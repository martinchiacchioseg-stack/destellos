import { z } from "zod";
import { api, json } from "@/lib/http";
import { db } from "@/lib/db";
import { requerirUsuario } from "@/lib/auth";
import { hoyAR } from "@/lib/fecha";
import { miembrosDelGrupo, nombreCorto } from "@/lib/usuarios";

const TEMAS_ROCK = [
  { titulo: "Crimen", artista: "Gustavo Cerati", pista: "Desamor brutal del 2006: 'La espera me agotó, no sé nada de vos...'", drama: "¿Qué sincericidio amoroso jamás te animaste a decir de frente?" },
  { titulo: "Seminare", artista: "Charly García / Serú Girán", pista: "Clásico eterno de 1978: 'Sigo esperando que te acuerdes de mí...'", drama: "¿A quién seguís esperando bajo la lluvia sin que se acuerde de vos?" },
  { titulo: "Paloma", artista: "Andrés Calamaro", pista: "Honestidad brutal de 1999: 'No me gusta que me digan qué tengo que hacer...'", drama: "¿Cuándo fue la última vez que mandaste todo al diablo con sinceridad total?" },
  { titulo: "Canción para mi muerte", artista: "Sui Generis", pista: "Fundación poética de 1972: 'Hubo un tiempo que fue hermoso y fui libre de verdad...'", drama: "¿Qué recuerdo de tu juventud te da nostalgia confesarle a la familia?" },
  { titulo: "Tan Solo", artista: "Los Piojos", pista: "Himno de 1992: 'Y en esta soledad...'", drama: "En la soledad de la noche... ¿cuál es tu mayor secreto familiar?" },
  { titulo: "Seguir viviendo sin tu amor", artista: "Luis Alberto Spinetta", pista: "Joya inmortal de 1991: 'Y hoy que enloquecido vuelvo buscando tu voz...'", drama: "¿Qué locura por pasión hiciste que juraste jamás repetir?" },
  { titulo: "El amor después del amor", artista: "Fito Páez", pista: "Clásico de 1992: 'El amor después del amor, tal vez se parezca a este rayo...'", drama: "¿Alguna vez te enamoraste en el momento y lugar menos indicado?" },
  { titulo: "Tratame suavemente", artista: "Soda Stereo", pista: "Balada inolvidable de 1984: 'No quiero soñar mil veces las mismas cosas...'", drama: "¿Quién en esta mesa sentís que debería tratarte más suavemente?" },
];

const PALABRAS_DIBUJO = [
  "Guitarra Criolla", "Asado Familiar", "Mate con Bombilla", "Submarino", "Castillo Encantado",
  "Pelota de Fútbol", "Helado de Dulce de Leche", "Avión de Papel", "Perro Durmiendo", "Mascara Veneciana"
];

export const GET = api(async (req: Request) => {
  const { grupo } = await requerirUsuario();
  const url = new URL(req.url);
  const juego = (url.searchParams.get("juego") || "tarareo") as "tarareo" | "dibujo";
  const hoy = hoyAR();

  // Buscar si ya hay un sorteo vigente para hoy en el grupo
  const { data: sorteoPrevio } = await db()
    .from("sorteos_arlequin")
    .select("*")
    .eq("grupo_id", grupo.id)
    .eq("juego", juego)
    .eq("fecha", hoy)
    .order("creado_en", { ascending: false })
    .limit(1);

  if (sorteoPrevio && sorteoPrevio.length > 0) {
    return { sorteo: sorteoPrevio[0] };
  }

  return { sorteo: null };
});

export const POST = api(async (req: Request) => {
  const { usuario, grupo } = await requerirUsuario();
  const b = await json(req, z.object({
    juego: z.enum(["tarareo", "dibujo"]),
    forzarNuevo: z.boolean().optional(),
  }));

  const hoy = hoyAR();
  const miembros = await miembrosDelGrupo(grupo.id);

  if (!miembros || miembros.length === 0) {
    return { error: "No hay integrantes en la familia para sortear." };
  }

  // Mezclar a los integrantes reales (CERO BOTS)
  const participantes = miembros.map(m => ({
    id: m.id,
    nombre: m.nombre,
    apodo: m.apodo,
    nombreMostrar: nombreCorto(m),
  })).sort(() => Math.random() - 0.5);

  const total = participantes.length;
  // Si son 5: 3 y 2 o 2 y 3 aleatorio
  const cantGrupo1 = total <= 2 ? 1 : Math.random() > 0.5 ? Math.ceil(total / 2) : Math.floor(total / 2);

  const grupo1 = participantes.slice(0, cantGrupo1);
  const grupo2 = participantes.slice(cantGrupo1);

  let activosSorteados: any = {};
  let mensajeArlequin = "";

  if (b.juego === "tarareo") {
    const temaElegido = TEMAS_ROCK[Math.floor(Math.random() * TEMAS_ROCK.length)];
    activosSorteados = {
      tarareadores: grupo1,
      adivinadores: grupo2,
      tema: temaElegido,
      grabaciones: [], // Se guardan los audios de los tarareadores reales
    };

    const nombresTararean = grupo1.map(g => g.nombreMostrar).join(", ");
    const nombresAdivinan = grupo2.map(g => g.nombreMostrar).join(", ");

    mensajeArlequin = `🎭 ¡Arlequín giró la ruleta familiar! Hoy les toca tararear a ${nombresTararean} el clásico "${temaElegido.titulo}" con voz de ardilla. ¡A ${nombresAdivinan} les toca agudizar el oído y confesar su sincericidio a mitad de ronda!`;
  } else {
    const palabra = PALABRAS_DIBUJO[Math.floor(Math.random() * PALABRAS_DIBUJO.length)];
    activosSorteados = {
      dibujantes: grupo1,
      adivinadores: grupo2,
      palabraSecreta: palabra,
      trazos: [],
    };

    const nombresDibujan = grupo1.map(g => g.nombreMostrar).join(", ");
    const nombresAdivinan = grupo2.map(g => g.nombreMostrar).join(", ");

    mensajeArlequin = `🎨 ¡Arlequín asignó los pinceles! Les toca dibujar a ${nombresDibujan} la consigna secreta. A ${nombresAdivinan} les toca adivinar a contrarreloj en la pizarra.`;
  }

  // Guardar en la base de datos
  const ins = await db()
    .from("sorteos_arlequin")
    .insert({
      grupo_id: grupo.id,
      juego: b.juego,
      fecha: hoy,
      activos_sorteados: activosSorteados,
      mensaje_arlequin: mensajeArlequin,
    })
    .select("*")
    .single();

  if (ins.error) {
    throw new Error(`DB sorteos: ${ins.error.message}`);
  }

  return {
    ok: true,
    sorteo: ins.data,
    mensaje: mensajeArlequin,
  };
});
