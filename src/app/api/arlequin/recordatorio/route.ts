import { z } from "zod";
import { api, json } from "@/lib/http";
import { db, must } from "@/lib/db";
import { requerirUsuario } from "@/lib/auth";
import { decir } from "@/lib/gemini";
import { hoyAR } from "@/lib/fecha";
import { nombreCorto, soloDigitos } from "@/lib/usuarios";
import { ApiError } from "@/lib/env";
import type { Usuario } from "@/lib/types";

/** Texto con humor, listo para mandar por WhatsApp a quien todavía no subió su destello. */
export const POST = api(async (req: Request) => {
  const { usuario, grupo } = await requerirUsuario();
  const { usuarioId } = await json(req, z.object({ usuarioId: z.string().uuid() }));
  const dest = must(await db().from("usuarios").select("*").eq("id", usuarioId).eq("grupo_id", grupo.id).limit(1))?.[0] as Usuario | undefined;
  if (!dest) throw new ApiError(404, "No encontramos a esa persona en tu familia.");
  const subio = must(await db().from("destellos").select("id").eq("usuario_id", dest.id).eq("fecha", hoyAR()).limit(1));
  if (subio?.length) throw new ApiError(409, `${nombreCorto(dest)} ya subió su destello hoy 🎉`);

  const nombre = nombreCorto(dest);
  const texto =
    (await decir(
      `Escribí un recordatorio corto y gracioso para WhatsApp dirigido a ${nombre}, avisándole que falta subir su destello del día a Destellos antes de las ${grupo.hora_limite} hs. ` +
        `Lo manda ${nombreCorto(usuario)}. Máximo 3 frases, cariñoso y sin presionar.`,
    )) ?? `¡Hola ${nombre}! 🎭 Todavía falta tu destello de hoy. Subilo antes de las ${grupo.hora_limite} hs así brillamos todos juntos ✨`;
  const tel = dest.whatsapp ? soloDigitos(dest.whatsapp) : null;
  const url = `https://wa.me/${tel ?? ""}?text=${encodeURIComponent(texto)}`;
  return { texto, url, tieneWhatsapp: !!tel };
});
