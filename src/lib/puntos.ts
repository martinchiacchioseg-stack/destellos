import { TipoEventoPuntos } from './types';

export const PUNTUACIONES = {
  PARTICIPACION_DIARIA: 1,
  DESTELLO_DEL_DIA: 10,
  CUMPLIR_RETO: 2,
  VOTACION_COMUNIDAD: 5,
  ADIVINA_QUIEN_ACIERTO: 1,
  FOTO_PASADO_EXACTO: 3,
  FOTO_PASADO_CERCANO: 1,
  FOTO_PASADO_ANFITRION: 1,
  RULETA_RUSA_RESPONDER: 2,
  RULETA_RUSA_MAS_REACCIONADA: 3,
  RULETA_RUSA_PREGUNTA_TOP: 1,
  PRODE_ACIERTO: 3,
  PRODE_MARCADOR_EXACTO: 1,
} as const;

export const DESCRIPCIONES_PUNTOS: Record<TipoEventoPuntos, string> = {
  participacion_diaria: '¡Por subir tu destello de hoy! 📸',
  destello_del_dia: '🌟 ¡Tu foto fue elegida el Destello del Día!',
  cumplir_reto: '✨ ¡Por cumplir con el reto del día!',
  votacion_comunidad_ganador: '❤️ ¡La foto favorita elegida por el grupo!',
  adivina_quien_acierto: '🎯 ¡Acierto en Adiviná Quién!',
  foto_pasado_acierto_exacto: '🕰️ ¡Acierto exacto del año en Foto del Pasado!',
  foto_pasado_acierto_cercano: '🕰️ ¡Muy cerca del año en Foto del Pasado (±2 años)!',
  foto_pasado_anfitrion: '🙌 Tu foto del pasado puso a jugar a todos',
  ruleta_rusa_responder: '🎲 ¡Por responder en la Ruleta Rusa!',
  ruleta_rusa_mas_reaccionada: '🔥 ¡La respuesta más reaccionada de la Ruleta Rusa!',
  ruleta_rusa_pregunta_top: '✨ Tu pregunta fue la más picante y reaccionada',
  prode_acierto: '⚽ ¡Golazo! Acierto en el Prode del Fin de Semana',
  prode_marcador_exacto: '🎯 ¡Pleno! Marcador exacto en el Prode',
};

/**
 * Retorna los puntos estándar correspondientes al tipo de evento
 */
export function getPuntosPorEvento(tipo: TipoEventoPuntos): number {
  switch (tipo) {
    case 'destello_del_dia':
      return PUNTUACIONES.DESTELLO_DEL_DIA;
    case 'participacion_diaria':
      return PUNTUACIONES.PARTICIPACION_DIARIA;
    case 'cumplir_reto':
      return PUNTUACIONES.CUMPLIR_RETO;
    case 'votacion_comunidad_ganador':
      return PUNTUACIONES.VOTACION_COMUNIDAD;
    case 'adivina_quien_acierto':
      return PUNTUACIONES.ADIVINA_QUIEN_ACIERTO;
    case 'foto_pasado_acierto_exacto':
      return PUNTUACIONES.FOTO_PASADO_EXACTO;
    case 'foto_pasado_acierto_cercano':
      return PUNTUACIONES.FOTO_PASADO_CERCANO;
    case 'foto_pasado_anfitrion':
      return PUNTUACIONES.FOTO_PASADO_ANFITRION;
    case 'ruleta_rusa_responder':
      return PUNTUACIONES.RULETA_RUSA_RESPONDER;
    case 'ruleta_rusa_mas_reaccionada':
      return PUNTUACIONES.RULETA_RUSA_MAS_REACCIONADA;
    case 'ruleta_rusa_pregunta_top':
      return PUNTUACIONES.RULETA_RUSA_PREGUNTA_TOP;
    case 'prode_acierto':
      return PUNTUACIONES.PRODE_ACIERTO;
    case 'prode_marcador_exacto':
      return PUNTUACIONES.PRODE_MARCADOR_EXACTO;
    default:
      return 1;
  }
}
