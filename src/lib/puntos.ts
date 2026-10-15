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
    default:
      return 1;
  }
}
