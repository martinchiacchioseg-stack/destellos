import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { obtenerEstadoDiaGrupo, listarGrupos } from '@/lib/db';
import { getFechaArgentina, getTiempoRestanteCierre } from '@/lib/date-utils';

export async function GET() {
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
    return NextResponse.json({
      fase: 'subida',
      mi_destello: null,
      subieron: [],
      faltan: [],
      destellosParaAdivinar: [],
      yaAdivino: false,
      mensaje: 'Aún no pertenecés a ningún grupo.',
    });
  }

  const fechaHoy = getFechaArgentina();
  const estadoDia = await obtenerEstadoDiaGrupo(grupoId, fechaHoy, session.id);
  const tiempoRestante = getTiempoRestanteCierre();

  return NextResponse.json({
    fechaHoy,
    tiempoRestante,
    ...estadoDia,
  });
}
