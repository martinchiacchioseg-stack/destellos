import { z } from "zod";
import { api, json } from "@/lib/http";
import { db } from "@/lib/db";
import { contexto, hashPassword } from "@/lib/auth";
import { ApiError } from "@/lib/env";
import { subirBuffer } from "@/lib/storage";

const PrimerIngresoSchema = z.object({
  nuevaPassword: z.string().min(4, "La contraseña debe tener al menos 4 caracteres.").max(100),
  apodo: z.string().max(40).optional().nullable(),
  bio: z.string().max(160).optional().nullable(),
});

/**
 * POST /api/auth/primer-ingreso
 * Permite cambiar obligatoriamente la clave temporal por la definitiva
 * y configurar el perfil inicial.
 */
export const POST = api(async (req: Request) => {
  const c = await contexto();
  if (!c || c.tipo !== "usuario") {
    throw new ApiError(401, "No hay sesión activa.");
  }

  const b = await json(req, PrimerIngresoSchema);
  const hash = await hashPassword(b.nuevaPassword);

  const updates: Record<string, unknown> = {
    password_hash: hash,
    debe_cambiar_clave: false,
    perfil_completo: true,
  };

  if (b.apodo !== undefined) updates.apodo = b.apodo?.trim() || null;
  if (b.bio !== undefined) updates.bio = b.bio?.trim() || null;

  const { data: usuario, error } = await db()
    .from("usuarios")
    .update(updates)
    .eq("id", c.usuario.id)
    .select("id, nombre, apodo, email, whatsapp, foto_path, rol")
    .single();

  if (error) throw new Error(error.message);

  return { ok: true, usuario };
});
