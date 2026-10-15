import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { obtenerFotosParaAdivinar, registrarAdivinanzas, obtenerGrupoIdPorDefecto } from '@/lib/db';
import { getFechaArgentina, getAyerFechaArgentina } from '@/lib/date-utils';

export async function GET(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  const grupoId = session.grupo_id || (await obtenerGrupoIdPorDefecto());
  const { searchParams } = new URL(req.url);
  // Por defecto se juega con las de hoy o ayer
  const fecha = searchParams.get('fecha') || getAyerFechaArgentina();

  const data = await obtenerFotosParaAdivinar(grupoId, fecha, session.id);
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    const grupoId = session.grupo_id || (await obtenerGrupoIdPorDefecto());
    const { fecha, respuestas } = await req.json();

    if (!respuestas || !Array.isArray(respuestas) || respuestas.length === 0) {
      return NextResponse.json({ error: 'Faltan respuestas para evaluar.' }, { status: 400 });
    }

    const res = await registrarAdivinanzas(
      grupoId,
      fecha || getAyerFechaArgentina(),
      session.id,
      respuestas
    );

    return NextResponse.json({
      ok: true,
      mensaje: `¡Acertaste ${res.aciertos} foto(s) y sumaste +${res.puntosGanados} punto(s)! 🎯`,
      ...res,
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Error al registrar adivinanzas.' }, { status: 500 });
  }
}
