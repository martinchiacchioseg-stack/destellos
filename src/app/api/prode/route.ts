import { z } from "zod";
import { api, json } from "@/lib/http";
import { db } from "@/lib/db";
import { contexto } from "@/lib/auth";

const PronosticoItem = z.object({
  partidoId: z.string().uuid(),
  pronostico: z.enum(["L", "E", "V"]),
  golesLocal: z.number().int().min(0).max(20).optional(),
  golesVisitante: z.number().int().min(0).max(20).optional(),
});

const BodyGuardar = z.object({
  pronosticos: z.array(PronosticoItem).min(1),
  usuarioId: z.string().optional(),
});

export const GET = api(async (req: Request) => {
  const c = await contexto();
  const url = new URL(req.url);
  const qUsuarioId = url.searchParams.get("usuarioId");
  const usuarioActualId = (c && c.tipo === "usuario") ? c.usuario.id : qUsuarioId;
  const grupoId = (c && c.tipo === "usuario") ? c.grupo.id : null;

  // 1. Obtener la fecha activa más reciente
  const { data: fechas, error: errFechas } = await db()
    .from("prode_fechas")
    .select("*")
    .order("creado_en", { ascending: false })
    .limit(1);

  if (errFechas || !fechas || fechas.length === 0) {
    return { fecha: null, partidos: [], pronosticos: {}, cerrada: false, miembros: [] };
  }

  const fechaActiva = fechas[0];
  const ahora = new Date();
  const limite = new Date(fechaActiva.limite_pronostico);
  const cerrada = ahora >= limite || fechaActiva.estado === "finalizada";

  // 2. Obtener partidos de la fecha
  const { data: partidos } = await db()
    .from("prode_partidos")
    .select("*")
    .eq("fecha_id", fechaActiva.id)
    .order("horario", { ascending: true });

  // 3. Pronósticos del usuario actual
  let misPronosticos: Record<string, { pronostico: string; golesLocal?: number; golesVisitante?: number; puntos?: number }> = {};
  if (usuarioActualId) {
    const { data: prons } = await db()
      .from("prode_pronosticos")
      .select("*")
      .eq("usuario_id", usuarioActualId);

    if (prons) {
      for (const p of prons) {
        misPronosticos[p.partido_id] = {
          pronostico: p.pronostico,
          golesLocal: p.goles_local,
          golesVisitante: p.goles_visitante,
          puntos: p.puntos_obtenidos,
        };
      }
    }
  }

  // 4. Si la fecha ya cerró o está en juego, traer pronósticos de la familia
  let pronosticosFamilia: Array<{
    usuarioId: string;
    nombre: string;
    apodo: string | null;
    pronosticos: Record<string, { pronostico: string; golesLocal?: number; golesVisitante?: number; puntos?: number }>;
    totalPuntosFecha: number;
  }> = [];

  const gid = grupoId || fechaActiva.grupo_id;
  if (gid) {
    const { data: usuarios } = await db()
      .from("usuarios")
      .select("id, nombre, apodo")
      .eq("grupo_id", gid);

    if (usuarios && usuarios.length > 0) {
      const uIds = usuarios.map(u => u.id);
      const { data: todosProns } = await db()
        .from("prode_pronosticos")
        .select("*")
        .in("usuario_id", uIds);

      for (const u of usuarios) {
        const uProns = (todosProns || []).filter(p => p.usuario_id === u.id);
        const dict: Record<string, { pronostico: string; golesLocal?: number; golesVisitante?: number; puntos?: number }> = {};
        let totalPts = 0;
        for (const up of uProns) {
          dict[up.partido_id] = {
            pronostico: up.pronostico,
            golesLocal: up.goles_local,
            golesVisitante: up.goles_visitante,
            puntos: up.puntos_obtenidos,
          };
          totalPts += up.puntos_obtenidos || 0;
        }
        pronosticosFamilia.push({
          usuarioId: u.id,
          nombre: u.nombre,
          apodo: u.apodo,
          pronosticos: dict,
          totalPuntosFecha: totalPts,
        });
      }

      pronosticosFamilia.sort((a, b) => b.totalPuntosFecha - a.totalPuntosFecha);
    }
  }

  return {
    fecha: fechaActiva,
    partidos: partidos || [],
    misPronosticos,
    cerrada,
    esAdmin: c?.tipo === "usuario" ? c.usuario.rol === "admin" : false,
    pronosticosFamilia: cerrada ? pronosticosFamilia : [],
  };
});

export const POST = api(async (req: Request) => {
  const c = await contexto();
  const b = await json(req, BodyGuardar);

  const usuarioId = (c && c.tipo === "usuario") ? c.usuario.id : b.usuarioId;
  const grupoId = (c && c.tipo === "usuario") ? c.grupo.id : null;

  if (!usuarioId) {
    return { error: "No se identificó el usuario para guardar pronósticos." };
  }

  // 1. Obtener la fecha activa
  const { data: fechas } = await db()
    .from("prode_fechas")
    .select("*")
    .order("creado_en", { ascending: false })
    .limit(1);

  if (!fechas || fechas.length === 0) {
    return { error: "No hay fecha de Prode activa." };
  }

  const fechaActiva = fechas[0];
  const ahora = new Date();
  const limite = new Date(fechaActiva.limite_pronostico);
  if (ahora >= limite || fechaActiva.estado === "finalizada") {
    return { error: "La fecha del Prode ya cerró para cargar pronósticos." };
  }

  const gId = grupoId || fechaActiva.grupo_id;

  // 2. Upsert de cada pronóstico
  for (const p of b.pronosticos) {
    await db().from("prode_pronosticos").upsert({
      partido_id: p.partidoId,
      usuario_id: usuarioId,
      grupo_id: gId,
      pronostico: p.pronostico,
      goles_local: p.golesLocal ?? null,
      goles_visitante: p.golesVisitante ?? null,
    }, {
      onConflict: "partido_id,usuario_id"
    });
  }

  return {
    ok: true,
    guardados: b.pronosticos.length,
    mensaje: "¡Tus pronósticos del Prode se guardaron con éxito!",
  };
});
