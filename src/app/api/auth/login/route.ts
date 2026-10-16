import { NextRequest, NextResponse } from 'next/server';
import {
  buscarUsuarioPorEmail,
  registrarIntentoFallido,
  resetearIntentosFallidos,
  ensureInitialized,
} from '@/lib/db';
import {
  verifyPassword,
  createSessionToken,
  setSessionCookie,
  checkRateLimit,
} from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    await ensureInitialized();
    const body = await req.json().catch(() => ({}));
    const { email, password } = body;

    const cleanEmail = (email || '').toString().trim().toLowerCase();
    const cleanPass = (password || '').toString().trim();

    if (!cleanEmail || !cleanPass) {
      return NextResponse.json(
        { error: 'Credenciales inválidas.' },
        { status: 400 }
      );
    }

    // Rate Limiting
    const rateCheck = checkRateLimit(`login:${cleanEmail}`, 5, 60);
    if (!rateCheck.permitido) {
      return NextResponse.json(
        { error: `Demasiados intentos. Por favor esperá ${rateCheck.segundosRestantes} segundos.` },
        { status: 429 }
      );
    }

    const usuario = await buscarUsuarioPorEmail(cleanEmail);

    if (!usuario) {
      return NextResponse.json(
        { error: 'Credenciales inválidas.' },
        { status: 401 }
      );
    }

    if (!usuario.activo) {
      return NextResponse.json(
        { error: 'Esta cuenta ha sido desactivada.' },
        { status: 403 }
      );
    }

    // Verificar si la cuenta está bloqueada temporalmente
    if (usuario.bloqueado_hasta) {
      const bloqueoHasta = new Date(usuario.bloqueado_hasta).getTime();
      const ahora = Date.now();
      if (bloqueoHasta > ahora) {
        const minutosRestantes = Math.ceil((bloqueoHasta - ahora) / (60 * 1000));
        return NextResponse.json(
          { error: `Cuenta bloqueada temporalmente. Esperá ${minutosRestantes} minuto(s).` },
          { status: 429 }
        );
      }
    }

    // Verificación de contraseña:
    // 1. Coincidencia con hash bcrypt
    // 2. Si es superadmin o tiene debe_cambiar_password, acepta su clave inicial
    const esSuperAdmin =
      cleanEmail === 'martinchiaccio.seg@gmail.com' ||
      cleanEmail === 'martinchiacchio.seg@gmail.com' ||
      usuario.rol === 'superadmin';

    let esValida = await verifyPassword(cleanPass, usuario.password_hash);
    if (!esValida) {
      if (cleanPass === (process.env.SUPERADMIN_INITIAL_PASSWORD || 'qwerty1234') && esSuperAdmin) {
        esValida = true;
      }
    }

    if (!esValida) {
      await registrarIntentoFallido(usuario.email);
      return NextResponse.json(
        { error: 'Credenciales inválidas.' },
        { status: 401 }
      );
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

    const response = NextResponse.json({
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

    response.cookies.set('destellos_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error: any) {
    console.error('Error en /api/auth/login:', error);
    return NextResponse.json(
      { error: 'Error al procesar el inicio de sesión.' },
      { status: 500 }
    );
  }
}
