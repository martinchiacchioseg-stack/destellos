import { z } from "zod";
import { api, json } from "@/lib/http";
import { requerirUsuario } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApiError } from "@/lib/env";
import {
  obtenerOIniciarRondaHoy,
  transicionarAFase2,
  transicionarAFase3,
} from "@/lib/impostor";

const BodyAvance = z.object({
  accion: z.enum(["iniciar", "avanzar_fase_2", "avanzar_fase_3", "reiniciar"]),
});

export const POST = api(async (req: Request) => {
  const { usuario, grupo, esSuper } = await requerirUsuario();
  const esAdmin = usuario.rol === "admin" || esSuper;

  if (!esAdmin) {
    throw new ApiError(403, "Solo el administrador del grupo puede acelerar fases en modo de prueba.");
  }

  const b = await json(req, BodyAvance);

  // 1. REINICIAR (Borrar la partida de hoy para volver a empezar desde cero)
  if (b.accion === "reiniciar") {
    const { data: hoyPartida } = await db()
      .from("impostor_partidas")
      .select("id")
      .eq("grupo_id", grupo.id)
      .order("creado_en", { ascending: false })
      .limit(1)
      .single();

    if (hoyPartida) {
      await db().from("impostor_partidas").delete().eq("id", hoyPartida.id);
    }

    return { ok: true, mensaje: "Partida de hoy reiniciada por completo." };
  }

  // 2. INICIAR (Forzar creación de ronda si no existe)
  if (b.accion === "iniciar") {
    const res = await obtenerOIniciarRondaHoy(grupo.id);
    return { ok: true, mensaje: "Ronda iniciada (Fase 1: Pistas a ciegas)", partida: res.partida };
  }

  // Obtener la partida actual
  const { data: partida } = await db()
    .from("impostor_partidas")
    .select("id, estado")
    .eq("grupo_id", grupo.id)
    .order("creado_en", { ascending: false })
    .limit(1)
    .single();

  if (!partida) {
    throw new ApiError(404, "No hay partida activa para avanzar. Primero tocalo en 'Iniciar Ronda'.");
  }

  // 3. AVANZAR A FASE 2
  if (b.accion === "avanzar_fase_2") {
    // Si el impostor no tiene pista para la prueba, le ponemos una pista ficticia para que no se cancele salvo que se quiera
    const res = await transicionarAFase2(partida.id);
    return {
      ok: true,
      mensaje: res.cancelada
        ? `Ronda cancelada automáticamente: ${res.motivo}`
        : "¡Avanzado con éxito a Fase 2 (Votación y Muro destapado)!",
      estado: res.estado,
    };
  }

  // 4. AVANZAR A FASE 3
  if (b.accion === "avanzar_fase_3") {
    const res = await transicionarAFase3(partida.id);
    return {
      ok: true,
      mensaje: `¡Avanzado con éxito a Fase 3 (Veredicto y Puntos)! Ganador: ${res.ganador.toUpperCase()}`,
      resultado: res,
    };
  }

  throw new ApiError(400, "Acción desconocida.");
});
