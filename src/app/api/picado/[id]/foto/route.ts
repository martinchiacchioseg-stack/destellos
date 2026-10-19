import { api } from "@/lib/http";
import { db } from "@/lib/db";
import { contexto } from "@/lib/auth";
import { ApiError } from "@/lib/env";
import { subirBuffer } from "@/lib/storage";
import { decir, jsonGemini } from "@/lib/gemini";
import type { Picado, FotoPostPartido } from "@/lib/types";

/**
 * POST /api/picado/[id]/foto
 * Subida de la foto obligatoria post-partido del tercer tiempo / vestuario.
 * La puede subir CUALQUIER jugador confirmado.
 * Dispara la evaluación de Arlequín en tono rioplatense futbolero.
 */
export const POST = api(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const c = await contexto();

  const { data: picado, error: errP } = await db()
    .from("picados")
    .select("*")
    .eq("id", id)
    .single();

  if (errP || !picado) throw new ApiError(404, "Picado no encontrado.");

  // Parsear multipart FormData
  const formData = await req.formData();
  const file = formData.get("foto") as File | null;
  const userNameManual = formData.get("uploader_name") as string | null;

  if (!file) throw new ApiError(400, "Falta adjuntar la foto del partido.");

  const uploaderId = c?.tipo === "usuario" ? c.usuario.id : "jugador-anon";
  const uploaderName =
    c?.tipo === "usuario"
      ? (c.usuario.apodo || c.usuario.nombre)
      : (userNameManual || "Jugador");

  // Subir imagen a Supabase Storage
  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split(".").pop() || "jpg";
  const storagePath = `picados/${id}-${Date.now()}.${ext}`;

  await subirBuffer(storagePath, buffer, file.type || "image/jpeg");

  // Llamar a Gemini para evaluar con tono futbolero de Arlequín
  let aiTitle = "¡Pura magia y piernas cansadas!";
  let aiVerdict =
    "Partido de alta intensidad. Se nota a la legua quién vino a dejar la vida y quién vino directo al tercer tiempo por las pizzas. ¡Salud al fútbol de los amigos!";

  try {
    const prompt =
      `Sos Arlequín, la IA anfitriona y bufón de TRIBOO. Analizá esta foto del equipo de fútbol 5 tras el partido ` +
      `(en el vestuario, la cancha o el tercer tiempo). Generá un veredicto hilarante y un título en tono rioplatense, ` +
      `muy futbolero y canchero, destacando el sudor, la gloria o las caras de cansancio extremo. ` +
      `Respondé en formato JSON con la siguiente estructura: {"titulo": "...", "veredicto": "..."}`;

    const resIa = await jsonGemini<{ titulo: string; veredicto: string }>(prompt, [
      { data: buffer, mime: file.type || "image/jpeg" },
    ]);

    if (resIa?.titulo && resIa?.veredicto) {
      aiTitle = resIa.titulo;
      aiVerdict = resIa.veredicto;
    }
  } catch (errIa) {
    console.warn("[picado:foto:ia]", errIa);
  }

  const postMatchPhoto: FotoPostPartido = {
    photo_url: storagePath,
    uploaded_by: uploaderId,
    uploader_name: uploaderName,
    ai_title: aiTitle,
    ai_verdict: aiVerdict,
    uploaded_at: new Date().toISOString(),
  };

  const { data: picadoActualizado, error: errUp } = await db()
    .from("picados")
    .update({
      foto_post_partido: postMatchPhoto,
      estado: "finalizado",
      actualizado_en: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (errUp) throw new Error(errUp.message);

  return { ok: true, picado: picadoActualizado };
});
