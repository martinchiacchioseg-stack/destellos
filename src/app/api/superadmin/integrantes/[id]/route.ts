import { z } from "zod";
import { api, json } from "@/lib/http";
import { db, must } from "@/lib/db";
import { requerirSuperadmin, hashPassword } from "@/lib/auth";
import { crearSesion } from "@/lib/session";
import { ApiError } from "@/lib/env";
import { borrarArchivos } from "@/lib/storage";
import { hoyAR } from "@/lib/fecha";
import { soloDigitos } from "@/lib/usuarios";

const Id = z.string().uuid();

const Editar = z.object({
  nombre: z.string().trim().min(2).max(80).optional(),
  apodo: z.string().trim().max(30).nullable().optional(),
  email: z.string().trim().email("Email inválido.").nullable().optional(),
  whatsapp: z.string().trim().max(30).nullable().optional(),
  nacimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  rol: z.enum(["miembro", "admin"]).optional(),
  password: z.string().min(4, "La clave debe tener al menos 4 caracteres.").max(100).optional(),
  desbloquear: z.boolean().optional(),
});

export const PATCH = api(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  await requerirSuperadmin();
  const id = Id.parse((await ctx.params).id);
  const b = await json(req, Editar);
  const c: Record<string, unknown> = {};
  if (b.nombre !== undefined) c.nombre = b.nombre;
  if (b.apodo !== undefined) c.apodo = b.apodo || null;
  if (b.email !== undefined) c.email = b.email ? b.email.toLowerCase() : null;
  if (b.whatsapp !== undefined) c.whatsapp = b.whatsapp ? soloDigitos(b.whatsapp) : null;
  if (b.nacimiento !== undefined) c.nacimiento = b.nacimiento;
  if (b.rol) c.rol = b.rol;
  if (b.password) c.password_hash = await hashPassword(b.password);
  if (b.desbloquear || b.password) Object.assign(c, { intentos_fallidos: 0, bloqueado_hasta: null });
  const r = await db().from("usuarios").update(c).eq("id", id).select("id");
  if (r.error) {
    if (r.error.code === "23505") throw new ApiError(409, "Ese email ya está en uso en la familia.");
    throw new Error(`DB: ${r.error.message}`);
  }
  if (!r.data?.length) throw new ApiError(404, "Ese integrante no existe.");
  return { ok: true };
});

/** Eliminación permanente del integrante (sus destellos, reacciones, puntos y archivos incluidos). */
export const DELETE = api(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  await requerirSuperadmin();
  const id = Id.parse((await ctx.params).id);
  const [f, u] = await Promise.all([
    db().from("destellos").select("foto_path").eq("usuario_id", id),
    db().from("usuarios").select("foto_path").eq("id", id).limit(1),
  ]);
  const paths = [...((f.data ?? []) as { foto_path: string }[]).map((x) => x.foto_path), (u.data?.[0] as { foto_path: string | null } | undefined)?.foto_path];
  const del = must(await db().from("usuarios").delete().eq("id", id).select("id"));
  if (!del.length) throw new ApiError(404, "Ese integrante no existe.");
  await borrarArchivos(paths);
  return { ok: true };
});

/** Acciones de soporte: "entrar" como el integrante (modo prueba) o reiniciar su trivia de hoy. */
export const POST = api(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  await requerirSuperadmin();
  const id = Id.parse((await ctx.params).id);
  const { accion } = await json(req, z.object({ accion: z.enum(["entrar", "reiniciar_trivia"]) }));
  const existe = must(await db().from("usuarios").select("id").eq("id", id).limit(1))?.length;
  if (!existe) throw new ApiError(404, "Ese integrante no existe.");
  if (accion === "entrar") {
    await crearSesion(`superadmin:${id}`);
    return { ok: true };
  }
  await db().from("trivia_intentos").delete().eq("usuario_id", id).eq("fecha", hoyAR());
  await db().from("puntos").delete().eq("usuario_id", id).eq("fecha", hoyAR()).eq("motivo", "trivia");
  return { ok: true };
});
