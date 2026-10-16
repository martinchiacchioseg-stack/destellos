import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { obtenerMetricasSuperadmin } from '@/lib/db';

export async function GET() {
  const session = await getCurrentSession();
  if (!session || session.rol !== 'superadmin') {
    return NextResponse.json({ error: 'Acceso exclusivo para Superadmin.' }, { status: 403 });
  }

  const metricas = await obtenerMetricasSuperadmin();

  return NextResponse.json({
    ...metricas,
    superadminEmail: session.email,
  });
}
