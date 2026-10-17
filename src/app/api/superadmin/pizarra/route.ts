import { z } from "zod";
import { api, json } from "@/lib/http";
import { db, must } from "@/lib/db";
import { requerirSuperadmin } from "@/lib/auth";
import { COLORES_LED } from "@/lib/types";

export const GET = api(async () => {
  await requerirSuperadmin();
  const r = must(await db().from("pizarra").select("*, grupos(nombre)").order("creado_en", { ascending: false }).limit(60));
  return { mensajes: r };
});

/** Mensaje destacado del superadmin: global (todas las familias) o para una familia, con vencimiento. */
export const POST = api(async (req: Request) => {
  await requerirSuperadmin();
  const b = await json(
    req,
    z.object({
      texto: z.string().trim().min(1, "Escribí el mensaje.").max(200),
      color: z.enum(COLORES_LED).default("magenta"),
      grupo_id: z.string().uuid().nullable().default(null),
      horas: z.number().int().min(1).max(24 * 30).default(24),
      destacado: z.boolean().default(true),
    }),
  );
  must(
    await db().from("pizarra").insert({
      texto: b.texto, color: b.color, grupo_id: b.grupo_id, origen: "superadmin", destacado: b.destacado,
      vence_en: new Date(Date.now() + b.horas * 3600_000).toISOString(),
    }),
  );
  return { ok: true };
});

export const DELETE = api(async (req: Request) => {
  await requerirSuperadmin();
  const { id } = await json(req, z.object({ id: z.string().uuid() }));
  must(await db().from("pizarra").delete().eq("id", id).select("id"));
  return { ok: true };
});
