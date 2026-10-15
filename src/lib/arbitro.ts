import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY || '';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export interface DestelloCandidato {
  id: string;
  usuario_id: string;
  autor_nombre: string;
  media_url?: string;
  pie_de_foto?: string;
  cumple_reto?: boolean;
}

export interface ResultadoDestello {
  tipo_evento: 'resultado_destello';
  ganador_usuario_id: string;
  puntos_otorgados: number; // 50
  titulo_diploma: string;
  motivo_jurado: string;
  resumen_dia: string;
}

export interface RecordatorioWhatsApp {
  tipo_evento: 'recordatorio_whatsapp';
  usuario_apurado: string;
  urgencia: 'leve' | 'media' | 'critica';
  mensaje_whatsapp: string;
}

// Diplomas cómicos de respaldo
const DIPLOMAS_BACKUP = [
  'Máster Supremo del Ángulo Dudoso',
  'Gran Duque del Desenfoque Artístico Involuntario',
  'Emperador de la Cara de Recién Levantado',
  'Doctor Honoris Causa en Iluminación Cuestionable',
  'Comendador de la Comida Fría pero Fotogénica',
  'Patriarca Supremo del Flash a Quemarropa',
  'Capitán Vitalicio de las Pantuflas con Orgullo',
];

const MOTIVOS_BACKUP = [
  'Logró desafiar todas las leyes de la física óptica con una pose que mezcla desconcierto existencial y valentía pura.',
  'La composición visual es tan audaz que el mismísimo Louvre está evaluando seriamente reemplazar la Mona Lisa.',
  'Capturó con total crudeza la belleza de la fiaca dominical en un solo disparo glorioso.',
  'Nadie en este árbol genealógico se animó a tanto; un derroche de carisma desmedido y sinceridad.',
];

const RESUMENES_BACKUP = [
  'Hoy la vara estuvo altísima... o bajísima, según el oftalmólogo que lo mire, ¡pero qué manera de reírnos!',
  'Un festival de caras raras, mates lavados y momentos que merecen ir directo a los archivos familiares.',
  'Si la NASA viera las fotos de hoy, suspende todas las misiones por exceso de misterio.',
];

/**
 * TAREA 1: EVALUAR DESTELLO ("accion": "evaluar_destello")
 */
export async function evaluarDestello(
  candidatos: DestelloCandidato[]
): Promise<ResultadoDestello> {
  if (!candidatos || candidatos.length === 0) {
    return {
      tipo_evento: 'resultado_destello',
      ganador_usuario_id: 'sin_participantes',
      puntos_otorgados: 50,
      titulo_diploma: 'Diploma al Silencio Fotográfico',
      motivo_jurado: 'Nadie subió foto hoy, así que el premio queda desierto hasta nuevo aviso.',
      resumen_dia: 'Hoy no hubo destellos, la cámara se tomó franco.',
    };
  }

  // Si hay un solo participante, gana por perseverancia y coraje
  if (candidatos.length === 1) {
    const unico = candidatos[0];
    return {
      tipo_evento: 'resultado_destello',
      ganador_usuario_id: unico.usuario_id,
      puntos_otorgados: 50,
      titulo_diploma: 'Llanero Solitario de la Lente',
      motivo_jurado: `Fue el único valiente que se dignó a subir foto (${unico.pie_de_foto || 'sin quejarse'}). ¡Se lleva los laureles por presentismo absoluto!`,
      resumen_dia: `Día de un solo héroe: ${unico.autor_nombre} salvó las papas del grupo.`,
    };
  }

  if (ai) {
    try {
      const prompt = `
Actúa como el árbitro, juez cómico y animador oficial del minijuego "El Destello" en una app para grupos de familia/amigos. Tu tono es divertido, con chispa, un toque sarcástico pero siempre querible (humor rioplatense argentino sano y cariñoso).

ACCIÓN: "evaluar_destello"
Fotos recibidas hoy:
${JSON.stringify(candidatos.map((c) => ({
  usuario_id: c.usuario_id,
  autor: c.autor_nombre,
  pie_de_foto: c.pie_de_foto || 'Sin pie de foto',
  cumple_reto: c.cumple_reto ? 'Sí' : 'No',
})), null, 2)}

INSTRUCCIONES:
1. Analiza las fotos y pies de foto recibidos.
2. Elige a un ganador indiscutido bajo criterios creativos y graciosos (originalidad, composición insólita, espontaneidad, cara de dormido o ternura familiar).
3. Otorga 50 puntos al ganador.
4. Genera el texto del "Diploma de Honor Diario" para estampar en la foto ganadora.
5. Da una explicación hilarante de 1 o 2 oraciones del por qué ganó.
6. Da una frase corta para el muro del grupo resumiendo el nivel de las fotos de hoy.

FORMATO DE SALIDA (JSON ESTRICTO ÚNICAMENTE, sin código markdown extra):
{
  "tipo_evento": "resultado_destello",
  "ganador_usuario_id": "ID_DEL_USUARIO_ELEGIDO",
  "puntos_otorgados": 50,
  "titulo_diploma": "Título rimbombante y cómico",
  "motivo_jurado": "Explicación hilarante de 1 o 2 oraciones de por qué ganó.",
  "resumen_dia": "Frase corta para el muro del grupo resumiendo el nivel de las fotos de hoy."
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
      if (parsed.ganador_usuario_id && parsed.titulo_diploma) {
        return {
          tipo_evento: 'resultado_destello',
          ganador_usuario_id: parsed.ganador_usuario_id,
          puntos_otorgados: 50,
          titulo_diploma: parsed.titulo_diploma,
          motivo_jurado: parsed.motivo_jurado || 'Ganador indiscutido por aclamación del jurado supremo.',
          resumen_dia: parsed.resumen_dia || '¡Gran jornada de fotos en el grupo!',
        };
      }
    } catch (err) {
      console.error('Error evaluando con Gemini árbitro:', err);
    }
  }

  // Fallback con chispa
  const ganador = candidatos[Math.floor(Math.random() * candidatos.length)];
  const diploma = DIPLOMAS_BACKUP[Math.floor(Math.random() * DIPLOMAS_BACKUP.length)];
  const motivo = MOTIVOS_BACKUP[Math.floor(Math.random() * MOTIVOS_BACKUP.length)];
  const resumen = RESUMENES_BACKUP[Math.floor(Math.random() * RESUMENES_BACKUP.length)];

  return {
    tipo_evento: 'resultado_destello',
    ganador_usuario_id: ganador.usuario_id,
    puntos_otorgados: 50,
    titulo_diploma: diploma,
    motivo_jurado: `${motivo} ¡Felicitaciones a ${ganador.autor_nombre} por esta joya!`,
    resumen_dia: resumen,
  };
}

/**
 * TAREA 2: APURAR POR WHATSAPP ("accion": "apurar_por_whatsapp")
 */
export async function apurarPorWhatsApp(
  usuarioApurado: string,
  urgencia: 'leve' | 'media' | 'critica' = 'media',
  contextoExtra?: string
): Promise<RecordatorioWhatsApp> {
  const nombreLimpio = usuarioApurado.trim() || 'Campeón/a';

  if (ai) {
    try {
      const prompt = `
Actúa como el árbitro, juez cómico y animador oficial del minijuego "El Destello" en una app para grupos de familia/amigos. Tu tono es divertido, con chispa, un toque sarcástico pero siempre querible (humor rioplatense argentino sano y de confianza).

ACCIÓN: "apurar_por_whatsapp"
Usuario retrasado: "${nombreLimpio}"
Nivel de urgencia: "${urgencia}"
Contexto: "${contextoExtra || (urgencia === 'critica' ? 'Faltan menos de 30 minutos para cerrar el día y es el único que falta' : urgencia === 'media' ? 'Ya pasaron varias horas de la tarde y el grupo quiere ver las fotos' : 'Arrancó la mañana y todavía no subió nada')}"

INSTRUCCIONES:
1. Genera un mensaje para enviar por WhatsApp al usuario retrasado (o al grupo arrobándolo).
2. Debe ser gracioso, exagerado, informal y adaptado a la urgencia y al contexto.
3. Incluye llamados a la acción claros y emojis.
4. Usa formato de WhatsApp con *negritas* para resaltar palabras clave.

FORMATO DE SALIDA (JSON ESTRICTO ÚNICAMENTE):
{
  "tipo_evento": "recordatorio_whatsapp",
  "usuario_apurado": "${nombreLimpio}",
  "urgencia": "${urgencia}",
  "mensaje_whatsapp": "Texto listo para enviar con emojis y formato de WhatsApp (negritas)."
}
`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.9,
        },
      });

      const parsed = JSON.parse(response.text?.trim() || '{}');
      if (parsed.mensaje_whatsapp) {
        return {
          tipo_evento: 'recordatorio_whatsapp',
          usuario_apurado: nombreLimpio,
          urgencia,
          mensaje_whatsapp: parsed.mensaje_whatsapp,
        };
      }
    } catch (err) {
      console.error('Error generando recordatorio WhatsApp con Gemini:', err);
    }
  }

  // Fallbacks según urgencia con formato WhatsApp y humor rioplatense
  let mensaje = '';
  if (urgencia === 'critica') {
    mensaje = `🚨 *¡ALARMA ROJA EN EL GRUPO!* 🚨\n\n¡Che, *${nombreLimpio}*! Quedan *menos de 30 minutos* para que cierre el día en *Destellos* y sos el *ÚNICO* que nos está trabando las fotos a todos. 😱📸\n\nDejá de mirar reels, agarrá la cámara y subí cualquier cosa (hasta la pantufla zafa). ¡No te duermas que te vas a quedar sin los *+50 puntos* del jurado! ⏳🏃💨`;
  } else if (urgencia === 'media') {
    mensaje = `⏰ *¡Atención ${nombreLimpio}!* 📸✨\n\nLa muchachada ya cumplió y está acá debatiendo quién se lleva el premio, pero falta *tu destello de hoy*. No nos dejes con la intriga ni te hagas rogar, ¡metele que el jurado está ansioso! 😉📲`;
  } else {
    mensaje = `👋 *¡Buenasss ${nombreLimpio}!* ☕📸\n\nArrancó el día y el reto de *Destellos* ya está picando. Dale que hoy se reparten *puntos pesados* y queremos ver tu obra de arte antes de que te gane la fiaca. ¡Avisale a tu cámara! ✨`;
  }

  return {
    tipo_evento: 'recordatorio_whatsapp',
    usuario_apurado: nombreLimpio,
    urgencia,
    mensaje_whatsapp: mensaje,
  };
}
