import { z } from "zod";
import { api, json } from "@/lib/http";
import { db } from "@/lib/db";
import { contexto } from "@/lib/auth";
import { hoyAR } from "@/lib/fecha";

const Body = z.object({
  juego: z.string(),
  puntos: z.number().int(),
  motivo: z.string().max(150).optional(),
  descripcion: z.string().max(150).optional(),
  usuarioId: z.string().optional(),
});

export const POST = api(async (req: Request) => {
  const c = await contexto();
  const b = await json(req, Body);
  const razon = b.motivo || b.descripcion || `Actividad en ${b.juego}`;

  // Si hay sesión de usuario, registrar en Supabase
  if (c && c.tipo === "usuario") {
    try {
      await db().from("puntos").insert({
        grupo_id: c.grupo.id,
        usuario_id: c.usuario.id,
        fecha: hoyAR(),
        motivo: `${b.juego}: ${razon}`,
        puntos: b.puntos,
      });
    } catch (e) {
      console.warn("[puntos] No se pudo persistir en DB:", e);
    }
  }

  return {
    ok: true,
    sumados: b.puntos,
    juego: b.juego,
    motivo: razon,
  };
});

export const GET = api(async (req: Request) => {
  const url = new URL(req.url);
  const usuarioId = url.searchParams.get("usuarioId");
  const c = await contexto();

  let total = 340; // Base inicial del club
  const uId = (c && c.tipo === "usuario") ? c.usuario.id : usuarioId;

  if (uId) {
    try {
      const { data } = await db()
        .from("puntos")
        .select("puntos")
        .eq("usuario_id", uId);

      if (data && data.length > 0) {
        total += data.reduce((acc: number, r: { puntos: number }) => acc + (r.puntos || 0), 0);
      }
    } catch {
      // Retornar total calculado
    }
  }

  return { totalPuntos: total };
});
