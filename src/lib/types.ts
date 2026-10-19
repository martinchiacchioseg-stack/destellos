export type TipoGrupo = "family" | "friends" | "sports_club" | "custom";

export interface ModulosActivos {
  flash_grupal: boolean;
  prode_futbol: boolean;
  tarareo_ardilla: boolean;
  trazo_loco: boolean;
  cerebro_fuga: boolean;
}

export const MODULOS_DEFECTO: ModulosActivos = {
  flash_grupal: true,
  prode_futbol: false,
  tarareo_ardilla: true,
  trazo_loco: true,
  cerebro_fuga: true,
};

export const PRESETS_TIPO_GRUPO: Record<TipoGrupo, { label: string; emoji: string; modulos: ModulosActivos }> = {
  family: {
    label: "Familia",
    emoji: "🏡",
    modulos: { flash_grupal: true, prode_futbol: false, tarareo_ardilla: true, trazo_loco: true, cerebro_fuga: true },
  },
  friends: {
    label: "Grupo de Amigos",
    emoji: "🍻",
    modulos: { flash_grupal: true, prode_futbol: true, tarareo_ardilla: true, trazo_loco: true, cerebro_fuga: true },
  },
  sports_club: {
    label: "Peña Deportiva / Fútbol",
    emoji: "⚽",
    modulos: { flash_grupal: true, prode_futbol: true, tarareo_ardilla: false, trazo_loco: false, cerebro_fuga: true },
  },
  custom: {
    label: "Personalizado",
    emoji: "🛠️",
    modulos: { flash_grupal: true, prode_futbol: false, tarareo_ardilla: false, trazo_loco: false, cerebro_fuga: false },
  },
};

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
  tipo_grupo?: TipoGrupo;
  modulos_activos?: ModulosActivos;
  activo: boolean;
  creado_en: string;
}

export type Rol = "admin" | "miembro";

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
