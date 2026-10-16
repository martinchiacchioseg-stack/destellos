import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

const LOCAL_UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');
const TMP_UPLOADS_DIR = path.join(os.tmpdir(), 'destellos-uploads');

const MIME_MAP: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;

    // Sanitizar nombre de archivo para evitar Directory Traversal
    const safeFilename = path.basename(filename);
    let filePath = path.join(LOCAL_UPLOADS_DIR, safeFilename);

    if (!fs.existsSync(filePath)) {
      filePath = path.join(TMP_UPLOADS_DIR, safeFilename);
    }

    if (!fs.existsSync(filePath)) {
      return new NextResponse('Archivo no encontrado', { status: 404 });
    }

    const ext = path.extname(safeFilename).toLowerCase();
    const contentType = MIME_MAP[ext] || 'application/octet-stream';
    const buffer = fs.readFileSync(filePath);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        // Cache inmutable para máxima velocidad: el navegador nunca vuelve a descargarlo
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error al servir archivo upload:', error);
    return new NextResponse('Error al servir archivo', { status: 500 });
  }
}
