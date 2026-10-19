import { api } from "@/lib/http";
import { requerirUsuario } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApiError } from "@/lib/env";
import { subirImagen } from "@/lib/storage";

export const POST = api(async (req: Request) => {
  const { usuario, grupo } = await requerirUsuario();

  // 1. Obtener la partida activa de hoy
  const { data: partida } = await db()
    .from("impostor_partidas")
    .select("*")
    .eq("grupo_id", grupo.id)
    .order("creado_en", { ascending: false })
    .limit(1)
    .single();

  if (!partida) {
    throw new ApiError(404, "No hay una ronda de El Impostor activa hoy.");
  }

  if (partida.estado !== "fase_1_pistas") {
    throw new ApiError(400, "La fase de envío de pistas ya cerró para esta ronda.");
  }

  // 2. Parsear FormData o JSON
  const contentType = req.headers.get("content-type") || "";
  let textoPista = "";
  let fotoUrl: string | null = null;

  if (contentType.includes("multipart/form-data")) {
    const fd = await req.formData();
    textoPista = ((fd.get("pista") as string) || "").trim();
    const archivoFoto = fd.get("foto") as File | null;

    if (archivoFoto && archivoFoto.size > 0) {
      try {
        const pathFoto = await subirImagen(archivoFoto, "fotos");
        const { data: publicUrlData } = db().storage.from("destellos").getPublicUrl(pathFoto);
        fotoUrl = publicUrlData?.publicUrl || null;
      } catch (e) {
        console.warn("[impostor:pista] Error subiendo imagen:", e);
      }
    }
  } else {
    const body = await req.json();
    textoPista = (body.pista || "").trim();
    fotoUrl = body.fotoUrl || null;
  }

  if (!textoPista || textoPista.length < 1) {
    throw new ApiError(400, "Debés ingresar una pista de texto (máx 80 caracteres).");
  }

  if (textoPista.length > 80) {
    throw new ApiError(400, "La pista no puede superar los 80 caracteres.");
  }

  // 3. Actualizar registro del jugador
  const { error } = await db()
    .from("impostor_jugadores")
    .update({
      pista_texto: textoPista,
      pista_foto_url: fotoUrl,
      pista_enviada_at: new Date().toISOString(),
    })
    .eq("partida_id", partida.id)
    .eq("usuario_id", usuario.id);

  if (error) {
    throw new ApiError(500, `Error al guardar pista: ${error.message}`);
  }

  return {
    ok: true,
    mensaje: "¡Tu pista fue guardada con éxito en secreto!",
    pista: textoPista,
    fotoUrl,
  };
});
