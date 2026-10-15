import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { obtenerDestelloUsuarioDia, listarDestellosDia, obtenerGrupoIdPorDefecto } from '@/lib/db';
import { getFechaArgentina, getTiempoRestanteCierre } from '@/lib/date-utils';

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  const grupoId = session.grupo_id || (await obtenerGrupoIdPorDefecto());
  const fechaHoy = getFechaArgentina();

  // 1. Destello propio de hoy (si ya subió)
  const miDestello = await obtenerDestelloUsuarioDia(grupoId, session.id, fechaHoy);

  // 2. Destellos de todos los miembros del grupo hoy
  const destellosGrupo = await listarDestellosDia(grupoId, fechaHoy);

  // 3. Tiempo restante para el cierre
  const tiempoRestante = getTiempoRestanteCierre();

  return NextResponse.json({
    fechaHoy,
    miDestello,
    destellosGrupo,
    tiempoRestante,
  });
}
