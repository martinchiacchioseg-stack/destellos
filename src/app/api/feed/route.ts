import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { listarFeedGrupo, reaccionarFeedPost, listarGrupos } from '@/lib/db';

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  let grupoId = session.grupo_id;
  if (!grupoId) {
    const grupos = await listarGrupos();
    if (grupos.length > 0) grupoId = grupos[0].id;
  }
  if (!grupoId) {
    return NextResponse.json({ feed: [] });
  }

  const feed = await listarFeedGrupo(grupoId);
  return NextResponse.json({ feed });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    const { feedPostId, emoji } = await req.json();
    if (!feedPostId || !emoji) {
      return NextResponse.json({ error: 'Faltan parámetros requeridos.' }, { status: 400 });
    }

    const postActualizado = await reaccionarFeedPost(feedPostId, session.id, emoji);
    return NextResponse.json({ ok: true, post: postActualizado });
  } catch (error: any) {
    return NextResponse.json({ error: 'Error al reaccionar.' }, { status: 500 });
  }
}
