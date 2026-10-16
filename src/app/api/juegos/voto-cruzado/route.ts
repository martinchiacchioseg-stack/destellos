import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { registrarVotoCruzado, obtenerVotoUsuarioHoy, listarDestellosDia, obtenerGrupoIdPorDefecto } from '@/lib/db';
import { getFechaArgentina } from '@/lib/date-utils';

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  const grupoId = session.grupo_id || (await obtenerGrupoIdPorDefecto());
  const fechaHoy = getFechaArgentina();

  const miVotoDestelloId = await obtenerVotoUsuarioHoy(grupoId, fechaHoy, session.id);
  const destellosHoy = await listarDestellosDia(grupoId, fechaHoy);

  return NextResponse.json({
    miVotoDestelloId,
    candidatos: destellosHoy
      .filter((d) => d.usuario_id !== session.id)
      .map((d) => ({
        id: d.id,
        media_url: d.media_url,
        pie_de_foto: d.pie_de_foto,
        autor_nombre: d.usuario?.nombre,
        votos: d.votos_comunidad || 0,
      })),
  });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    const grupoId = session.grupo_id || (await obtenerGrupoIdPorDefecto());
    const fechaHoy = getFechaArgentina();
    const { destelloId } = await req.json();

    if (!destelloId) {
      return NextResponse.json({ error: 'Seleccioná un destello para votar.' }, { status: 400 });
    }

    const res = await registrarVotoCruzado(grupoId, fechaHoy, session.id, destelloId);
    if (!res.ok) {
      return NextResponse.json({ error: res.mensaje }, { status: 400 });
    }

    return NextResponse.json(res);
  } catch (error: any) {
    return NextResponse.json({ error: 'Error al registrar voto.' }, { status: 500 });
  }
}
