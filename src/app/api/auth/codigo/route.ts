import { z } from "zod";
import { api, json } from "@/lib/http";
import { grupoPorCodigo, estadoLicencia, licenciaPermiteAcceso } from "@/lib/grupos";
import { miembrosDelGrupo, publicos } from "@/lib/usuarios";
import { ApiError } from "@/lib/env";

/** Paso 1 del ingreso: valida el código (tolerante) y devuelve la bienvenida + integrantes para elegir. */
export const POST = api(async (req: Request) => {
  const { codigo } = await json(req, z.object({ codigo: z.string().min(2).max(40) }));
  const g = await grupoPorCodigo(codigo);
  if (!g) throw new ApiError(404, "No encontramos una familia con ese código. Revisalo y probá de nuevo 🎭");
  if (!licenciaPermiteAcceso(g)) {
    throw new ApiError(
      402,
      `El espacio de la familia ${g.nombre} está en pausa por ahora. Hablá con el administrador para reactivarlo.`,
      estadoLicencia(g),
    );
  }
  const miembros = await publicos(await miembrosDelGrupo(g.id));
  return {
    grupo: { nombre: g.nombre, emoji: g.emoji },
    bienvenida: `¡Bienvenido a la familia ${g.nombre}! 🎭`,
    miembros: miembros.map(({ id, nombre, apodo, foto_url }) => ({ id, nombre, apodo, foto_url })),
  };
});
