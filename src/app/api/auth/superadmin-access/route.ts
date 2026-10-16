import { NextRequest, NextResponse } from 'next/server';
import { buscarUsuarioPorEmail } from '@/lib/db';
import { createSessionToken, checkRateLimit, verifyPassword } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'ip-superadmin';
    // Limitar intentos fallidos: máximo 5 intentos cada 15 minutos (900 seg)
    const rate = checkRateLimit(`superadmin-access:${ip}`, 5, 900);
    if (!rate.permitido) {
      return NextResponse.json(
        {
          error: `Acceso temporalmente bloqueado por seguridad tras varios intentos fallidos. Aguardá ${Math.ceil(
            rate.segundosRestantes / 60
          )} minutos.`,
        },
        { status: 429 }
      );
    }

    const { email, password } = await req.json();
    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: 'Ingresá la clave de acceso.' }, { status: 400 });
    }

    // Si se envía email, validar que corresponda al dueño
    if (email && typeof email === 'string') {
      const emailNorm = email.toLowerCase().trim();
      const esAdminValido =
        emailNorm === 'martinchiacchio.seg@gmail.com' ||
        emailNorm === 'martinchiaccio.seg@gmail.com' ||
        emailNorm.includes('martinchiac');

      if (!esAdminValido) {
        return NextResponse.json({ error: 'Credenciales de acceso no válidas.' }, { status: 401 });
      }
    }

    const superadmin =
      (await buscarUsuarioPorEmail('martinchiacchio.seg@gmail.com')) ||
      (await buscarUsuarioPorEmail('martinchiaccio.seg@gmail.com'));

    if (!superadmin) {
      return NextResponse.json({ error: 'Error del sistema de autenticación.' }, { status: 500 });
    }

    const superPassMaster = process.env.SUPERADMIN_INITIAL_PASSWORD || 'Chiachio@1938';
    const esClaveValida =
      password.trim() === superPassMaster.trim() ||
      (await verifyPassword(password.trim(), superadmin.password_hash));

    if (!esClaveValida) {
      return NextResponse.json(
        { error: 'Clave de acceso incorrecta.' },
        { status: 401 }
      );
    }

    // Clave correcta: generar token de sesión de Superadmin
    const token = await createSessionToken({
      id: superadmin.id,
      email: superadmin.email,
      nombre: superadmin.nombre,
      apodo: superadmin.apodo,
      avatar_url: superadmin.avatar_url,
      rol: 'superadmin',
      grupo_id: null,
      debe_cambiar_password: false,
    });

    const response = NextResponse.json({
      ok: true,
      mensaje: 'Acceso autorizado al Panel Superadmin.',
      token,
      redirectUrl: '/superadmin',
    });

    response.cookies.set('destellos_session', token, {
      path: '/',
      httpOnly: false,
      maxAge: 60 * 60 * 24 * 7,
      sameSite: 'lax',
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: 'Error procesando solicitud.' }, { status: 500 });
  }
}
