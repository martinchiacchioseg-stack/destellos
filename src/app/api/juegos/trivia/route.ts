import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import {
  obtenerTriviaDelDia,
  responderTrivia,
  listarGrupos,
  reiniciarTriviaUsuario,
  dispararEventoPizarraArlequin,
} from '@/lib/db';
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

    // Opción para reiniciar intento en modo de prueba / superadmin
    if (searchParams.get('reset') === '1' && (session.rol === 'superadmin' || process.env.NODE_ENV !== 'production')) {
      await reiniciarTriviaUsuario(session.id, fecha);
    }

    // 1. Verificar si ya jugó hoy
    const intentos = dbGetAll<TriviaIntento>('triviaIntentos');
    const intento = intentos.find(
      (i) => i.usuario_id === session.id && i.grupo_id === grupoId && i.fecha === fecha
    );

    if (intento) {
      const preguntas = dbGetAll<TriviaPregunta>('triviaPreguntas');
      const preguntaJugada = preguntas.find((p) => p.id === intento.pregunta_id);
      const cIdx = preguntaJugada?.correct_index ?? preguntaJugada?.correct_answer_index ?? 0;

      return NextResponse.json({
        yaJugo: true,
        fecha,
        intento: {
          ...intento,
          selected_index: intento.selected_index ?? intento.respuesta_elegida_index ?? 0,
          respuesta_elegida_index: intento.respuesta_elegida_index ?? intento.selected_index ?? 0,
          tiempo_agotado: Boolean(intento.tiempo_agotado || (intento.selected_index !== undefined && intento.selected_index < 0)),
          difficulty: intento.difficulty || preguntaJugada?.difficulty || 'medio',
        },
        pregunta: preguntaJugada
          ? {
              ...preguntaJugada,
              correct_index: cIdx,
              correct_answer_index: cIdx,
              time_limit_seconds:
                preguntaJugada.time_limit_seconds ||
                (preguntaJugada.difficulty === 'facil' ? 15 : preguntaJugada.difficulty === 'medio' ? 20 : 25),
            }
          : null,
      });
    }

    // 2. Obtener la pregunta (ocultando el índice correcto y explicaciones al cliente antes de responder)
    const pregunta = await obtenerTriviaDelDia(grupoId, fecha, dificultad);

    const preguntaSegura = {
      id: pregunta.id,
      fecha: pregunta.fecha,
      difficulty: pregunta.difficulty,
      category: pregunta.category,
      question: pregunta.question,
      options: pregunta.options,
      points_win: pregunta.points_win || (dificultad === 'facil' ? 1 : dificultad === 'medio' ? 3 : 5),
      points_penalty: pregunta.points_penalty || 0,
      time_limit_seconds: pregunta.time_limit_seconds || (dificultad === 'facil' ? 15 : dificultad === 'medio' ? 20 : 25),
      comentario_arlequin: pregunta.comentario_arlequin,
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

    const body = await req.json();
    const preguntaId = body.preguntaId || body.pregunta_id;
    const selectedIndex =
      body.selectedIndex !== undefined
        ? Number(body.selectedIndex)
        : body.respuestaIndex !== undefined
        ? Number(body.respuestaIndex)
        : body.respuesta_elegida_index !== undefined
        ? Number(body.respuesta_elegida_index)
        : -1;

    const tiempoAgotado = Boolean(body.tiempoAgotado || body.tiempo_agotado || selectedIndex < 0);

    if (!preguntaId) {
      return NextResponse.json({ error: 'Falta identificación de la pregunta.' }, { status: 400 });
    }

    const fechaHoy = body.fecha || getFechaArgentina();

    const resultado = await responderTrivia(
      preguntaId,
      session.id,
      grupoId,
      fechaHoy,
      selectedIndex,
      tiempoAgotado,
      session.apodo || session.nombre
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
      intento: resultado.intento,
      evaluacionArlequin: resultado.evaluacion,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error al procesar respuesta.' }, { status: 400 });
  }
}
