import { GoogleGenAI } from '@google/genai';
import { AILog, DificultadTrivia, TriviaPregunta } from './types';
import { dbUpsert } from './sqlite-store';
import { randomUUID } from 'crypto';

const apiKey = process.env.GEMINI_API_KEY || '';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

/**
 * Elige el Destello del Día con Gemini de manera resiliente.
 * Devuelve SOLO el ID de la foto ganadora sin explicar el motivo al usuario.
 */
export async function elegirDestelloDelDia(
  destellos: Array<{
    id: string;
    usuario_id: string;
    autor_nombre: string;
    media_url: string;
    pie_de_foto?: string;
  }>,
  grupoId: string,
  fecha: string
): Promise<{ ganadorDestelloId: string; ganadorUsuarioId: string; usadoFallback: boolean }> {
  if (!destellos || destellos.length === 0) {
    throw new Error('No hay destellos para evaluar.');
  }

  // Caso borde: un solo participante
  if (destellos.length === 1) {
    return {
      ganadorDestelloId: destellos[0].id,
      ganadorUsuarioId: destellos[0].usuario_id,
      usadoFallback: false,
    };
  }

  // Si Gemini está disponible, intentamos la evaluación con reintento y backoff
  if (ai) {
    for (let intento = 1; intento <= 2; intento++) {
      try {
        const resumen = destellos.map((d) => ({
          id: d.id,
          autor: d.autor_nombre,
          pie_de_foto: d.pie_de_foto || 'Sin pie de foto',
        }));

        const prompt = `
Actuá como el jurado de la app familiar "Destellos".
Hoy los miembros del grupo compartieron estas fotos:
${JSON.stringify(resumen, null, 2)}

Elegí una sola foto ganadora considerando espontaneidad, emoción, ternura, humor o belleza cotidiana.
IMPORTANTE: No expliques el motivo. Devolvé ÚNICAMENTE un objeto JSON válido con la siguiente estructura:
{
  "ganador_id": "ID_DE_LA_FOTO_ELEGIDA"
}
`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.7,
          },
        });

        const texto = response.text?.trim() || '{}';
        const parsed = JSON.parse(texto);
        const elegido = destellos.find((d) => d.id === parsed.ganador_id);

        if (elegido) {
          // Registrar en log de IA
          const logEntry: AILog = {
            id: randomUUID(),
            grupo_id: grupoId,
            fecha,
            tipo_accion: 'elegir_destello',
            prompt_resumen: `Evaluados ${destellos.length} destellos`,
            respuesta_ia: texto,
            ganador_elegido_id: elegido.id,
            usado_fallback: false,
            creado_en: new Date().toISOString(),
          };
          try {
            dbUpsert('ai_logs' as any, logEntry);
          } catch {}

          return {
            ganadorDestelloId: elegido.id,
            ganadorUsuarioId: elegido.usuario_id,
            usadoFallback: false,
          };
        }
      } catch (err: any) {
        console.warn(`[Gemini] Intento ${intento} fallido al elegir destello:`, err?.message);
        if (intento < 2) {
          await new Promise((res) => setTimeout(res, 1200));
        }
      }
    }
  }

  // Fallback justo y aleatorio si la IA no está disponible o falla
  const indiceAzar = Math.floor(Math.random() * destellos.length);
  const fallbackElegido = destellos[indiceAzar];

  const logFallback: AILog = {
    id: randomUUID(),
    grupo_id: grupoId,
    fecha,
    tipo_accion: 'elegir_destello_fallback',
    prompt_resumen: `Fallback aleatorio sobre ${destellos.length} fotos`,
    ganador_elegido_id: fallbackElegido.id,
    usado_fallback: true,
    error: 'Gemini no respondió o no devolvió un JSON válido. Se aplicó selección aleatoria justa.',
    creado_en: new Date().toISOString(),
  };
  try {
    dbUpsert('ai_logs' as any, logFallback);
  } catch {}

  return {
    ganadorDestelloId: fallbackElegido.id,
    ganadorUsuarioId: fallbackElegido.usuario_id,
    usadoFallback: true,
  };
}

/**
 * Modera contenido con Gemini antes de publicarlo
 */
export async function moderarContenido(pieDeFoto?: string): Promise<{ esApto: boolean; motivo?: string }> {
  if (!pieDeFoto || !ai) {
    return { esApto: true };
  }

  try {
    const prompt = `
Analizá el siguiente texto de un usuario en una aplicación para familias y grupos de amigos:
"${pieDeFoto}"

Determiná si contiene lenguaje de odio explícito, amenazas, acoso o contenido inapropiado severo.
Respondé ÚNICAMENTE un JSON:
{
  "apto": true o false,
  "motivo": "explicación breve si fue rechazado"
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const parsed = JSON.parse(response.text?.trim() || '{"apto": true}');
    return {
      esApto: Boolean(parsed.apto),
      motivo: parsed.motivo,
    };
  } catch {
    // Si la IA falla en moderación, no bloqueamos la subida
    return { esApto: true };
  }
}

/**
 * Genera una pregunta de Trivia Diaria en español rioplatense apto para toda la familia
 */
export async function generarTriviaDiaria(
  dificultad: DificultadTrivia = 'medio',
  preguntasYaUsadas: string[] = []
): Promise<Omit<TriviaPregunta, 'id' | 'grupo_id' | 'fecha' | 'creado_en'>> {
  const puntosWin = dificultad === 'facil' ? 10 : dificultad === 'medio' ? 25 : 50;
  const puntosPenalty = dificultad === 'facil' ? 0 : dificultad === 'medio' ? -5 : -15;

  if (ai) {
    try {
      const prompt = `
Generá 1 pregunta de trivia en español rioplatense (Argentina/Uruguay), apta y divertida para compartir en familia o con amigos.
Nivel de dificultad: ${dificultad.toUpperCase()}.
Temas: cultura general, cine, comidas típicas, geografía, costumbres, ciencia cotidiana, música o historia curiosa.

Preguntas ya realizadas recientemente (NO REPETIR NINGUNA DE ESTAS):
${JSON.stringify(preguntasYaUsadas.slice(-20))}

ESTRUCTURA JSON REQUERIDA (devolver ÚNICAMENTE JSON):
{
  "category": "Categoría (ej: Cine y Series, Costumbres Argentinas, Comida, etc.)",
  "question": "Texto claro de la pregunta",
  "options": ["Opción A", "Opción B", "Opción C", "Opción D"],
  "correct_index": 0, // índice de la opción correcta (entre 0 y 3)
  "explanation": "Explicación breve y amena de por qué esa es la respuesta correcta",
  "fun_fact": "Un dato curioso o anécdota simpática relacionada"
}
`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.85,
        },
      });

      const parsed = JSON.parse(response.text?.trim() || '{}');
      if (
        parsed.question &&
        Array.isArray(parsed.options) &&
        parsed.options.length === 4 &&
        typeof parsed.correct_index === 'number'
      ) {
        return {
          difficulty: dificultad,
          category: parsed.category || 'Cultura General',
          question: parsed.question,
          options: parsed.options,
          correct_index: parsed.correct_index,
          explanation: parsed.explanation || '',
          fun_fact: parsed.fun_fact || '',
          points_win: puntosWin,
          points_penalty: puntosPenalty,
        };
      }
    } catch (err) {
      console.warn('[Gemini] Error generando trivia:', err);
    }
  }

  // Pregunta de reserva de calidad garantizada
  return {
    difficulty: dificultad,
    category: 'Costumbres y Curiosidades',
    question: '¿En qué año se declaró oficialmente al Mate como infusión nacional en la República Argentina?',
    options: ['2013', '1995', '2001', '1983'],
    correct_index: 0,
    explanation: 'La Ley 26.871 sancionada en 2013 declaró al mate como infusión nacional y a la Argentina como país de origen de esta tradición.',
    fun_fact: 'En promedio, cada habitante en Argentina consume cerca de 6,4 kilos de yerba mate por año.',
    points_win: puntosWin,
    points_penalty: puntosPenalty,
  };
}

const RETOS_BACKUP = [
  { tema: '☕ Desayuno o mate criollo', descripcion: 'Mostrá tu taza favorita, el mate o las tostadas que te acompañan hoy.' },
  { tema: '👟 Calzado listo para arrancar', descripcion: 'Una foto de tus zapatillas o pantuflas del día.' },
  { tema: '🌿 Rincón verde del hogar', descripcion: 'Una plantita, una flor o ese lugarcito con luz natural de tu casa.' },
  { tema: '🐾 Mascota o recuerdo familiar', descripcion: 'La mirada de tu compañero de 4 patas o un recuerdo con historia.' },
  { tema: '📚 Objeto con historia', descripcion: 'Algo que tengas hace años y guardes con mucho afecto.' },
];

export async function generarRetoDelDia(fecha: string): Promise<{ tema: string; descripcion: string }> {
  if (!ai) {
    const index = Math.abs(fecha.split('-').reduce((acc, curr) => acc + parseInt(curr, 10), 0)) % RETOS_BACKUP.length;
    return RETOS_BACKUP[index];
  }

  try {
    const prompt = `
Sos el asistente amigable de "Destellos", una app familiar en Argentina.
Hoy es ${fecha}.
Generá un RETO FOTOGRÁFICO DEL DÍA:
- Debe ser positivo, simple, accesible para cualquier persona de la familia.
- No requiere salir de casa ni equipos especiales.
- Debe tener chispa, humor o calidez familiar en español rioplatense.

Devolvé ÚNICAMENTE un objeto JSON válido con este formato:
{
  "tema": "Título corto y simpático con un emoji (máx 5 palabras)",
  "descripcion": "Instrucción cálida y motivadora en 1 o 2 oraciones breves."
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json', temperature: 0.8 },
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    if (parsed.tema && parsed.descripcion) {
      return { tema: parsed.tema, descripcion: parsed.descripcion };
    }
  } catch (err) {
    console.warn('[Gemini] Error generando reto:', err);
  }

  const index = Math.abs(fecha.split('-').reduce((acc, curr) => acc + parseInt(curr, 10), 0)) % RETOS_BACKUP.length;
  return RETOS_BACKUP[index];
}

export async function moderarPreguntaRuleta(
  textoPregunta: string,
  nivel: 'suave' | 'picante' | 'extra_picante'
): Promise<{ aprobada: boolean; motivoRechazo?: string }> {
  if (!textoPregunta || textoPregunta.trim().length < 5) {
    return { aprobada: false, motivoRechazo: 'La pregunta es demasiado corta.' };
  }

  if (!ai) {
    const palabrasProhibidas = ['estúpido', 'idiota', 'odio', 'hdp'];
    const esOfensiva = palabrasProhibidas.some((p) => textoPregunta.toLowerCase().includes(p));
    return {
      aprobada: !esOfensiva,
      motivoRechazo: esOfensiva ? 'Contiene términos no apropiados para el grupo familiar.' : undefined,
    };
  }

  try {
    const prompt = `
Sos el moderador de "Ruleta Rusa", un juego para familias y amigos en la app "Destellos".
El nivel seleccionado es: "${nivel}".
La pregunta enviada es: "${textoPregunta}".

Reglas estrictas de moderación:
- Se permite el humor, el doble sentido pícaro y la curiosidad divertida (especialmente en niveles picante y extra picante).
- PROHIBIDO: odio, racismo, discriminación, violencia, ataques personales crueles o lenguaje explícito denigrante.

Devolvé ÚNICAMENTE un JSON:
{
  "aprobada": true o false,
  "motivoRechazo": "Motivo breve si fue rechazada o vacío si fue aprobada"
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json', temperature: 0.1 },
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    return {
      aprobada: Boolean(parsed.aprobada),
      motivoRechazo: parsed.motivoRechazo || undefined,
    };
  } catch {
    return { aprobada: true };
  }
}

