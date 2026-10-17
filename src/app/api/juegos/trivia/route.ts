import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { obtenerTriviaDelDia, responderTrivia, listarGrupos, dispararEventoPizarraArlequin } from '@/lib/db';
import { getFechaArgentina } from '@/lib/date-utils';
import { DificultadTrivia, TriviaIntento, TriviaPregunta } from '@/lib/types';
import { dbGetAll } from '@/lib/sqlite-store';

export async function GET(req: NextRequest) {
  try {
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
      return NextResponse.json({ error: 'Sin grupo.' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const fecha = searchParams.get('fecha') || getFechaArgentina();
    const difParam = (searchParams.get('dificultad') || 'medio').toLowerCase();
    const dificultad: DificultadTrivia =
      difParam === 'facil' || difParam === 'dificil' ? difParam : 'medio';

    // 1. Verificar si ya jugó hoy
    const intentos = dbGetAll<TriviaIntento>('triviaIntentos');
    const intento = intentos.find(
      (i) => i.usuario_id === session.id && i.grupo_id === grupoId && i.fecha === fecha
    );

    if (intento) {
      const preguntas = dbGetAll<TriviaPregunta>('triviaPreguntas');
      const preguntaJugada = preguntas.find((p) => p.id === intento.pregunta_id);
      return NextResponse.json({
        yaJugo: true,
        fecha,
        intento,
        pregunta: preguntaJugada || null,
      });
    }

    // 2. Obtener la pregunta (ocultando el índice correcto al cliente)
    const pregunta = await obtenerTriviaDelDia(grupoId, fecha, dificultad);

    const preguntaSegura = {
      id: pregunta.id,
      fecha: pregunta.fecha,
      difficulty: pregunta.difficulty,
      category: pregunta.category,
      question: pregunta.question,
      options: pregunta.options,
      points_win: pregunta.points_win,
      points_penalty: pregunta.points_penalty,
    };

    return NextResponse.json({
      yaJugo: false,
      fecha,
      pregunta: preguntaSegura,
    });
  } catch (error: any) {
    console.error('Error en GET /api/juegos/trivia:', error);
    return NextResponse.json({ error: 'Error al consultar trivia.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
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
      return NextResponse.json({ error: 'Sin grupo.' }, { status: 400 });
    }

    const { preguntaId, selectedIndex, fecha } = await req.json();

    if (!preguntaId || typeof selectedIndex !== 'number') {
      return NextResponse.json({ error: 'Datos incompletos.' }, { status: 400 });
    }

    const fechaHoy = fecha || getFechaArgentina();

    const resultado = await responderTrivia(
      preguntaId,
      session.id,
      grupoId,
      fechaHoy,
      selectedIndex
    );

    // Disparar evento a la Pizarra LED (respetando rate-limit de 10 min)
    dispararEventoPizarraArlequin({
      tipo: 'trivia',
      grupoId,
      metadata: {
        usuarioNombre: session.apodo || session.nombre,
        puntos: resultado.puntos,
      },
    }).catch(() => {});

    return NextResponse.json({
      ok: true,
      acerto: resultado.acerto,
      puntos: resultado.puntos,
      pregunta: resultado.pregunta,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error al procesar respuesta.' }, { status: 400 });
  }
}
