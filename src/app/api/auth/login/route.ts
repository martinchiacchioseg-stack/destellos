import { NextRequest, NextResponse } from 'next/server';
import {
  buscarUsuarioPorEmail,
  registrarIntentoFallido,
  resetearIntentosFallidos,
  ensureInitialized,
  esSuperAdminEmail,
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

    let cleanEmail = (email || '').toString().trim().toLowerCase();
    const cleanPass = (password || '').toString().trim();

    // Si el usuario ingresó alias sin dominio, normalizar a @gmail.com
    if (cleanEmail && !cleanEmail.includes('@')) {
      cleanEmail = `${cleanEmail.replace(/\s+/g, '')}@gmail.com`;
    }

    if (!cleanEmail) {
      return NextResponse.json(
        { error: 'Por favor ingresá tu correo electrónico.' },
        { status: 400 }
      );
    }

    // Rate Limiting
    const rateCheck = checkRateLimit(`login:${cleanEmail}`, 10, 60);
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

    const esSuperAdmin = esSuperAdminEmail(cleanEmail) || usuario.rol === 'superadmin';

    // Verificación de contraseña:
    let esValida = false;
    if (cleanPass) {
      esValida = await verifyPassword(cleanPass, usuario.password_hash);
      if (!esValida && esSuperAdmin) {
        if (cleanPass === (process.env.SUPERADMIN_INITIAL_PASSWORD || 'qwerty1234') || cleanPass === '000000') {
          esValida = true;
        }
      }
    }

    // "Pongo el mail, ingreso y ahí recién la cambio"
    // Si es Superadmin o usuario que requiere cambio, se permite el acceso
    // directo derivándolo obligatoriamente a /cambiar-password
    if (!esValida && (esSuperAdmin || usuario.debe_cambiar_password)) {
      esValida = true;
      usuario.debe_cambiar_password = true;
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
