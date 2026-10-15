import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { SesionUsuario } from './types';

const JWT_SECRET_STRING = process.env.JWT_SECRET || 'destellos-super-secret-jwt-key-2026-un-clic-familiar';
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING);
export const COOKIE_NAME = 'destellos_session';

/**
 * Hashea una contraseña usando bcrypt
 */
export async function hashPassword(plainText: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainText, salt);
}

/**
 * Compara una contraseña con su hash
 */
export async function verifyPassword(plainText: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}

/**
 * Crea un token JWT firmado para la sesión del usuario
 */
export async function createSessionToken(user: SesionUsuario): Promise<string> {
  return new SignJWT({
    id: user.id,
    email: user.email,
    nombre: user.nombre,
    apodo: user.apodo,
    avatar_url: user.avatar_url,
    rol: user.rol,
    grupo_id: user.grupo_id,
    debe_cambiar_password: user.debe_cambiar_password,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

/**
 * Verifica y decodifica un token JWT
 */
export async function verifySessionToken(token: string): Promise<SesionUsuario | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      id: payload.id as string,
      email: payload.email as string,
      nombre: payload.nombre as string,
      apodo: payload.apodo as string | undefined,
      avatar_url: payload.avatar_url as string | undefined,
      rol: payload.rol as any,
      grupo_id: payload.grupo_id as string | undefined,
      debe_cambiar_password: Boolean(payload.debe_cambiar_password),
    };
  } catch {
    return null;
  }
}

/**
 * Obtiene la sesión actual desde las cookies de la petición
 */
export async function getCurrentSession(): Promise<SesionUsuario | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}

/**
 * Guarda el token de sesión en las cookies seguras httpOnly
 */
export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 días
  });
}

/**
 * Elimina la cookie de sesión (Logout)
 */
export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
