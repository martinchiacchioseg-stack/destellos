import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { buscarGrupoPorId, buscarUsuarioPorId } from '@/lib/db';

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ authenticated: false, usuario: null }, { status: 401 });
    }

    let usuarioDb = null;
    try {
      usuarioDb = await buscarUsuarioPorId(session.id);
    } catch {}

    const actualGrupoId = usuarioDb?.grupo_id || session.grupo_id;
    let grupo = null;
    if (actualGrupoId) {
      try {
        grupo = await buscarGrupoPorId(actualGrupoId);
      } catch {}
    }

    return NextResponse.json({
      authenticated: true,
      usuario: {
        ...session,
        grupo_id: actualGrupoId,
        debe_cambiar_password: usuarioDb ? usuarioDb.debe_cambiar_password : false,
        grupo_nombre: grupo?.nombre || null,
        grupo_codigo: grupo?.codigo_invitacion || null,
      },
    });
  } catch (err) {
    console.error('Error en /api/auth/me:', err);
    return NextResponse.json({ authenticated: false, usuario: null }, { status: 401 });
  }
}
