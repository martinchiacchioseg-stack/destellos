import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession, verifyPassword, createSessionToken, setSessionCookie } from '@/lib/auth';
import { buscarUsuarioPorId, actualizarPassword, actualizarUsuario } from '@/lib/db';

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
    const { passwordActual, passwordNuevo, avatar_url } = body;

    if (!passwordNuevo || passwordNuevo.trim().length < 6) {
      return NextResponse.json(
        { error: 'La nueva contraseña debe tener como mínimo 6 caracteres.' },
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

    const esSuperAdmin = usuario.email.toLowerCase() === 'martinchiacchio.seg@gmail.com';
    const noRequiereActual = usuario.debe_cambiar_password || esSuperAdmin;

    if (!noRequiereActual && passwordActual) {
      const esValida = await verifyPassword(passwordActual, usuario.password_hash);
      if (!esValida) {
        return NextResponse.json(
          { error: 'La contraseña actual ingresada es incorrecta.' },
          { status: 400 }
        );
      }
    }

    const ok = await actualizarPassword(usuario.id, passwordNuevo);
    if (!ok) {
      return NextResponse.json(
        { error: 'No se pudo actualizar la contraseña. Reintentá en unos segundos.' },
        { status: 500 }
      );
    }

    let finalAvatar = session.avatar_url;
    if (avatar_url) {
      const uAct = await actualizarUsuario(usuario.id, { avatar_url });
      if (uAct?.avatar_url) finalAvatar = uAct.avatar_url;
    }

    // Actualizar token de sesión con debe_cambiar_password = false
    const nuevoToken = await createSessionToken({
      ...session,
      avatar_url: finalAvatar,
      debe_cambiar_password: false,
    });
    await setSessionCookie(nuevoToken);

    const response = NextResponse.json({
      ok: true,
      mensaje: '¡Contraseña actualizada con éxito! Ahora podés disfrutar de Destellos ✨',
    });

    response.cookies.set('destellos_session', nuevoToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error: any) {
    console.error('Error en /api/auth/cambiar-password:', error);
    return NextResponse.json(
      { error: 'Ocurrió un error al procesar el cambio de contraseña.' },
      { status: 500 }
    );
  }
}
