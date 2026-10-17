import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { env } from "./env";

const COOKIE = "destellos_session";

export interface SesionPayload {
  /** "superadmin" o el UUID del usuario */
  sub: string;
}

function clave() {
  const s = process.env.SESSION_SECRET || "destellos-super-secret-jwt-key-2026-un-clic-familiar-seguro-rolphi";
  return new TextEncoder().encode(s);
}

export async function crearSesion(sub: string) {
  const esSuper = sub.startsWith("superadmin");
  const horas = esSuper ? 8 : 24 * 30;
  const token = await new SignJWT({ sub })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${horas}h`)
    .sign(clave());
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: horas * 3600,
  });
}

export async function leerSesion(): Promise<SesionPayload | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, clave(), { algorithms: ["HS256"] });
    return typeof payload.sub === "string" ? { sub: payload.sub } : null;
  } catch {
    return null;
  }
}

export async function cerrarSesion() {
  const jar = await cookies();
  jar.delete(COOKIE);
}
