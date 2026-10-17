import { api } from "@/lib/http";
import { cerrarSesion } from "@/lib/session";

export const POST = api(async () => {
  await cerrarSesion();
  return { ok: true };
});
