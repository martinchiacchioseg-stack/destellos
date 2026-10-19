import { z } from "zod";
import { api, json } from "@/lib/http";
import { db } from "@/lib/db";
import { requerirUsuario, hashPassword } from "@/lib/auth";
import { ApiError } from "@/lib/env";

const Body = z.object({
  password: z.string().min(4, "La clave debe tener al menos 4 caracteres.").max(100),
});

export const POST = api(async (req: Request) => {
  const c = await requerirUsuario({ ignorarLicencia: true });
  const b = await json(req, Body);

  if (b.password === "123456") {
    throw new ApiError(400, "Por tu seguridad, elegí una clave distinta a '123456'.");
  }

  const hash = await hashPassword(b.password);
  const up = await db()
    .from("usuarios")
    .update({
      password_hash: hash,
      intentos_fallidos: 0,
      bloqueado_hasta: null,
    })
    .eq("id", c.usuario.id);

  if (up.error) {
    throw new Error(`DB: ${up.error.message}`);
  }

  return { ok: true, mensaje: "Clave actualizada con éxito." };
});
