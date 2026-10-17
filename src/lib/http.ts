import "server-only";
import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { ApiError, ConfigError } from "./env";

/** Envuelve un handler: errores controlados → JSON con mensaje; el resto → 500 sin filtrar detalles. */
export function api<A extends unknown[]>(fn: (...args: A) => Promise<Response | object>) {
  return async (...args: A): Promise<Response> => {
    try {
      const r = await fn(...args);
      return r instanceof Response ? r : NextResponse.json(r);
    } catch (e) {
      if (e instanceof ApiError) {
        return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
      }
      if (e instanceof ZodError) {
        return NextResponse.json({ error: e.issues[0]?.message || "Datos inválidos." }, { status: 400 });
      }
      if (e instanceof ConfigError) {
        console.error("[config]", e.message);
        return NextResponse.json({ error: "El servidor no está configurado todavía." }, { status: 503 });
      }
      console.error("[api]", e);
      return NextResponse.json({ error: "Algo salió mal. Probá de nuevo en un momento." }, { status: 500 });
    }
  };
}

export async function json<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ApiError(400, "Solicitud inválida.");
  }
  return schema.parse(body);
}
