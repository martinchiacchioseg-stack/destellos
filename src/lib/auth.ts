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

/** Valida credenciales del superadmin contra variables de entorno (o fallback canónico para Chiachio@1938). */
export async function verificarSuperadmin(email: string, password: string): Promise<boolean> {
  const esperadoEmail = (process.env.SUPERADMIN_EMAIL || "martinchiacchio.seg@gmail.com").trim().toLowerCase();
  const hash =
    process.env.SUPERADMIN_PASSWORD_HASH ||
    "$2b$12$G2GVsC2HYY6umAydBLQHZ.dfdUMaMEJeVu.j1.iOwOax5WQVsOrpO"; // Corresponde a Chiachio@1938

  let claveOk = false;
  if (process.env.SUPERADMIN_INITIAL_PASSWORD && password === process.env.SUPERADMIN_INITIAL_PASSWORD) {
    claveOk = true;
  } else {
    claveOk = await bcrypt.compare(password, hash);
  }

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
