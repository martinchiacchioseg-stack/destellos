import { z } from "zod";
import { api, json } from "@/lib/http";
import { db, must } from "@/lib/db";
import { contexto } from "@/lib/auth";
import { ApiError } from "@/lib/env";
import type { Picado, JugadorPicado } from "@/lib/types";

/**
 * GET /api/picado
 * Obtiene el picado activo (o el último creado) de la tribu / grupo.
 * Si no existe ninguno, crea uno por defecto para el próximo jueves a las 20:00 hs.
 */
export const GET = api(async (req: Request) => {
  const c = await contexto();
  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  let grupoId = c?.tipo === "usuario" ? c.grupo.id : null;

  // Si viene con token de invitación o acceso directo sin sesión
  if (!grupoId && token) {
    const { data: g } = await db()
      .from("grupos")
      .select("id")
      .or(`codigo.eq.${token},codigo_norm.eq.${token.toLowerCase().trim()}`)
      .limit(1)
      .single();
    if (g) grupoId = g.id;
  }

  if (!grupoId) {
    throw new ApiError(401, "No se identificó la tribu.");
  }

  // Buscar el picado más reciente del grupo
  const { data: picados } = await db()
    .from("picados")
    .select("*")
    .eq("grupo_id", grupoId)
    .order("creado_en", { ascending: false })
    .limit(1);

  let picado = picados?.[0] as Picado | undefined;

  // Si no existe, crear uno inicial automáticamente
  if (!picado) {
    const proximoJueves = new Date();
    proximoJueves.setDate(proximoJueves.getDate() + ((4 + 7 - proximoJueves.getDay()) % 7 || 7));
    proximoJueves.setHours(20, 0, 0, 0);

    const { data: nuevo, error } = await db()
      .from("picados")
      .insert({
        grupo_id: grupoId,
        titulo: "Fútbol 5 de los Jueves ⚽",
        lugar: "Canchas El Ombú (Cancha 2)",
        lugar_link: "https://maps.google.com/?q=Canchas+El+Ombu",
        fecha_hora: proximoJueves.toISOString(),
        limite_jugadores: 10,
        info_pago: "futbol.amigos.mp (Alias Mercado Pago)",
        estado: "convocatoria_abierta",
        jugadores: [],
        votos_mvp: [],
      })
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    picado = nuevo as Picado;
  }

  // Identificar usuario actual si hay sesión
  const usuarioActual =
    c?.tipo === "usuario"
      ? {
          id: c.usuario.id,
          nombre: c.usuario.apodo || c.usuario.nombre,
          esAdmin: c.usuario.rol === "admin" || c.esSuper,
        }
      : null;

  return { picado, usuarioActual };
});

const CrearPicado = z.object({
  titulo: z.string().trim().min(2).max(100),
  lugar: z.string().trim().max(120).optional().nullable(),
  lugar_link: z.string().trim().url().optional().nullable(),
  fecha_hora: z.string(),
  limite_jugadores: z.number().int().min(4).max(30).default(10),
  info_pago: z.string().trim().max(100).optional().nullable(),
});

/**
 * POST /api/picado
 * Crea o reinicia un nuevo picado para la tribu (Admin o miembro autorizado).
 */
export const POST = api(async (req: Request) => {
  const c = await contexto();
  if (!c || c.tipo !== "usuario") throw new ApiError(401, "Iniciá sesión para crear el picado.");

  const b = await json(req, CrearPicado);

  const { data: nuevo, error } = await db()
    .from("picados")
    .insert({
      grupo_id: c.grupo.id,
      titulo: b.titulo,
      lugar: b.lugar || null,
      lugar_link: b.lugar_link || null,
      fecha_hora: b.fecha_hora,
      limite_jugadores: b.limite_jugadores,
      info_pago: b.info_pago || null,
      estado: "convocatoria_abierta",
      jugadores: [],
      votos_mvp: [],
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  return { picado: nuevo };
});
