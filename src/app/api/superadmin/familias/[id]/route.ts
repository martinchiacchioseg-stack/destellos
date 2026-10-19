import { z } from "zod";
import { api, json } from "@/lib/http";
import { db, must } from "@/lib/db";
import { requerirSuperadmin, hashPassword } from "@/lib/auth";
import { normalizarCodigo } from "@/lib/grupos";
import { sumarDias, sumarMeses, hoyAR } from "@/lib/fecha";
import { ApiError } from "@/lib/env";
import { borrarArchivos } from "@/lib/storage";
import { miembrosDelGrupo, publicos, soloDigitos } from "@/lib/usuarios";
import type { Grupo } from "@/lib/types";

const Id = z.string().uuid();

const Editar = z.object({
  nombre: z.string().trim().min(2).max(60).optional(),
  emoji: z.string().trim().max(8).optional(),
  hora_limite: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora límite inválida (HH:MM).").optional(),
  codigo: z.string().trim().max(30).optional(),
  admin_nombre: z.string().trim().min(2).max(80).optional(),
  admin_email: z.string().trim().email("Email inválido.").optional(),
  admin_whatsapp: z.string().trim().max(30).optional().nullable(),
  vence_en: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  /** Atajos de licencia: se suman al vencimiento actual (o a hoy si ya venció). */
  extender_meses: z.union([z.literal(1), z.literal(3), z.literal(12)]).optional(),
  activo: z.boolean().optional(),
});

export const PATCH = api(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  await requerirSuperadmin();
  const id = Id.parse((await ctx.params).id);
  const b = await json(req, Editar);
  const actual = must(await db().from("grupos").select("*").eq("id", id).limit(1))?.[0] as Grupo | undefined;
  if (!actual) throw new ApiError(404, "Esa familia no existe.");

  const cambios: Record<string, unknown> = {};
  for (const k of ["nombre", "emoji", "hora_limite", "admin_nombre", "activo"] as const) if (b[k] !== undefined) cambios[k] = b[k];
  if (b.admin_email) cambios.admin_email = b.admin_email.toLowerCase();
  if (b.codigo) {
    const norm = normalizarCodigo(b.codigo);
    if (norm.length < 4) throw new ApiError(400, "El código debe tener al menos 4 letras o números.");
    cambios.codigo = b.codigo;
    cambios.codigo_norm = norm;
  }
  if (b.vence_en) cambios.vence_en = b.vence_en;
  if (b.extender_meses) {
    const base = actual.vence_en > hoyAR() ? actual.vence_en : hoyAR();
    cambios.vence_en = sumarMeses(base, b.extender_meses);
    cambios.activo = true;
  }

  const up = await db().from("grupos").update(cambios).eq("id", id).select("*").single();
  if (up.error) {
    if (up.error.code === "23505") throw new ApiError(409, "Ese código de familia ya existe. Elegí otro.");
    throw new Error(`DB: ${up.error.message}`);
  }

  // Mantener sincronizada la cuenta del administrador si cambió su nombre, email o WhatsApp.
  if ((b.admin_email || b.admin_nombre || b.admin_whatsapp !== undefined) && actual.id) {
    const sync: Record<string, string | null> = {};
    if (b.admin_email) sync.email = b.admin_email.toLowerCase();
    if (b.admin_nombre) sync.nombre = b.admin_nombre;
    if (b.admin_whatsapp !== undefined) {
      sync.whatsapp = b.admin_whatsapp ? soloDigitos(b.admin_whatsapp) : null;
    }
    await db().from("usuarios").update(sync).eq("grupo_id", id).eq("rol", "admin");
  }
  return { familia: up.data };
});

const CrearMiembro = z.object({
  nombre: z.string().trim().min(2, "El nombre debe tener al menos 2 letras.").max(80),
  apodo: z.string().trim().max(40).optional().nullable(),
  email: z.string().trim().email("Email inválido.").optional().nullable(),
  whatsapp: z.string().trim().max(30).optional().nullable(),
  password: z.string().trim().min(4, "La clave debe tener al menos 4 caracteres.").max(100).default("123456"),
  rol: z.enum(["admin", "miembro"]).default("miembro"),
});

/** Agregar un nuevo integrante directamente a la familia desde el panel Superadmin. */
export const POST = api(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  await requerirSuperadmin();
  const id = Id.parse((await ctx.params).id);
  const b = await json(req, CrearMiembro);

  const hash = await hashPassword(b.password);
  const ws = b.whatsapp ? soloDigitos(b.whatsapp) : null;

  const ins = await db()
    .from("usuarios")
    .insert({
      grupo_id: id,
      nombre: b.nombre,
      apodo: b.apodo || null,
      email: b.email ? b.email.toLowerCase() : null,
      whatsapp: ws,
      password_hash: hash,
      rol: b.rol,
    })
    .select("id, nombre, apodo, email, whatsapp, rol")
    .single();

  if (ins.error) {
    if (ins.error.code === "23505") throw new ApiError(409, "Ya existe un usuario con ese email en esta familia.");
    throw new Error(`DB: ${ins.error.message}`);
  }

  return { ok: true, usuario: ins.data };
});

/** Eliminación permanente: borra familia, integrantes, destellos y también los archivos del Storage. */
export const DELETE = api(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  await requerirSuperadmin();
  const id = Id.parse((await ctx.params).id);
  const [d, u, v] = await Promise.all([
    db().from("destellos").select("foto_path").eq("grupo_id", id),
    db().from("usuarios").select("foto_path").eq("grupo_id", id),
    db().from("veredictos").select("diploma_path").eq("grupo_id", id),
  ]);
  const paths = [
    ...((d.data ?? []) as { foto_path: string }[]).map((x) => x.foto_path),
    ...((u.data ?? []) as { foto_path: string | null }[]).map((x) => x.foto_path),
    ...((v.data ?? []) as { diploma_path: string | null }[]).map((x) => x.diploma_path),
  ];
  must(await db().from("grupos").delete().eq("id", id).select("id"));
  await borrarArchivos(paths); // en lotes por límite de la API
  return { ok: true };
});

/** Integrantes de una familia (vista completa para el superadmin). */
export const GET = api(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  await requerirSuperadmin();
  const id = Id.parse((await ctx.params).id);
  const ms = await miembrosDelGrupo(id);
  const pubs = await publicos(ms);
  return {
    integrantes: ms.map((m, i) => ({
      ...pubs[i], email: m.email, whatsapp: m.whatsapp, nacimiento: m.nacimiento, grupo_id: m.grupo_id, bloqueado: !!m.bloqueado_hasta && new Date(m.bloqueado_hasta) > new Date(),
    })),
  };
});

void sumarDias;
