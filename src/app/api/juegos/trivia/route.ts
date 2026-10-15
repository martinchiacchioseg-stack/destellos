import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import {
  obtenerTriviaDia,
  guardarTriviaPregunta,
  obtenerIntentoTriviaUsuario,
  registrarIntentoTrivia,
  otorgarPuntos,
  obtenerGrupoIdPorDefecto,
  getStore,
} from '@/lib/db';
import { generarPreguntaTrivia } from '@/lib/trivia';
import { getFechaArgentina } from '@/lib/date-utils';
import { DificultadTrivia, TriviaIntento } from '@/lib/types';
import { randomUUID } from 'crypto';

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const fecha = searchParams.get('fecha') || getFechaArgentina();
    const dificultadParam = (searchParams.get('dificultad') || 'medio').toLowerCase();
    const dificultad: DificultadTrivia =
      dificultadParam === 'facil' || dificultadParam === 'dificil' ? dificultadParam : 'medio';

    // 1. Verificar si el usuario ya jugó hoy
    const intento = await obtenerIntentoTriviaUsuario(session.id, fecha);
    if (intento) {
      // Buscar la pregunta que jugó para mostrar la explicación y dato curioso
      const store = getStore();
      const preguntaJugada = (store.triviaPreguntas || []).find((p) => p.id === intento.pregunta_id);
      return NextResponse.json({
        yaJugo: true,
        fecha,
        intento,
        pregunta: preguntaJugada || null,
      });
    }

    // 2. Obtener o generar la pregunta del día para la dificultad elegida
    let pregunta = await obtenerTriviaDia(fecha, dificultad);
    if (!pregunta) {
      pregunta = await generarPreguntaTrivia(fecha, dificultad);
      await guardarTriviaPregunta(pregunta);
    }

    // Para evitar trampas en inspección web, ocultamos la respuesta correcta antes de enviar
    const preguntaSegura = {
      id: pregunta.id,
      fecha: pregunta.fecha,
      difficulty: pregunta.difficulty,
      category: pregunta.category,
      question: pregunta.question,
      options: pregunta.options,
      points_win: pregunta.points_win,
      points_penalty: pregunta.points_penalty,
      time_limit_seconds: pregunta.time_limit_seconds,
    };

    return NextResponse.json({
      yaJugo: false,
      fecha,
      pregunta: preguntaSegura,
    });
  } catch (err: any) {
    console.error('Error en GET /api/juegos/trivia:', err);
    return NextResponse.json({ error: 'Error al cargar la trivia.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    const body = await req.json();
    const { preguntaId, respuestaIndex, tiempoAgotado } = body;

    if (!preguntaId) {
      return NextResponse.json({ error: 'ID de pregunta no proporcionado.' }, { status: 400 });
    }

    const fecha = getFechaArgentina();

    // 1. Validar que no haya jugado hoy
    const yaJugo = await obtenerIntentoTriviaUsuario(session.id, fecha);
    if (yaJugo) {
      return NextResponse.json(
        { error: 'Ya completaste tu desafío de trivia del día. ¡Volvé mañana por más puntos!' },
        { status: 400 }
      );
    }

    // 2. Buscar la pregunta completa
    const store = getStore();
    const pregunta = (store.triviaPreguntas || []).find((p) => p.id === preguntaId);
    if (!pregunta) {
      return NextResponse.json({ error: 'Pregunta no encontrada.' }, { status: 404 });
    }

    // 3. Evaluar respuesta
    const esTiempoAgotado = Boolean(tiempoAgotado);
    const acerto = !esTiempoAgotado && respuestaIndex === pregunta.correct_answer_index;
    const puntos = acerto ? pregunta.points_win : pregunta.points_penalty;

    const grupoId = session.grupo_id || (await obtenerGrupoIdPorDefecto());

    // 4. Registrar intento único
    const intento: TriviaIntento = {
      id: `intento_triv_${Date.now()}_${randomUUID().slice(0, 6)}`,
      usuario_id: session.id,
      grupo_id: grupoId,
      fecha,
      pregunta_id: pregunta.id,
      difficulty: pregunta.difficulty,
      respuesta_elegida_index: typeof respuestaIndex === 'number' ? respuestaIndex : -1,
      acerto,
      tiempo_agotado: esTiempoAgotado,
      puntos_obtenidos: puntos,
      creado_en: new Date().toISOString(),
    };

    await registrarIntentoTrivia(intento);

    // 5. Otorgar o descontar puntos en el ranking
    if (puntos !== 0) {
      await otorgarPuntos(
        grupoId,
        session.id,
        fecha,
        'trivia_diaria',
        puntos,
        acerto
          ? `🎯 ¡Acierto en Trivia Diaria (${pregunta.difficulty})! +${puntos} pts`
          : `❌ Error en Trivia Diaria (${pregunta.difficulty}): ${puntos} pts`,
        intento.id
      );
    }

    return NextResponse.json({
      ok: true,
      acerto,
      puntos,
      intento,
      pregunta, // Ahora sí revelamos explicación, respuesta correcta y dato curioso
    });
  } catch (err: any) {
    console.error('Error en POST /api/juegos/trivia:', err);
    return NextResponse.json({ error: 'Error al registrar tu respuesta de trivia.' }, { status: 500 });
  }
}
