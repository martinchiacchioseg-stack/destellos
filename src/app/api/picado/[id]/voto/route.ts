import { z } from "zod";
import { api, json } from "@/lib/http";
import { db } from "@/lib/db";
import { contexto } from "@/lib/auth";
import { ApiError } from "@/lib/env";
import type { Picado, VotoMVP } from "@/lib/types";

const VotoSchema = z.object({
  voter_id: z.string().optional(),
  voted_mvp_id: z.string().min(1, "Elegí la figura del partido."),
  voted_rusty_id: z.string().min(1, "Elegí el rústico o pecho frío."),
});

/**
 * POST /api/picado/[id]/voto
 * Registra los votos de Figura (MVP) y Rústico/Pecho Frío de la jornada.
 */
export const POST = api(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const c = await contexto();
  const b = await json(req, VotoSchema);

  const { data: picado, error: errP } = await db()
    .from("picados")
    .select("*")
    .eq("id", id)
    .single();

  if (errP || !picado) throw new ApiError(404, "Picado no encontrado.");

  const voterId = c?.tipo === "usuario" ? c.usuario.id : (b.voter_id || "voter-anon");

  let votos: VotoMVP[] = (picado.votos_mvp as VotoMVP[]) || [];

  // Evitar duplicar voto del mismo usuario
  votos = votos.filter((v) => v.voter_id !== voterId);
  votos.push({
    voter_id: voterId,
    voted_mvp_id: b.voted_mvp_id,
    voted_rusty_id: b.voted_rusty_id,
    timestamp: new Date().toISOString(),
  });

  const { data: actualizado, error: errUp } = await db()
    .from("picados")
    .update({
      votos_mvp: votos,
      actualizado_en: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (errUp) throw new Error(errUp.message);

  return { ok: true, picado: actualizado };
});
