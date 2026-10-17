export type Rol = "miembro" | "admin";

export interface Grupo {
  id: string;
  nombre: string;
  emoji: string;
  codigo: string;
  codigo_norm: string;
  hora_limite: string;
  admin_nombre: string | null;
  admin_email: string | null;
  vence_en: string;
  activo: boolean;
  creado_en: string;
}

export interface Usuario {
  id: string;
  grupo_id: string;
  nombre: string;
  apodo: string | null;
  email: string | null;
  whatsapp: string | null;
  nacimiento: string | null;
  foto_path: string | null;
  rol: Rol;
  password_hash: string;
  intentos_fallidos: number;
  bloqueado_hasta: string | null;
  creado_en: string;
}

export type EstadoLicencia = "activa" | "por_vencer" | "vencida" | "pausada";

export type NivelTrivia = "facil" | "medio" | "experto";

export const NIVELES: Record<NivelTrivia, { segundos: number; puntos: number; etiqueta: string; emoji: string }> = {
  facil: { segundos: 15, puntos: 1, etiqueta: "Fácil", emoji: "🎭" },
  medio: { segundos: 20, puntos: 3, etiqueta: "Medio", emoji: "💡" },
  experto: { segundos: 25, puntos: 5, etiqueta: "Experto", emoji: "🔥" },
};

export const COLORES_LED = ["ambar", "verde", "rojo", "celeste", "magenta"] as const;
export type ColorLed = (typeof COLORES_LED)[number];

/** Puntos del ranking familiar. */
export const PUNTOS = { foto: 1, ganador: 5 } as const;
