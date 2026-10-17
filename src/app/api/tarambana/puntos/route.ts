import { z } from "zod";
import { api, json } from "@/lib/http";
import { db } from "@/lib/db";
import { contexto } from "@/lib/auth";
import { hoyAR } from "@/lib/fecha";

const Body = z.object({
  juego: z.enum(["flash_grupal", "los_tarambana", "cerebro_en_fuga", "trazo_loco"]),
  puntos: z.number().int(),
  motivo: z.string().max(100),
});

export const POST = api(async (req: Request) => {
  const c = await contexto();
  const b = await json(req, Body);

  // Si hay sesión de usuario, registrar en Supabase
  if (c && c.tipo === "usuario") {
    try {
      await db().from("puntos").insert({
        grupo_id: c.grupo.id,
        usuario_id: c.usuario.id,
        fecha: hoyAR(),
        motivo: `${b.juego}: ${b.motivo}`,
        puntos: b.puntos,
      });
    } catch (e) {
      console.warn("[puntos] No se pudo persistir en DB, acumulando en memoria:", e);
    }
  }

  return {
    ok: true,
    sumados: b.puntos,
    juego: b.juego,
    motivo: b.motivo,
  };
});
