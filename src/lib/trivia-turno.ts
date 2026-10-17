import "server-only";
import { db, must } from "./db";
import { evaluar, type Pregunta } from "./trivia";
import { NIVELES, type NivelTrivia } from "./types";
import { nombreCorto } from "./usuarios";
import type { Usuario } from "./types";

const GRACIA_SEG = 2; // tolerancia por latencia de red

export interface Intento {
  id: string;
  grupo_id: string;
  usuario_id: string;
  fecha: string;
  nivel: NivelTrivia;
  pregunta: Pregunta;
  iniciada_en: string;
  respondida: boolean;
  elegida: number | null;
  acerto: boolean | null;
  puntos: number;
  evaluacion: string | null;
}

export const segundosRestantes = (i: Intento) =>
  Math.max(0, Math.ceil(NIVELES[i.nivel].segundos - (Date.now() - new Date(i.iniciada_en).getTime()) / 1000));

export const vencido = (i: Intento) =>
  (Date.now() - new Date(i.iniciada_en).getTime()) / 1000 > NIVELES[i.nivel].segundos + GRACIA_SEG;

/** Cierra el intento (con la opción elegida o por tiempo agotado). Solo la primera resolución puntúa. */
export async function resolver(i: Intento, u: Usuario, opcion: number | null): Promise<Intento> {
  if (i.respondida) return i;
  const agotado = opcion === null || vencido(i);
  const acerto = !agotado && opcion === i.pregunta.correcta;
  const puntos = acerto ? NIVELES[i.nivel].puntos : 0;
  const evaluacion = await evaluar({ nombre: nombreCorto(u), nivel: i.nivel, acerto, agotado, pregunta: i.pregunta });

  // Condición respondida=false hace atómica la transición: un doble envío no suma dos veces.
  const { data } = await db()
    .from("trivia_intentos")
    .update({ respondida: true, elegida: agotado ? null : opcion, acerto, puntos, evaluacion })
    .eq("id", i.id)
    .eq("respondida", false)
    .select("*");
  if (!data?.length) return must(await db().from("trivia_intentos").select("*").eq("id", i.id).limit(1))![0] as Intento;

  if (puntos > 0) {
    await db()
      .from("puntos")
      .upsert({ grupo_id: i.grupo_id, usuario_id: i.usuario_id, fecha: i.fecha, motivo: "trivia", puntos }, { onConflict: "usuario_id,fecha,motivo", ignoreDuplicates: true });
  }
  return data[0] as Intento;
}

/** Vista para el cliente: la respuesta correcta SOLO se incluye cuando ya fue respondida. */
export function vista(i: Intento) {
  const base = { nivel: i.nivel, segundos_total: NIVELES[i.nivel].segundos, restante: segundosRestantes(i) };
  const preg = { pregunta: i.pregunta.pregunta, opciones: i.pregunta.opciones };
  if (!i.respondida) return { ...base, ...preg, respondida: false as const };
  return {
    ...base,
    ...preg,
    respondida: true as const,
    correcta: i.pregunta.correcta,
    elegida: i.elegida,
    acerto: !!i.acerto,
    puntos: i.puntos,
    explicacion: i.pregunta.explicacion,
    dato_curioso: i.pregunta.dato_curioso,
    evaluacion: i.evaluacion,
  };
}
