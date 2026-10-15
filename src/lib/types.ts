export type Rol = 'superadmin' | 'admin' | 'miembro';

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
  creado_en: string;
}

export type UsuarioPublico = Omit<Usuario, 'password_hash' | 'intentos_fallidos' | 'bloqueado_hasta'>;

export interface Grupo {
  id: string;
  nombre: string;
  codigo_invitacion: string;
  descripcion?: string;
  activo: boolean;
  creado_en: string;
}

export interface RetoDiario {
  id: string;
  grupo_id?: string | null;
  fecha: string; // YYYY-MM-DD
  tema: string;
  descripcion: string;
  generado_por_ia: boolean;
  creado_en: string;
}

export type TipoMedia = 'foto' | 'video';

export interface Destello {
  id: string;
  grupo_id: string;
  usuario_id: string;
  fecha: string; // YYYY-MM-DD
  media_url: string;
  thumbnail_url?: string;
  tipo_media: TipoMedia;
  pie_de_foto?: string;
  cumple_reto?: boolean;
  reto_verificacion_detalle?: string;
  es_destello_del_dia: boolean;
  votos_comunidad: number;
  es_favorito_comunidad: boolean;
  moderado: boolean;
  motivo_moderacion?: string;
  creado_en: string;
  actualizado_en: string;
  usuario?: UsuarioPublico;
}

export interface EvaluacionDiaria {
  id: string;
  grupo_id: string;
  fecha: string;
  destello_ganador_id?: string | null;
  destello_favorito_id?: string | null;
  total_participantes: number;
  cerrado: boolean;
  cerrado_en?: string;
}

export type TipoEventoPuntos =
  | 'participacion_diaria'        // +1
  | 'destello_del_dia'            // +50 (Gemini Árbitro)
  | 'cumplir_reto'                // +2 (Reto temático)
  | 'votacion_comunidad_ganador'  // +5 (Más votado por el grupo)
  | 'adivina_quien_acierto'       // +10 por cada acierto
  | 'foto_pasado_acierto_exacto'  // +3
  | 'foto_pasado_acierto_cercano' // +1 (+- 2 años)
  | 'foto_pasado_anfitrion'       // +1 por cada miembro que participó
  | 'ruleta_rusa_responder'       // +2 por responder
  | 'ruleta_rusa_mas_reaccionada' // +3 respuesta más reaccionada
  | 'ruleta_rusa_pregunta_top'    // +1 autor de la pregunta más reaccionada
  | 'prode_acierto'               // +3 por acertar resultado L/E/V
  | 'prode_marcador_exacto'       // +1 extra por marcador exacto
  | 'trivia_diaria';              // +10 / +25 / +50 / -5 / -15 (Trivia Diaria)

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
  creado_en: string;
}

export interface RankingItem {
  usuario_id: string;
  nombre: string;
  apodo?: string;
  avatar_url?: string;
  puntos_totales: number;
  destellos_ganados: number;
  destellos_subidos: number;
  posicion: number;
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
// TIPOS PARA RULETA RUSA (Etapa 6)
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
  texto?: string; // alias conveniente
  nivel: NivelRuleta;
  aprobada_ia: boolean;
  asignada_a_usuario_id?: string | null;
  destinatario_id?: string | null; // alias
  es_bala: boolean;
  respuesta_texto?: string;
  respuesta_media_url?: string;
  respondida: boolean;
  paso_utilizado: boolean;
  pasada?: boolean; // alias
  reacciones_risa: number;
  reacciones_fuego: number;
  reacciones_amor: number;
  creado_en: string;
  autor?: UsuarioPublico;
  asignado?: UsuarioPublico;
  autor_nombre?: string;
  destinatario_nombre?: string;
}

// ==============================================================================
// TIPOS PARA PRODE DEL FIN DE SEMANA (Etapa 7)
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

// Aliases para compatibilidad de componentes
export type JuegoRuletaRonda = JuegoRuletaRusa;
export type ProdeFecha = JuegoProdeFecha;
export type ProdePartido = JuegoProdePartido;
export type ProdePronostico = JuegoProdePronostico;

// ==============================================================================
// PUBLICIDAD Y MONETIZACIÓN (Superadmin)
// ==============================================================================

export type UbicacionPublicidad =
  | 'post_subida'
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

// ==============================================================================
// TRIVIA DIARIA FAMILIAR
// ==============================================================================

export type DificultadTrivia = 'facil' | 'medio' | 'dificil';

export interface TriviaPregunta {
  id: string;
  fecha: string;
  difficulty: DificultadTrivia;
  category: string;
  question: string;
  options: string[];
  correct_answer_index: number;
  points_win: number;
  points_penalty: number;
  time_limit_seconds: number;
  explanation: string;
  fun_fact: string;
}

export interface TriviaIntento {
  id: string;
  usuario_id: string;
  grupo_id: string;
  fecha: string; // YYYY-MM-DD
  pregunta_id: string;
  difficulty: DificultadTrivia;
  respuesta_elegida_index: number;
  acerto: boolean;
  tiempo_agotado: boolean;
  puntos_obtenidos: number;
  creado_en: string;
}
