import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { obtenerRanking, obtenerRachaUsuario } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  const grupoId = session.grupo_id || 'grupo-familia-perez-001';
  const { searchParams } = new URL(req.url);
  const periodo = (searchParams.get('periodo') || 'total') as 'diario' | 'semanal' | 'total';

  const ranking = await obtenerRanking(grupoId, periodo);

  // Añadir racha a cada participante
  const rankingConRacha = await Promise.all(
    ranking.map(async (item) => {
      const racha = await obtenerRachaUsuario(item.usuario_id, grupoId);
      return {
        ...item,
        racha,
      };
    })
  );

  return NextResponse.json({
    periodo,
    ranking: rankingConRacha,
    miUsuarioId: session.id,
  });
}
