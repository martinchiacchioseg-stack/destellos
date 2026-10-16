import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import {
  listarUsuariosGrupo,
  crearPersonaEnGrupo,
  buscarUsuarioPorEmail,
  buscarUsuarioPorId,
} from '@/lib/db';

export async function GET() {
  const session = await getCurrentSession();
  if (!session || (session.rol !== 'admin' && session.rol !== 'superadmin')) {
    return NextResponse.json({ error: 'Acceso no autorizado.' }, { status: 403 });
  }

  const usuarioDb = await buscarUsuarioPorId(session.id);
  const grupoId = usuarioDb?.grupo_id || session.grupo_id;
  if (!grupoId) {
    return NextResponse.json({ usuarios: [] });
  }

  const usuarios = await listarUsuariosGrupo(grupoId);
  return NextResponse.json({ usuarios });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session || (session.rol !== 'admin' && session.rol !== 'superadmin')) {
      return NextResponse.json({ error: 'Acceso no autorizado.' }, { status: 403 });
    }

    const usuarioDb = await buscarUsuarioPorId(session.id);
    const grupoId = usuarioDb?.grupo_id || session.grupo_id;
    if (!grupoId) {
      return NextResponse.json({ error: 'No tenés un grupo asignado.' }, { status: 400 });
    }

    const { email, nombre, apodo, telefono } = await req.json();

    if (!email || !nombre) {
      return NextResponse.json(
        { error: 'Completá nombre y correo electrónico.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();
    const existente = await buscarUsuarioPorEmail(cleanEmail);
    if (existente) {
      return NextResponse.json(
        { error: 'Ya existe un usuario con este correo electrónico.' },
        { status: 409 }
      );
    }

    const { usuario, passwordTemporal } = await crearPersonaEnGrupo({
      nombre,
      email: cleanEmail,
      apodo,
      telefono,
      rol: 'miembro',
      grupo_id: grupoId,
    });

    return NextResponse.json({
      ok: true,
      mensaje: `Miembro ${usuario.nombre} creado con éxito.`,
      usuario,
      passwordTemporal,
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Error al agregar miembro.' }, { status: 500 });
  }
}
