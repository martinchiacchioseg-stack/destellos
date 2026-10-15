import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import {
  obtenerColgadosAyer,
  obtenerFaltantesHoy,
  obtenerRachaUsuario,
  generarEnlaceApurarWhatsApp,
  obtenerPublicidadPorUbicacion,
  obtenerReglasGrupo,
  obtenerDestelloGanadorDia,
} from '@/lib/db';
import { getFechaArgentina, getAyerFechaArgentina } from '@/lib/date-utils';

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  const grupoId = session.grupo_id || 'grupo-familia-perez-001';
  const fechaHoy = getFechaArgentina();
  const fechaAyer = getAyerFechaArgentina();

  const [colgadosAyer, faltantesHoyRaw, racha, publicidadPost, publicidadGanadora, reglas, destelloGanadorAyer] =
    await Promise.all([
      obtenerColgadosAyer(grupoId),
      obtenerFaltantesHoy(grupoId, fechaHoy),
      obtenerRachaUsuario(session.id, grupoId),
      (await obtenerPublicidadPorUbicacion('post_subida')) || (await obtenerPublicidadPorUbicacion('fin_desafio_reto_diario')),
      obtenerPublicidadPorUbicacion('foto_ganadora'),
      obtenerReglasGrupo(grupoId),
      obtenerDestelloGanadorDia(grupoId, fechaAyer),
    ]);

  const faltantesHoy = faltantesHoyRaw.map((m) => ({
    ...m,
    enlaceWhatsApp: generarEnlaceApurarWhatsApp(m.apodo || m.nombre.split(' ')[0]),
  }));

  return NextResponse.json({
    racha,
    colgadosAyer,
    faltantesHoy,
    publicidadPost,
    publicidadGanadora,
    reglas,
    destelloGanadorAyer,
  });
}
