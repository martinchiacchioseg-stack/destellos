import { z } from "zod";
import bcrypt from "bcryptjs";
import { api, json } from "@/lib/http";
import { db } from "@/lib/db";
import { grupoPorCodigo } from "@/lib/grupos";
import { buscarPorIdentificador } from "@/lib/usuarios";
import { hashPassword } from "@/lib/auth";
import { ApiError } from "@/lib/env";

const MAX_INTENTOS = 5;

export const POST = api(async (req: Request) => {
  const b = await json(
    req,
    z.object({
      codigo: z.string().min(2),
      identificador: z.string().min(3).max(120),
      pin: z.string().regex(/^\d{6}$/, "El código tiene 6 dígitos."),
      password: z.string().min(6, "La clave debe tener al menos 6 caracteres.").max(100),
    }),
  );
  const invalido = new ApiError(400, "El código es incorrecto o venció. Pedí uno nuevo.");
  const g = await grupoPorCodigo(b.codigo);
  if (!g) throw invalido;
  const u = await buscarPorIdentificador(g.id, b.identificador);
  if (!u) throw invalido;

  const { data } = await db()
    .from("reset_codigos")
    .select("*")
    .eq("usuario_id", u.id)
    .eq("usado", false)
    .gt("vence_en", new Date().toISOString())
    .order("creado_en", { ascending: false })
    .limit(1);
  const r = data?.[0];
  if (!r || r.intentos >= MAX_INTENTOS) throw invalido;

  if (!(await bcrypt.compare(b.pin, r.codigo_hash))) {
    await db().from("reset_codigos").update({ intentos: r.intentos + 1 }).eq("id", r.id);
    throw invalido;
  }

  await db().from("reset_codigos").update({ usado: true }).eq("id", r.id);
  await db()
    .from("usuarios")
    .update({ password_hash: await hashPassword(b.password), intentos_fallidos: 0, bloqueado_hasta: null })
    .eq("id", u.id);
  return { ok: true, mensaje: "¡Listo! Ya podés ingresar con tu nueva clave." };
});
