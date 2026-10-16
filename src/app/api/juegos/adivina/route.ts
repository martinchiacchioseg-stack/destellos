import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { guardarAdivinanzas, obtenerEstadoDiaGrupo, listarGrupos } from '@/lib/db';
import { getFechaArgentina } from '@/lib/date-utils';

export async function GET(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  let grupoId = session.grupo_id;
  if (!grupoId) {
    const grupos = await listarGrupos();
    if (grupos.length > 0) grupoId = grupos[0].id;
  }
  if (!grupoId) {
    return NextResponse.json({ error: 'Sin grupo asignado.' }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const fecha = searchParams.get('fecha') || getFechaArgentina();

  const data = await obtenerEstadoDiaGrupo(grupoId, fecha, session.id);
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    let grupoId = session.grupo_id;
    if (!grupoId) {
      const grupos = await listarGrupos();
      if (grupos.length > 0) grupoId = grupos[0].id;
    }
    if (!grupoId) {
      return NextResponse.json({ error: 'Sin grupo asignado.' }, { status: 400 });
    }

    const { fecha, asignaciones } = await req.json();

    if (!asignaciones || typeof asignaciones !== 'object' || Object.keys(asignaciones).length === 0) {
      return NextResponse.json({ error: 'Debés asignar un nombre a cada foto.' }, { status: 400 });
    }

    const fechaHoy = fecha || getFechaArgentina();

    const res = await guardarAdivinanzas(
      grupoId,
      session.id,
      fechaHoy,
      asignaciones
    );

    return NextResponse.json({
      mensaje: `¡Acertaste ${res.aciertos} foto(s) y sumaste +${res.puntosGanados} punto(s)! 🎯`,
      ...res,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error al guardar adivinanzas.' }, { status: 400 });
  }
}
