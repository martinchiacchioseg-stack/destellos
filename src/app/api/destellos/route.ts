import { z } from "zod";
import { api } from "@/lib/http";
import { db } from "@/lib/db";
import { requerirUsuario } from "@/lib/auth";
import { hoyAR, pasoHoraLimite } from "@/lib/fecha";
import { subirImagen, borrarArchivos } from "@/lib/storage";
import { ApiError } from "@/lib/env";
import { PUNTOS } from "@/lib/types";
import { publicarArlequin } from "@/lib/pizarra";
import { nombreCorto } from "@/lib/usuarios";

/** Sube el destello del día: una foto por integrante, antes de la hora límite de la familia. */
export const POST = api(async (req: Request) => {
  const { usuario, grupo } = await requerirUsuario();
  const hoy = hoyAR();
  if (pasoHoraLimite(grupo.hora_limite)) {
    throw new ApiError(409, `Ya pasó la hora límite (${grupo.hora_limite} hs). ¡Mañana hay otro destello! ✨`);
  }
  const fd = await req.formData();
  const foto = fd.get("foto");
  if (!(foto instanceof File) || foto.size === 0) throw new ApiError(400, "Elegí una foto para subir.");
  const desc = z.string().trim().max(200).optional().parse(typeof fd.get("descripcion") === "string" ? (fd.get("descripcion") as string) || undefined : undefined);

  const path = await subirImagen(foto, "fotos");
  const ins = await db()
    .from("destellos")
    .insert({ grupo_id: grupo.id, usuario_id: usuario.id, fecha: hoy, foto_path: path, descripcion: desc || null })
    .select("id")
    .single();
  if (ins.error) {
    await borrarArchivos([path]);
    if (ins.error.code === "23505") throw new ApiError(409, "Hoy ya subiste tu destello. ¡Mañana más! 🎭");
    throw new Error(`DB: ${ins.error.message}`);
  }

  await db()
    .from("puntos")
    .upsert({ grupo_id: grupo.id, usuario_id: usuario.id, fecha: hoy, motivo: "foto", puntos: PUNTOS.foto }, { onConflict: "usuario_id,fecha,motivo", ignoreDuplicates: true });
  await publicarArlequin(grupo.id, `📸 ${nombreCorto(usuario).toUpperCase()} ya subió su destello de hoy`, "celeste");
  return { ok: true, id: ins.data.id };
});
