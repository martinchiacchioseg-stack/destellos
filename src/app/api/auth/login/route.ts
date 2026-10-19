import { z } from "zod";
import { api, json } from "@/lib/http";
import { db, must } from "@/lib/db";
import { grupoPorCodigo, licenciaPermiteAcceso } from "@/lib/grupos";
import { verificarPassword, verificarSuperadmin } from "@/lib/auth";
import { crearSesion } from "@/lib/session";
import { ApiError } from "@/lib/env";
import { buscarPorIdentificador } from "@/lib/usuarios";
import type { Usuario } from "@/lib/types";

const MAX_INTENTOS = 5;
const BLOQUEO_MIN = 10;

const Body = z.object({
  /** Código ahora es opcional. Si no viene, se busca directamente por email o whatsapp globalmente. */
  codigo: z.string().optional(),
  usuarioId: z.string().uuid().optional(),
  identificador: z.string().max(120).optional(),
  password: z.string().min(1).max(200),
});

export const POST = api(async (req: Request) => {
  const b = await json(req, Body);

  let u: Usuario | null = null;
  let g: any = null;

  // 0. Comprobar si es el Superadministrador ingresando por la pantalla unificada
  if (b.identificador) {
    const esSuper = await verificarSuperadmin(b.identificador.trim(), b.password);
    if (esSuper) {
      await crearSesion("superadmin");
      return {
        ok: true,
        esSuperadmin: true,
        debeCambiarClave: false,
        perfilCompleto: true,
        redirect: "/superadmin",
      };
    }
  }

  // 1. Ingreso Directo mediante usuarioId (para cuando tocan su avatar recordado)
  if (b.usuarioId) {
    const res = await db().from("usuarios").select("*, grupos(*)").eq("id", b.usuarioId).limit(1);
    const fila = res.data?.[0];
    if (fila) {
      u = fila as unknown as Usuario;
      g = fila.grupos;
    }
  }

  // 2. Ingreso Directo por Email o WhatsApp (sin necesidad de código de familia)
  if (!u && b.identificador) {
    const raw = b.identificador.trim();
    const soloNum = raw.replace(/\D/g, "");
    const emailNorm = raw.toLowerCase();

    // Si viene código de familia clásico, buscar dentro del grupo
    if (b.codigo?.trim()) {
      g = await grupoPorCodigo(b.codigo.trim());
      if (g) {
        u = await buscarPorIdentificador(g.id, raw);
      }
    } else {
      // Búsqueda global directa
      let q = db().from("usuarios").select("*, grupos(*)");
      if (emailNorm.includes("@")) {
        q = q.eq("email", emailNorm);
      } else if (soloNum.length >= 6) {
        q = q.eq("whatsapp", soloNum);
      } else {
        q = q.ilike("nombre", `%${raw}%`);
      }
      const res = await q.limit(1);
      const fila = res.data?.[0];
      if (fila) {
        u = fila as unknown as Usuario;
        g = fila.grupos;
      }
    }
  }

  const generico = new ApiError(401, "El usuario o la clave no coinciden. Revisalos y probá de nuevo.");
  if (!u || !g) throw generico;

  if (!licenciaPermiteAcceso(g)) {
    throw new ApiError(402, "El espacio de esta tribu está en pausa.");
  }

  if (u.bloqueado_hasta && new Date(u.bloqueado_hasta) > new Date()) {
    throw new ApiError(429, "Demasiados intentos. Esperá unos minutos y probá otra vez.");
  }

  if (!(await verificarPassword(b.password, u.password_hash))) {
    const intentos = (u.intentos_fallidos || 0) + 1;
    const bloqueo = intentos >= MAX_INTENTOS ? new Date(Date.now() + BLOQUEO_MIN * 60_000).toISOString() : null;
    await db().from("usuarios").update({ intentos_fallidos: bloqueo ? 0 : intentos, bloqueado_hasta: bloqueo }).eq("id", u.id);
    throw generico;
  }

  await db().from("usuarios").update({ intentos_fallidos: 0, bloqueado_hasta: null }).eq("id", u.id);
  await crearSesion(u.id);

  // Debe cambiar clave si su flag está activo o si usa la clave genérica inicial
  const debeCambiar = u.debe_cambiar_clave ?? (b.password === "123456");

  return {
    ok: true,
    debeCambiarClave: debeCambiar,
    perfilCompleto: u.perfil_completo ?? !!u.foto_path,
    usuario: {
      id: u.id,
      nombre: u.nombre,
      apodo: u.apodo,
      foto_path: u.foto_path,
      rol: u.rol,
    },
    tribu: {
      id: g.id,
      nombre: g.nombre,
      emoji: g.emoji,
    },
  };
});
