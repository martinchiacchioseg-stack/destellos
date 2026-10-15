import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { resetearPassword, buscarUsuarioPorId } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session || (session.rol !== 'admin' && session.rol !== 'superadmin')) {
      return NextResponse.json({ error: 'Acceso no autorizado.' }, { status: 403 });
    }

    const body = await req.json();
    const { usuarioId, nuevaPasswordTemporal } = body;

    if (!usuarioId || !nuevaPasswordTemporal) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos.' },
        { status: 400 }
      );
    }

    if (nuevaPasswordTemporal.length < 6) {
      return NextResponse.json(
        { error: 'La nueva contraseña temporal debe tener al menos 6 caracteres.' },
        { status: 400 }
      );
    }

    const usuario = await buscarUsuarioPorId(usuarioId);
    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 });
    }

    // Un admin solo puede resetear usuarios de su propio grupo (a menos que sea superadmin)
    if (session.rol === 'admin' && usuario.grupo_id !== session.grupo_id) {
      return NextResponse.json({ error: 'No podés resetear usuarios de otro grupo.' }, { status: 403 });
    }

    await resetearPassword(usuarioId, nuevaPasswordTemporal);

    return NextResponse.json({
      ok: true,
      mensaje: `Contraseña de ${usuario.nombre} reseteada con éxito. Se le solicitará cambio obligatorio en su próximo acceso.`,
    });
  } catch (error: any) {
    console.error('Error en /api/admin/usuarios/reset-password:', error);
    return NextResponse.json({ error: 'Error al resetear contraseña.' }, { status: 500 });
  }
}
