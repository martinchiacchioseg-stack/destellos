import { z } from "zod";
import { api, json } from "@/lib/http";
import { db, must } from "@/lib/db";
import { requerirUsuario } from "@/lib/auth";
import { miembrosDelGrupo, publicos } from "@/lib/usuarios";

/** Panel del administrador de la familia: integrantes (con contacto) y campanita. */
export const GET = api(async () => {
  const { grupo } = await requerirUsuario({ admin: true });
  const [miembros, notifs] = await Promise.all([
    miembrosDelGrupo(grupo.id),
    db().from("notificaciones").select("id,texto,leida,creado_en").eq("grupo_id", grupo.id).order("creado_en", { ascending: false }).limit(30),
  ]);
  const pubs = await publicos(miembros);
  return {
    grupo: { nombre: grupo.nombre, codigo: grupo.codigo, hora_limite: grupo.hora_limite, vence_en: grupo.vence_en },
    integrantes: miembros.map((m, i) => ({ ...pubs[i], whatsapp: m.whatsapp, email: m.email, nacimiento: m.nacimiento })),
    notificaciones: must(notifs),
  };
});

/** Marca las notificaciones como leídas. */
export const POST = api(async (req: Request) => {
  const { grupo } = await requerirUsuario({ admin: true });
  await json(req, z.object({ accion: z.literal("leer_todas") }));
  await db().from("notificaciones").update({ leida: true }).eq("grupo_id", grupo.id).eq("leida", false);
  return { ok: true };
});
