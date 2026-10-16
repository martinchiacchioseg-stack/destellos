export type Rol = 'superadmin' | 'admin' | 'miembro';

export type EstadoGrupo = 'activo' | 'pausado';

export interface Grupo {
  id: string;
  nombre: string;
  emoji_or_logo?: string;
  hora_limite: string; // HH:MM (ej: "22:00")
  codigo_invitacion?: string;
  descripcion?: string;
  estado: EstadoGrupo;
  activo: boolean;
  creado_en: string;
  actualizado_en?: string;
}

export interface Usuario {
  id: string;
  email: string;
  password_hash: string;
  nombre: string;
  apodo?: string;
  telefono?: string;
  avatar_url?: string;
  rol: Rol;
  grupo_id?: string | null;
  debe_cambiar_password: boolean;
  intentos_fallidos: number;
  bloqueado_hasta?: string | null;
  activo: boolean;
  racha: number;
  creado_en: string;
}

export type UsuarioPublico = Omit<Usuario, 'password_hash' | 'intentos_fallidos' | 'bloqueado_hasta'>;

export type FaseDestello = 'subida' | 'adivinanza' | 'veredicto' | 'cerrado';

export interface Destello {
  id: string;
  grupo_id: string;
  usuario_id: string;
  fecha: string; // YYYY-MM-DD
  media_url: string;
  tipo_media?: 'foto' | 'video';
  thumbnail_url?: string;
  diploma_url?: string;
  pie_de_foto?: string;
  fase: FaseDestello;
  es_destello_del_dia: boolean;
  es_favorito_comunidad?: boolean;
  cumple_reto?: boolean;
  reto_verificacion_detalle?: string;
  titulo_diploma?: string | null;
  motivo_jurado?: string | null;
  votos_comunidad?: number;
  moderado: boolean;
  motivo_moderacion?: string;
  creado_en: string;
  actualizado_en: string;
  usuario?: UsuarioPublico;
}

export interface Adivinanza {
  id: string;
  grupo_id: string;
  adivinador_id: string;
  destello_id: string;
  usuario_adivinado_id: string;
  es_correcta: boolean;
  fecha: string; // YYYY-MM-DD
  creado_en: string;
}

export interface EvaluacionDiaria {
  id: string;
  grupo_id: string;
  fecha: string;
  destello_ganador_id?: string | null;
  usuario_ganador_id?: string | null;
  titulo_diploma?: string | null;
  motivo_jurado?: string | null;
  total_participantes: number;
  elegido_por_ia: boolean;
  cerrado: boolean;
  cerrado_en?: string;
}

export type TipoEventoPuntos =
  | 'subir_destello'        // +10
  | 'acierto_adivinanza'    // +5
  | 'destello_ganador_ia'   // +20
  | 'bonus_racha'           // bonus progresivo
  | 'trivia_acierto'        // +10
  | 'trivia_error';         // 0 o penalización

export const PUNTOS_CONFIG = {
  SUBIR_A_TIEMPO: 10,
  ACIERTO_ADIVINANZA: 5,
  DESTELLO_ELEGIDO_IA: 20,
  BONUS_RACHA_CADA_DIAS: 3,
  BONUS_RACHA_PUNTOS: 1,
  TRIVIA_FACIL: 10,
  TRIVIA_MEDIO: 25,
  TRIVIA_DIFICIL: 50,
} as const;

export interface PuntosEvento {
  id: string;
  grupo_id: string;
  usuario_id: string;
  fecha: string;
  tipo_evento: TipoEventoPuntos;
  puntos: number;
  descripcion: string;
  referencia_id?: string;
  creado_en: string;
}

export interface FeedPost {
  id: string;
  grupo_id: string;
  destello_id: string;
  usuario_ganador_id: string;
  nombre_ganador: string;
  fecha: string;
  diploma_url: string;
  pie_de_foto?: string;
  reacciones: Record<string, number>; // emoji -> count
  creado_en: string;
}

export interface Reaccion {
  id: string;
  feed_post_id: string;
  usuario_id: string;
  emoji: string;
  creado_en: string;
}

export type DificultadTrivia = 'facil' | 'medio' | 'dificil';

export interface TriviaPregunta {
  id: string;
  grupo_id?: string | null;
  fecha: string;
  difficulty: DificultadTrivia;
  category: string;
  question: string;
  options: string[];
  correct_index?: number;
  correct_answer_index?: number;
  time_limit_seconds?: number;
  explanation?: string;
  fun_fact?: string;
  points_win: number;
  points_penalty: number;
  es_manual?: boolean;
  creado_en?: string;
}

export interface TriviaIntento {
  id: string;
  pregunta_id: string;
  usuario_id: string;
  grupo_id: string;
  fecha: string;
  selected_index: number;
  respuesta_elegida_index?: number;
  tiempo_agotado?: boolean;
  difficulty?: DificultadTrivia;
  acerto: boolean;
  puntos_obtenidos: number;
  creado_en: string;
}

export interface AILog {
  id: string;
  grupo_id: string;
  fecha: string;
  tipo_accion: string;
  prompt_resumen?: string;
  respuesta_ia?: string;
  ganador_elegido_id?: string;
  usado_fallback: boolean;
  error?: string;
  creado_en: string;
}

export interface RankingItem {
  posicion: number;
  usuario_id: string;
  nombre: string;
  apodo?: string;
  avatar_url?: string;
  puntos: number;
  destellos_ganados: number;
  racha: number;
  es_usuario_actual?: boolean;
}

export interface SesionUsuario {
  id: string;
  email: string;
  nombre: string;
  apodo?: string;
  avatar_url?: string;
  rol: Rol;
  grupo_id?: string | null;
  debe_cambiar_password: boolean;
}
