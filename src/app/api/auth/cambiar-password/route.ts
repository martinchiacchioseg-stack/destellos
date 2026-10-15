import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession, verifyPassword, createSessionToken, setSessionCookie } from '@/lib/auth';
import { buscarUsuarioPorId, actualizarPassword } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json(
        { error: 'No has iniciado sesión.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { passwordActual, passwordNuevo } = body;

    if (!passwordActual || !passwordNuevo) {
      return NextResponse.json(
        { error: 'Completá la contraseña actual y la nueva contraseña.' },
        { status: 400 }
      );
    }

    if (passwordNuevo.length < 8) {
      return NextResponse.json(
        { error: 'La nueva contraseña debe tener como mínimo 8 caracteres.' },
        { status: 400 }
      );
    }

    if (passwordActual === passwordNuevo) {
      return NextResponse.json(
        { error: 'La nueva contraseña debe ser distinta a la contraseña temporal actual.' },
        { status: 400 }
      );
    }

    const usuario = await buscarUsuarioPorId(session.id);
    if (!usuario) {
      return NextResponse.json(
        { error: 'Usuario no encontrado.' },
        { status: 404 }
      );
    }

    const esValida = await verifyPassword(passwordActual, usuario.password_hash);
    if (!esValida) {
      return NextResponse.json(
        { error: 'La contraseña actual ingresada es incorrecta.' },
        { status: 400 }
      );
    }

    const ok = await actualizarPassword(usuario.id, passwordNuevo);
    if (!ok) {
      return NextResponse.json(
        { error: 'No se pudo actualizar la contraseña. Reintentá en unos segundos.' },
        { status: 500 }
      );
    }

    // Actualizar token de sesión con debe_cambiar_password = false
    const nuevoToken = await createSessionToken({
      ...session,
      debe_cambiar_password: false,
    });
    await setSessionCookie(nuevoToken);

    return NextResponse.json({
      ok: true,
      mensaje: '¡Contraseña actualizada con éxito! Ahora podés disfrutar de Destellos ✨',
    });
  } catch (error: any) {
    console.error('Error en /api/auth/cambiar-password:', error);
    return NextResponse.json(
      { error: 'Ocurrió un error al procesar el cambio de contraseña.' },
      { status: 500 }
    );
  }
}
