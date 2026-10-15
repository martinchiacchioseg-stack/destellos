import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { buscarGrupoPorId, buscarUsuarioPorId } from '@/lib/db';

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ authenticated: false, usuario: null }, { status: 401 });
  }

  const usuarioDb = await buscarUsuarioPorId(session.id);
  const grupo = session.grupo_id ? await buscarGrupoPorId(session.grupo_id) : null;

  return NextResponse.json({
    authenticated: true,
    usuario: {
      ...session,
      debe_cambiar_password: usuarioDb ? usuarioDb.debe_cambiar_password : session.debe_cambiar_password,
      grupo_nombre: grupo?.nombre || null,
      grupo_codigo: grupo?.codigo_invitacion || null,
    },
  });
}
