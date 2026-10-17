import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession, checkRateLimit } from '@/lib/auth';
import { subirDestello, dispararEventoPizarraArlequin } from '@/lib/db';
import { getFechaArgentina } from '@/lib/date-utils';
import { procesarYSanitizarImagen } from '@/lib/image-processor';
import { moderarContenido } from '@/lib/gemini';
import fs from 'fs';
import path from 'path';
import os from 'os';

const isVercel = process.env.VERCEL === '1' || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);
const UPLOADS_DIR = isVercel
  ? path.join(os.tmpdir(), 'destellos-uploads')
  : path.join(process.cwd(), 'public', 'uploads');

function asegurarUploadsDir() {
  try {
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
  } catch {}
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    if (!session.grupo_id) {
      return NextResponse.json({ error: 'No pertenecés a ningún grupo activo.' }, { status: 400 });
    }

    // Rate Limiting
    const rateCheck = checkRateLimit(`upload:${session.id}`, 10, 60);
    if (!rateCheck.permitido) {
      return NextResponse.json(
        { error: `Demasiados intentos de subida. Esperá ${rateCheck.segundosRestantes} segundos.` },
        { status: 429 }
      );
    }

    const fechaHoy = getFechaArgentina();
    const body = await req.json().catch(() => ({}));
    const { media_url, pie_de_foto } = body;

    if (!media_url) {
      return NextResponse.json({ error: 'La foto es obligatoria.' }, { status: 400 });
    }

    // Moderación previa de texto con Gemini
    if (pie_de_foto) {
      const moderacion = await moderarContenido(pie_de_foto);
      if (!moderacion.esApto) {
        return NextResponse.json(
          { error: `Contenido no permitido: ${moderacion.motivo || 'Lenguaje inapropiado.'}` },
          { status: 422 }
        );
      }
    }

    // Procesamiento y sanitización con sharp
    asegurarUploadsDir();
    let finalMediaUrl = media_url;

    if (typeof media_url === 'string' && media_url.startsWith('data:image/')) {
      const mimeMatch = media_url.match(/^data:(image\/[a-zA-Z+]+);base64,/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
      const base64Data = media_url.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');
      const rawBuffer = Buffer.from(base64Data, 'base64');

      // Sanitiza EXIF (GPS) y redimensiona a max 1600px
      const procesado = await procesarYSanitizarImagen(rawBuffer, mimeType);

      const filename = `destello-${session.id}-${Date.now()}.jpg`;
      const filePath = path.join(UPLOADS_DIR, filename);
      fs.writeFileSync(filePath, procesado.buffer);

      finalMediaUrl = `/uploads/${filename}`;
    }

    const destelloGuardado = await subirDestello({
      grupo_id: session.grupo_id,
      usuario_id: session.id,
      fecha: fechaHoy,
      media_url: finalMediaUrl,
      pie_de_foto: pie_de_foto?.trim(),
    });

    // Notificar en Pizarra LED (respetando rate-limit de 10 min de Arlequín)
    dispararEventoPizarraArlequin({
      tipo: 'foto',
      grupoId: session.grupo_id,
      metadata: {
        usuarioNombre: session.apodo || session.nombre,
      },
    }).catch(() => {});

    return NextResponse.json({
      ok: true,
      mensaje: '¡Tu destello fue subido con éxito! (+10 pts)',
      destello: destelloGuardado,
    });
  } catch (error: any) {
    console.error('Error en /api/destellos/subir:', error);
    return NextResponse.json(
      { error: error?.message || 'Error al procesar la foto.' },
      { status: 500 }
    );
  }
}
