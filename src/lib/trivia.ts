import "server-only";
import { z } from "zod";
import { jsonGemini, decir } from "./gemini";
import { NIVELES, type NivelTrivia } from "./types";

export const PreguntaSchema = z.object({
  pregunta: z.string().min(5),
  opciones: z.array(z.string().min(1)).length(4),
  correcta: z.number().int().min(0).max(3),
  explicacion: z.string().default(""),
  dato_curioso: z.string().default(""),
});
export type Pregunta = z.infer<typeof PreguntaSchema>;

const TEMAS = [
  "historia argentina", "geografía del mundo", "ciencia y naturaleza", "música y cine", "deportes y fútbol",
  "comidas y cultura rioplatense", "animales", "inventos", "literatura", "espacio y astronomía", "cuerpo humano",
];

/** Banco de respaldo, solo se usa si Gemini no responde. */
const RESPALDO: Record<NivelTrivia, Pregunta[]> = {
  facil: [
    { pregunta: "¿De qué color es el cielo en un día despejado?", opciones: ["Verde", "Azul", "Rojo", "Gris"], correcta: 1, explicacion: "La luz azul se dispersa más en la atmósfera.", dato_curioso: "Al atardecer se ve naranja porque la luz recorre más atmósfera." },
    { pregunta: "¿Qué bebida se toma con bombilla en Argentina?", opciones: ["Café", "Té helado", "Mate", "Licuado"], correcta: 2, explicacion: "El mate es la infusión nacional.", dato_curioso: "Se hace con hojas de yerba mate." },
    { pregunta: "¿Cuántos días tiene una semana?", opciones: ["5", "6", "7", "8"], correcta: 2, explicacion: "Lunes a domingo son siete días.", dato_curioso: "La semana de siete días viene de la antigua Babilonia." },
  ],
  medio: [
    { pregunta: "¿En qué año se declaró la independencia argentina?", opciones: ["1810", "1816", "1853", "1825"], correcta: 1, explicacion: "Se declaró en Tucumán el 9 de julio de 1816.", dato_curioso: "El 25 de mayo de 1810 fue el primer gobierno patrio." },
    { pregunta: "¿Cuál es el río más ancho del mundo?", opciones: ["Nilo", "Amazonas", "Río de la Plata", "Paraná"], correcta: 2, explicacion: "Es un estuario de unos 220 km de ancho en su desembocadura.", dato_curioso: "Separa Argentina y Uruguay." },
    { pregunta: "¿Qué planeta es conocido como el planeta rojo?", opciones: ["Venus", "Júpiter", "Marte", "Mercurio"], correcta: 2, explicacion: "El óxido de hierro le da su color.", dato_curioso: "Tiene el volcán más alto del sistema solar." },
  ],
  experto: [
    { pregunta: "¿Qué científico argentino ganó el Nobel de Medicina en 1984?", opciones: ["Luis Federico Leloir", "César Milstein", "Bernardo Houssay", "René Favaloro"], correcta: 1, explicacion: "César Milstein compartió el Nobel por los anticuerpos monoclonales.", dato_curioso: "Leloir ganó el Nobel de Química en 1970 y Houssay el de Medicina en 1947." },
    { pregunta: "¿Cuál es el punto más alto de América?", opciones: ["Aconcagua", "Denali", "Huascarán", "Chimborazo"], correcta: 0, explicacion: "El Aconcagua mide 6.961 metros.", dato_curioso: "Está en Mendoza." },
    { pregunta: "¿Qué elemento químico tiene símbolo 'Au'?", opciones: ["Plata", "Aluminio", "Oro", "Argón"], correcta: 2, explicacion: "Au viene del latín 'aurum'.", dato_curioso: "La plata es 'Ag', de 'argentum', y de ahí viene el nombre Argentina." },
  ],
};

export async function generarPregunta(nivel: NivelTrivia): Promise<Pregunta> {
  const tema = TEMAS[Math.floor(Math.random() * TEMAS.length)];
  const dificultad = { facil: "muy fácil, apta para toda la familia incluidos los chicos", medio: "de dificultad media", experto: "difícil, para expertos" }[nivel];
  const r = await jsonGemini<unknown>(
    `Creá UNA pregunta de trivia ${dificultad}, tema: ${tema}. Exactamente 4 opciones, una sola correcta, ` +
      `una explicación breve y un dato curioso. Respondé JSON: {"pregunta":"","opciones":["","","",""],"correcta":0,"explicacion":"","dato_curioso":""}. ` +
      `Que la posición de la correcta sea variada.`,
  );
  const ok = PreguntaSchema.safeParse(r);
  if (ok.success) return ok.data;
  const banco = RESPALDO[nivel];
  return banco[Math.floor(Math.random() * banco.length)];
}

/** Devolución personalizada de Arlequín con humor rioplatense. */
export async function evaluar(opts: { nombre: string; nivel: NivelTrivia; acerto: boolean; agotado: boolean; pregunta: Pregunta }): Promise<string> {
  const estado = opts.agotado ? "se le acabó el tiempo" : opts.acerto ? "acertó" : "se equivocó";
  const t = await decir(
    `${opts.nombre} jugó la trivia (nivel ${NIVELES[opts.nivel].etiqueta}) y ${estado}. La pregunta era: "${opts.pregunta.pregunta}", ` +
      `la correcta: "${opts.pregunta.opciones[opts.pregunta.correcta]}". Escribí 1 o 2 frases con humor rioplatense y cariño, sin retar.`,
  );
  if (t) return t;
  if (opts.acerto) return `¡Tremendo, ${opts.nombre}! Sabés más que el almanaque. 🎭`;
  if (opts.agotado) return `Se fue el tiempo, ${opts.nombre}, pero el que no arriesga no gana. ¡Mañana hay revancha! ⏳`;
  return `Casi, ${opts.nombre}. De los errores también se aprende, y mañana hay otra. 💪`;
}
