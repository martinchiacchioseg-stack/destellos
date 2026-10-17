import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { listarMensajesPizarra, limpiarMensajesPizarraVencidos } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    // Limpiar vencidos de fondo
    limpiarMensajesPizarraVencidos().catch(() => {});

    const grupoId = session?.grupo_id || undefined;
    const mensajes = await listarMensajesPizarra(grupoId, true);

    return NextResponse.json({
      ok: true,
      mensajes,
    });
  } catch (error: any) {
    console.error('Error en GET /api/board/mensajes:', error);
    return NextResponse.json({ error: 'Error al obtener mensajes de la pizarra.' }, { status: 500 });
  }
}
