import { z } from "zod";
import { api, json } from "@/lib/http";
import { requerirUsuario } from "@/lib/auth";
import { decir } from "@/lib/gemini";
import { nombreCorto } from "@/lib/usuarios";

const AYUDA = `
Cómo funciona Destellos: cada integrante sube UNA foto por día antes de la hora límite de la familia.
A la hora límite Arlequín elige la Foto del Día y le estampa un Diploma de Honor.
Puntos: +1 por subir foto, +5 si tu foto es la ganadora. La Trivia diaria (un intento por día, se renueva a las 00:00):
Fácil 15 s +1 punto, Medio 20 s +3 puntos, Experto 25 s +5 puntos.
Se puede reaccionar con emojis y comentar con cariño. Las familias son privadas.
`.trim();

export const POST = api(async (req: Request) => {
  const { usuario, grupo } = await requerirUsuario();
  const { mensaje } = await json(req, z.object({ mensaje: z.string().trim().min(1).max(500) }));
  const r = await decir(
    `${nombreCorto(usuario)} (familia ${grupo.nombre}, hora límite ${grupo.hora_limite} hs) te pregunta: "${mensaje}"\nRespondé breve y con calidez.`,
    AYUDA,
  );
  return { respuesta: r ?? "Uy, se me trabó el antifaz un segundito. ¿Me lo preguntás de nuevo? 🎭" };
});
