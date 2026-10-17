import "server-only";

export function env(name: string): string {
  const v = process.env[name];
  if (!v || !v.trim()) {
    throw new ConfigError(`Falta la variable de entorno ${name}.`);
  }
  return v.trim();
}

export function envOpt(name: string): string | null {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : null;
}

export class ConfigError extends Error {}

/** Error controlado que se traduce en una respuesta HTTP con mensaje apto para el usuario. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}
