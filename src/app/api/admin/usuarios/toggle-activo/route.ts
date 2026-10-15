import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { buscarUsuarioPorId } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session || (session.rol !== 'admin' && session.rol !== 'superadmin')) {
      return NextResponse.json({ error: 'Acceso no autorizado.' }, { status: 403 });
    }

    const { usuarioId } = await req.json();
    const usuario = await buscarUsuarioPorId(usuarioId);
    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 });
    }

    if (usuario.rol === 'superadmin') {
      return NextResponse.json({ error: 'No se puede desactivar al superadministrador.' }, { status: 400 });
    }

    usuario.activo = !usuario.activo;

    return NextResponse.json({
      ok: true,
      activo: usuario.activo,
      mensaje: `Usuario ${usuario.nombre} ${usuario.activo ? 'activado' : 'desactivado'}.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Error al cambiar estado de usuario.' }, { status: 500 });
  }
}
