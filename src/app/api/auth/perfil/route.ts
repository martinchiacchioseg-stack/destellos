import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession, createSessionToken, setSessionCookie } from '@/lib/auth';
import { buscarUsuarioPorId, actualizarUsuario } from '@/lib/db';
import { procesarYGuardarMedia } from '@/lib/storage';

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    const body = await req.json();
    const { avatar_url, nombre, apodo, telefono } = body;

    let finalAvatar = avatar_url;
    if (finalAvatar && finalAvatar.startsWith('data:')) {
      finalAvatar = procesarYGuardarMedia(finalAvatar, `avatar-${session.id}`);
    }

    const actualizado = await actualizarUsuario(session.id, {
      avatar_url: finalAvatar,
      nombre,
      apodo,
      telefono,
    });

    if (!actualizado) {
      return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 });
    }

    // Actualizar cookie de sesión con la nueva foto
    const nuevoToken = await createSessionToken({
      ...session,
      nombre: actualizado.nombre,
      apodo: actualizado.apodo,
      avatar_url: actualizado.avatar_url,
    });
    await setSessionCookie(nuevoToken);

    return NextResponse.json({
      ok: true,
      mensaje: 'Foto de perfil actualizada con éxito.',
      usuario: actualizado,
    });
  } catch (error: any) {
    console.error('Error al actualizar perfil:', error);
    return NextResponse.json({ error: 'Error al actualizar perfil.' }, { status: 500 });
  }
}
