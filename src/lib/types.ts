export type TipoGrupo = "family" | "friends" | "sports_club" | "custom";

export interface ModulosActivos {
  flash_grupal: boolean;
  prode_futbol: boolean;
  picado_futbol: boolean;
  tarareo_ardilla: boolean;
  trazo_loco: boolean;
  cerebro_fuga: boolean;
}

export const MODULOS_DEFECTO: ModulosActivos = {
  flash_grupal: true,
  prode_futbol: false,
  picado_futbol: true,
  tarareo_ardilla: true,
  trazo_loco: true,
  cerebro_fuga: true,
};

export const PRESETS_TIPO_GRUPO: Record<TipoGrupo, { label: string; emoji: string; modulos: ModulosActivos }> = {
  family: {
    label: "Familia",
    emoji: "🏡",
    modulos: { flash_grupal: true, prode_futbol: false, picado_futbol: false, tarareo_ardilla: true, trazo_loco: true, cerebro_fuga: true },
  },
  friends: {
    label: "Grupo de Amigos",
    emoji: "🍻",
    modulos: { flash_grupal: true, prode_futbol: true, picado_futbol: true, tarareo_ardilla: true, trazo_loco: true, cerebro_fuga: true },
  },
  sports_club: {
    label: "Peña Deportiva / Fútbol",
    emoji: "⚽",
    modulos: { flash_grupal: true, prode_futbol: true, picado_futbol: true, tarareo_ardilla: false, trazo_loco: false, cerebro_fuga: true },
  },
  custom: {
    label: "Personalizado",
    emoji: "🛠️",
    modulos: { flash_grupal: true, prode_futbol: false, picado_futbol: false, tarareo_ardilla: false, trazo_loco: false, cerebro_fuga: false },
  },
};

export type EstadoPicado =
  | "convocatoria_abierta"
  | "lista_completa"
  | "en_juego"
  | "esperando_foto"
  | "finalizado";

export interface JugadorPicado {
  user_id: string;
  name: string;
  status: "confirmed" | "declined";
  reason_declined?: string;
  is_substitute: boolean;
  paid: boolean;
  timestamp: string;
}

export interface FotoPostPartido {
  photo_url: string;
  uploaded_by: string;
  uploader_name?: string;
  ai_title?: string;
  ai_verdict: string;
  uploaded_at: string;
}

export interface VotoMVP {
  voter_id: string;
  voted_mvp_id: string;
  voted_rusty_id: string;
  timestamp?: string;
}

export interface Picado {
  id: string;
  grupo_id: string;
  titulo: string;
  lugar: string | null;
  lugar_link: string | null;
  fecha_hora: string;
  limite_jugadores: number;
  info_pago: string | null;
  estado: EstadoPicado;
  jugadores: JugadorPicado[];
  foto_post_partido: FotoPostPartido | null;
  votos_mvp: VotoMVP[];
  creado_en: string;
  actualizado_en: string;
}

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
