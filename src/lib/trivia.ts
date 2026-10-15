import { GoogleGenAI } from '@google/genai';
import { DificultadTrivia, TriviaPregunta } from './types';
import { randomUUID } from 'crypto';

const apiKey = process.env.GEMINI_API_KEY || '';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// Parámetros y reglas por dificultad
export const REGLAS_DIFICULTAD = {
  facil: {
    nombre: 'Fácil',
    opciones: 3,
    time_limit_seconds: 15,
    points_win: 10,
    points_penalty: 0,
    descripcion: 'Cultura general, cine popular, música y curiosidades simples.',
    badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  },
  medio: {
    nombre: 'Medio',
    opciones: 4,
    time_limit_seconds: 20,
    points_win: 25,
    points_penalty: -5,
    descripcion: 'Ingenio, historia, geografía, deportes o ciencia cotidiana.',
    badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  },
  dificil: {
    nombre: 'Difícil',
    opciones: 4,
    time_limit_seconds: 25,
    points_win: 50,
    points_penalty: -15,
    descripcion: 'Datos poco conocidos, trampas de lógica y erudición.',
    badgeColor: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  },
} as const;

// Banco de preguntas de respaldo curadas para máxima estabilidad
const PREGUNTAS_FALLBACK: Record<DificultadTrivia, Array<Omit<TriviaPregunta, 'id' | 'fecha'>>> = {
  facil: [
    {
      difficulty: 'facil',
      category: 'Cine & TV',
      question: '¿Cómo se llama el muñeco de nieve que cobra vida en la película "Frozen"?',
      options: ['Olaf', 'Sven', 'Kristoff'],
      correct_answer_index: 0,
      points_win: 10,
      points_penalty: 0,
      time_limit_seconds: 15,
      explanation: 'Olaf es el simpático muñeco de nieve creado por los poderes de Elsa.',
      fun_fact: 'A Olaf le encantan los abrazos cálidos, a pesar de que se derretiría.',
    },
    {
      difficulty: 'facil',
      category: 'Música Latina',
      question: '¿Qué artista internacional es conocido mundialmente como "El Sol de México"?',
      options: ['Ricky Martin', 'Luis Miguel', 'Chayanne'],
      correct_answer_index: 1,
      points_win: 10,
      points_penalty: 0,
      time_limit_seconds: 15,
      explanation: 'Luis Miguel comenzó a ser apodado "El Sol" por su madre cuando era un niño.',
      fun_fact: 'A los 14 años ya ganó su primer premio Grammy por un dúo con Sheena Easton.',
    },
    {
      difficulty: 'facil',
      category: 'Gastronomía',
      question: '¿Cuál es el ingrediente principal tradicional del guacamole mexicano?',
      options: ['Tomate', 'Palta (Aguacate)', 'Pepinillo'],
      correct_answer_index: 1,
      points_win: 10,
      points_penalty: 0,
      time_limit_seconds: 15,
      explanation: 'El guacamole se prepara machacando palta con limón, sal y condimentos.',
      fun_fact: 'Los aztecas ya preparaban una salsa llamada "ahuacamolli" hace más de 500 años.',
    },
    {
      difficulty: 'facil',
      category: 'Cultura General',
      question: '¿Cuántos días tiene un año bisiesto?',
      options: ['364 días', '365 días', '366 días'],
      correct_answer_index: 2,
      points_win: 10,
      points_penalty: 0,
      time_limit_seconds: 15,
      explanation: 'Cada cuatro años se añade el 29 de febrero sumando 366 días.',
      fun_fact: 'La Tierra tarda aproximadamente 365 días y 6 horas en orbitar al Sol.',
    },
  ],
  medio: [
    {
      difficulty: 'medio',
      category: 'Fútbol & Deportes',
      question: '¿En qué año ganó la Selección Argentina su primera Copa del Mundo de fútbol?',
      options: ['1974', '1978', '1982', '1986'],
      correct_answer_index: 1,
      points_win: 25,
      points_penalty: -5,
      time_limit_seconds: 20,
      explanation: 'Argentina fue campeona en el Mundial de 1978 disputado en nuestro país, con Kempes como figura.',
      fun_fact: 'Mario Kempes no convirtió ningún gol en la primera ronda y luego fue el goleador del torneo.',
    },
    {
      difficulty: 'medio',
      category: 'Ciencia & Naturaleza',
      question: '¿Cuál es el único mamífero capaz de volar activamente batiendo alas?',
      options: ['La ardilla voladora', 'El murciélago', 'El lémur volador', 'El colibrí'],
      correct_answer_index: 1,
      points_win: 25,
      points_penalty: -5,
      time_limit_seconds: 20,
      explanation: 'Los murciélagos poseen alas con membranas y son los únicos mamíferos con vuelo sostenido.',
      fun_fact: 'Las ardillas y lémures planean, pero no baten alas como el murciélago.',
    },
    {
      difficulty: 'medio',
      category: 'Geografía',
      question: '¿Cuál es el río más caudaloso del mundo?',
      options: ['Río Nilo', 'Río Yangtsé', 'Río Amazonas', 'Río Misisipi'],
      correct_answer_index: 2,
      points_win: 25,
      points_penalty: -5,
      time_limit_seconds: 20,
      explanation: 'El río Amazonas transporta más agua que el Nilo, el Yangtsé y el Misisipi juntos.',
      fun_fact: 'Representa aproximadamente una quinta parte del total de caudal fluvial del planeta.',
    },
    {
      difficulty: 'medio',
      category: 'Historia',
      question: '¿En qué año cayó el Muro de Berlín, símbolo de la Guerra Fría?',
      options: ['1987', '1989', '1991', '1993'],
      correct_answer_index: 1,
      points_win: 25,
      points_penalty: -5,
      time_limit_seconds: 20,
      explanation: 'El Muro de Berlín cayó la noche del 9 de noviembre de 1989.',
      fun_fact: 'Una rueda de prensa confusa de un portavoz del gobierno aceleró la apertura inmediata.',
    },
  ],
  dificil: [
    {
      difficulty: 'dificil',
      category: 'Ciencia & Espacio',
      question: '¿Qué planeta de nuestro Sistema Solar rota sobre su eje en sentido horario (de este a oeste)?',
      options: ['Marte', 'Venus', 'Saturno', 'Júpiter'],
      correct_answer_index: 1,
      points_win: 50,
      points_penalty: -15,
      time_limit_seconds: 25,
      explanation: 'Venus tiene rotación retrógrada: en Venus el Sol sale por el oeste y se pone por el este.',
      fun_fact: 'Un día en Venus dura 243 días terrestres, más largo que su propio año (225 días).',
    },
    {
      difficulty: 'dificil',
      category: 'Curiosidades Absurdas',
      question: '¿De qué color es la leche de una hembra de hipopótamo?',
      options: ['Blanca espesa', 'Rosa brillante', 'Amarillo pálido', 'Celeste verdoso'],
      correct_answer_index: 1,
      points_win: 50,
      points_penalty: -15,
      time_limit_seconds: 25,
      explanation: 'El hipopótamo secreta un fluido rojizo protector de la piel que, al mezclarse con la leche blanca, le otorga un color rosado.',
      fun_fact: 'Esta secreción actúa como bloqueador solar y antiséptico natural contra bacterias.',
    },
    {
      difficulty: 'dificil',
      category: 'Historia & Literatura',
      question: '¿En qué idioma escribió Franz Kafka sus obras más famosas como "La metamorfosis"?',
      options: ['Checo', 'Alemán', 'Yidis', 'Francés'],
      correct_answer_index: 1,
      points_win: 50,
      points_penalty: -15,
      time_limit_seconds: 25,
      explanation: 'Aunque Kafka nació y vivió en Praga (entonces Imperio Austrohúngaro), toda su obra la escribió en alemán.',
      fun_fact: 'Antes de morir le pidió a su amigo Max Brod que quemara todos sus manuscritos, pero este desobedeció.',
    },
    {
      difficulty: 'dificil',
      category: 'Mundo Animal',
      question: '¿Cuántos corazones tiene un pulpo?',
      options: ['1 corazón', '2 corazones', '3 corazones', '5 corazones'],
      correct_answer_index: 2,
      points_win: 50,
      points_penalty: -15,
      time_limit_seconds: 25,
      explanation: 'Tienen 3 corazones: dos bombean sangre a las branquias y uno al resto del cuerpo.',
      fun_fact: 'Su sangre es de color azul porque utiliza hemocianina rica en cobre en lugar de hierro.',
    },
  ],
};

/**
 * Genera una pregunta de trivia usando Gemini AI adaptada a las reglas solicitadas por el usuario.
 * Si falla o no hay conexión/API Key, utiliza una pregunta curada de respaldo.
 */
export async function generarPreguntaTrivia(
  fecha: string,
  dificultad: DificultadTrivia
): Promise<TriviaPregunta> {
  const regla = REGLAS_DIFICULTAD[dificultad] || REGLAS_DIFICULTAD.facil;
  const difPrompt = dificultad === 'facil' ? 'fácil' : dificultad === 'medio' ? 'medio' : 'difícil';

  if (ai) {
    try {
      const prompt = `
Actúa como el motor de generación de preguntas para el minijuego "Trivia Diaria" dentro de una aplicación grupal de amigos y familia en Argentina.

Tu objetivo es generar una pregunta aleatoria, entretenida y desafiante, adaptada al nivel de dificultad que se te solicite, devolviendo ÚNICAMENTE un objeto JSON válido (sin texto introductorio, sin bloques markdown innecesarios, solo el JSON puro).

REGLAS DE DIFICULTAD Y PUNTUACIÓN:
- Nivel "fácil": 
  * Pregunta accesible de cultura general, cine popular, música conocida o curiosidades simples.
  * Opciones: 3 opciones.
  * Tiempo límite recomendado: 15 segundos.
  * Puntos por acierto: 10 pts.
  * Penalización por error/tiempo agotado: 0 pts.

- Nivel "medio":
  * Pregunta de ingenio, historia, geografía, deportes o ciencia cotidiana que requiera pensar un poco.
  * Opciones: 4 opciones.
  * Tiempo límite recomendado: 20 segundos.
  * Puntos por acierto: 25 pts.
  * Penalización por error/tiempo agotado: -5 pts.

- Nivel "difícil":
  * Pregunta específica, dato poco conocido o trampa de lógica interesante.
  * Opciones: 4 opciones.
  * Tiempo límite recomendado: 25 segundos.
  * Puntos por acierto: 50 pts.
  * Penalización por error/tiempo agotado: -15 pts.

REQUISITOS DEL CONTENIDO:
1. Variedad temática: cine, música, deportes, ciencia, historia, comida o curiosidades absurdas.
2. Tono: dinámico, fresco y entretenido para debatir en el grupo familiar/amigos.
3. Las opciones deben ser creíbles, evitando respuestas obvias o absurdas por defecto.
4. Incluir un dato curioso breve ("fun_fact") para mostrar una vez que respondan.

FORMATO DE SALIDA (JSON ESTRICTO):
{
  "category": "Nombre de la categoría (ej: Cine & Series, Deportes, Ciencia, Curiosidades)",
  "question": "¿Texto claro de la pregunta?",
  "options": [
    "Opción A",
    "Opción B",
    "Opción C"
  ],
  "correct_answer_index": 0,
  "explanation": "Breve explicación de por qué es la correcta.",
  "fun_fact": "Dato curioso complementario para picar al grupo."
}

PARÁMETRO DE ENTRADA:
Dificultad solicitada: ${difPrompt}
Fecha actual: ${fecha}
`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.85,
        },
      });

      const text = response.text?.trim() || '';
      const parsed = JSON.parse(text);

      if (
        parsed &&
        parsed.question &&
        Array.isArray(parsed.options) &&
        typeof parsed.correct_answer_index === 'number'
      ) {
        return {
          id: `triv_${fecha}_${dificultad}_${randomUUID().slice(0, 8)}`,
          fecha,
          difficulty: dificultad,
          category: parsed.category || 'Trivia Diaria',
          question: parsed.question,
          options: parsed.options.slice(0, regla.opciones),
          correct_answer_index: Math.min(
            parsed.correct_answer_index,
            parsed.options.slice(0, regla.opciones).length - 1
          ),
          points_win: regla.points_win,
          points_penalty: regla.points_penalty,
          time_limit_seconds: regla.time_limit_seconds,
          explanation: parsed.explanation || '¡Esa era la respuesta correcta!',
          fun_fact: parsed.fun_fact || '¡Un dato para compartir con la familia!',
        };
      }
    } catch (e) {
      console.error('Error generando trivia con Gemini, usando fallback:', e);
    }
  }

  // Fallback determinista pero variado por fecha
  const list = PREGUNTAS_FALLBACK[dificultad];
  const dateHash = fecha.split('-').reduce((acc, c) => acc + parseInt(c, 10), 0);
  const selected = list[dateHash % list.length];

  return {
    ...selected,
    id: `triv_${fecha}_${dificultad}_fallback`,
    fecha,
    difficulty: dificultad,
    points_win: regla.points_win,
    points_penalty: regla.points_penalty,
    time_limit_seconds: regla.time_limit_seconds,
  };
}
