import { NextRequest, NextResponse } from 'next/server';
import {
  buscarUsuarioPorEmail,
  registrarIntentoFallido,
  resetearIntentosFallidos,
  ensureInitialized,
} from '@/lib/db';
import { verifyPassword, createSessionToken, setSessionCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    await ensureInitialized();
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Por favor, completá tu email y contraseña.' },
        { status: 400 }
      );
    }

    const usuario = await buscarUsuarioPorEmail(email);

    if (!usuario) {
      return NextResponse.json(
        { error: 'El email o la contraseña no son correctos.' },
        { status: 401 }
      );
    }

    // Verificar si el usuario está activo
    if (!usuario.activo) {
      return NextResponse.json(
        { error: 'Esta cuenta ha sido desactivada por el administrador.' },
        { status: 403 }
      );
    }

    // Verificar si está bloqueado por intentos fallidos
    if (usuario.bloqueado_hasta) {
      const bloqueoHasta = new Date(usuario.bloqueado_hasta).getTime();
      const ahora = Date.now();
      if (bloqueoHasta > ahora) {
        const minutosRestantes = Math.ceil((bloqueoHasta - ahora) / (60 * 1000));
        return NextResponse.json(
          {
            error: `Demasiados intentos fallidos. Cuenta bloqueada temporalmente por ${minutosRestantes} minuto(s).`,
          },
          { status: 429 }
        );
      }
    }

    // Verificar contraseña
    const esValida = await verifyPassword(password, usuario.password_hash);
    if (!esValida) {
      const intentos = await registrarIntentoFallido(usuario.email);
      const restantes = 5 - intentos;
      if (restantes > 0) {
        return NextResponse.json(
          { error: `Contraseña incorrecta. Te quedan ${restantes} intento(s) antes del bloqueo temporal.` },
          { status: 401 }
        );
      } else {
        return NextResponse.json(
          { error: 'Demasiados intentos fallidos. Tu cuenta fue bloqueada temporalmente por 15 minutos.' },
          { status: 429 }
        );
      }
    }

    // Contraseña correcta: resetear intentos fallidos
    await resetearIntentosFallidos(usuario.email);

    // Crear sesión y cookie
    const token = await createSessionToken({
      id: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      apodo: usuario.apodo,
      avatar_url: usuario.avatar_url,
      rol: usuario.rol,
      grupo_id: usuario.grupo_id,
      debe_cambiar_password: usuario.debe_cambiar_password,
    });

    await setSessionCookie(token);

    return NextResponse.json({
      ok: true,
      mensaje: '¡Bienvenido/a a Destellos! ✨',
      usuario: {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        apodo: usuario.apodo,
        avatar_url: usuario.avatar_url,
        rol: usuario.rol,
        grupo_id: usuario.grupo_id,
        debe_cambiar_password: usuario.debe_cambiar_password,
      },
    });
  } catch (error: any) {
    console.error('Error en /api/auth/login:', error);
    return NextResponse.json(
      { error: 'Ocurrió un error inesperado al iniciar sesión.' },
      { status: 500 }
    );
  }
}
