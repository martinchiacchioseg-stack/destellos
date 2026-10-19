import { api } from "@/lib/http";
import { db } from "@/lib/db";
import { env, ApiError } from "@/lib/env";
import { hoyAR } from "@/lib/fecha";
import {
  obtenerOIniciarRondaHoy,
  transicionarAFase2,
  transicionarAFase3,
} from "@/lib/impostor";

export const maxDuration = 60;

/**
 * Cron para El Impostor:
 * Corre periódicamente para ejecutar las transiciones automáticas:
 * - 00:00 hs: Crea la ronda del día con palabra generada por Gemini y sorteo de roles.
 * - 19:00 hs: Destapa pistas y abre votación (o cancela si el impostor no envió pista).
 * - 22:00 hs: Cierra votación, congela votos y liquida veredicto/puntos.
 */
export const GET = api(async (req: Request) => {
  const authHeader = req.headers.get("authorization");
  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  if (authHeader !== `Bearer ${env("CRON_SECRET")}` && token !== env("CRON_SECRET")) {
    throw new ApiError(401, "No autorizado.");
  }

  // 1. Obtener todas las configuraciones activas de grupos
  const { data: configs } = await db()
    .from("impostor_configuracion")
    .select("*")
    .eq("activo", true);

  if (!configs || configs.length === 0) {
    return { ok: true, mensaje: "No hay grupos con El Impostor activo.", procesados: 0 };
  }

  const hoy = hoyAR();
  // Hora actual en Argentina (HH:MM)
  const ahoraAR = new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());

  const resultados: any[] = [];

  for (const c of configs) {
    try {
      // 1. Asegurar que exista la ronda de hoy
      const { partida } = await obtenerOIniciarRondaHoy(c.grupo_id, hoy);
      if (!partida) continue;

      const horaRev = (c.hora_revelacion || "19:00").slice(0, 5);
      const horaCie = (c.hora_cierre || "22:00").slice(0, 5);

      // 2. Si está en Fase 1 y ya pasó la hora de revelación (default 19:00): pasar a Fase 2
      if (partida.estado === "fase_1_pistas" && ahoraAR >= horaRev) {
        const trans = await transicionarAFase2(partida.id);
        resultados.push({ grupoId: c.grupo_id, accion: "fase_2", trans });
      }

      // 3. Si está en Fase 2 y ya pasó la hora de cierre (default 22:00): pasar a Fase 3
      if (partida.estado === "fase_2_votacion" && ahoraAR >= horaCie) {
        const trans = await transicionarAFase3(partida.id);
        resultados.push({ grupoId: c.grupo_id, accion: "fase_3", trans });
      }
    } catch (err: any) {
      console.warn(`[cron:impostor] Error procesando grupo ${c.grupo_id}:`, err?.message);
    }
  }

  return {
    ok: true,
    horaActualAR: ahoraAR,
    gruposActivos: configs.length,
    transicionesEjecutadas: resultados,
  };
});
