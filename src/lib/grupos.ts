import "server-only";
import { db, must } from "./db";
import { diasHasta } from "./fecha";
import type { EstadoLicencia, Grupo } from "./types";

/** Normaliza un código: mayúsculas, sin acentos, guiones ni espacios. chia1938 == CHIA-1938. */
export function normalizarCodigo(codigo: string): string {
  return (codigo || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]/g, "");
}

export function estadoLicencia(g: Pick<Grupo, "activo" | "vence_en">): EstadoLicencia {
  if (!g.activo) return "pausada";
  const d = diasHasta(g.vence_en);
  if (d < 0) return "vencida";
  if (d <= 7) return "por_vencer";
  return "activa";
}

export function licenciaPermiteAcceso(g: Pick<Grupo, "activo" | "vence_en">) {
  const e = estadoLicencia(g);
  return e === "activa" || e === "por_vencer";
}

function prefijo(nombre: string) {
  const limpio = nombre
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z]/g, "");
  return limpio.slice(0, 4).padEnd(4, "X");
}

/** Genera un código único (reintenta si hay colisión). */
export async function generarCodigoUnico(nombre: string): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const codigo = `${prefijo(nombre)}-${1000 + Math.floor(Math.random() * 9000)}`;
    const r = must(await db().from("grupos").select("id").eq("codigo_norm", normalizarCodigo(codigo)).limit(1));
    if (!r || r.length === 0) return codigo;
  }
  throw new Error("No se pudo generar un código de familia único.");
}

export async function grupoPorCodigo(codigo: string): Promise<Grupo | null> {
  const norm = normalizarCodigo(codigo);
  if (!norm) return null;
  const rows = must(await db().from("grupos").select("*").eq("codigo_norm", norm).limit(1));
  return (rows?.[0] as Grupo) ?? null;
}
