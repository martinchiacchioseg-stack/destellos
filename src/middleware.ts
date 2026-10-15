import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET_STRING = process.env.JWT_SECRET || 'destellos-super-secret-jwt-key-2026-un-clic-familiar';
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING);
const COOKIE_NAME = 'destellos_session';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Rutas públicas que no requieren autenticación
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth/login') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/api/crons') // Crons se protegen por su propio secret
  ) {
    return NextResponse.next();
  }

  // Verificar cookie de sesión
  const token = req.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    // Si no está autenticado y es una ruta de API
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }
    // Si es una página web, redirigir al login
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const debeCambiarPass = Boolean(payload.debe_cambiar_password);
    const rol = payload.rol as string;

    // Si debe cambiar la contraseña, obligarlo a ir a /cambiar-password
    if (
      debeCambiarPass &&
      pathname !== '/cambiar-password' &&
      pathname !== '/api/auth/cambiar-password' &&
      pathname !== '/api/auth/logout'
    ) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Debés cambiar tu contraseña antes de continuar.' },
          { status: 403 }
        );
      }
      return NextResponse.redirect(new URL('/cambiar-password', req.url));
    }

    // Si NO debe cambiar la contraseña pero intenta ir a /cambiar-password de forma forzada
    if (!debeCambiarPass && pathname === '/cambiar-password') {
      return NextResponse.redirect(new URL('/', req.url));
    }

    // Protección de rutas de Superadmin
    if (pathname.startsWith('/superadmin') || pathname.startsWith('/api/superadmin')) {
      if (rol !== 'superadmin') {
        if (pathname.startsWith('/api/')) {
          return NextResponse.json({ error: 'Acceso no autorizado.' }, { status: 403 });
        }
        return NextResponse.redirect(new URL('/', req.url));
      }
    }

    // Protección de rutas de Admin
    if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
      if (rol !== 'admin' && rol !== 'superadmin') {
        if (pathname.startsWith('/api/')) {
          return NextResponse.json({ error: 'Acceso no autorizado.' }, { status: 403 });
        }
        return NextResponse.redirect(new URL('/', req.url));
      }
    }

    return NextResponse.next();
  } catch (err) {
    // Token inválido o expirado
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Sesión expirada.' }, { status: 401 });
    }
    const response = NextResponse.redirect(new URL('/login', req.url));
    response.cookies.delete(COOKIE_NAME);
    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
