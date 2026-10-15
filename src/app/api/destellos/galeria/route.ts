import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { listarGaleria, listarUsuariosGrupo } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  const grupoId = session.grupo_id || 'grupo-familia-perez-001';
  const { searchParams } = new URL(req.url);
  const usuarioId = searchParams.get('usuario_id');
  const tipoMedia = searchParams.get('tipo_media');

  let destellos = await listarGaleria(grupoId, 200);

  if (usuarioId) {
    destellos = destellos.filter((d) => d.usuario_id === usuarioId);
  }

  if (tipoMedia && (tipoMedia === 'foto' || tipoMedia === 'video')) {
    destellos = destellos.filter((d) => d.tipo_media === tipoMedia);
  }

  const miembros = await listarUsuariosGrupo(grupoId);

  return NextResponse.json({
    destellos,
    miembros,
    esAdmin: session.rol === 'admin' || session.rol === 'superadmin',
  });
}
