const TZ = "America/Argentina/Buenos_Aires";

function partes(d: Date) {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const o: Record<string, string> = {};
  for (const p of f.formatToParts(d)) o[p.type] = p.value;
  return o;
}

/** YYYY-MM-DD en hora argentina. */
export function hoyAR(d = new Date()): string {
  const p = partes(d);
  return `${p.year}-${p.month}-${p.day}`;
}

/** HH:MM en hora argentina. */
export function horaAR(d = new Date()): string {
  const p = partes(d);
  return `${p.hour}:${p.minute}`;
}

export function ayerAR(): string {
  return hoyAR(new Date(Date.now() - 24 * 3600 * 1000));
}

/** true si ya pasó la hora límite del día de hoy. */
export function pasoHoraLimite(horaLimite: string): boolean {
  return horaAR() >= horaLimite;
}

export function diasHasta(fecha: string): number {
  const a = new Date(hoyAR() + "T00:00:00Z").getTime();
  const b = new Date(fecha + "T00:00:00Z").getTime();
  return Math.round((b - a) / 86400000);
}

export function sumarDias(fecha: string, dias: number): string {
  const d = new Date(fecha + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

export function sumarMeses(fecha: string, meses: number): string {
  const d = new Date(fecha + "T00:00:00Z");
  d.setUTCMonth(d.getUTCMonth() + meses);
  return d.toISOString().slice(0, 10);
}
