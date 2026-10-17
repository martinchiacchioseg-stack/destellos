import { api } from "@/lib/http";
import { db } from "@/lib/db";
import { env, ApiError } from "@/lib/env";
import { ayerAR, hoyAR } from "@/lib/fecha";
import { asegurarVeredicto } from "@/lib/veredicto";
import { estadoLicencia } from "@/lib/grupos";
import type { Grupo } from "@/lib/types";

export const maxDuration = 60;

/** Cron diario: emite los veredictos pendientes y depura datos vencidos. Protegido por CRON_SECRET. */
export const GET = api(async (req: Request) => {
  if (req.headers.get("authorization") !== `Bearer ${env("CRON_SECRET")}`) throw new ApiError(401, "No autorizado.");
  const { data } = await db().from("grupos").select("*").eq("activo", true);
  let veredictos = 0;
  for (const g of (data ?? []) as Grupo[]) {
    if (!["activa", "por_vencer"].includes(estadoLicencia(g))) continue;
    for (const f of [ayerAR(), hoyAR()]) {
      const { data: d } = await db().from("destellos").select("id").eq("grupo_id", g.id).eq("fecha", f).limit(1);
      const ya = await db().from("veredictos").select("fecha").eq("grupo_id", g.id).eq("fecha", f).limit(1);
      if (d?.length && !ya.data?.length && (f !== hoyAR())) { await asegurarVeredicto(g, f); veredictos++; }
    }
  }
  await db().from("pizarra").delete().lt("vence_en", new Date().toISOString());
  await db().from("reset_codigos").delete().lt("vence_en", new Date(Date.now() - 24 * 3600_000).toISOString());
  return { ok: true, veredictos };
});
