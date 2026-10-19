import { z } from "zod";
import { api, json } from "@/lib/http";
import { requerirUsuario } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApiError } from "@/lib/env";

const BodyVoto = z.object({
  sospechosoId: z.string().uuid("ID de sospechoso inválido."),
});

export const POST = api(async (req: Request) => {
  const { usuario, grupo } = await requerirUsuario();
  const b = await json(req, BodyVoto);

  // 1. Prohibido autovotarse
  if (b.sospechosoId === usuario.id) {
    throw new ApiError(400, "¡No podés votarte a vos mismo!");
  }

  // 2. Obtener la partida activa
  const { data: partida } = await db()
    .from("impostor_partidas")
    .select("*")
    .eq("grupo_id", grupo.id)
    .order("creado_en", { ascending: false })
    .limit(1)
    .single();

  if (!partida) {
    throw new ApiError(404, "No hay una ronda de El Impostor activa hoy.");
  }

  if (partida.estado !== "fase_2_votacion") {
    throw new ApiError(400, "La fase de votación no está activa en este momento.");
  }

  // 3. Verificar que el sospechoso pertenezca a la partida
  const { data: sospechoso } = await db()
    .from("impostor_jugadores")
    .select("id, usuario_id")
    .eq("partida_id", partida.id)
    .eq("usuario_id", b.sospechosoId)
    .single();

  if (!sospechoso) {
    throw new ApiError(404, "El sospechoso no forma parte de esta partida.");
  }

  // 4. Registrar o actualizar voto (se puede cambiar hasta las 22:00)
  const { error } = await db()
    .from("impostor_jugadores")
    .update({
      voto_sospechoso_id: b.sospechosoId,
      voto_enviado_at: new Date().toISOString(),
    })
    .eq("partida_id", partida.id)
    .eq("usuario_id", usuario.id);

  if (error) {
    throw new ApiError(500, `Error al registrar voto: ${error.message}`);
  }

  return {
    ok: true,
    mensaje: "¡Voto secreto registrado con éxito! Podés cambiarlo hasta las 22:00 hs.",
    sospechosoId: b.sospechosoId,
  };
});
