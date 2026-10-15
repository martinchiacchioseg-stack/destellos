import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { listarPublicidades, guardarPublicidad, eliminarPublicidad } from '@/lib/db';

export async function GET() {
  const publicidades = await listarPublicidades();
  return NextResponse.json({ publicidades });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session || session.rol !== 'superadmin') {
      return NextResponse.json({ error: 'Acceso no autorizado.' }, { status: 403 });
    }

    const body = await req.json();
    const { titulo, texto, imagen_url, link_url, ubicacion, id } = body;

    if (!titulo || !texto || !ubicacion) {
      return NextResponse.json(
        { error: 'Completá título, texto y ubicación de la publicidad.' },
        { status: 400 }
      );
    }

    const pub = await guardarPublicidad({
      id,
      titulo,
      texto,
      imagen_url,
      link_url,
      ubicacion,
      activa: true,
    });

    return NextResponse.json({
      ok: true,
      mensaje: 'Publicidad guardada con éxito.',
      publicidad: pub,
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Error al guardar publicidad.' }, { status: 500 });
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
    if (!id) return NextResponse.json({ error: 'ID requerido.' }, { status: 400 });

    await eliminarPublicidad(id);
    return NextResponse.json({ ok: true, mensaje: 'Publicidad eliminada.' });
  } catch (error: any) {
    return NextResponse.json({ error: 'Error al eliminar publicidad.' }, { status: 500 });
  }
}
