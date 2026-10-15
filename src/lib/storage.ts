import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

export function asegurarDirectorioUploads() {
  try {
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
  } catch (err) {
    console.error('Error asegurando directorio uploads:', err);
  }
}

/**
 * Recibe una URL o un string Base64 (data:image/... o data:video/...).
 * Si es Base64, decodifica y guarda el archivo en public/uploads/ y devuelve "/uploads/nombre.ext".
 * Si ya es una URL web (/uploads/... o https://...), lo devuelve intacto.
 */
export function procesarYGuardarMedia(dataUrlOrUrl: string, prefijo = 'media'): string {
  if (!dataUrlOrUrl || typeof dataUrlOrUrl !== 'string') return dataUrlOrUrl;

  // Si no es un Data URL base64, ya es una URL estática o remota
  if (!dataUrlOrUrl.startsWith('data:')) {
    return dataUrlOrUrl;
  }

  try {
    asegurarDirectorioUploads();

    const matches = dataUrlOrUrl.match(/^data:([A-Za-z0-9\-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return dataUrlOrUrl;
    }

    const mimeType = matches[1].toLowerCase();
    const base64Data = matches[2];

    let ext = 'jpg';
    if (mimeType.includes('png')) ext = 'png';
    else if (mimeType.includes('webp')) ext = 'webp';
    else if (mimeType.includes('gif')) ext = 'gif';
    else if (mimeType.includes('mp4')) ext = 'mp4';
    else if (mimeType.includes('quicktime')) ext = 'mov';
    else if (mimeType.includes('webm')) ext = 'webm';
    else if (mimeType.includes('svg')) ext = 'svg';

    const cleanPrefijo = prefijo.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 20);
    const filename = `${cleanPrefijo}-${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;
    const filePath = path.join(UPLOADS_DIR, filename);

    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(filePath, buffer);

    return `/uploads/${filename}`;
  } catch (err) {
    console.error('Error procesando y guardando media en disco:', err);
    return dataUrlOrUrl;
  }
}
