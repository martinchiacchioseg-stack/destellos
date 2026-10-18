import { z } from "zod";
import { api, json } from "@/lib/http";
import { db } from "@/lib/db";
import { hoyAR } from "@/lib/fecha";

const BodyResultado = z.object({
  partidoId: z.string().uuid(),
  golesLocal: z.number().int().min(0).max(20),
  golesVisitante: z.number().int().min(0).max(20),
  finalizado: z.boolean().default(true),
});

export const POST = api(async (req: Request) => {
  const b = await json(req, BodyResultado);

  const signoReal: "L" | "E" | "V" =
    b.golesLocal > b.golesVisitante ? "L" :
    b.golesLocal < b.golesVisitante ? "V" : "E";

  // 1. Actualizar partido
  const { data: partido, error: errP } = await db()
    .from("prode_partidos")
    .update({
      goles_local: b.golesLocal,
      goles_visitante: b.golesVisitante,
      resultado_oficial: signoReal,
      finalizado: b.finalizado,
    })
    .eq("id", b.partidoId)
    .select("*, fecha_id")
    .single();

  if (errP || !partido) {
    return { error: "No se encontró el partido." };
  }

  // 2. Evaluar pronósticos de todos los usuarios para este partido
  const { data: pronosticos } = await db()
    .from("prode_pronosticos")
    .select("*")
    .eq("partido_id", b.partidoId);

  let evaluadosCount = 0;
  if (pronosticos && pronosticos.length > 0) {
    for (const pr of pronosticos) {
      let pts = 0;
      const acertoSigno = pr.pronostico === signoReal;
      const acertoGoles =
        pr.goles_local !== null &&
        pr.goles_visitante !== null &&
        pr.goles_local === b.golesLocal &&
        pr.goles_visitante === b.golesVisitante;

      if (acertoGoles) {
        pts = 8; // Pleno (3 de signo + 5 de marcador exacto)
      } else if (acertoSigno) {
        pts = 3; // Acertó ganador / empate
      }

      // Actualizar puntos del pronóstico
      await db()
        .from("prode_pronosticos")
        .update({
          puntos_obtenidos: pts,
          evaluado: true,
        })
        .eq("id", pr.id);

      // Si sumó puntos, impactar en la tabla unificada de puntos
      if (pts > 0 && pr.usuario_id && pr.grupo_id) {
        try {
          const motivo = acertoGoles
            ? `Prode PLENO: ${partido.local} ${b.golesLocal}-${b.golesVisitante} ${partido.visitante}`
            : `Prode ACIERTO: ${partido.local} vs ${partido.visitante}`;

          await db().from("puntos").insert({
            grupo_id: pr.grupo_id,
            usuario_id: pr.usuario_id,
            fecha: hoyAR(),
            motivo,
            puntos: pts,
          });
        } catch (e) {
          console.warn("[prode] Puntos ya registrados o error al persistir:", e);
        }
      }

      evaluadosCount++;
    }
  }

  return {
    ok: true,
    partido: `${partido.local} ${b.golesLocal} - ${b.golesVisitante} ${partido.visitante}`,
    signoOficial: signoReal,
    pronosticosEvaluados: evaluadosCount,
  };
});
