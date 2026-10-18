import { api } from "@/lib/http";
import { db } from "@/lib/db";
import { contexto } from "@/lib/auth";

export const GET = api(async () => {
  const c = await contexto();
  const grupoId = (c && c.tipo === "usuario") ? c.grupo.id : null;

  // Traer todos los pronósticos evaluados con sus usuarios
  let query = db()
    .from("prode_pronosticos")
    .select(`
      puntos_obtenidos,
      evaluado,
      usuario_id,
      usuarios (
        id,
        nombre,
        apodo,
        foto_path
      )
    `);

  if (grupoId) {
    query = query.eq("grupo_id", grupoId);
  }

  const { data: pronosticos, error } = await query;

  if (error || !pronosticos) {
    return { ranking: [] };
  }

  // Agrupar por usuario
  const mapaUsuarios: Record<string, {
    id: string;
    nombre: string;
    apodo: string | null;
    puntosTotales: number;
    partidosPronosticados: number;
    plenos: number; // 8 puntos
    aciertosSimples: number; // 3 puntos
  }> = {};

  for (const pr of pronosticos) {
    const u = Array.isArray(pr.usuarios) ? pr.usuarios[0] : pr.usuarios;
    if (!u) continue;

    if (!mapaUsuarios[u.id]) {
      mapaUsuarios[u.id] = {
        id: u.id,
        nombre: u.nombre,
        apodo: u.apodo,
        puntosTotales: 0,
        partidosPronosticados: 0,
        plenos: 0,
        aciertosSimples: 0,
      };
    }

    mapaUsuarios[u.id].partidosPronosticados++;
    const pts = pr.puntos_obtenidos || 0;
    mapaUsuarios[u.id].puntosTotales += pts;
    if (pts === 8) {
      mapaUsuarios[u.id].plenos++;
    } else if (pts === 3) {
      mapaUsuarios[u.id].aciertosSimples++;
    }
  }

  const ranking = Object.values(mapaUsuarios).sort((a, b) => {
    if (b.puntosTotales !== a.puntosTotales) return b.puntosTotales - a.puntosTotales;
    return b.plenos - a.plenos;
  });

  return { ranking };
});
