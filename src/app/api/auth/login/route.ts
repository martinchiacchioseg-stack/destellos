import { z } from "zod";
import { api, json } from "@/lib/http";
import { db, must } from "@/lib/db";
import { grupoPorCodigo, licenciaPermiteAcceso } from "@/lib/grupos";
import { verificarPassword, verificarSuperadmin, hashPassword } from "@/lib/auth";
import { crearSesion } from "@/lib/session";
import { ApiError } from "@/lib/env";
import { buscarPorIdentificador } from "@/lib/usuarios";
import type { Usuario } from "@/lib/types";

const MAX_INTENTOS = 5;
const BLOQUEO_MIN = 10;

const Body = z.object({
  /** Código ahora es opcional. Si no viene, se busca directamente por email o whatsapp globalmente. */
  codigo: z.string().optional(),
  usuarioId: z.string().uuid().optional(),
  identificador: z.string().max(120).optional(),
  password: z.string().min(1).max(200),
});

export const POST = api(async (req: Request) => {
  const b = await json(req, Body);

  let u: Usuario | null = null;
  let g: any = null;

  const rawIdent = (b.identificador || "").trim();
  const rawLower = rawIdent.toLowerCase();
  const soloNum = rawIdent.replace(/\D/g, "");

  // 0. Si escribió explícitamente "superadmin", acceso directo al panel maestro
  if (rawLower === "superadmin") {
    const esSuper = await verificarSuperadmin(rawIdent, b.password);
    if (esSuper) {
      await crearSesion("superadmin");
      return {
        ok: true,
        esSuperadmin: true,
        debeCambiarClave: false,
        perfilCompleto: true,
        redirect: "/superadmin",
      };
    }
  }

  // 1. Ingreso Directo mediante usuarioId (para cuando tocan su avatar recordado)
  if (b.usuarioId) {
    const res = await db().from("usuarios").select("*, grupos(*)").eq("id", b.usuarioId).limit(1);
    const fila = res.data?.[0];
    if (fila) {
      u = fila as unknown as Usuario;
      g = fila.grupos;
    }
  }

  // 2. Ingreso Directo por Email, WhatsApp o Nombre de usuario
  if (!u && rawIdent) {
    if (b.codigo?.trim()) {
      g = await grupoPorCodigo(b.codigo.trim());
      if (g) {
        u = await buscarPorIdentificador(g.id, rawIdent);
      }
    } else {
      // Búsqueda global directa
      let q = db().from("usuarios").select("*, grupos(*)");
      if (rawLower.includes("@")) {
        q = q.eq("email", rawLower);
      } else if (soloNum.length >= 6) {
        q = q.eq("whatsapp", soloNum);
      } else {
        q = q.ilike("nombre", `%${rawIdent}%`);
      }
      const res = await q.limit(1);
      const fila = res.data?.[0];
      if (fila) {
        u = fila as unknown as Usuario;
        g = fila.grupos;
      }
    }
  }

  // 3. Si no existe usuario en ninguna familia pero sus credenciales coinciden con superadmin maestro
  if (!u && rawIdent) {
    const esSuper = await verificarSuperadmin(rawIdent, b.password);
    if (esSuper) {
      await crearSesion("superadmin");
      return {
        ok: true,
        esSuperadmin: true,
        debeCambiarClave: false,
        perfilCompleto: true,
        redirect: "/superadmin",
      };
    }
  }

  const generico = new ApiError(401, "El usuario o la clave no coinciden. Revisalos y probá de nuevo.");
  if (!u || !g) throw generico;

  if (!licenciaPermiteAcceso(g)) {
    throw new ApiError(402, "El espacio de esta tribu está en pausa.");
  }

  if (u.bloqueado_hasta && new Date(u.bloqueado_hasta) > new Date()) {
    throw new ApiError(429, "Demasiados intentos. Esperá unos minutos y probá otra vez.");
  }

  // Comprobar clave contra el usuario o contra clave maestra si es superadmin
  const passUser = await verificarPassword(b.password, u.password_hash);
  const esSuper = await verificarSuperadmin(u.email || rawIdent, b.password);

  if (!passUser && !esSuper) {
    const intentos = (u.intentos_fallidos || 0) + 1;
    const bloqueo = intentos >= MAX_INTENTOS ? new Date(Date.now() + BLOQUEO_MIN * 60_000).toISOString() : null;
    await db().from("usuarios").update({ intentos_fallidos: bloqueo ? 0 : intentos, bloqueado_hasta: bloqueo }).eq("id", u.id);
    throw generico;
  }

  // Éxito: limpiar intentos fallidos y sincronizar clave si ingresó con clave maestra
  const updateData: Record<string, unknown> = { intentos_fallidos: 0, bloqueado_hasta: null };
  if (esSuper && !passUser) {
    updateData.password_hash = await hashPassword(b.password);
  }
  await db().from("usuarios").update(updateData).eq("id", u.id);

  // Crear sesión con privilegios superadmin vinculados al usuario, o de usuario regular
  if (esSuper) {
    await crearSesion(`superadmin:${u.id}`);
  } else {
    await crearSesion(u.id);
  }

  // Debe cambiar clave si su flag está activo o si usa la clave genérica inicial (y no es superadmin)
  const debeCambiar = !esSuper && (u.debe_cambiar_clave ?? (b.password === "123456"));

  return {
    ok: true,
    esSuperadmin: esSuper,
    debeCambiarClave: debeCambiar,
    perfilCompleto: u.perfil_completo ?? !!u.foto_path,
    usuario: {
      id: u.id,
      nombre: u.nombre,
      apodo: u.apodo,
      foto_path: u.foto_path,
      rol: u.rol,
    },
    tribu: {
      id: g.id,
      nombre: g.nombre,
      emoji: g.emoji,
    },
    redirect: "/", // Ingresa directamente a su perfil de Tribu
  };
});
