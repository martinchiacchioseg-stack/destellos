import { api } from "@/lib/http";
import { db, must } from "@/lib/db";
import { requerirUsuario } from "@/lib/auth";
import { hoyAR } from "@/lib/fecha";
import { resolver, vencido, vista, type Intento } from "@/lib/trivia-turno";

/** Estado de la trivia de hoy. Si el tiempo de un intento abierto ya venció, se cierra como "tiempo agotado". */
export const GET = api(async () => {
  const { usuario, esSuper } = await requerirUsuario();
  const fila = must(await db().from("trivia_intentos").select("*").eq("usuario_id", usuario.id).eq("fecha", hoyAR()).limit(1))?.[0] as Intento | undefined;
  if (!fila) return { jugada: false, puedeReiniciar: esSuper };
  const intento = !fila.respondida && vencido(fila) ? await resolver(fila, usuario, null) : fila;
  return { jugada: true, intento: vista(intento), puedeReiniciar: esSuper };
});
