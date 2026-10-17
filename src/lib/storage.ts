import "server-only";
import sharp from "sharp";
import { randomUUID } from "crypto";
import { db, BUCKET } from "./db";
import { ApiError } from "./env";

const MAX_BYTES = 12 * 1024 * 1024;
const TIPOS = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

/** Valida, comprime con Sharp (máx 1600px, JPEG) y sube al bucket privado. Devuelve el path. */
export async function subirImagen(file: File, carpeta: "fotos" | "avatars" | "ads", maxPx = 1600): Promise<string> {
  if (!TIPOS.has(file.type)) throw new ApiError(400, "Formato de imagen no soportado. Usá JPG, PNG o WebP.");
  if (file.size > MAX_BYTES) throw new ApiError(400, "La imagen pesa demasiado (máximo 12 MB).");
  const entrada = Buffer.from(await file.arrayBuffer());
  let salida: Buffer;
  try {
    salida = await sharp(entrada)
      .rotate()
      .resize({ width: maxPx, height: maxPx, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
  } catch {
    throw new ApiError(400, "No pude leer esa imagen. Probá con otra.");
  }
  const path = `${carpeta}/${randomUUID()}.jpg`;
  await subirBuffer(path, salida, "image/jpeg");
  return path;
}

export async function subirBuffer(path: string, buf: Buffer, contentType: string) {
  const { error } = await db().storage.from(BUCKET).upload(path, buf, { contentType, upsert: true });
  if (error) throw new Error(`Storage: ${error.message}`);
}

export async function descargar(path: string): Promise<Buffer> {
  const { data, error } = await db().storage.from(BUCKET).download(path);
  if (error || !data) throw new Error(`Storage: ${error?.message ?? "sin datos"}`);
  return Buffer.from(await data.arrayBuffer());
}

export async function borrarArchivos(paths: (string | null | undefined)[]) {
  const limpios = paths.filter((p): p is string => !!p);
  if (limpios.length) await db().storage.from(BUCKET).remove(limpios);
}

/** URLs firmadas (1 h) para un lote de paths. Devuelve un mapa path → url. */
export async function firmar(paths: (string | null | undefined)[]): Promise<Record<string, string>> {
  const unicos = [...new Set(paths.filter((p): p is string => !!p))];
  if (!unicos.length) return {};
  const { data } = await db().storage.from(BUCKET).createSignedUrls(unicos, 3600);
  const mapa: Record<string, string> = {};
  for (const d of data ?? []) if (d.path && d.signedUrl) mapa[d.path] = d.signedUrl;
  return mapa;
}
