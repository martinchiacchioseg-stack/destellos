import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { cerrarDiaGrupo } from '@/lib/db';
import { getFechaArgentina, getAyerFechaArgentina } from '@/lib/date-utils';

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session || (session.rol !== 'admin' && session.rol !== 'superadmin')) {
      return NextResponse.json({ error: 'Acceso exclusivo para administradores.' }, { status: 403 });
    }

    const { grupoId, fecha } = await req.json();
    const targetGrupo = grupoId || session.grupo_id || 'grupo-familia-perez-001';
    const targetFecha = fecha || getFechaArgentina();

    const resultado = await cerrarDiaGrupo(targetGrupo, targetFecha);

    return NextResponse.json({
      ok: true,
      mensaje: '¡Día cerrado con éxito! Gemini eligió el Destello del Día y se sumaron los puntos.',
      resultado,
    });
  } catch (error: any) {
    console.error('Error cerrando día:', error);
    return NextResponse.json({ error: 'Error al evaluar y cerrar el día.' }, { status: 500 });
  }
}

export async function GET() {
  // Para pruebas rápidas desde el navegador o herramientas
  const fechaHoy = getFechaArgentina();
  const res = await cerrarDiaGrupo('grupo-familia-perez-001', fechaHoy);
  return NextResponse.json(res);
}
