import { z } from "zod";
import { api, json } from "@/lib/http";
import { requerirUsuario } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApiError } from "@/lib/env";
import { asegurarFaseSegunHorario, obtenerConfiguracionImpostor } from "@/lib/impostor";

const BodyComentario = z.object({
  mensaje: z.string().trim().min(1, "Escribí un mensaje.").max(280, "Máximo 280 caracteres."),
});

export const GET = api(async () => {
  const { grupo } = await requerirUsuario();

  const { data: partida } = await db()
    .from("impostor_partidas")
    .select("id")
    .eq("grupo_id", grupo.id)
    .order("creado_en", { ascending: false })
    .limit(1)
    .single();

  if (!partida) return { comentarios: [] };

  const { data: comentarios } = await db()
    .from("impostor_comentarios")
    .select("id, mensaje, creado_en, usuario_id, usuarios(nombre, apodo)")
    .eq("partida_id", partida.id)
    .order("creado_en", { ascending: true });

  const lista = (comentarios || []).map((c: any) => ({
    id: c.id,
    mensaje: c.mensaje,
    creadoEn: c.creado_en,
    usuarioId: c.usuario_id,
    nombre: c.usuarios?.apodo || c.usuarios?.nombre || "Jugador",
  }));

  return { comentarios: lista };
});

export const POST = api(async (req: Request) => {
  const { usuario, grupo } = await requerirUsuario();
  const b = await json(req, BodyComentario);

  const { data: partida } = await db()
    .from("impostor_partidas")
    .select("id, estado")
    .eq("grupo_id", grupo.id)
    .order("creado_en", { ascending: false })
    .limit(1)
    .single();

  if (!partida) {
    throw new ApiError(404, "No hay partida activa.");
  }

  const config = await obtenerConfiguracionImpostor(grupo.id);
  const partidaActual = await asegurarFaseSegunHorario(partida as any, config);

  if (partidaActual.estado !== "fase_2_votacion") {
    throw new ApiError(400, "El debate solo está abierto durante la fase de votación (19:00 a 22:00 hs).");
  }

  const { data: ins, error } = await db()
    .from("impostor_comentarios")
    .insert({
      partida_id: partida.id,
      usuario_id: usuario.id,
      mensaje: b.mensaje,
    })
    .select("id, mensaje, creado_en")
    .single();

  if (error) throw new ApiError(500, `Error al publicar mensaje: ${error.message}`);

  return {
    ok: true,
    comentario: {
      ...ins,
      nombre: usuario.apodo || usuario.nombre,
      usuarioId: usuario.id,
    },
  };
});
