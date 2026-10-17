import { z } from "zod";
import { api, json } from "@/lib/http";
import { db, must } from "@/lib/db";
import { requerirSuperadmin } from "@/lib/auth";
import { subirImagen, firmar, borrarArchivos } from "@/lib/storage";
import { ApiError } from "@/lib/env";

export const GET = api(async () => {
  await requerirSuperadmin();
  const rows = (must(await db().from("publicidades").select("*").order("creado_en", { ascending: false })) ?? []) as { imagen_path: string | null }[];
  const urls = await firmar(rows.map((r) => r.imagen_path));
  return { publicidades: rows.map((r) => ({ ...r, imagen_url: r.imagen_path ? urls[r.imagen_path] ?? null : null })) };
});

const enlaceOk = z.string().trim().url("El enlace debe empezar con https://").refine((u) => /^https?:\/\//i.test(u), "Solo enlaces http(s).");

export const POST = api(async (req: Request) => {
  await requerirSuperadmin();
  const fd = await req.formData();
  const g = (k: string) => (typeof fd.get(k) === "string" ? ((fd.get(k) as string).trim() || undefined) : undefined);
  const b = z
    .object({
      titulo: z.string().min(1, "Falta el título.").max(80),
      texto: z.string().max(200).optional(),
      enlace: enlaceOk.optional(),
      ubicacion: z.enum(["home", "login", "trivia"]).default("home"),
    })
    .parse({ titulo: g("titulo"), texto: g("texto"), enlace: g("enlace"), ubicacion: g("ubicacion") });
  const img = fd.get("imagen");
  const imagen_path = img instanceof File && img.size > 0 ? await subirImagen(img, "ads", 1000) : null;
  must(await db().from("publicidades").insert({ ...b, imagen_path }));
  return { ok: true };
});

export const PATCH = api(async (req: Request) => {
  await requerirSuperadmin();
  const { id, activa } = await json(req, z.object({ id: z.string().uuid(), activa: z.boolean() }));
  must(await db().from("publicidades").update({ activa }).eq("id", id).select("id"));
  return { ok: true };
});

export const DELETE = api(async (req: Request) => {
  await requerirSuperadmin();
  const { id } = await json(req, z.object({ id: z.string().uuid() }));
  const fila = must(await db().from("publicidades").delete().eq("id", id).select("imagen_path"));
  if (!fila.length) throw new ApiError(404, "No existe esa publicidad.");
  await borrarArchivos(fila.map((f: { imagen_path: string | null }) => f.imagen_path));
  return { ok: true };
});
