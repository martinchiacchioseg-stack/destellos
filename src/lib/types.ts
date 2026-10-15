export type Rol = 'superadmin' | 'admin' | 'miembro';

export interface Usuario {
  id: string;
  email: string;
  password_hash: string;
  nombre: string;
  apodo?: string;
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
  | 'destello_del_dia'            // +10 (Gemini)
  | 'cumplir_reto'                // +2 (Reto temático)
  | 'votacion_comunidad_ganador'  // +5 (Más votado por el grupo)
  | 'adivina_quien_acierto'       // +1 por cada acierto
  | 'foto_pasado_acierto_exacto'  // +3
  | 'foto_pasado_acierto_cercano' // +1 (+- 2 años)
  | 'foto_pasado_anfitrion';      // +1 por cada miembro que participó

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
