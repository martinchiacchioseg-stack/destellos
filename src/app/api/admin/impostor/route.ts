import { z } from "zod";
import { api, json } from "@/lib/http";
import { requerirUsuario } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApiError } from "@/lib/env";
import {
  obtenerConfiguracionImpostor,
  actualizarConfiguracionImpostor,
} from "@/lib/impostor";

const BodyConfig = z.object({
  activo: z.boolean().optional(),
  modo_seguro: z.boolean().optional(),
  cantidad_impostores: z.number().int().min(1).max(3).optional(),
  dias_no_repeticion: z.number().int().min(7).max(180).optional(),
  hora_inicio: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  hora_revelacion: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  hora_cierre: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  puntos_civil_acierta: z.number().int().optional(),
  puntos_impostor_engana: z.number().int().optional(),
  puntos_tiro_gracia: z.number().int().optional(),
  penalizacion_sin_pista: z.number().int().optional(),
  penalizacion_sin_voto: z.number().int().optional(),
  compensacion_civil_cancelada: z.number().int().optional(),
});

export const GET = api(async () => {
  const { usuario, grupo, esSuper } = await requerirUsuario();
  const esAdmin = usuario.rol === "admin" || esSuper;

  const config = await obtenerConfiguracionImpostor(grupo.id);

  // Historial de palabras generadas en este grupo
  const { data: historial } = await db()
    .from("impostor_historial_palabras")
    .select("id, palabra, categoria, fecha")
    .eq("grupo_id", grupo.id)
    .order("fecha", { ascending: false })
    .limit(30);

  // Partidas históricas
  const { data: partidas } = await db()
    .from("impostor_partidas")
    .select("id, fecha, estado, palabra_secreta, categoria, ganador, creado_en")
    .eq("grupo_id", grupo.id)
    .order("fecha", { ascending: false })
    .limit(15);

  return {
    esAdmin,
    config,
    historial: historial || [],
    partidas: partidas || [],
  };
});

export const POST = api(async (req: Request) => {
  const { usuario, grupo, esSuper } = await requerirUsuario();
  const esAdmin = usuario.rol === "admin" || esSuper;

  if (!esAdmin) {
    throw new ApiError(403, "Solo el administrador de la Tribu puede modificar estos ajustes.");
  }

  const b = await json(req, BodyConfig);
  const guardada = await actualizarConfiguracionImpostor(grupo.id, b);

  // Sincronizar con modulos_activos en tabla grupos si cambió activo
  if (b.activo !== undefined) {
    const { data: gActual } = await db()
      .from("grupos")
      .select("modulos_activos")
      .eq("id", grupo.id)
      .single();

    if (gActual) {
      const modulos = {
        ...(gActual.modulos_activos || {}),
        el_impostor: b.activo,
      };
      await db().from("grupos").update({ modulos_activos: modulos }).eq("id", grupo.id);
    }
  }

  return {
    ok: true,
    mensaje: "Ajustes de El Impostor guardados correctamente.",
    config: guardada,
  };
});
