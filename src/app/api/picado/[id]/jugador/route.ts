import { z } from "zod";
import { api, json } from "@/lib/http";
import { db, must } from "@/lib/db";
import { contexto } from "@/lib/auth";
import { ApiError } from "@/lib/env";
import type { Picado, JugadorPicado } from "@/lib/types";

const AccionJugador = z.object({
  accion: z.enum(["juego", "me_bajo", "marcar_pago"]),
  user_id: z.string().optional(),
  name: z.string().trim().min(1).max(50).optional(),
  reason_declined: z.string().trim().max(50).optional(),
  target_user_id: z.string().optional(), // Para marcar pago de un compañero
  token_tribu: z.string().optional(),
});

/**
 * Recalcula la lista de jugadores y el estado del picado:
 * - Los primeros N confirmados son titulares (is_substitute = false).
 * - Del N+1 en adelante confirmados son suplentes (is_substitute = true).
 * - Los dados de baja quedan con status: 'declined'.
 * - Si hay cupo lleno (confirmados >= N), estado: 'lista_completa', si no 'convocatoria_abierta'.
 */
export function recalcularListaYEstado(
  jugadores: JugadorPicado[],
  limite: number,
  estadoActual: string
): { jugadores: JugadorPicado[]; nuevoEstado: string } {
  const confirmados = jugadores.filter((j) => j.status === "confirmed");
  const bajados = jugadores.filter((j) => j.status === "declined");

  // Ordenar confirmados por timestamp para respetar riguroso orden de llegada
  confirmados.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Asignar titulares y suplentes
  confirmados.forEach((j, idx) => {
    j.is_substitute = idx >= limite;
  });

  const nuevaLista = [...confirmados, ...bajados];

  let nuevoEstado = estadoActual;
  if (estadoActual === "convocatoria_abierta" || estadoActual === "lista_completa") {
    nuevoEstado = confirmados.length >= limite ? "lista_completa" : "convocatoria_abierta";
  }

  return { jugadores: nuevaLista, nuevoEstado };
}

/**
 * POST /api/picado/[id]/jugador
 * Maneja '👍 ¡Juego!', '👎 Me bajo' (con promoción automática de suplentes) y '💸 Marcar Pago'.
 */
export const POST = api(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const b = await json(req, AccionJugador);
  const c = await contexto();

  // Obtener picado
  const { data: picado, error: errP } = await db()
    .from("picados")
    .select("*")
    .eq("id", id)
    .single();

  if (errP || !picado) throw new ApiError(404, "Picado no encontrado.");

  // Identificar jugador
  let userId = c?.tipo === "usuario" ? c.usuario.id : b.user_id;
  let userName = c?.tipo === "usuario" ? (c.usuario.apodo || c.usuario.nombre) : b.name;

  if (!userId) {
    if (b.name) {
      userId = `guest-${b.name.toLowerCase().replace(/\s+/g, "-")}`;
    } else {
      throw new ApiError(400, "Falta identificar tu nombre de jugador.");
    }
  }

  let jugadores: JugadorPicado[] = (picado.jugadores as JugadorPicado[]) || [];
  const index = jugadores.findIndex((j) => j.user_id === userId);

  const ahora = new Date().toISOString();

  if (b.accion === "juego") {
    if (index >= 0) {
      jugadores[index].status = "confirmed";
      jugadores[index].reason_declined = undefined;
      jugadores[index].name = userName || jugadores[index].name;
      // Actualizamos timestamp para que si se bajó y vuelve a subir, respete la cola
      jugadores[index].timestamp = ahora;
    } else {
      jugadores.push({
        user_id: userId,
        name: userName || "Jugador",
        status: "confirmed",
        is_substitute: false,
        paid: false,
        timestamp: ahora,
      });
    }
  } else if (b.accion === "me_bajo") {
    if (index >= 0) {
      jugadores[index].status = "declined";
      jugadores[index].reason_declined = b.reason_declined?.slice(0, 50) || "Se bajó";
      jugadores[index].is_substitute = false;
    } else {
      jugadores.push({
        user_id: userId,
        name: userName || "Jugador",
        status: "declined",
        reason_declined: b.reason_declined?.slice(0, 50) || "Se bajó",
        is_substitute: false,
        paid: false,
        timestamp: ahora,
      });
    }
  } else if (b.accion === "marcar_pago") {
    const targetId = b.target_user_id || userId;
    const targetIdx = jugadores.findIndex((j) => j.user_id === targetId);
    if (targetIdx >= 0) {
      jugadores[targetIdx].paid = !jugadores[targetIdx].paid;
    }
  }

  // Recalcular titulares y suplentes con promoción automática
  const { jugadores: listaActualizada, nuevoEstado } = recalcularListaYEstado(
    jugadores,
    picado.limite_jugadores,
    picado.estado
  );

  const { data: actualizado, error: errUp } = await db()
    .from("picados")
    .update({
      jugadores: listaActualizada,
      estado: nuevoEstado,
      actualizado_en: ahora,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (errUp) throw new Error(errUp.message);

  return { picado: actualizado };
});
