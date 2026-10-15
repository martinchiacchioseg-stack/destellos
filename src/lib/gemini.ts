import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY || '';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// Retos predefinidos de respaldo con tono rioplatense cálido y positivo
const RETOS_BACKUP = [
  { tema: 'El mate o café de hoy ☕', descripcion: 'Mostrá tu infusión favorita con algo rico para acompañar.' },
  { tema: 'Una sonrisa cómplice 😁', descripcion: 'Una selfie divertida, una mueca o alguien de la casa sonriendo.' },
  { tema: 'Algo de color rojo brillante 🔴', descripcion: 'Buscá algo rojo llamativo en tu casa, jardín o en la calle.' },
  { tema: 'Tu mascota o planta mimada 🐾🌿', descripcion: 'El rey o la reina de la casa en su momento de gloria.' },
  { tema: 'El cielo sobre tu cabeza ☁️✨', descripcion: 'Mirá arriba y capturá las nubes, el sol o el atardecer.' },
  { tema: 'Un recuerdo con historia 🕰️', descripcion: 'Un objeto viejo, un portarretratos o algo que te recuerde a la familia.' },
  { tema: 'Momento de relax 🛋️', descripcion: 'Ese instante del día donde te sentás a descansar.' },
  { tema: 'Lo más rico del almuerzo 🍝', descripcion: 'Tu plato preferido, un detalle casero o el bocado del día.' },
  { tema: 'Calzado del día 👟🧦', descripcion: 'Tus zapatillas, pantuflas o medias favoritas en acción.' },
  { tema: 'Un detalle que casi nadie nota 🔍', descripcion: 'Una textura, una flor chiquita, una sombra curiosa.' },
];

/**
 * 1. Genera el Reto del Día para las 06:00 hs
 */
export async function generarRetoDelDia(fecha: string): Promise<{ tema: string; descripcion: string }> {
  if (!ai) {
    // Si no hay API key configurada, seleccionamos un reto de respaldo rotativo
    const index = Math.abs(fecha.split('-').reduce((acc, curr) => acc + parseInt(curr, 10), 0)) % RETOS_BACKUP.length;
    return RETOS_BACKUP[index];
  }

  try {
    const prompt = `
Sos el asistente amigable y chispeante de "Destellos", una app para familias y amigos en Argentina.
Hoy es ${fecha}.
Generá un RETO FOTOGRÁFICO DEL DÍA:
- Debe ser positivo, simple, accesible para cualquier persona (incluso abuelos, padres o niños).
- No requiere salir de casa ni equipos especiales.
- Debe tener chispa, humor o calidez familiar.
- Escribí en español rioplatense coloquial y cercano.

Devolvé ÚNICAMENTE un objeto JSON válido con este formato exacto:
{
  "tema": "Título corto y simpático con un emoji (máx 5 palabras)",
  "descripcion": "Instrucción cálida y motivadora en 1 o 2 oraciones breves."
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.8,
      },
    });

    const text = response.text?.trim() || '';
    const parsed = JSON.parse(text);
    if (parsed.tema && parsed.descripcion) {
      return parsed;
    }
  } catch (err) {
    console.error('Error al generar reto con Gemini, usando fallback:', err);
  }

  const fallbackIndex = Math.floor(Math.random() * RETOS_BACKUP.length);
  return RETOS_BACKUP[fallbackIndex];
}

/**
 * 2. Verifica si la foto o video subido cumple con el reto del día
 * Requisito: "sin ser estricto", premia la participación con buena fe (+2 pts)
 */
export async function verificarCumpleReto(
  temaReto: string,
  descripcionReto: string,
  pieDeFoto?: string,
  mediaBase64?: string,
  mimeType: string = 'image/jpeg'
): Promise<{ cumple: boolean; detalle: string }> {
  // Si no hay API Key o la imagen no viene en base64, asumimos buena fe
  if (!ai || !mediaBase64) {
    return {
      cumple: true,
      detalle: '¡Destello recibido con la mejor onda familiar!',
    };
  }

  try {
    const prompt = `
Sos el juez bonachón de "Destellos", una aplicación familiar y de amigos.
El reto del día es: "${temaReto}" (${descripcionReto}).
El autor agregó este pie de foto (si tiene): "${pieDeFoto || 'Sin texto'}".

Analizá la imagen adjunta. Tu rol NO ES ser un guardia estricto ni un crítico de arte, sino premiar la creatividad, la buena fe y la participación familiar (+2 puntos extra).
Si hay un intento razonable, metafórico o simpático de relacionar la imagen con el reto, marcalo como cumple: true.
Solo marcalo como cumple: false si no tiene absolutamente NADA que ver o es una pantalla en negro / spam.

Devolvé ÚNICAMENTE un JSON con:
{
  "cumple": true o false,
  "detalle": "comentario interno simpático en 1 frase corta"
}
`;

    const cleanBase64 = mediaBase64.replace(/^data:[a-zA-Z0-9/+-]+;base64,/, '');

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: cleanBase64,
                mimeType: mimeType || 'image/jpeg',
              },
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    return {
      cumple: parsed.cumple ?? true,
      detalle: parsed.detalle || '¡Cumplió el reto!',
    };
  } catch (err) {
    console.error('Error al verificar reto con Gemini:', err);
    // En caso de error técnico, premiar al usuario
    return {
      cumple: true,
      detalle: '¡Participación registrada con éxito!',
    };
  }
}

/**
 * 3. Cierre diario (23:59 hs): Gemini elige el "Destello del Día"
 * Requisito estricto: "elige el mejor del día (por gracia, belleza, creatividad o emoción) SIN EXPLICAR EL MOTIVO"
 */
export async function elegirDestelloDelDia(
  destellos: Array<{
    id: string;
    usuario_id: string;
    autor_nombre: string;
    media_url: string;
    pie_de_foto?: string;
    cumple_reto?: boolean;
    mediaBase64?: string;
  }>
): Promise<{ ganadorDestelloId: string | null; ganadorUsuarioId: string | null }> {
  if (!destellos || destellos.length === 0) {
    return { ganadorDestelloId: null, ganadorUsuarioId: null };
  }

  // Si solo hay uno, ese es el destello del día
  if (destellos.length === 1) {
    return {
      ganadorDestelloId: destellos[0].id,
      ganadorUsuarioId: destellos[0].usuario_id,
    };
  }

  if (ai) {
    try {
      const summaryList = destellos.map((d, i) => ({
        indice: i,
        id: d.id,
        usuario_id: d.usuario_id,
        pie: d.pie_de_foto || 'Sin pie',
        cumple_reto: d.cumple_reto ? 'Sí' : 'No',
      }));

      const prompt = `
Sos el jurado invisible y mágico de "Destellos".
Hoy los miembros del grupo compartieron estas fotos familiares:
${JSON.stringify(summaryList, null, 2)}

Elegí UN SOLO destello como el "Destello del Día" considerando espontaneidad, emoción, humor, creatividad o belleza cotidiana.
IMPORTANTE: La app NO muestra el motivo de la elección a los usuarios para mantener el misterio y la chispa.

Devolvé ÚNICAMENTE un JSON con:
{
  "ganador_id": "el id del destello elegido",
  "usuario_id": "el id del usuario autor"
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

      const parsed = JSON.parse(response.text?.trim() || '{}');
      const elegido = destellos.find((d) => d.id === parsed.ganador_id);
      if (elegido) {
        return {
          ganadorDestelloId: elegido.id,
          ganadorUsuarioId: elegido.usuario_id,
        };
      }
    } catch (err) {
      console.error('Error al evaluar destello con Gemini:', err);
    }
  }

  // Fallback seguro: selección ponderada (privilegia quienes cumplieron el reto)
  const queCumplieron = destellos.filter((d) => d.cumple_reto);
  const candidatos = queCumplieron.length > 0 ? queCumplieron : destellos;
  const seleccionado = candidatos[Math.floor(Math.random() * candidatos.length)];

  return {
    ganadorDestelloId: seleccionado.id,
    ganadorUsuarioId: seleccionado.usuario_id,
  };
}
