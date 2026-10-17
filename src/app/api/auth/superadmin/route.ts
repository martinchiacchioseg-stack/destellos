import { z } from "zod";
import { api, json } from "@/lib/http";
import { verificarSuperadmin } from "@/lib/auth";
import { crearSesion } from "@/lib/session";
import { ApiError } from "@/lib/env";

// Limitador simple por instancia + demora constante para frenar fuerza bruta.
const fallos = new Map<string, { n: number; hasta: number }>();

export const POST = api(async (req: Request) => {
  const { email, password } = await json(req, z.object({ email: z.string().max(160), password: z.string().max(200) }));
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const f = fallos.get(ip);
  if (f && f.hasta > Date.now()) throw new ApiError(429, "Probá de nuevo en unos minutos.");

  const ok = await verificarSuperadmin(email, password);
  if (!ok) {
    const n = (f?.n ?? 0) + 1;
    fallos.set(ip, { n, hasta: n >= 5 ? Date.now() + 15 * 60_000 : 0 });
    await new Promise((r) => setTimeout(r, 800));
    throw new ApiError(401, "Credenciales inválidas.");
  }
  fallos.delete(ip);
  await crearSesion("superadmin");
  return { ok: true };
});
