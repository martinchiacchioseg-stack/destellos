import { z } from "zod";
import { api, json } from "@/lib/http";
import { db, must } from "@/lib/db";
import { requerirUsuario } from "@/lib/auth";
import { hoyAR } from "@/lib/fecha";
import { resolver, vista, type Intento } from "@/lib/trivia-turno";
import { ApiError } from "@/lib/env";

export const POST = api(async (req: Request) => {
  const { usuario } = await requerirUsuario();
  const { opcion } = await json(req, z.object({ opcion: z.number().int().min(0).max(3).nullable() }));
  const fila = must(await db().from("trivia_intentos").select("*").eq("usuario_id", usuario.id).eq("fecha", hoyAR()).limit(1))?.[0] as Intento | undefined;
  if (!fila) throw new ApiError(404, "Primero elegí un nivel para empezar.");
  const i = await resolver(fila, usuario, opcion);
  return { intento: vista(i) };
});
