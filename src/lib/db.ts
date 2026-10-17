import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";

let client: SupabaseClient | null = null;

/** Cliente con service_role. Solo corre en el servidor; nunca se importa desde componentes cliente. */
export function db(): SupabaseClient {
  if (!client) {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "https://hzysabgjbcypfydeigkh.supabase.co";
    const key =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6eXNhYmdqYmN5cGZ5ZGVpZ2toIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjIxMjk2OSwiZXhwIjoyMTA3Nzg4OTY5fQ.2te043w-UVmprA-cPwBfeICOofkw9mM_6V-ojWKVXyk";

    client = createClient(url, key, {
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
