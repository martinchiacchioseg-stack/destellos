import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies, headers } from 'next/headers';
import { SesionUsuario } from './types';

const JWT_SECRET_STRING = process.env.JWT_SECRET || 'destellos-super-secret-jwt-key-2026-un-clic-familiar';
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING);
export const COOKIE_NAME = 'destellos_session';

/**
 * Validador estricto de fortaleza de contraseña:
 * - Mínimo 8 caracteres
 * - Al menos una letra
 * - Al menos un número o caracter especial
 */
export function validarFortalezaPassword(password: string): { esValida: boolean; error?: string } {
  if (!password || typeof password !== 'string') {
    return { esValida: false, error: 'Debés ingresar una contraseña.' };
  }
  if (password.length < 8) {
    return { esValida: false, error: 'La contraseña debe tener como mínimo 8 caracteres.' };
  }
  const tieneLetra = /[a-zA-Z]/.test(password);
  const tieneNumeroOSimbolo = /[\d\W_]/.test(password);

  if (!tieneLetra || !tieneNumeroOSimbolo) {
    return {
      esValida: false,
      error: 'La contraseña debe combinar letras con al menos un número o símbolo para ser segura.',
    };
  }

  return { esValida: true };
}

/**
 * Rate Limiter en memoria para endpoints sensibles (login, upload, IA)
 */
interface RateRecord {
  intentos: number;
  primerIntento: number;
}
const rateLimitMap = new Map<string, RateRecord>();

export function checkRateLimit(
  identificador: string,
  maxIntentos: number = 5,
  ventanaSegundos: number = 60
): { permitido: boolean; segundosRestantes: number } {
  const ahora = Date.now();
  const registro = rateLimitMap.get(identificador);

  if (!registro) {
    rateLimitMap.set(identificador, { intentos: 1, primerIntento: ahora });
    return { permitido: true, segundosRestantes: 0 };
  }

  const tiempoTranscurrido = (ahora - registro.primerIntento) / 1000;

  if (tiempoTranscurrido > ventanaSegundos) {
    // Ventana expirada, reiniciamos
    rateLimitMap.set(identificador, { intentos: 1, primerIntento: ahora });
    return { permitido: true, segundosRestantes: 0 };
  }

  if (registro.intentos >= maxIntentos) {
    const segundosRestantes = Math.ceil(ventanaSegundos - tiempoTranscurrido);
    return { permitido: false, segundosRestantes };
  }

  registro.intentos += 1;
  return { permitido: true, segundosRestantes: 0 };
}

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
 * Obtiene la sesión actual desde las cookies o desde el header Authorization
 */
export async function getCurrentSession(): Promise<SesionUsuario | null> {
  try {
    const cookieStore = await cookies();
    let token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) {
      try {
        const headerStore = await headers();
        const auth = headerStore.get('authorization');
        if (auth && auth.startsWith('Bearer ')) {
          token = auth.slice(7).trim();
        }
      } catch {}
    }

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
  try {
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: false, // Universal para HTTP, HTTPS, localhost y webviews
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 días
    });
  } catch {}
}

/**
 * Elimina la cookie de sesión (Logout)
 */
export async function clearSessionCookie() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(COOKIE_NAME);
  } catch {}
}
