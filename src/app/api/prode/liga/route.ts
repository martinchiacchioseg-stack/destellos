import { z } from "zod";
import { api, json } from "@/lib/http";
import { db } from "@/lib/db";

// Fallback inicial representativo de la Liga Profesional por si el cron aún no sincronizó
const FALLBACK_STANDINGS = [
  { rank: 1, team: "Vélez Sarsfield", badge: "🔵⚪", points: 38, played: 19, win: 11, draw: 5, lose: 3, diff: "+20" },
  { rank: 2, team: "Huracán", badge: "⚪🎈", points: 35, played: 19, win: 9, draw: 8, lose: 2, diff: "+13" },
  { rank: 3, team: "Talleres (Cba)", badge: "🔵⚪", points: 32, played: 19, win: 8, draw: 8, lose: 3, diff: "+8" },
  { rank: 4, team: "Racing Club", badge: "⚪🩵", points: 31, played: 19, win: 9, draw: 4, lose: 6, diff: "+10" },
  { rank: 5, team: "River Plate", badge: "⚪🔴", points: 30, played: 19, win: 7, draw: 9, lose: 3, diff: "+12" },
  { rank: 6, team: "Boca Juniors", badge: "🟦🟨", points: 28, played: 19, win: 7, draw: 7, lose: 5, diff: "+6" },
  { rank: 7, team: "Independiente", badge: "🔴⚪", points: 27, played: 19, win: 6, draw: 9, lose: 4, diff: "+4" },
  { rank: 8, team: "Estudiantes L.P.", badge: "🔴⚪", points: 26, played: 19, win: 6, draw: 8, lose: 5, diff: "+3" },
  { rank: 9, team: "San Lorenzo", badge: "🔵🔴", points: 24, played: 19, win: 5, draw: 9, lose: 5, diff: "0" },
  { rank: 10, team: "Rosario Central", badge: "🟡🔵", points: 23, played: 19, win: 5, draw: 8, lose: 6, diff: "-1" },
];

const FALLBACK_SCORERS = [
  { rank: 1, name: "Claudio Aquino", team: "Vélez Sarsfield", goals: 11 },
  { rank: 2, name: "Braian Romero", team: "Vélez Sarsfield", goals: 10 },
  { rank: 3, name: "Miguel Borja", team: "River Plate", goals: 9 },
  { rank: 4, name: "Milton Giménez", team: "Boca Juniors", goals: 8 },
  { rank: 5, name: "Adrián Martínez", team: "Racing Club", goals: 8 },
  { rank: 6, name: "Gabriel Ávalos", team: "Independiente", goals: 7 },
];

export const GET = api(async () => {
  try {
    const { data: filas } = await db()
      .from("prode_liga_datos")
      .select("*");

    let standings = FALLBACK_STANDINGS;
    let scorers = FALLBACK_SCORERS;
    let actualizadoEn = null;

    if (filas && filas.length > 0) {
      const rowStandings = filas.find(f => f.id === "standings");
      const rowScorers = filas.find(f => f.id === "topscorers");

      if (rowStandings?.payload) standings = rowStandings.payload;
      if (rowScorers?.payload) scorers = rowScorers.payload;
      actualizadoEn = rowStandings?.actualizado_en || rowScorers?.actualizado_en || null;
    }

    return {
      ok: true,
      standings,
      scorers,
      actualizadoEn,
    };
  } catch {
    return {
      ok: true,
      standings: FALLBACK_STANDINGS,
      scorers: FALLBACK_SCORERS,
      actualizadoEn: null,
    };
  }
});

const BodyGuardarLiga = z.object({
  tipo: z.enum(["standings", "topscorers"]),
  datos: z.array(z.any()),
});

export const POST = api(async (req: Request) => {
  const b = await json(req, BodyGuardarLiga);

  const { error } = await db()
    .from("prode_liga_datos")
    .upsert({
      id: b.tipo,
      payload: b.datos,
      actualizado_en: new Date().toISOString(),
    });

  if (error) {
    return { error: error.message };
  }

  return { ok: true, tipo: b.tipo, cantidad: b.datos.length };
});
