import { NextRequest, NextResponse } from 'next/server';
import { cerrarDiaGrupo, listarGrupos } from '@/lib/db';
import { getFechaArgentina } from '@/lib/date-utils';

export async function GET(req: NextRequest) {
  const fechaHoy = getFechaArgentina();
  const grupos = await listarGrupos();

  const resultados = [];
  for (const g of grupos) {
    const res = await cerrarDiaGrupo(g.id, fechaHoy);
    resultados.push({ grupoId: g.id, ...res });
  }

  return NextResponse.json({
    ok: true,
    fecha: fechaHoy,
    totalGruposProcesados: grupos.length,
    resultados,
  });
}
