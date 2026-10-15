import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import {
  obtenerFechaProdeActiva,
  guardarPronosticoProde,
  corregirPartidosProde,
  sincronizarPartidosProde,
  obtenerPublicidadPorUbicacion,
} from '@/lib/db';

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  const grupoId = session.grupo_id || 'grupo-familia-perez-001';
  const data = await obtenerFechaProdeActiva(grupoId);
  const publicidad = await obtenerPublicidadPorUbicacion('prode');

  // Filtrar solo los pronósticos del usuario actual para su formulario
  const misPronosticos = data.pronosticos.filter((pr) => pr.usuario_id === session.id);

  return NextResponse.json({
    fecha: data.fecha,
    partidos: data.partidos,
    misPronosticos,
    publicidad,
    esAdmin: session.rol === 'admin' || session.rol === 'superadmin',
  });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    const grupoId = session.grupo_id || 'grupo-familia-perez-001';
    const body = await req.json();
    const { accion } = body;

    if (accion === 'pronosticar') {
      const { partidoId, pronostico, golesLocal, golesVisitante } = body;
      if (!partidoId || !pronostico) {
        return NextResponse.json({ error: 'Faltan datos de pronóstico.' }, { status: 400 });
      }

      const p = await guardarPronosticoProde(
        partidoId,
        session.id,
        pronostico,
        golesLocal !== undefined ? Number(golesLocal) : undefined,
        golesVisitante !== undefined ? Number(golesVisitante) : undefined
      );

      return NextResponse.json({ ok: true, mensaje: '¡Pronóstico guardado! ⚽', pronostico: p });
    }

    if (accion === 'sincronizar') {
      if (session.rol !== 'admin' && session.rol !== 'superadmin') {
        return NextResponse.json({ error: 'Acceso exclusivo de administrador.' }, { status: 403 });
      }
      const res = await sincronizarPartidosProde(grupoId);
      return NextResponse.json(res);
    }

    if (accion === 'corregir') {
      if (session.rol !== 'admin' && session.rol !== 'superadmin') {
        return NextResponse.json({ error: 'Acceso exclusivo de administrador.' }, { status: 403 });
      }
      const { fechaProdeId, resultadosManuales } = body;
      const res = await corregirPartidosProde(fechaProdeId, resultadosManuales);
      return NextResponse.json({ ok: true, mensaje: '¡Partidos corregidos y puntos otorgados!', res });
    }

    return NextResponse.json({ error: 'Acción no válida.' }, { status: 400 });
  } catch (error: any) {
    console.error('Error en /api/juegos/prode:', error);
    return NextResponse.json({ error: 'Error procesando Prode.' }, { status: 500 });
  }
}
