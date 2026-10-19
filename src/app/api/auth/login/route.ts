import { z } from "zod";
import { api, json } from "@/lib/http";
import { db, must } from "@/lib/db";
import { grupoPorCodigo, licenciaPermiteAcceso } from "@/lib/grupos";
import { verificarPassword } from "@/lib/auth";
import { crearSesion } from "@/lib/session";
import { ApiError } from "@/lib/env";
import { buscarPorIdentificador } from "@/lib/usuarios";
import type { Usuario } from "@/lib/types";

const MAX_INTENTOS = 5;
const BLOQUEO_MIN = 10;

const Body = z.object({
  codigo: z.string().min(2),
  usuarioId: z.string().uuid().optional(),
  identificador: z.string().max(120).optional(),
  password: z.string().min(1).max(200),
});

export const POST = api(async (req: Request) => {
  const b = await json(req, Body);
  const g = await grupoPorCodigo(b.codigo);
  if (!g) throw new ApiError(404, "No encontramos esa familia.");
  if (!licenciaPermiteAcceso(g)) throw new ApiError(402, "El espacio de esta familia está en pausa.");

  let u: Usuario | null = null;
  if (b.usuarioId) {
    u = (must(await db().from("usuarios").select("*").eq("id", b.usuarioId).eq("grupo_id", g.id).limit(1))?.[0] as Usuario) ?? null;
  } else if (b.identificador) {
    u = await buscarPorIdentificador(g.id, b.identificador);
  }
  const generico = new ApiError(401, "Los datos no coinciden. Revisalos y probá de nuevo.");
  if (!u) throw generico;

  if (u.bloqueado_hasta && new Date(u.bloqueado_hasta) > new Date()) {
    throw new ApiError(429, "Demasiados intentos. Esperá unos minutos y probá otra vez.");
  }

  if (!(await verificarPassword(b.password, u.password_hash))) {
    const intentos = u.intentos_fallidos + 1;
    const bloqueo = intentos >= MAX_INTENTOS ? new Date(Date.now() + BLOQUEO_MIN * 60_000).toISOString() : null;
    await db().from("usuarios").update({ intentos_fallidos: bloqueo ? 0 : intentos, bloqueado_hasta: bloqueo }).eq("id", u.id);
    throw generico;
  }

  await db().from("usuarios").update({ intentos_fallidos: 0, bloqueado_hasta: null }).eq("id", u.id);
  await crearSesion(u.id);
  return { ok: true, debeCambiarClave: b.password === "123456" };
});
