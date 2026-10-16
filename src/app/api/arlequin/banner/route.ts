import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { obtenerMensajeBannerArlequin } from '@/lib/gemini';
import { dbGetAll, dbGet } from '@/lib/sqlite-store';
import { Grupo, Usuario, Destello } from '@/lib/types';
import { getFechaArgentina } from '@/lib/date-utils';

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    const grupoId = session.grupo_id;
    if (!grupoId) {
      return NextResponse.json({
        banner: '¡Hola! 🎭 Arlequín te saluda. Sumate a una familia para arrancar la diversión con tus destellos diarios.',
      });
    }

    const grupo = dbGet<Grupo>('grupos', grupoId);
    const grupoNombre = grupo?.nombre || 'Familia';
    const horaLimite = grupo?.hora_limite || '22:00';

    const fechaHoy = getFechaArgentina();
    const miembros = dbGetAll<Usuario>('usuarios').filter((u) => u.grupo_id === grupoId && u.activo);
    const destellos = dbGetAll<Destello>('destellos').filter(
      (d) => d.grupo_id === grupoId && d.fecha === fechaHoy
    );

    const banner = await obtenerMensajeBannerArlequin(
      grupoNombre,
      miembros.length,
      destellos.length,
      horaLimite
    );

    return NextResponse.json({
      ok: true,
      banner,
      grupoNombre,
      horaLimite,
      miembrosTotal: miembros.length,
      miembrosSubieron: destellos.length,
    });
  } catch (error: any) {
    console.error('Error en /api/arlequin/banner:', error);
    return NextResponse.json(
      { banner: '¡Bienvenidos a Destellos! 🎭 Recuerden subir su foto del día antes de la hora límite.' },
      { status: 200 }
    );
  }
}
