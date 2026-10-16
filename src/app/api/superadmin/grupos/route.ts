import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import {
  listarGrupos,
  crearGrupo,
  actualizarGrupo,
  eliminarGrupo,
  listarUsuariosGrupo,
} from '@/lib/db';

export async function GET() {
  const session = await getCurrentSession();
  if (!session || session.rol !== 'superadmin') {
    return NextResponse.json({ error: 'Acceso exclusivo para Superadmin.' }, { status: 403 });
  }

  const grupos = await listarGrupos();
  const gruposConStats = await Promise.all(
    grupos.map(async (g) => {
      const miembros = await listarUsuariosGrupo(g.id);
      return {
        ...g,
        total_miembros: miembros.length,
        total_admins: miembros.filter((m) => m.rol === 'admin').length,
      };
    })
  );

  return NextResponse.json({ grupos: gruposConStats });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session || session.rol !== 'superadmin') {
      return NextResponse.json({ error: 'Acceso exclusivo para Superadmin.' }, { status: 403 });
    }

    const { nombre, emoji_or_logo, hora_limite, descripcion } = await req.json();
    if (!nombre || nombre.trim().length === 0) {
      return NextResponse.json({ error: 'El nombre del grupo es obligatorio.' }, { status: 400 });
    }

    const nuevo = await crearGrupo({
      nombre,
      emoji_or_logo: emoji_or_logo || '✨',
      hora_limite: hora_limite || '22:00',
      descripcion,
    });

    return NextResponse.json({
      ok: true,
      grupo: nuevo,
      mensaje: `Grupo "${nuevo.nombre}" creado exitosamente.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Error al crear grupo.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session || session.rol !== 'superadmin') {
      return NextResponse.json({ error: 'Acceso exclusivo para Superadmin.' }, { status: 403 });
    }

    const { id, nombre, emoji_or_logo, hora_limite, estado, descripcion } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'ID de grupo requerido.' }, { status: 400 });
    }

    const actualizado = await actualizarGrupo(id, {
      ...(nombre ? { nombre: nombre.trim() } : {}),
      ...(emoji_or_logo !== undefined ? { emoji_or_logo } : {}),
      ...(hora_limite !== undefined ? { hora_limite } : {}),
      ...(estado !== undefined ? { estado, activo: estado === 'activo' } : {}),
      ...(descripcion !== undefined ? { descripcion: descripcion.trim() } : {}),
    });

    if (!actualizado) {
      return NextResponse.json({ error: 'Grupo no encontrado.' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, grupo: actualizado, mensaje: 'Grupo actualizado con éxito.' });
  } catch (error: any) {
    return NextResponse.json({ error: 'Error al actualizar grupo.' }, { status: 500 });
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
    if (!id) {
      return NextResponse.json({ error: 'ID de grupo requerido.' }, { status: 400 });
    }

    const ok = await eliminarGrupo(id);
    if (!ok) {
      return NextResponse.json({ error: 'No se pudo eliminar el grupo.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, mensaje: 'Grupo eliminado correctamente.' });
  } catch (error: any) {
    return NextResponse.json({ error: 'Error al eliminar grupo.' }, { status: 500 });
  }
}
