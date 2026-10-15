// Utilidades para manejo estricto de la zona horaria: America/Argentina/Buenos_Aires

export const ZONA_HORARIA_ARG = 'America/Argentina/Buenos_Aires';

/**
 * Retorna la fecha actual o dada en formato YYYY-MM-DD según la zona horaria de Argentina.
 */
export function getFechaArgentina(d: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_HORARIA_ARG,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(d); // Retorna YYYY-MM-DD
}

/**
 * Retorna la fecha de ayer en formato YYYY-MM-DD según la zona horaria de Argentina.
 */
export function getAyerFechaArgentina(): string {
  const hoyStr = getFechaArgentina();
  const [year, month, day] = hoyStr.split('-').map(Number);
  const dateObj = new Date(Date.UTC(year, month - 1, day - 1, 12, 0, 0));
  return getFechaArgentina(dateObj);
}

/**
 * Retorna la hora, minutos y segundos actuales en Argentina.
 */
export function getHoraArgentina(d: Date = new Date()) {
  const formatter = new Intl.DateTimeFormat('es-AR', {
    timeZone: ZONA_HORARIA_ARG,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(d);
  const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
  const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
  const second = parseInt(parts.find((p) => p.type === 'second')?.value || '0', 10);

  return {
    hora: hour,
    minuto: minute,
    segundo: second,
    formatted: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
  };
}

/**
 * Calcula la semana del año actual en formato ISO: YYYY-Wxx en Argentina.
 */
export function getSemanaArgentina(d: Date = new Date()): string {
  const fechaStr = getFechaArgentina(d);
  const [year, month, day] = fechaStr.split('-').map(Number);
  const target = new Date(Date.UTC(year, month - 1, day));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = target.getTime();
  target.setUTCMonth(0, 1);
  if (target.getUTCDay() !== 4) {
    target.setUTCMonth(0, 1 + ((4 - target.getUTCDay() + 7) % 7));
  }
  const weekNumber = 1 + Math.ceil((firstThursday - target.getTime()) / 604800000);
  return `${year}-W${String(weekNumber).padStart(2, '0')}`;
}

/**
 * Retorna formato legible y cálido para la app: "Jueves 15 de Octubre"
 */
export function formatFechaBonita(fechaIso: string): string {
  if (!fechaIso) return '';
  const [year, month, day] = fechaIso.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const formatter = new Intl.DateTimeFormat('es-AR', {
    timeZone: ZONA_HORARIA_ARG,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const res = formatter.format(d);
  return res.charAt(0).toUpperCase() + res.slice(1);
}

/**
 * Calcula el tiempo que falta hasta el cierre diario (23:59:59 hora Argentina).
 */
export function getTiempoRestanteCierre(): { horas: number; minutos: number; texto: string } {
  const { hora, minuto } = getHoraArgentina();
  let horasRestantes = 23 - hora;
  let minutosRestantes = 59 - minuto;

  if (minutosRestantes < 0) {
    minutosRestantes += 60;
    horasRestantes -= 1;
  }

  if (horasRestantes < 0) {
    horasRestantes = 0;
    minutosRestantes = 0;
  }

  return {
    horas: horasRestantes,
    minutos: minutosRestantes,
    texto: `${horasRestantes}h ${minutosRestantes}m`,
  };
}
