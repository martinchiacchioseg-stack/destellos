import { api } from "@/lib/http";
import { db, must } from "@/lib/db";
import { requerirUsuario } from "@/lib/auth";
import { miembrosDelGrupo, publicos } from "@/lib/usuarios";
import { hoyAR, sumarDias } from "@/lib/fecha";

/** Ranking familiar (total y últimos 7 días). Suma fotos, victorias y trivia. */
export const GET = api(async () => {
  const { grupo } = await requerirUsuario();
  const [miembros, filas] = await Promise.all([
    miembrosDelGrupo(grupo.id),
    db().from("puntos").select("usuario_id,fecha,puntos").eq("grupo_id", grupo.id),
  ]);
  const semana = sumarDias(hoyAR(), -6);
  const total = new Map<string, number>();
  const sem = new Map<string, number>();
  for (const p of (must(filas) ?? []) as { usuario_id: string; fecha: string; puntos: number }[]) {
    total.set(p.usuario_id, (total.get(p.usuario_id) ?? 0) + p.puntos);
    if (p.fecha >= semana) sem.set(p.usuario_id, (sem.get(p.usuario_id) ?? 0) + p.puntos);
  }
  const pubs = await publicos(miembros);
  const lista = pubs
    .map((u) => ({ ...u, total: total.get(u.id) ?? 0, semana: sem.get(u.id) ?? 0 }))
    .sort((a, b) => b.total - a.total || a.nombre.localeCompare(b.nombre));
  return { ranking: lista };
});
