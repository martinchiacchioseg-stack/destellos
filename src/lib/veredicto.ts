import "server-only";
import sharp from "sharp";
import { randomUUID } from "crypto";
import { db, must } from "./db";
import { jsonGemini } from "./gemini";
import { descargar, subirBuffer } from "./storage";
import { publicarArlequin } from "./pizarra";
import { PUNTOS, type Grupo } from "./types";

export interface Veredicto {
  grupo_id: string;
  fecha: string;
  destello_id: string | null;
  texto: string;
  diploma_path: string | null;
}

interface FilaDestello {
  id: string;
  usuario_id: string;
  foto_path: string;
  descripcion: string | null;
  usuarios: { nombre: string; apodo: string | null } | null;
}

const nombreDe = (d: FilaDestello) => d.usuarios?.apodo || d.usuarios?.nombre || "alguien de la familia";

/** Estampa un Diploma de Honor sobre la foto ganadora (Sharp). Si falla, devuelve null y se usa la foto original. */
async function estamparDiploma(fotoPath: string, ganador: string): Promise<string | null> {
  try {
    const base = await descargar(fotoPath);
    const meta = await sharp(base).metadata();
    const w = meta.width ?? 1200;
    const h = meta.height ?? 1200;
    const alto = Math.round(w * 0.2);
    const nombre = ganador.replace(/[<>&"']/g, "").slice(0, 30);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${alto}">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7a5a00"/><stop offset=".5" stop-color="#e8b923"/><stop offset="1" stop-color="#7a5a00"/></linearGradient></defs>
      <rect width="${w}" height="${alto}" fill="#0b1220" fill-opacity=".82"/>
      <rect x="0" y="0" width="${w}" height="${Math.round(alto * 0.05)}" fill="url(#g)"/>
      <polygon transform="translate(${w * 0.08} ${alto * 0.52}) scale(${alto / 90})" fill="#f4c430" points="0,-30 9,-9 31,-9 13,5 20,28 0,14 -20,28 -13,5 -31,-9 -9,-9"/>
      <text x="${w * 0.15}" y="${alto * 0.42}" font-family="sans-serif" font-weight="700" font-size="${alto * 0.26}" fill="#f4c430" letter-spacing="3">DIPLOMA DE HONOR</text>
      <text x="${w * 0.15}" y="${alto * 0.78}" font-family="sans-serif" font-size="${alto * 0.3}" fill="#ffffff">${nombre}</text>
    </svg>`;
    const out = await sharp(base)
      .composite([{ input: Buffer.from(svg), top: h - alto, left: 0 }])
      .jpeg({ quality: 85 })
      .toBuffer();
    const path = `diplomas/${randomUUID()}.jpg`;
    await subirBuffer(path, out, "image/jpeg");
    return path;
  } catch (e) {
    console.error("[diploma]", e);
    return null;
  }
}

/**
 * Veredicto de la Foto del Día. Idempotente: si ya existe lo devuelve; si no, lo calcula una sola vez
 * (la PK (grupo_id, fecha) evita duplicados aunque dos requests lo intenten a la vez).
 */
export async function asegurarVeredicto(grupo: Grupo, fecha: string): Promise<Veredicto> {
  const previo = must(await db().from("veredictos").select("*").eq("grupo_id", grupo.id).eq("fecha", fecha).limit(1))?.[0];
  if (previo) return previo as Veredicto;

  const destellos = (must(
    await db()
      .from("destellos")
      .select("id,usuario_id,foto_path,descripcion,usuarios(nombre,apodo)")
      .eq("grupo_id", grupo.id)
      .eq("fecha", fecha)
      .order("creado_en"),
  ) ?? []) as unknown as FilaDestello[];

  let ganador: FilaDestello | null = null;
  let texto: string;

  if (destellos.length === 0) {
    texto = "Hoy el escenario quedó vacío, pero mañana Arlequín los espera con los brazos abiertos. ¡A buscar un destello! ✨";
  } else {
    // 1) Gemini mira las fotos y elige con ternura.
    const imgs = await Promise.all(
      destellos.slice(0, 10).map(async (d) => ({ data: await descargar(d.foto_path), mime: "image/jpeg" })),
    ).catch(() => []);
    const lista = destellos.slice(0, 10).map((d, i) => `${i}: ${nombreDe(d)}${d.descripcion ? ` — "${d.descripcion}"` : ""}`).join("\n");
    const r =
      imgs.length === destellos.slice(0, 10).length
        ? await jsonGemini<{ indice: number; texto: string }>(
            `Estas son las fotos del día de la familia "${grupo.nombre}", en el mismo orden que esta lista:\n${lista}\n` +
              `Elegí LA foto del día (la más tierna, original o llena de vida) y justificá la elección con ternura y simpatía en 2 o 3 frases, ` +
              `nombrando a la persona. Respondé JSON: {"indice": número, "texto": "..."}`,
            imgs,
          )
        : null;
    if (r && Number.isInteger(r.indice) && destellos[r.indice] && r.texto) {
      ganador = destellos[r.indice];
      texto = r.texto.slice(0, 600);
    } else {
      // 2) Fallback equitativo: más reacciones, y a igualdad la más temprana.
      const ids = destellos.map((d) => d.id);
      const rx = must(await db().from("reacciones").select("destello_id").in("destello_id", ids)) ?? [];
      const cuenta = new Map<string, number>();
      for (const x of rx as { destello_id: string }[]) cuenta.set(x.destello_id, (cuenta.get(x.destello_id) ?? 0) + 1);
      ganador = [...destellos].sort((a, b) => (cuenta.get(b.id) ?? 0) - (cuenta.get(a.id) ?? 0))[0];
      texto = `El destello de ${nombreDe(ganador)} se llevó los aplausos de la familia. ¡Qué lindo ver cómo brillás! 🎭`;
    }
  }

  const diploma = ganador ? await estamparDiploma(ganador.foto_path, nombreDe(ganador)) : null;
  const fila = { grupo_id: grupo.id, fecha, destello_id: ganador?.id ?? null, texto, diploma_path: diploma };
  const ins = await db().from("veredictos").insert(fila).select("*").single();

  if (ins.error) {
    // Otro request ganó la carrera: usamos el suyo y NO repetimos puntos.
    const existente = must(await db().from("veredictos").select("*").eq("grupo_id", grupo.id).eq("fecha", fecha).limit(1))?.[0];
    if (existente) return existente as Veredicto;
    throw new Error(`DB: ${ins.error.message}`);
  }

  if (ganador) {
    await db()
      .from("puntos")
      .upsert(
        { grupo_id: grupo.id, usuario_id: ganador.usuario_id, fecha, motivo: "ganador", puntos: PUNTOS.ganador },
        { onConflict: "usuario_id,fecha,motivo", ignoreDuplicates: true },
      );
    await publicarArlequin(grupo.id, `🏆 La foto del día es de ${nombreDe(ganador).toUpperCase()}. ¡Aplausos, familia!`, "verde");
  }
  return ins.data as Veredicto;
}
