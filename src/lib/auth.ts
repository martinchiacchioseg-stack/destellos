import "server-only";
import bcrypt from "bcryptjs";
import { db, must } from "./db";
import { env, ApiError } from "./env";
import { leerSesion } from "./session";
import { licenciaPermiteAcceso, estadoLicencia } from "./grupos";
import type { Grupo, Usuario } from "./types";

export const hashPassword = (p: string) => bcrypt.hash(p, 12);
export const verificarPassword = (p: string, h: string) => bcrypt.compare(p, h);

export type Contexto =
  | { tipo: "superadmin" }
  | { tipo: "usuario"; usuario: Usuario; grupo: Grupo; esSuper: boolean };

/** Valida credenciales del superadmin SOLO contra variables de entorno (sin fila en DB). */
export async function verificarSuperadmin(email: string, password: string): Promise<boolean> {
  const esperadoEmail = env("SUPERADMIN_EMAIL").toLowerCase();
  const hash = env("SUPERADMIN_PASSWORD_HASH");
  // Se compara siempre el hash para no filtrar por tiempo si el email existe.
  const claveOk = await bcrypt.compare(password, hash);
  return claveOk && email.trim().toLowerCase() === esperadoEmail;
}

/** Resuelve el contexto desde la cookie. Los datos salen de la DB en cada request (usuario borrado = sesión inválida). */
export async function contexto(): Promise<Contexto | null> {
  const s = await leerSesion();
  if (!s) return null;
  if (s.sub === "superadmin") return { tipo: "superadmin" };

  const esSuper = s.sub.startsWith("superadmin:");
  const uid = esSuper ? s.sub.slice("superadmin:".length) : s.sub;
  const u = must(await db().from("usuarios").select("*").eq("id", uid).limit(1))?.[0] as Usuario | undefined;
  if (!u) return null;
  const g = must(await db().from("grupos").select("*").eq("id", u.grupo_id).limit(1))?.[0] as Grupo | undefined;
  if (!g) return null;
  return { tipo: "usuario", usuario: u, grupo: g, esSuper };
}

/** Exige usuario de familia. grupo_id sale SIEMPRE de la sesión, nunca del cliente. */
export async function requerirUsuario(opts: { admin?: boolean; ignorarLicencia?: boolean } = {}) {
  const c = await contexto();
  if (!c || c.tipo !== "usuario") throw new ApiError(401, "Tenés que ingresar para continuar.");
  if (opts.admin && c.usuario.rol !== "admin" && !c.esSuper) {
    throw new ApiError(403, "Solo el administrador de la familia puede hacer esto.");
  }
  if (!opts.ignorarLicencia && !c.esSuper && !licenciaPermiteAcceso(c.grupo)) {
    throw new ApiError(402, "La licencia de la familia no está vigente.", estadoLicencia(c.grupo));
  }
  return c;
}

export async function requerirSuperadmin() {
  const c = await contexto();
  if (!c || c.tipo !== "superadmin") throw new ApiError(403, "No autorizado.");
  return c;
}
