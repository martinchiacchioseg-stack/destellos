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

/**
 * Valida en segundo plano y genera el aviso al administrador con Gemini
 */
export async function procesarAltaIntegranteConGemini(data: {
  nombre: string;
  apodo?: string;
  grupoNombre: string;
  adminNombre: string;
  whatsapp?: string;
}): Promise<{ mensajeAdmin: string; mensajeBienvenida: string }> {
  const fallbackMensajeAdmin = `¡Hola ${data.adminNombre}! ${data.nombre}${data.apodo ? ` ("${data.apodo}")` : ''} acaba de sumarse a la familia ${data.grupoNombre}. Ya puede compartir fotos y participar de los juegos diarios.`;
  const fallbackBienvenida = `¡Bienvenido/a ${data.nombre} a la familia ${data.grupoNombre}! Disfrutá de cada destello diario.`;

  if (!ai) {
    return {
      mensajeAdmin: fallbackMensajeAdmin,
      mensajeBienvenida: fallbackBienvenida,
    };
  }

  try {
    const prompt = `
Sos el asistente de "Destellos — un clic familiar by Rolφ", una app de Argentina donde las familias comparten fotos y juegan juntas.
Un nuevo integrante se sumó a una familia:
- Integrante: ${data.nombre} ${data.apodo ? `(Apodo: "${data.apodo}")` : ''}
- Familia / Grupo: ${data.grupoNombre}
- Administrador de la familia: ${data.adminNombre}

Generá:
1. "mensajeAdmin": Un mensaje cálido, alegre y afectuoso para notificar por email al administrador que este familiar se unió a la app. Estilo argentino familiar y cercano (máximo 3 oraciones).
2. "mensajeBienvenida": Una breve frase de bienvenida para el nuevo integrante.

Respondé ÚNICAMENTE un JSON:
{
  "mensajeAdmin": "texto...",
  "mensajeBienvenida": "texto..."
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json', temperature: 0.7 },
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    return {
      mensajeAdmin: parsed.mensajeAdmin || fallbackMensajeAdmin,
      mensajeBienvenida: parsed.mensajeBienvenida || fallbackBienvenida,
    };
  } catch (err) {
    console.warn('[Gemini] Error procesando alta de integrante:', err);
    return {
      mensajeAdmin: fallbackMensajeAdmin,
      mensajeBienvenida: fallbackBienvenida,
    };
  }
}

// ==============================================================================
// ASISTENTE ARLEQUÍN (Personalidad interna: Rolφ, cara pública: Arlequín)
// ==============================================================================

export async function obtenerMensajeBannerArlequin(
  grupoNombre: string,
  totalMiembros: number = 0,
  subieron: number = 0,
  horaLimite: string = '22:00'
): Promise<string> {
  const faltanSubir = Math.max(0, totalMiembros - subieron);
  const fallbacks = [
    `¡Buenas y santas, familia ${grupoNombre}! 🎭 Arlequín en la casa: hoy la foto del día promete chispas antes de las ${horaLimite} hs. ¿Ya subieron la suya?`,
    `¡Atención ${grupoNombre}! 🎭 Arlequín reportándose. Quedan ${faltanSubir} de ${totalMiembros} por subir su destello antes de las ${horaLimite} hs. ¡No se duerman en los laureles!`,
    `🎭 Arlequín dice: La vida es un destello... ¡y hoy sumamos puntos en el ranking familiar! Cierre a las ${horaLimite} hs.`,
  ];
  const fallback = fallbacks[Math.floor(Math.random() * fallbacks.length)];

  if (!ai) return fallback;

  try {
    const prompt = `
Sos "Arlequín", el asistente lúdico, pícaro, cariñoso y divertido de la app "Destellos" (tu esencia secreta es Rolφ, pero en pantalla siempre te llamás Arlequín).
Familia actual: "${grupoNombre}".
Faltan subir fotos: ${faltanSubir} de ${totalMiembros} integrantes.
Hora límite del día: ${horaLimite} hs.
Generá un mensaje brevísimo (máx 2 oraciones) para el banner principal del día:
- Debe tener chispa, humor rioplatense simpático y motivar a subir la foto diaria.
- Firmá siempre con emoji 🎭 o como Arlequín.
- Respondé SOLO el texto del mensaje, sin comillas ni intros.
`;
    const res = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { temperature: 0.8 },
    });
    return res.text?.trim() || fallback;
  } catch {
    return fallback;
  }
}

export async function charlarConArlequin(
  usuarioNombreOrParams:
    | string
    | {
        mensajeUsuario: string;
        usuarioNombre: string;
        grupoNombre?: string;
        historial?: Array<{ remitente: 'usuario' | 'arlequin'; texto: string }>;
      },
  grupoNombreArg?: string,
  mensajeUsuarioArg?: string,
  historialArg?: Array<{ remitente: 'usuario' | 'arlequin'; texto: string }>
): Promise<string> {
  let usuarioNombre = 'amigo';
  let grupoNombre = 'tu familia';
  let mensajeUsuario = '';
  let historial: Array<{ remitente: 'usuario' | 'arlequin'; texto: string }> = [];

  if (typeof usuarioNombreOrParams === 'object') {
    usuarioNombre = usuarioNombreOrParams.usuarioNombre || 'amigo';
    grupoNombre = usuarioNombreOrParams.grupoNombre || 'tu familia';
    mensajeUsuario = usuarioNombreOrParams.mensajeUsuario || '';
    historial = usuarioNombreOrParams.historial || [];
  } else {
    usuarioNombre = usuarioNombreOrParams || 'amigo';
    grupoNombre = grupoNombreArg || 'tu familia';
    mensajeUsuario = mensajeUsuarioArg || '';
    historial = historialArg || [];
  }

  if (!ai) {
    return `¡Hola ${usuarioNombre}! 🎭 Soy Arlequín. Por acá estoy listo para ayudarte con las fotos diarias, los juegos (la Ruleta Picante, el Prode o la Foto del Pasado) y la tabla de posiciones. ¿Qué duda tenés?`;
  }

  try {
    const systemPrompt = `
Sos "Arlequín", el simpático y carismático anfitrión de "Destellos — un clic familiar by Rolφ".
Tu personalidad interna está inspirada en "Rolφ" (el querido padre del creador Martín Chiacchio), pero de cara a los usuarios SIEMPRE te presentás y te hacés llamar "Arlequín".
Hablás en español rioplatense (argentino), con mucho humor, calidez familiar, picardía sana y entusiasmo.
Usuario con el que hablás: "${usuarioNombre}".
Familia / Grupo: "${grupoNombre}".

Tus conocimientos sobre la app:
1. Subida de fotos: cada integrante sube 1 foto al día antes de la hora límite (ej: 22:00 hs).
2. Revelación: a la hora límite (o cuando todos suben), se desbloquean las fotos y se adivina quién sacó cada una.
3. Foto del día: un jurado de IA (Gemini genérico) elige la foto más original o emotiva y le entrega un diploma de honor.
4. Mini-juegos:
   - Trivia de Arlequín: podés elegir Fácil (+1 pt), Medio (+3 pts) o Experto (+5 pts).
   - Ruleta Rusa Picante: preguntas picantes con cámara y bala giratoria.
   - Prode del Fútbol Argentino: pronósticos de la fecha.
   - Foto del Pasado: adivinar el año exacto de una foto retro.
   - Voto Cruzado: elegir tu foto favorita entre los familiares.
5. Rankings y puntos: cada acierto y foto ganadora suma puntos para la copa familiar.

Mantené respuestas breves (1 a 3 párrafos cortos), amenas y con emojis simpáticos 🎭✨📸.
`;

    const historialTexto = historial
      .slice(-6)
      .map((h) => `${h.remitente === 'usuario' ? usuarioNombre : 'Arlequín'}: ${h.texto}`)
      .join('\n');

    const promptCompleto = `${systemPrompt}\n\nHistorial reciente:\n${historialTexto}\n\n${usuarioNombre}: ${mensajeUsuario}\nArlequín:`;

    const res = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: promptCompleto,
      config: { temperature: 0.7 },
    });

    return res.text?.trim() || `¡De una, ${usuarioNombre}! 🎭 Arlequín al rescate. Si tenés dudas sobre los puntos o los juegos familiares, decime y lo resolvemos en un toque.`;
  } catch (err) {
    console.warn('[Gemini] Error en chat con Arlequín:', err);
    return `¡Epa, ${usuarioNombre}! 🎭 Tuve un pequeño tropiezo con los malabares, pero sigo acá. Preguntame de vuelta sobre las reglas, los juegos o las fotos familiares.`;
  }
}

export async function generarTriviaArlequin(dificultad: 'facil' | 'medio' | 'experto'): Promise<{
  pregunta: string;
  opciones: string[];
  respuestaCorrecta: number;
  explicacion: string;
  puntos: number;
  comentarioArlequin: string;
}> {
  const puntosPorDificultad = { facil: 1, medio: 3, experto: 5 };
  const puntos = puntosPorDificultad[dificultad] || 1;

  if (!ai) {
    return {
      pregunta: '¿Cuál es el río más ancho del mundo que baña las costas argentinas?',
      opciones: ['Río de la Plata', 'Río Paraná', 'Río Amazonas', 'Río Uruguay'],
      respuestaCorrecta: 0,
      explicacion: 'El Río de la Plata es considerado el más ancho del mundo, con hasta 220 km en su desembocadura.',
      puntos,
      comentarioArlequin: '🎭 ¡Preguntita clásica para calentar los motores familiares!',
    };
  }

  try {
    const prompt = `
Sos Arlequín, anfitrión de la Trivia en "Destellos".
Generá una pregunta de trivia de cultura general, curiosidades argentinas o mundiales para el nivel: "${dificultad}".
- Nivel fácil: cultura popular, geografía o comida típica (+1 pt).
- Nivel medio: historia, cine, música o ciencia interesante (+3 pts).
- Nivel experto: datos insólitos, récords mundiales o preguntas desafiantes (+5 pts).

Devolvé ÚNICAMENTE un JSON:
{
  "pregunta": "texto de la pregunta",
  "opciones": ["Opción A", "Opción B", "Opción C", "Opción D"],
  "respuestaCorrecta": 0,
  "explicacion": "Explicación breve y divertida del dato",
  "comentarioArlequin": "Un comentario gracioso o motivador de Arlequín presentando la pregunta"
}
`;

    const res = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json', temperature: 0.8 },
    });

    const parsed = JSON.parse(res.text?.trim() || '{}');
    if (parsed.pregunta && Array.isArray(parsed.opciones) && parsed.opciones.length === 4) {
      return {
        pregunta: parsed.pregunta,
        opciones: parsed.opciones,
        respuestaCorrecta: Number(parsed.respuestaCorrecta) || 0,
        explicacion: parsed.explicacion || '',
        puntos,
        comentarioArlequin: parsed.comentarioArlequin || '🎭 ¡A ver quién se anima a responder!',
      };
    }
  } catch (err) {
    console.warn('[Gemini] Error en Trivia Arlequín:', err);
  }

  return {
    pregunta: '¿Qué animal autóctono aparece en el billete argentino de 1000 pesos de la serie animales?',
    opciones: ['El Hornero', 'El Yaguareté', 'La Ballena Franca', 'El Guanaco'],
    respuestaCorrecta: 0,
    explicacion: 'El hornero, ave nacional de Argentina, ilustra el billete de $1000.',
    puntos,
    comentarioArlequin: '🎭 ¡Arlequín te desafía con un clásico de la billetera!',
  };
}

export async function generarRecordatorioHumorWhatsApp(
  nombreFaltante: string,
  horaLimite: string,
  grupoNombre: string
): Promise<string> {
  const fallbacks = [
    `¡Che, ${nombreFaltante}! 🎭 Te habla Arlequín de Destellos. Toda la familia ${grupoNombre} ya tiene el mate listo y falta tu foto. ¡Tenés hasta las ${horaLimite} hs o te declaramos culpable del misterio! 📸⏰`,
    `¡Atención ${nombreFaltante}! 🚨 Alerta de Arlequín: el reloj no para y en ${grupoNombre} nos estamos quedando sin destellos tuyos. ¡Subí tu foto antes de las ${horaLimite} hs que hoy se define el ranking! ✨`,
    `¡Hola ${nombreFaltante}! 🎭 Arlequín te susurra al oído: falta nada para las ${horaLimite} hs. Meté foto en Destellos que la familia te está esperando. ¡Un clic y listo! 📸🙌`,
  ];
  const fallback = fallbacks[Math.floor(Math.random() * fallbacks.length)];

  if (!ai) return fallback;

  try {
    const prompt = `
Sos Arlequín, el asistente divertido de "Destellos".
Generá un mensaje corto de WhatsApp para apurar con mucho humor y cariño argentino a "${nombreFaltante}" de la familia "${grupoNombre}", que todavía no subió su foto del día.
Hora límite del grupo: ${horaLimite} hs.
- Debe ser simpático, sin ser pesado.
- Firmá como Arlequín 🎭.
- Máximo 3 oraciones cortas.
- Devolvé SOLO el texto para copiar en WhatsApp.
`;
    const res = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { temperature: 0.8 },
    });
    return res.text?.trim() || fallback;
  } catch {
    return fallback;
  }
}


