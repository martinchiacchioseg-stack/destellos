import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import {
  listarUsuariosGrupo,
  crearPersonaEnGrupo,
  actualizarUsuario,
  buscarUsuarioPorEmail,
  buscarUsuarioPorId,
} from '@/lib/db';
import { dbDelete } from '@/lib/sqlite-store';

export async function GET(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session || session.rol !== 'superadmin') {
    return NextResponse.json({ error: 'Acceso exclusivo para Superadmin.' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const grupoId = searchParams.get('grupoId');
  if (!grupoId) {
    return NextResponse.json({ error: 'ID de grupo requerido.' }, { status: 400 });
  }

  const usuarios = await listarUsuariosGrupo(grupoId);
  return NextResponse.json({ usuarios });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session || session.rol !== 'superadmin') {
      return NextResponse.json({ error: 'Acceso no autorizado.' }, { status: 403 });
    }

    const { grupoId, email, nombre, apodo, telefono, rol } = await req.json();

    if (!grupoId || !email || !nombre) {
      return NextResponse.json(
        { error: 'Completá los campos obligatorios (nombre, email y grupo).' },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();
    const existe = await buscarUsuarioPorEmail(cleanEmail);
    if (existe) {
      return NextResponse.json(
        { error: 'Ya existe un usuario registrado con este correo electrónico.' },
        { status: 409 }
      );
    }

    // Se genera una contraseña temporal aleatoria única (no un valor fijo)
    const { usuario, passwordTemporal } = await crearPersonaEnGrupo({
      nombre,
      email: cleanEmail,
      apodo,
      telefono,
      rol: rol || 'miembro',
      grupo_id: grupoId,
    });

    return NextResponse.json({
      ok: true,
      mensaje: `Usuario ${usuario.nombre} creado con éxito.`,
      usuario,
      passwordTemporal, // El superadmin la ve una sola vez para pasársela
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Error al crear usuario.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session || session.rol !== 'superadmin') {
      return NextResponse.json({ error: 'Acceso no autorizado.' }, { status: 403 });
    }

    const { id, nombre, apodo, telefono, rol, activo } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'ID de usuario requerido.' }, { status: 400 });
    }

    const actualizado = await actualizarUsuario(id, {
      ...(nombre ? { nombre: nombre.trim() } : {}),
      ...(apodo !== undefined ? { apodo: apodo.trim() } : {}),
      ...(telefono !== undefined ? { telefono: telefono.trim() } : {}),
      ...(rol ? { rol } : {}),
      ...(activo !== undefined ? { activo } : {}),
    });

    if (!actualizado) {
      return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, usuario: actualizado, mensaje: 'Usuario actualizado.' });
  } catch (error: any) {
    return NextResponse.json({ error: 'Error al actualizar usuario.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session || session.rol !== 'superadmin') {
      return NextResponse.json({ error: 'Acceso no autorizado.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID de usuario requerido.' }, { status: 400 });
    }

    const u = await buscarUsuarioPorId(id);
    if (u?.rol === 'superadmin') {
      return NextResponse.json({ error: 'No es posible eliminar al Superadministrador.' }, { status: 400 });
    }

    dbDelete('usuarios', id);
    return NextResponse.json({ ok: true, mensaje: 'Usuario eliminado.' });
  } catch (error: any) {
    return NextResponse.json({ error: 'Error al eliminar usuario.' }, { status: 500 });
  }
}
