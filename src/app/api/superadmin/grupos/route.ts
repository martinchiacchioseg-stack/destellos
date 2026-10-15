import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { listarGrupos, crearGrupo, eliminarGrupo, listarTodosLosUsuarios } from '@/lib/db';

export async function GET() {
  const session = await getCurrentSession();
  if (!session || session.rol !== 'superadmin') {
    return NextResponse.json({ error: 'Acceso exclusivo para Superadmin.' }, { status: 403 });
  }

  const grupos = await listarGrupos();
  const todosLosUsuarios = await listarTodosLosUsuarios();

  const gruposConStats = grupos.map((g) => {
    const miembros = todosLosUsuarios.filter((u) => u.grupo_id === g.id && u.activo);
    const admins = miembros.filter((u) => u.rol === 'admin');
    return {
      ...g,
      total_miembros: miembros.length,
      total_admins: admins.length,
    };
  });

  return NextResponse.json({ grupos: gruposConStats });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session || session.rol !== 'superadmin') {
      return NextResponse.json({ error: 'Acceso exclusivo para Superadmin.' }, { status: 403 });
    }

    const { nombre, descripcion } = await req.json();
    if (!nombre || nombre.trim().length === 0) {
      return NextResponse.json({ error: 'El nombre del grupo es obligatorio.' }, { status: 400 });
    }

    const nuevo = await crearGrupo(nombre, descripcion);
    return NextResponse.json({ ok: true, grupo: nuevo, mensaje: `Grupo "${nuevo.nombre}" creado exitosamente.` });
  } catch (error: any) {
    return NextResponse.json({ error: 'Error al crear grupo.' }, { status: 500 });
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
    if (!id) return NextResponse.json({ error: 'ID de grupo requerido.' }, { status: 400 });

    const ok = await eliminarGrupo(id);
    return NextResponse.json({ ok, mensaje: 'Grupo desactivado correctamente.' });
  } catch (error: any) {
    return NextResponse.json({ error: 'Error al eliminar grupo.' }, { status: 500 });
  }
}
