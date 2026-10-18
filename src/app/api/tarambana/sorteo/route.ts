import { z } from "zod";
import { api } from "@/lib/http";
import { db } from "@/lib/db";
import { requerirUsuario } from "@/lib/auth";
import { hoyAR } from "@/lib/fecha";
import { miembrosDelGrupo, nombreCorto } from "@/lib/usuarios";
import { publicarArlequin } from "@/lib/pizarra";

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

export async function asegurarSorteoArlequin(grupoId: string, juego: "tarareo" | "dibujo") {
  const hoy = hoyAR();

  // 1) Si ya hay un sorteo hoy, devolverlo
  const { data: sorteoPrevio } = await db()
    .from("sorteos_arlequin")
    .select("*")
    .eq("grupo_id", grupoId)
    .eq("juego", juego)
    .eq("fecha", hoy)
    .order("creado_en", { ascending: false })
    .limit(1);

  if (sorteoPrevio && sorteoPrevio.length > 0) {
    return sorteoPrevio[0];
  }

  // 2) Si no hay, Arlequín realiza el sorteo automáticamente
  const miembros = await miembrosDelGrupo(grupoId);
  if (!miembros || miembros.length === 0) {
    return null;
  }

  // Mezcla de integrantes reales sin bots
  const participantes = miembros.map(m => ({
    id: m.id,
    nombre: m.nombre,
    apodo: m.apodo,
    nombreMostrar: nombreCorto(m),
  })).sort(() => Math.random() - 0.5);

  const total = participantes.length;
  const cantGrupo1 = total <= 2 ? 1 : Math.random() > 0.5 ? Math.ceil(total / 2) : Math.floor(total / 2);

  const grupo1 = participantes.slice(0, cantGrupo1);
  const grupo2 = participantes.slice(cantGrupo1);

  let activosSorteados: any = {};
  let mensajeArlequin = "";

  if (juego === "tarareo") {
    const temaElegido = TEMAS_ROCK[Math.floor(Math.random() * TEMAS_ROCK.length)];
    activosSorteados = {
      tarareadores: grupo1,
      adivinadores: grupo2,
      tema: temaElegido,
      grabaciones: [],
    };

    const nombresTararean = grupo1.map(g => g.nombreMostrar).join(", ");
    const nombresAdivinan = grupo2.map(g => g.nombreMostrar).join(", ");

    mensajeArlequin = `🎭 ¡Arlequín sorteó los roles de hoy! Cantan: ${nombresTararean} ("${temaElegido.titulo}"). Adivinan: ${nombresAdivinan}. ¡Abran bien las orejas!`;
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

    mensajeArlequin = `🎨 ¡Arlequín asignó los pinceles! Dibujan: ${nombresDibujan}. Adivinan: ${nombresAdivinan}. ¡A dibujar en la pizarra!`;
  }

  const ins = await db()
    .from("sorteos_arlequin")
    .insert({
      grupo_id: grupoId,
      juego,
      fecha: hoy,
      activos_sorteados: activosSorteados,
      mensaje_arlequin: mensajeArlequin,
    })
    .select("*")
    .single();

  if (!ins.error && ins.data) {
    // Comunicar automáticamente en la marquesina de LEDs de la familia
    await publicarArlequin(grupoId, mensajeArlequin, "celeste");
    return ins.data;
  }

  return null;
}

export const GET = api(async (req: Request) => {
  const { grupo } = await requerirUsuario();
  const url = new URL(req.url);
  const juego = (url.searchParams.get("juego") || "tarareo") as "tarareo" | "dibujo";

  const sorteo = await asegurarSorteoArlequin(grupo.id, juego);
  return { sorteo };
});
