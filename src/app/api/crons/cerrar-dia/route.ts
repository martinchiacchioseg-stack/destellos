import { NextRequest, NextResponse } from 'next/server';
import { resolverDiaGrupo, listarGrupos } from '@/lib/db';
import { getFechaArgentina } from '@/lib/date-utils';

export async function GET(req: NextRequest) {
  // Verificación opcional de CRON_SECRET de Vercel
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // Si no coincide y estamos en producción, protegemos
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }
  }

  const fechaHoy = getFechaArgentina();
  const grupos = await listarGrupos();

  const resultados = [];
  for (const g of grupos) {
    if (g.estado === 'activo') {
      const res = await resolverDiaGrupo(g.id, fechaHoy);
      resultados.push({ grupoId: g.id, ...res });
    }
  }

  return NextResponse.json({
    ok: true,
    fecha: fechaHoy,
    totalGruposProcesados: grupos.length,
    resultados,
  });
}
