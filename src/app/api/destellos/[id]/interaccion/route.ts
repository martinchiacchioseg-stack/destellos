import { z } from "zod";
import { api, json } from "@/lib/http";
import { db, must } from "@/lib/db";
import { requerirUsuario } from "@/lib/auth";
import { ApiError } from "@/lib/env";

const EMOJIS = ["❤️", "😂", "😍", "👏", "🔥", "🥹"];

async function destelloDelGrupo(id: string, grupoId: string) {
  const d = must(await db().from("destellos").select("id").eq("id", id).eq("grupo_id", grupoId).limit(1))?.[0];
  if (!d) throw new ApiError(404, "No encontramos ese destello.");
}

/** Reacción (una por persona; null la quita) o comentario. El destello debe ser del grupo de la sesión. */
export const POST = api(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const { usuario, grupo } = await requerirUsuario();
  const b = await json(
    req,
    z.union([
      z.object({ emoji: z.string().nullable() }),
      z.object({ comentario: z.string().trim().min(1, "Escribí algo.").max(300) }),
    ]),
  );
  await destelloDelGrupo(id, grupo.id);

  if ("emoji" in b) {
    if (b.emoji === null) {
      await db().from("reacciones").delete().eq("destello_id", id).eq("usuario_id", usuario.id);
    } else {
      if (!EMOJIS.includes(b.emoji)) throw new ApiError(400, "Reacción inválida.");
      must(await db().from("reacciones").upsert({ destello_id: id, usuario_id: usuario.id, emoji: b.emoji }, { onConflict: "destello_id,usuario_id" }));
    }
  } else {
    must(await db().from("comentarios").insert({ destello_id: id, usuario_id: usuario.id, texto: b.comentario }));
  }
  return { ok: true };
});
