import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { listarUsuariosGrupo, crearUsuario, buscarUsuarioPorEmail } from '@/lib/db';

export async function GET() {
  const session = await getCurrentSession();
  if (!session || (session.rol !== 'admin' && session.rol !== 'superadmin')) {
    return NextResponse.json({ error: 'Acceso no autorizado.' }, { status: 403 });
  }

  if (!session.grupo_id && session.rol !== 'superadmin') {
    return NextResponse.json({ error: 'No tenés un grupo asignado.' }, { status: 400 });
  }

  const grupoId = session.grupo_id || 'grupo-familia-perez-001';
  const usuarios = await listarUsuariosGrupo(grupoId);

  return NextResponse.json({ usuarios });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session || (session.rol !== 'admin' && session.rol !== 'superadmin')) {
      return NextResponse.json({ error: 'Acceso no autorizado.' }, { status: 403 });
    }

    const grupoId = session.grupo_id || 'grupo-familia-perez-001';
    const body = await req.json();
    const { email, nombre, apodo, passwordTemporal } = body;

    if (!email || !nombre || !passwordTemporal) {
      return NextResponse.json(
        { error: 'Completá nombre, email y contraseña temporal.' },
        { status: 400 }
      );
    }

    if (passwordTemporal.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña temporal debe tener al menos 6 caracteres.' },
        { status: 400 }
      );
    }

    const existente = await buscarUsuarioPorEmail(email);
    if (existente) {
      return NextResponse.json(
        { error: 'Ya existe un usuario registrado con ese email.' },
        { status: 400 }
      );
    }

    const nuevoUsuario = await crearUsuario({
      email,
      nombre,
      apodo,
      passwordTemporal,
      rol: 'miembro',
      grupo_id: grupoId,
    });

    return NextResponse.json({
      ok: true,
      mensaje: `¡Miembro ${nuevoUsuario.nombre} creado con éxito! Deberá cambiar su contraseña al primer ingreso.`,
      usuario: {
        id: nuevoUsuario.id,
        email: nuevoUsuario.email,
        nombre: nuevoUsuario.nombre,
        apodo: nuevoUsuario.apodo,
        rol: nuevoUsuario.rol,
        debe_cambiar_password: nuevoUsuario.debe_cambiar_password,
      },
    });
  } catch (error: any) {
    console.error('Error en POST /api/admin/usuarios:', error);
    return NextResponse.json({ error: 'Error al crear miembro.' }, { status: 500 });
  }
}
