import { api } from "@/lib/http";
import { db } from "@/lib/db";
import { requerirSuperadmin } from "@/lib/auth";
import { estadoLicencia } from "@/lib/grupos";
import type { Grupo } from "@/lib/types";

const total = async (tabla: string) => (await db().from(tabla).select("*", { count: "exact", head: true })).count ?? 0;

export const GET = api(async () => {
  await requerirSuperadmin();
  const [grupos, integrantes, destellos, gs] = await Promise.all([
    total("grupos"),
    total("usuarios"),
    total("destellos"),
    db().from("grupos").select("activo,vence_en"),
  ]);
  const activas = ((gs.data ?? []) as Pick<Grupo, "activo" | "vence_en">[]).filter((g) => ["activa", "por_vencer"].includes(estadoLicencia(g))).length;
  return { familias_activas: activas, familias_total: grupos, integrantes, destellos };
});
