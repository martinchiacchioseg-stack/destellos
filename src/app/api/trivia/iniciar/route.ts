import { z } from "zod";
import { api, json } from "@/lib/http";
import { db } from "@/lib/db";
import { requerirUsuario } from "@/lib/auth";
import { hoyAR } from "@/lib/fecha";
import { generarPregunta } from "@/lib/trivia";
import { vista, type Intento } from "@/lib/trivia-turno";
import { ApiError } from "@/lib/env";

/** Elige nivel y consume el único turno del día (refrescar la página no da otra chance). */
export const POST = api(async (req: Request) => {
  const { usuario, grupo } = await requerirUsuario();
  const { nivel } = await json(req, z.object({ nivel: z.enum(["facil", "medio", "experto"]) }));
  const pregunta = await generarPregunta(nivel);
  const ins = await db()
    .from("trivia_intentos")
    .insert({ grupo_id: grupo.id, usuario_id: usuario.id, fecha: hoyAR(), nivel, pregunta })
    .select("*")
    .single();
  if (ins.error) {
    if (ins.error.code === "23505") throw new ApiError(409, "Hoy ya jugaste tu trivia. ¡Volvé mañana a las 00:00! 🎭");
    throw new Error(`DB: ${ins.error.message}`);
  }
  return { intento: vista(ins.data as Intento) };
});
