import { z } from "zod";
import sharp from "sharp";
import { api } from "@/lib/http";
import { db } from "@/lib/db";
import { requerirUsuario } from "@/lib/auth";
import { hoyAR } from "@/lib/fecha";
import { subirFotoProcesada, borrarArchivos } from "@/lib/storage";
import { ApiError } from "@/lib/env";
import { PUNTOS } from "@/lib/types";
import { publicarArlequin } from "@/lib/pizarra";
import { nombreCorto, miembrosDelGrupo } from "@/lib/usuarios";
import { estamparSubtituloArlequin } from "@/lib/estampa";
import { jsonGemini } from "@/lib/gemini";
import { asegurarVeredicto } from "@/lib/veredicto";

const TITULOS_FALLBACK = [
  "Momento estelar de la familia que vale oro ✨",
  "Pura magia y sonrisa compartida 📸🎭",
  "Una joya fotográfica digna de concurso 🌟",
  "El destello que ilumina el día familiar 🏆",
  "Espontaneidad, alegría y mucho corazón ❤️",
  "El verdadero espíritu de la familia en una toma 👏",
];

export const POST = api(async (req: Request) => {
  const { usuario, grupo } = await requerirUsuario();
  const hoy = hoyAR();

  const fd = await req.formData();
  const foto = fd.get("foto");
  if (!(foto instanceof File) || foto.size === 0) {
    throw new ApiError(400, "Elegí una foto para subir.");
  }

  const desc = z
    .string()
    .trim()
    .max(200)
    .optional()
    .parse(typeof fd.get("descripcion") === "string" ? (fd.get("descripcion") as string) || undefined : undefined);

  const bufferEntrada = Buffer.from(await foto.arrayBuffer());

  // 1. Arlequín analiza y genera su devolución y subtítulo único
  let tituloArlequin = TITULOS_FALLBACK[Math.floor(Math.random() * TITULOS_FALLBACK.length)];
  let devolucionArlequin = `¡Qué fotón, ${nombreCorto(usuario)}! Arlequín ya le estampó su título oficial.`;

  try {
    const prompt = `
Actúa como Arlequín, el bufón cariñoso, cómico y maestro de ceremonias del juego familiar privado.
El integrante "${nombreCorto(usuario)}" acaba de subir una foto familiar con la siguiente descripción: "${desc || "Foto espontánea familiar"}".
Crea:
1. "titulo": Un subtítulo ingenioso, divertido, cariñoso o poético en español rioplatense (máximo 60 caracteres) para estampar en la parte inferior de la foto.
2. "devolucion": Una devolución de Arlequín en 1 o 2 oraciones hablándole a ${nombreCorto(usuario)} y a la familia con simpatía.

Responde únicamente en formato JSON:
{"titulo": "...", "devolucion": "..."}
`;
    const resGemini = await jsonGemini<{ titulo: string; devolucion: string }>(prompt, [
      { data: bufferEntrada, mime: foto.type || "image/jpeg" },
    ]);

    if (resGemini?.titulo && resGemini?.devolucion) {
      tituloArlequin = resGemini.titulo.slice(0, 75);
      devolucionArlequin = resGemini.devolucion.slice(0, 300);
    }
  } catch (err) {
    console.warn("[destellos] Fallback en devolución de Arlequín:", err);
  }

  // 2. Normalizar tamaño y estampar subtítulo de Arlequín físicamente sobre la foto
  let bufferProcesado: Buffer;
  try {
    const normalizada = await sharp(bufferEntrada)
      .rotate()
      .resize({ width: 1400, height: 1400, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 86 })
      .toBuffer();

    bufferProcesado = await estamparSubtituloArlequin(normalizada, tituloArlequin, nombreCorto(usuario));
  } catch (err) {
    console.error("[destellos] Error al procesar imagen con Sharp:", err);
    throw new ApiError(400, "No se pudo procesar la imagen.");
  }

  // 3. Subir al bucket privado
  const path = await subirFotoProcesada(bufferProcesado);

  // 4. Guardar en DB (fotos en cualquier momento permitidas)
  const ins = await db()
    .from("destellos")
    .insert({
      grupo_id: grupo.id,
      usuario_id: usuario.id,
      fecha: hoy,
      foto_path: path,
      descripcion: desc || null,
      titulo_arlequin: tituloArlequin,
      devolucion_arlequin: devolucionArlequin,
      subtitulo_impreso: true,
    })
    .select("id")
    .single();

  if (ins.error) {
    await borrarArchivos([path]);
    throw new Error(`DB: ${ins.error.message}`);
  }

  // 5. Puntos diarios de foto (primera del día)
  await db()
    .from("puntos")
    .upsert(
      { grupo_id: grupo.id, usuario_id: usuario.id, fecha: hoy, motivo: "foto", puntos: PUNTOS.foto },
      { onConflict: "usuario_id,fecha,motivo", ignoreDuplicates: true }
    );

  // 6. Publicar en la pizarra interactiva de Arlequín
  await publicarArlequin(
    grupo.id,
    `📸 Arlequín estampó en la foto de ${nombreCorto(usuario).toUpperCase()}: "${tituloArlequin}"`,
    "celeste"
  );

  // 7. Si ya subieron todos los integrantes de la familia, Arlequín elige la foto del día
  try {
    const [miembros, destellosHoy] = await Promise.all([
      miembrosDelGrupo(grupo.id),
      db().from("destellos").select("usuario_id").eq("grupo_id", grupo.id).eq("fecha", hoy),
    ]);

    const subieronSet = new Set((destellosHoy.data || []).map((d) => d.usuario_id));
    if (miembros.length > 0 && subieronSet.size >= miembros.length) {
      // Todos subieron: Arlequín corona la foto más bonita del día
      await asegurarVeredicto(grupo, hoy);
    }
  } catch (e) {
    console.warn("[destellos] Veredicto automático:", e);
  }

  return {
    ok: true,
    id: ins.data.id,
    tituloArlequin,
    devolucionArlequin,
    mensaje: `¡Foto recibida! Arlequín le imprimió el subtítulo: "${tituloArlequin}"`,
  };
});
