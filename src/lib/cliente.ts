/** Llamada a la API desde el navegador. Lanza Error con el mensaje del servidor. */
export class ErrorApi extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message);
  }
}

export async function llamar<T = unknown>(url: string, opts: { method?: string; body?: unknown | FormData } = {}): Promise<T> {
  const esForm = typeof FormData !== "undefined" && opts.body instanceof FormData;
  const r = await fetch(url, {
    method: opts.method ?? (opts.body ? "POST" : "GET"),
    headers: opts.body && !esForm ? { "Content-Type": "application/json" } : undefined,
    body: opts.body ? (esForm ? (opts.body as FormData) : JSON.stringify(opts.body)) : undefined,
    cache: "no-store",
  });
  let data: { error?: string; code?: string } & Record<string, unknown> = {};
  try {
    data = await r.json();
  } catch {
    /* respuesta vacía */
  }
  if (!r.ok) throw new ErrorApi(data.error || "Algo salió mal. Probá de nuevo.", r.status, data.code);
  return data as T;
}
