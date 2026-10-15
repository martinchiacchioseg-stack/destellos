import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { moderarDestello } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session || (session.rol !== 'admin' && session.rol !== 'superadmin')) {
      return NextResponse.json({ error: 'Acceso no autorizado para moderación.' }, { status: 403 });
    }

    const { destelloId, motivo } = await req.json();
    if (!destelloId) {
      return NextResponse.json({ error: 'ID de destello requerido.' }, { status: 400 });
    }

    const ok = await moderarDestello(destelloId, motivo || 'Contenido inapropiado según normas familiares.');
    if (!ok) {
      return NextResponse.json({ error: 'No se encontró el destello.' }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      mensaje: 'Publicación moderada y ocultada del grupo.',
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Error al moderar publicación.' }, { status: 500 });
  }
}
