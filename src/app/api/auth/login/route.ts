import { NextRequest, NextResponse } from 'next/server';
import {
  buscarUsuarioPorEmail,
  resetearIntentosFallidos,
  ensureInitialized,
  listarTodosLosUsuarios,
} from '@/lib/db';
import { verifyPassword, createSessionToken, setSessionCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    await ensureInitialized();
    const body = await req.json().catch(() => ({}));
    const { email, password, accesoLibre } = body;

    // Si pide acceso libre o no especificó email, ingresar directo como Martín Superadmin
    let targetEmail = (email || '').toString().trim().toLowerCase();
    if (accesoLibre || !targetEmail) {
      targetEmail = 'martinchiacchio.seg@gmail.com';
    }

    let usuario = await buscarUsuarioPorEmail(targetEmail);

    // Si no se encuentra, buscar si hay algún superadmin o cualquier usuario
    if (!usuario) {
      const todos = await listarTodosLosUsuarios();
      const admin = todos.find((u) => u.rol === 'superadmin') || todos[0];
      if (admin) {
        usuario = await buscarUsuarioPorEmail(admin.email);
      }
    }

    if (!usuario) {
      return NextResponse.json(
        { error: 'No se encontró ningún usuario configurado.' },
        { status: 404 }
      );
    }

    // ACCESO LIBRE TOTAL: No se requiere clave
    // Resetear cualquier intento previo o bloqueo
    await resetearIntentosFallidos(usuario.email);

    // Crear sesión y cookie (debe_cambiar_password = false para libre navegación)
    const token = await createSessionToken({
      id: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      apodo: usuario.apodo,
      avatar_url: usuario.avatar_url,
      rol: usuario.rol,
      grupo_id: usuario.grupo_id,
      debe_cambiar_password: false,
    });

    await setSessionCookie(token);

    return NextResponse.json({
      ok: true,
      mensaje: '¡Acceso libre concedido! Bienvenido/a a Destellos ✨',
      usuario: {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        apodo: usuario.apodo,
        avatar_url: usuario.avatar_url,
        rol: usuario.rol,
        grupo_id: usuario.grupo_id,
        debe_cambiar_password: false,
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

export async function GET(req: NextRequest) {
  try {
    await ensureInitialized();
    const { searchParams } = new URL(req.url);
    const redirectUrl = searchParams.get('redirect') || '/';

    const usuario = await buscarUsuarioPorEmail('martinchiacchio.seg@gmail.com');
    if (!usuario) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    const token = await createSessionToken({
      id: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      apodo: usuario.apodo,
      avatar_url: usuario.avatar_url,
      rol: usuario.rol,
      grupo_id: usuario.grupo_id,
      debe_cambiar_password: false,
    });

    const res = NextResponse.redirect(new URL(redirectUrl, req.url));
    res.cookies.set('destellos_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 días
    });

    return res;
  } catch (error) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
}
