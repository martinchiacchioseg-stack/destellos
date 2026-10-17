import "server-only";
import { db, must } from "./db";
import { firmar } from "./storage";
import type { Usuario } from "./types";

export const soloDigitos = (s: string) => (s || "").replace(/\D/g, "");

export interface UsuarioPublico {
  id: string;
  nombre: string;
  apodo: string | null;
  foto_url: string | null;
  rol: string;
}

/** Datos mínimos y seguros para mostrar a otros integrantes (jamás hash, email ni WhatsApp). */
export async function publicos(us: Pick<Usuario, "id" | "nombre" | "apodo" | "foto_path" | "rol">[]): Promise<UsuarioPublico[]> {
  const urls = await firmar(us.map((u) => u.foto_path));
  return us.map((u) => ({
    id: u.id,
    nombre: u.nombre,
    apodo: u.apodo,
    foto_url: u.foto_path ? (urls[u.foto_path] ?? null) : null,
    rol: u.rol,
  }));
}

export async function miembrosDelGrupo(grupoId: string): Promise<Usuario[]> {
  return (must(await db().from("usuarios").select("*").eq("grupo_id", grupoId).order("nombre")) ?? []) as Usuario[];
}

/** Busca por email o WhatsApp dentro de un grupo. */
export async function buscarPorIdentificador(grupoId: string, ident: string): Promise<Usuario | null> {
  const t = ident.trim();
  if (!t) return null;
  const todos = await miembrosDelGrupo(grupoId);
  const dig = soloDigitos(t);
  return (
    todos.find((u) => (u.email && u.email.toLowerCase() === t.toLowerCase()) || (dig.length >= 6 && u.whatsapp && soloDigitos(u.whatsapp) === dig)) ??
    null
  );
}

export const nombreCorto = (u: { nombre: string; apodo: string | null }) => u.apodo || u.nombre.split(" ")[0];
