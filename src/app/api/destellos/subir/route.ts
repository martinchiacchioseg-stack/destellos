import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { guardarOActualizarDestello, obtenerDestelloUsuarioDia, obtenerGrupoIdPorDefecto } from '@/lib/db';
import { getFechaArgentina, getHoraArgentina } from '@/lib/date-utils';

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    const grupoId = session.grupo_id || (await obtenerGrupoIdPorDefecto());
    const fechaHoy = getFechaArgentina();

    // Comprobamos si el día ya cerró (después de las 23:59:59)
    const { hora, minuto } = getHoraArgentina();
    if (hora === 23 && minuto >= 59) {
      return NextResponse.json(
        { error: 'El día ya cerró por hoy. ¡Esperá hasta mañana para subir tu nuevo destello!' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { media_url, thumbnail_url, tipo_media, pie_de_foto } = body;

    if (!media_url || !tipo_media) {
      return NextResponse.json(
        { error: 'El archivo de foto o video es obligatorio.' },
        { status: 400 }
      );
    }

    const previo = await obtenerDestelloUsuarioDia(grupoId, session.id, fechaHoy);
    const esActualizacion = Boolean(previo);

    const destelloGuardado = await guardarOActualizarDestello({
      grupo_id: grupoId,
      usuario_id: session.id,
      fecha: fechaHoy,
      media_url,
      thumbnail_url: thumbnail_url || media_url,
      tipo_media,
      pie_de_foto: pie_de_foto?.trim(),
      cumple_reto: false, // Se evaluará con Gemini en Etapa 3/4
    });

    return NextResponse.json({
      ok: true,
      mensaje: esActualizacion
        ? '¡Tu destello de hoy fue actualizado con éxito! ✨'
        : '¡Tu destello de hoy fue publicado y sumaste +1 punto! 📸✨',
      destello: destelloGuardado,
    });
  } catch (error: any) {
    console.error('Error en /api/destellos/subir:', error);
    return NextResponse.json(
      { error: 'Ocurrió un error al guardar tu destello.' },
      { status: 500 }
    );
  }
}
