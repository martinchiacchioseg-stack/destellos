import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { obtenerRankingGrupo, listarGrupos } from '@/lib/db';

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
    return NextResponse.json({ ranking: [], periodo: 'total' });
  }

  const { searchParams } = new URL(req.url);
  const periodo = (searchParams.get('periodo') || 'total') as 'semanal' | 'mensual' | 'total';

  const ranking = await obtenerRankingGrupo(grupoId, periodo, session.id);

  return NextResponse.json({
    periodo,
    ranking,
    miUsuarioId: session.id,
  });
}
