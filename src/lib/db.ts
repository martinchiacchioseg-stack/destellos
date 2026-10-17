import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";

let client: SupabaseClient | null = null;

/** Cliente con service_role. Solo corre en el servidor; nunca se importa desde componentes cliente. */
export function db(): SupabaseClient {
  if (!client) {
    client = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

export const BUCKET = "destellos";

/** Desenvuelve una respuesta de Supabase o lanza el error de base de datos. */
export function must<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(`DB: ${res.error.message}`);
  return res.data as T;
}
