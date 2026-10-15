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

    if (!email || !email.trim()) {
      return NextResponse.json(
        { error: 'Por favor, ingresá tu email.' },
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

    const pwd = (password ?? '').toString().trim();
    const esSuperAdmin = usuario.email.toLowerCase() === 'martinchiacchio.seg@gmail.com';
    const esAccesoTemporal = pwd === '000000' || pwd === '' || usuario.debe_cambiar_password;

    // Si es superadmin o solicita acceso temporal/sin clave o con 000000
    let esValida = false;
    if (esSuperAdmin || esAccesoTemporal) {
      // Si ingresó sin clave o con 000000, o es superadmin, siempre es válido y debe poner clave nueva
      esValida = true;
      usuario.debe_cambiar_password = true;
    } else {
      esValida = await verifyPassword(pwd, usuario.password_hash);
    }

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

    // Contraseña correcta: resetear intentos fallidos y desbloquear
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
