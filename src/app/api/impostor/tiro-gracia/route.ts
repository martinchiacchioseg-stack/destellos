import { z } from "zod";
import { api, json } from "@/lib/http";
import { requerirUsuario } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApiError } from "@/lib/env";
import { ejecutarTiroDeGracia } from "@/lib/impostor";

const BodyTiro = z.object({
  intento: z.string().trim().min(1, "Escribí tu intento.").max(40, "Máximo 40 caracteres."),
});

export const POST = api(async (req: Request) => {
  const { usuario, grupo } = await requerirUsuario();
  const b = await json(req, BodyTiro);

  const { data: partida } = await db()
    .from("impostor_partidas")
    .select("id, estado")
    .eq("grupo_id", grupo.id)
    .order("creado_en", { ascending: false })
    .limit(1)
    .single();

  if (!partida) {
    throw new ApiError(404, "No hay partida activa.");
  }

  const res = await ejecutarTiroDeGracia(partida.id, usuario.id, b.intento);
  return res;
});
