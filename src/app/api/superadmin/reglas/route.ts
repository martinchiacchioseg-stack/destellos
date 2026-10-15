import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { obtenerReglasGrupo, actualizarReglasGrupo, obtenerGrupoIdPorDefecto } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const grupoId = searchParams.get('grupoId') || (await obtenerGrupoIdPorDefecto());
  const reglas = await obtenerReglasGrupo(grupoId);
  return NextResponse.json({ reglas });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session || session.rol !== 'superadmin') {
      return NextResponse.json({ error: 'Acceso exclusivo de Superadmin.' }, { status: 403 });
    }

    const body = await req.json();
    const { grupoId, ...data } = body;
    const targetGrupo = grupoId || (await obtenerGrupoIdPorDefecto());

    const actualizadas = await actualizarReglasGrupo(targetGrupo, data);
    return NextResponse.json({
      ok: true,
      mensaje: 'Reglas actualizadas con éxito.',
      reglas: actualizadas,
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Error al actualizar reglas.' }, { status: 500 });
  }
}
