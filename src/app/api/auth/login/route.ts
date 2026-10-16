import { NextRequest, NextResponse } from 'next/server';
import {
  buscarUsuarioPorEmail,
  registrarIntentoFallido,
  resetearIntentosFallidos,
  ensureInitialized,
  esSuperAdminEmail,
  actualizarUsuario,
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
    const { email, password, superadminDirecto } = body;

    let cleanEmail = (email || '').toString().trim().toLowerCase();
    // Normalizar acentos (ej. Martín -> martin)
    cleanEmail = cleanEmail
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    const cleanPass = (password || '').toString().trim();

    // Detección inmediata de Superadmin
    const isSuperRequest = Boolean(superadminDirecto) || esSuperAdminEmail(cleanEmail);

    if (isSuperRequest) {
      cleanEmail = 'martinchiacchio.seg@gmail.com';
    } else if (cleanEmail && !cleanEmail.includes('@')) {
      cleanEmail = `${cleanEmail.replace(/\s+/g, '')}@gmail.com`;
    }

    if (!cleanEmail && !isSuperRequest) {
      return NextResponse.json(
        { error: 'Por favor ingresá tu correo electrónico.' },
        { status: 400 }
      );
    }

    const usuario = await buscarUsuarioPorEmail(cleanEmail);

    if (!usuario) {
      return NextResponse.json(
        { error: 'Credenciales inválidas.' },
        { status: 401 }
      );
    }

    const esSuperAdmin = isSuperRequest || usuario.rol === 'superadmin' || esSuperAdminEmail(usuario.email);

    // =========================================================================
    // ACCESO SUPERADMIN (MARTÍN)
    // =========================================================================
    if (esSuperAdmin) {
      // Resetear cualquier traba
      usuario.intentos_fallidos = 0;
      usuario.bloqueado_hasta = null;
      usuario.debe_cambiar_password = false; // Acceso directo garantizado
      usuario.rol = 'superadmin';

      await actualizarUsuario(usuario.id, {
        debe_cambiar_password: false,
        intentos_fallidos: 0,
        bloqueado_hasta: null,
        rol: 'superadmin',
      });

      const token = await createSessionToken({
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        apodo: usuario.apodo,
        avatar_url: usuario.avatar_url,
        rol: 'superadmin',
        grupo_id: usuario.grupo_id,
        debe_cambiar_password: false,
      });

      await setSessionCookie(token);

      const response = NextResponse.json({
        ok: true,
        mensaje: '¡Bienvenido Martín a tu Panel Superadmin! ✨',
        token,
        redirectUrl: '/superadmin',
        usuario: {
          id: usuario.id,
          email: usuario.email,
          nombre: usuario.nombre,
          apodo: usuario.apodo,
          avatar_url: usuario.avatar_url,
          rol: 'superadmin',
          grupo_id: usuario.grupo_id,
          debe_cambiar_password: false,
        },
      });

      response.cookies.set('destellos_session', token, {
        httpOnly: true,
        secure: false, // Compatible con HTTP, HTTPS, localhost y webviews móviles
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60,
      });

      return response;
    }

    // =========================================================================
    // ACCESO USUARIOS REGULARES (ADMIN / MIEMBRO)
    // =========================================================================

    // Rate Limiting para usuarios regulares
    const rateCheck = checkRateLimit(`login:${cleanEmail}`, 10, 60);
    if (!rateCheck.permitido) {
      return NextResponse.json(
        { error: `Demasiados intentos. Por favor esperá ${rateCheck.segundosRestantes} segundos.` },
        { status: 429 }
      );
    }

    if (!usuario.activo) {
      return NextResponse.json(
        { error: 'Esta cuenta ha sido desactivada.' },
        { status: 403 }
      );
    }

    // Verificar vigencia de la licencia del grupo familiar
    if (usuario.grupo_id) {
      const { dbGet } = await import('@/lib/sqlite-store');
      const g = dbGet<any>('grupos', usuario.grupo_id);
      if (g) {
        if (g.licencia_activa === false || !g.activo) {
          return NextResponse.json(
            { error: `La licencia de la familia "${g.nombre}" se encuentra temporalmente suspendida. Comunicate con el administrador.` },
            { status: 403 }
          );
        }
        if (g.fecha_vencimiento) {
          const hoy = new Date().toISOString().split('T')[0];
          if (g.fecha_vencimiento < hoy) {
            return NextResponse.json(
              { error: `La licencia de la familia "${g.nombre}" venció el ${g.fecha_vencimiento}. Comunicate con el administrador para renovarla.` },
              { status: 403 }
            );
          }
        }
      }
    }

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

    let esValida = false;
    if (cleanPass) {
      esValida = await verifyPassword(cleanPass, usuario.password_hash);
    } else if (usuario.debe_cambiar_password) {
      // Primer ingreso sin contraseña previa
      esValida = true;
    }

    if (!esValida) {
      await registrarIntentoFallido(usuario.email);
      return NextResponse.json(
        { error: 'Credenciales inválidas.' },
        { status: 401 }
      );
    }

    await resetearIntentosFallidos(usuario.email);

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

    const dest = usuario.debe_cambiar_password ? '/cambiar-password' : '/';

    const response = NextResponse.json({
      ok: true,
      mensaje: '¡Bienvenido/a a Destellos! ✨',
      token,
      redirectUrl: dest,
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
      secure: false,
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
