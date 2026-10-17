import { z } from "zod";
import { api, json } from "@/lib/http";
import { jsonGemini } from "@/lib/gemini";

const Body = z.object({
  palabraSecreta: z.string().min(1),
  intento: z.string().min(1).max(100),
});

export const POST = api(async (req: Request) => {
  const { palabraSecreta, intento } = await json(req, Body);

  const cleanPalabra = palabraSecreta.trim().toLowerCase();
  const cleanIntento = intento.trim().toLowerCase();

  // Coincidencia exacta o muy cercana
  if (cleanPalabra === cleanIntento) {
    return { acerto: true, similitud: 1.0, explicacion: "¡Coincidencia exacta!" };
  }

  // Validación semántica asistida por Gemini
  const prompt = `
Actúa como juez de un juego de adivinanzas de dibujos rápidos.
Palabra secreta a adivinar: "${palabraSecreta}"
Respuesta escrita por el jugador: "${intento}"

Determina si el jugador adivinó el concepto correcto, tolerando faltas ortográficas leves (ej. "jirafa" vs "girafa"), singulares/plurales, o sinónimos directos obvios.
Responde únicamente en formato JSON con la siguiente estructura:
{"acerto": boolean, "similitud": number entre 0.0 y 1.0, "explicacion": "breve justificativo en español rioplatense cálido"}
`;

  const evaluacion = await jsonGemini<{ acerto: boolean; similitud: number; explicacion: string }>(prompt);

  if (evaluacion && typeof evaluacion.acerto === "boolean") {
    return evaluacion;
  }

  // Fallback heurístico de similitud de cadenas si la IA no está disponible
  const esSimilar = cleanPalabra.includes(cleanIntento) || cleanIntento.includes(cleanPalabra);
  return {
    acerto: esSimilar,
    similitud: esSimilar ? 0.8 : 0.2,
    explicacion: esSimilar ? "¡Casi idéntico, te la damos por buena!" : "No coincide con el dibujo.",
  };
});
