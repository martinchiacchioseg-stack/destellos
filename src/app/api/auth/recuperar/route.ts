import { z } from "zod";
import { randomInt } from "crypto";
import bcrypt from "bcryptjs";
import { api, json } from "@/lib/http";
import { db } from "@/lib/db";
import { grupoPorCodigo } from "@/lib/grupos";
import { buscarPorIdentificador } from "@/lib/usuarios";
import { enviarMail, mailConfigurado } from "@/lib/mail";

/** Envía un código de 6 dígitos (válido 15 min). La respuesta es siempre la misma para no revelar quién existe. */
export const POST = api(async (req: Request) => {
  const { codigo, identificador } = await json(req, z.object({ codigo: z.string().min(2), identificador: z.string().min(3).max(120) }));
  const respuesta = { ok: true, mensaje: "Si los datos son correctos, te enviamos un código al correo registrado. Vale por 15 minutos." };

  const g = await grupoPorCodigo(codigo);
  if (!g) return respuesta;
  const u = await buscarPorIdentificador(g.id, identificador);
  if (!u?.email) return respuesta;

  // Limitar a un pedido por minuto.
  const reciente = await db()
    .from("reset_codigos")
    .select("id")
    .eq("usuario_id", u.id)
    .gte("creado_en", new Date(Date.now() - 60_000).toISOString())
    .limit(1);
  if (reciente.data?.length) return respuesta;

  const pin = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db().from("reset_codigos").update({ usado: true }).eq("usuario_id", u.id).eq("usado", false);
  await db().from("reset_codigos").insert({
    usuario_id: u.id,
    codigo_hash: await bcrypt.hash(pin, 8),
    vence_en: new Date(Date.now() + 15 * 60_000).toISOString(),
  });
  if (mailConfigurado()) {
    await enviarMail({
      para: u.email,
      asunto: "Tu código para recuperar la clave de Destellos",
      texto: `Hola ${u.apodo || u.nombre}, tu código es ${pin}. Vale por 15 minutos. Si no lo pediste vos, ignorá este mensaje.`,
    });
  } else {
    // Si el servidor de correo no está configurado, registrar aviso in-app para que el admin familiar pueda brindar asistencia directa
    try {
      await db().from("notificaciones").insert({
        grupo_id: g.id,
        tipo: "recuperacion_clave",
        mensaje: `${u.nombre} solicitó código de recuperación de clave. Código temporal: ${pin} (válido 15 min).`,
        leido: false,
      });
    } catch {
      // Ignorar si la tabla de notificaciones no estuviera disponible
    }
  }
  return respuesta;
});
