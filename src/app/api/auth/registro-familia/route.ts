import { NextRequest, NextResponse } from 'next/server';
import {
  buscarGrupoPorCodigo,
  crearMiembroPorCodigoFamilia,
  crearNotificacionAdmin,
} from '@/lib/db';
import { createSessionToken, checkRateLimit } from '@/lib/auth';
import { procesarAltaIntegranteConGemini } from '@/lib/gemini';
import { enviarAvisoNuevoIntegranteAdmin } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'anon';
    const rate = checkRateLimit(`registro-familia:${ip}`, 8, 60);
    if (!rate.permitido) {
      return NextResponse.json(
        { error: `Demasiados intentos. Por favor aguardá ${rate.segundosRestantes} segundos.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const {
      codigoFamilia,
      nombre,
      apodo,
      fechaNacimiento,
      whatsapp,
      email,
      fotoUrl,
      password,
    } = body;

    if (!codigoFamilia || !nombre) {
      return NextResponse.json(
        { error: 'El código de familia y tu nombre completo son obligatorios.' },
        { status: 400 }
      );
    }

    // 1. Validar el grupo asociado al código
    const grupo = await buscarGrupoPorCodigo(codigoFamilia);
    if (!grupo) {
      return NextResponse.json(
        { error: 'El código ingresado no corresponde a ninguna familia activa.' },
        { status: 404 }
      );
    }

    // 2. Dar de alta al integrante con rol 'miembro' común
    const nuevoUsuario = await crearMiembroPorCodigoFamilia({
      grupoId: grupo.id,
      nombre: nombre.trim(),
      apodo: apodo?.trim(),
      fechaNacimiento: fechaNacimiento?.trim(),
      whatsapp: whatsapp?.trim(),
      email: email?.trim(),
      fotoUrl: fotoUrl?.trim(),
      password: password?.trim(),
    });

    // 3. Procesar alta y generar aviso cálido con Gemini en segundo plano
    const { mensajeAdmin, mensajeBienvenida } = await procesarAltaIntegranteConGemini({
      nombre: nuevoUsuario.nombre,
      apodo: nuevoUsuario.apodo,
      grupoNombre: grupo.nombre,
      adminNombre: grupo.admin_nombre || 'Administrador',
      whatsapp: nuevoUsuario.whatsapp,
    });

    // 4. Sumar aviso a la campanita del administrador (in-app notification)
    if (grupo.admin_id) {
      await crearNotificacionAdmin({
        grupo_id: grupo.id,
        admin_id: grupo.admin_id,
        tipo: 'nuevo_integrante',
        titulo: `¡${nuevoUsuario.nombre} se sumó a la familia!`,
        mensaje: mensajeAdmin,
        nuevo_usuario_id: nuevoUsuario.id,
        nuevo_usuario_nombre: nuevoUsuario.nombre,
        nuevo_usuario_avatar: nuevoUsuario.avatar_url,
      });
    }

    // 5. Enviar correo al administrador con nombre y foto (si la cargó)
    const adminDestinoEmail = grupo.admin_email || 'martinchiacchio.seg@gmail.com';
    enviarAvisoNuevoIntegranteAdmin({
      adminEmail: adminDestinoEmail,
      adminNombre: grupo.admin_nombre || 'Administrador',
      grupoNombre: grupo.nombre,
      nuevoMiembroNombre: nuevoUsuario.nombre,
      nuevoMiembroApodo: nuevoUsuario.apodo,
      nuevoMiembroFoto: nuevoUsuario.avatar_url,
      nuevoMiembroWhatsapp: nuevoUsuario.whatsapp,
      nuevoMiembroNacimiento: nuevoUsuario.fecha_nacimiento,
      mensajeGemini: mensajeAdmin,
    }).catch((err) => console.warn('[Email] Error enviando correo al admin:', err));

    // 6. Generar sesión y token JWT para ingresar de inmediato
    const token = await createSessionToken({
      id: nuevoUsuario.id,
      email: nuevoUsuario.email,
      nombre: nuevoUsuario.nombre,
      apodo: nuevoUsuario.apodo,
      avatar_url: nuevoUsuario.avatar_url,
      rol: 'miembro',
      grupo_id: grupo.id,
      debe_cambiar_password: false,
    });

    const response = NextResponse.json({
      ok: true,
      mensaje: mensajeBienvenida,
      token,
      usuario: {
        id: nuevoUsuario.id,
        nombre: nuevoUsuario.nombre,
        apodo: nuevoUsuario.apodo,
        rol: nuevoUsuario.rol,
        grupo_id: nuevoUsuario.grupo_id,
      },
      redirectUrl: '/',
    });

    response.cookies.set('destellos_session', token, {
      path: '/',
      httpOnly: false,
      maxAge: 60 * 60 * 24 * 30, // 30 días
      sameSite: 'lax',
    });

    return response;
  } catch (error: any) {
    console.error('Error en registro de familia:', error);
    return NextResponse.json(
      { error: 'Error al registrarte en la familia. Por favor intentá nuevamente.' },
      { status: 500 }
    );
  }
}
