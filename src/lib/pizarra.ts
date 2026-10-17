import "server-only";
import { db, must } from "./db";
import type { ColorLed } from "./types";

const COOLDOWN_MIN = 10;

/** Arlequín escribe en la pizarra de la familia, con rate limit de 10 min por grupo. */
export async function publicarArlequin(grupoId: string, texto: string, color: ColorLed = "ambar"): Promise<boolean> {
  const desde = new Date(Date.now() - COOLDOWN_MIN * 60_000).toISOString();
  const recientes = must(
    await db().from("pizarra").select("id").eq("grupo_id", grupoId).eq("origen", "arlequin").gte("creado_en", desde).limit(1),
  );
  if (recientes && recientes.length) return false;
  must(await db().from("pizarra").insert({ grupo_id: grupoId, texto: texto.slice(0, 200), color, origen: "arlequin", vence_en: new Date(Date.now() + 24 * 3600_000).toISOString() }));
  return true;
}

export interface MensajePizarra {
  id: string;
  texto: string;
  color: ColorLed;
  origen: "arlequin" | "superadmin";
  destacado: boolean;
}

/** Mensajes vigentes: globales del superadmin + propios del grupo. Los destacados primero. */
export async function mensajesVigentes(grupoId: string): Promise<MensajePizarra[]> {
  const ahora = new Date().toISOString();
  const rows = must(
    await db()
      .from("pizarra")
      .select("id,texto,color,origen,destacado,vence_en,creado_en")
      .or(`grupo_id.eq.${grupoId},grupo_id.is.null`)
      .or(`vence_en.is.null,vence_en.gt.${ahora}`)
      .order("destacado", { ascending: false })
      .order("creado_en", { ascending: false })
      .limit(12),
  ) as (MensajePizarra & { vence_en: string | null })[];
  return rows.map(({ id, texto, color, origen, destacado }) => ({ id, texto, color, origen, destacado }));
}
