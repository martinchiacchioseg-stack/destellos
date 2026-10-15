import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { listarTodosLosUsuarios, crearUsuario, buscarUsuarioPorEmail, buscarUsuarioPorId } from '@/lib/db';

export async function GET() {
  const session = await getCurrentSession();
  if (!session || session.rol !== 'superadmin') {
    return NextResponse.json({ error: 'Acceso exclusivo para Superadmin.' }, { status: 403 });
  }

  const usuarios = await listarTodosLosUsuarios();
  const admins = usuarios.filter((u) => u.rol === 'admin' && u.activo);

  return NextResponse.json({ admins });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session || session.rol !== 'superadmin') {
      return NextResponse.json({ error: 'Acceso exclusivo para Superadmin.' }, { status: 403 });
    }

    const { email, nombre, grupoId, passwordTemporal } = await req.json();
    if (!email || !nombre || !grupoId || !passwordTemporal) {
      return NextResponse.json(
        { error: 'Completá todos los campos requeridos.' },
        { status: 400 }
      );
    }

    if (passwordTemporal.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña temporal debe tener al menos 6 caracteres.' },
        { status: 400 }
      );
    }

    const existe = await buscarUsuarioPorEmail(email);
    if (existe) {
      return NextResponse.json({ error: 'Ya existe un usuario con este email.' }, { status: 400 });
    }

    const nuevoAdmin = await crearUsuario({
      email,
      nombre,
      passwordTemporal,
      rol: 'admin',
      grupo_id: grupoId,
    });

    return NextResponse.json({
      ok: true,
      mensaje: `Administrador/a ${nuevoAdmin.nombre} creado con éxito. Deberá cambiar su contraseña al primer ingreso.`,
      admin: nuevoAdmin,
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Error al crear administrador.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session || session.rol !== 'superadmin') {
      return NextResponse.json({ error: 'Acceso exclusivo para Superadmin.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID requerido.' }, { status: 400 });

    const usuario = await buscarUsuarioPorId(id);
    if (!usuario) return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 });

    usuario.activo = false;
    return NextResponse.json({ ok: true, mensaje: `Administrador ${usuario.nombre} eliminado.` });
  } catch (error: any) {
    return NextResponse.json({ error: 'Error al eliminar administrador.' }, { status: 500 });
  }
}
