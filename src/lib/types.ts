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

// ==============================================================================
// RETO DIARIO (Gemini)
// ==============================================================================
export interface RetoDiario {
  id: string;
  grupo_id?: string | null;
  fecha: string;
  titulo?: string;
  tema?: string;
  descripcion: string;
  puntos_bonus?: number;
  generado_por_ia?: boolean;
  creado_en?: string;
}

// ==============================================================================
// JUEGOS Y VOTACIÓN CRUZADA
// ==============================================================================
export interface JuegoAdivinaIntento {
  id: string;
  grupo_id: string;
  fecha: string;
  usuario_id: string;
  destello_id: string;
  autor_adivinado_id: string;
  es_correcto: boolean;
  creado_en: string;
}

export interface JuegoVotoCruzado {
  id: string;
  grupo_id: string;
  fecha: string;
  votante_id: string;
  destello_id: string;
  creado_en: string;
}

export interface JuegoFotoPasado {
  id: string;
  grupo_id: string;
  semana: string; // Ej: 2026-W42
  usuario_id: string;
  media_url: string;
  anio_real: number;
  lugar_real: string;
  pista?: string;
  esPropia?: boolean;
  cerrada: boolean;
  creado_en: string;
  usuario?: UsuarioPublico;
  adivinanzas_count?: number;
}

export interface JuegoFotoPasadoAdivinanza {
  id: string;
  foto_pasado_id: string;
  usuario_id: string;
  anio_adivinado: number;
  lugar_adivinado?: string;
  puntos_obtenidos: number;
  puntos_ganados?: number;
  creado_en: string;
}

// ==============================================================================
// RULETA RUSA PICANTE
// ==============================================================================
export type NivelRuleta = 'suave' | 'picante' | 'extra_picante';
export type EstadoRuleta = 'preguntas' | 'ruleta' | 'respuestas' | 'finalizada' | 'girada';

export interface JuegoRuletaRusa {
  id: string;
  grupo_id: string;
  nivel_maximo: NivelRuleta;
  estado: EstadoRuleta;
  cerrada: boolean;
  creado_en: string;
}

export interface JuegoRuletaPregunta {
  id: string;
  ronda_id: string;
  autor_usuario_id: string;
  texto_pregunta: string;
  texto?: string;
  nivel: NivelRuleta;
  aprobada_ia: boolean;
  asignada_a_usuario_id?: string | null;
  destinatario_id?: string | null;
  es_bala: boolean;
  respuesta_texto?: string;
  respuesta_media_url?: string;
  respondida: boolean;
  paso_utilizado: boolean;
  pasada?: boolean;
  reacciones_risa: number;
  reacciones_fuego: number;
  reacciones_amor: number;
  creado_en: string;
  autor?: UsuarioPublico;
  asignado?: UsuarioPublico;
  autor_nombre?: string;
  destinatario_nombre?: string;
}

export type JuegoRuletaRonda = JuegoRuletaRusa;

// ==============================================================================
// PRODE DEL FÚTBOL
// ==============================================================================
export type EstadoPartido = 'programado' | 'en_vivo' | 'finalizado' | 'suspendido';
export type ResultadoPronostico = 'L' | 'E' | 'V';

export interface JuegoProdeFecha {
  id: string;
  grupo_id: string;
  torneo_nombre: string;
  numero_fecha: number;
  nombre?: string;
  fecha_inicio: string;
  fecha_fin: string;
  cerrada: boolean;
  creado_en: string;
}

export interface JuegoProdePartido {
  id: string;
  fecha_prode_id: string;
  equipo_local: string;
  escudo_local?: string;
  equipo_visitante: string;
  escudo_visitante?: string;
  fecha_hora_partido: string;
  fecha_hora_texto?: string;
  estado?: string;
  goles_local?: number | null;
  goles_visitante?: number | null;
  estado_partido: EstadoPartido;
  resultado_final?: ResultadoPronostico | null;
  creado_en: string;
}

export interface JuegoProdePronostico {
  id: string;
  partido_id: string;
  usuario_id: string;
  pronostico: ResultadoPronostico | 'local' | 'empate' | 'visitante';
  goles_local_pronostico?: number | null;
  goles_visitante_pronostico?: number | null;
  goles_local?: number | null;
  goles_visitante?: number | null;
  corregido: boolean;
  acerto: boolean;
  acertado?: boolean;
  puntos_sumados: number;
  puntos_ganados?: number;
  creado_en: string;
}

export type ProdeFecha = JuegoProdeFecha;
export type ProdePartido = JuegoProdePartido;
export type ProdePronostico = JuegoProdePronostico;

// ==============================================================================
// PUBLICIDADES Y MONETIZACIÓN (Superadmin)
// ==============================================================================
export type UbicacionPublicidad =
  | 'post_subida'
  | 'feed_entre_destellos'
  | 'juegos_banner'
  | 'pantalla_bloqueo'
  | 'foto_ganadora'
  | 'prode'
  | 'interstitial_juegos'
  | 'interstitial_ranking'
  | 'fin_desafio_ruleta'
  | 'fin_desafio_prode'
  | 'fin_desafio_reto_diario'
  | 'fin_desafio_voto_cruzado'
  | 'fin_desafio_adivina'
  | 'fin_desafio_foto_pasado'
  | 'fin_desafio_trivia';

export interface Publicidad {
  id: string;
  titulo: string;
  texto: string;
  imagen_url?: string;
  link_url?: string;
  ubicacion: UbicacionPublicidad;
  activa: boolean;
  creado_en: string;
}

export interface ReglasConfig {
  id: string;
  grupo_id?: string | null;
  solo_mostrar_si_todos_subieron: boolean;
  racha_activa: boolean;
  apurar_whatsapp_activo: boolean;
  nivel_ruleta_maximo: NivelRuleta;
  puntos_destello_ganador: number;
  puntos_participacion: number;
}

export type ReglasGrupo = ReglasConfig & {
  fotos_borrosas_hasta_subir?: boolean;
  prode_marcador_exacto_bonus?: boolean;
};
