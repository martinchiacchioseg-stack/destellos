import { api } from "@/lib/http";
import { contexto } from "@/lib/auth";
import { publicos } from "@/lib/usuarios";
import { hoyAR } from "@/lib/fecha";
import { db } from "@/lib/db";

export const GET = api(async () => {
  const c = await contexto();
  if (!c) return { sesion: null };
  if (c.tipo === "superadmin") return { sesion: { tipo: "superadmin" } };
  const yo = (await publicos([c.usuario]))[0];

  const hoy = hoyAR();
  const { data: dHoy } = await db()
    .from("destellos")
    .select("id")
    .eq("usuario_id", c.usuario.id)
    .eq("fecha", hoy)
    .limit(1);

  const subiHoy = !!(dHoy && dHoy.length > 0);

  return {
    sesion: {
      tipo: "usuario",
      ...yo,
      esAdmin: c.usuario.rol === "admin" || c.esSuper,
      esSuper: c.esSuper,
      familia: c.grupo.nombre,
      emoji: c.grupo.emoji,
      subiHoy,
    },
  };
});
