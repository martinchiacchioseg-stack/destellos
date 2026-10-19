import { z } from "zod";
import { api, json } from "@/lib/http";
import { requerirUsuario } from "@/lib/auth";
import { decir } from "@/lib/gemini";
import { nombreCorto } from "@/lib/usuarios";

const AYUDA = `
Cómo funciona Destellos: cada integrante sube su foto del día antes de la hora límite de la familia.
A la hora límite Arlequín elige la Foto del Día y le estampa un Diploma de Honor con veredicto cómico.
Juegos familiares: Foto Oculta (Flash grupal), Trazo Loco (pizarra táctil con turnos de dibujante y adivinador),
Cerebro en Fuga (trivia diaria dinámica) y Los Tarambana (tarareos).
Puntos: subir foto, acertar en la trivia y adivinar en los juegos.
`.trim();

export const POST = api(async (req: Request) => {
  const { usuario, grupo } = await requerirUsuario();
  const { mensaje } = await json(req, z.object({ mensaje: z.string().trim().min(1).max(500) }));
  const nombre = nombreCorto(usuario);

  const r = await decir(
    `Sos Arlequín (el alma de Rolφ). ${nombre} (de la familia ${grupo.nombre}, cierre diario a las ${grupo.hora_limite} hs) te escribe: "${mensaje}". ` +
      `Respondé con tu tono pícaro, cálido y rioplatense, máximo 2 o 3 oraciones.`,
    AYUDA,
  );

  const respFallback = [
    `¡Hola ${nombre}! Acá está Arlequín en persona 🎭. Ya podés disfrutar de los Destellos, la Foto Oculta, la Pizarra de Trazo Loco y la Trivia diaria. ¡Cualquier duda acá me tenés!`,
    `¡Qué hacés, ${nombre}! Acá estoy para ponerle chispa a la familia ${grupo.nombre}. ¡A subir la foto de hoy y no aflojarle a los puntos! ✨`,
    `¡Te escucho fuerte y claro, ${nombre}! 🎭 Como anfitrión de la familia ${grupo.nombre}, te recuerdo que a las ${grupo.hora_limite} hs elijo la Foto del Día.`,
  ];
  const fallback = respFallback[Math.floor(Math.random() * respFallback.length)];

  return { respuesta: r ?? fallback };
});
