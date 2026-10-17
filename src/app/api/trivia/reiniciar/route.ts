import { api } from "@/lib/http";
import { db } from "@/lib/db";
import { requerirUsuario } from "@/lib/auth";
import { hoyAR } from "@/lib/fecha";
import { ApiError } from "@/lib/env";

/** [Superadmin] Reinicia el turno de hoy (y sus puntos) para poder volver a probar. */
export const POST = api(async () => {
  const { usuario, esSuper } = await requerirUsuario();
  if (!esSuper) throw new ApiError(403, "No autorizado.");
  const fecha = hoyAR();
  await db().from("trivia_intentos").delete().eq("usuario_id", usuario.id).eq("fecha", fecha);
  await db().from("puntos").delete().eq("usuario_id", usuario.id).eq("fecha", fecha).eq("motivo", "trivia");
  return { ok: true };
});
