import { z } from "zod";
import { api, json } from "@/lib/http";
import { db, must } from "@/lib/db";
import { requerirUsuario, hashPassword } from "@/lib/auth";
import { miembrosDelGrupo, publicos, soloDigitos } from "@/lib/usuarios";
import { ApiError } from "@/lib/env";
import { borrarArchivos } from "@/lib/storage";

/** Panel de la familia: integrantes (con contacto), link de invitación y herramientas de gestión. */
export const GET = api(async () => {
  const { grupo, usuario, esSuper } = await requerirUsuario();
  const esAdmin = usuario.rol === "admin" || esSuper;
  const [miembros, notifs] = await Promise.all([
    miembrosDelGrupo(grupo.id),
    db().from("notificaciones").select("id,texto,leida,creado_en").eq("grupo_id", grupo.id).order("creado_en", { ascending: false }).limit(30),
  ]);
  const pubs = await publicos(miembros);
  return {
    grupo: {
      nombre: grupo.nombre,
      emoji: grupo.emoji,
      codigo: grupo.codigo,
      hora_limite: grupo.hora_limite,
      vence_en: grupo.vence_en,
    },
    esAdmin,
    yoId: usuario.id,
    integrantes: miembros.map((m, i) => ({
      ...pubs[i],
      whatsapp: m.whatsapp,
      email: m.email,
      nacimiento: m.nacimiento,
      bloqueado: !!m.bloqueado_hasta && new Date(m.bloqueado_hasta) > new Date(),
    })),
    notificaciones: must(notifs),
  };
});

const AccionBody = z.discriminatedUnion("accion", [
  z.object({
    accion: z.literal("leer_todas"),
  }),
  z.object({
    accion: z.literal("agregar_integrante"),
    nombre: z.string().trim().min(2, "El nombre debe tener al menos 2 letras.").max(80),
    apellido: z.string().trim().max(80).optional().nullable(),
    apodo: z.string().trim().max(40).optional().nullable(),
    email: z.string().trim().email("Email inválido.").optional().nullable(),
    whatsapp: z.string().trim().min(8, "El número de WhatsApp es obligatorio para enviar la invitación."),
    password: z.string().trim().min(4).max(100).optional(),
    rol: z.enum(["miembro", "admin"]).default("miembro"),
  }),
  z.object({
    accion: z.literal("modificar_integrante"),
    id: z.string().uuid(),
    nombre: z.string().trim().min(2).max(80),
    apodo: z.string().trim().max(40).optional().nullable(),
    email: z.string().trim().email("Email inválido.").optional().nullable(),
    whatsapp: z.string().trim().max(30).optional().nullable(),
    nacimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    rol: z.enum(["miembro", "admin"]).optional(),
  }),
  z.object({
    accion: z.literal("resetear_clave"),
    id: z.string().uuid(),
    password: z.string().trim().min(4).max(100).default("123456"),
  }),
  z.object({
    accion: z.literal("dar_de_baja"),
    id: z.string().uuid(),
  }),
]);

export const POST = api(async (req: Request) => {
  const { grupo, usuario, esSuper } = await requerirUsuario();
  const esAdmin = usuario.rol === "admin" || esSuper;
  const b = await json(req, AccionBody);

  if (b.accion === "leer_todas") {
    await db().from("notificaciones").update({ leida: true }).eq("grupo_id", grupo.id).eq("leida", false);
    return { ok: true };
  }

  // Las siguientes acciones requieren rol de administrador
  if (!esAdmin) {
    throw new ApiError(403, "Solo los administradores de la familia pueden realizar esta acción.");
  }

  if (b.accion === "agregar_integrante") {
    // Generar clave temporal automática de 6 dígitos si no se especifica
    const claveGenerada = b.password || Math.floor(100000 + Math.random() * 900000).toString();
    const hash = await hashPassword(claveGenerada);
    const ws = soloDigitos(b.whatsapp);

    const ins = await db()
      .from("usuarios")
      .insert({
        grupo_id: grupo.id,
        nombre: b.nombre,
        apellido: b.apellido || null,
        apodo: b.apodo || null,
        email: b.email ? b.email.toLowerCase() : null,
        whatsapp: ws,
        password_hash: hash,
        rol: b.rol,
        debe_cambiar_clave: true,
        perfil_completo: false,
      })
      .select("id, nombre, apellido, apodo, email, whatsapp, rol")
      .single();

    if (ins.error) {
      if (ins.error.code === "23505") throw new ApiError(409, "Ya existe un usuario con ese email o WhatsApp en la tribu.");
      throw new Error(`DB: ${ins.error.message}`);
    }

    const textoWsp =
      `¡Hola ${b.nombre}! Te sumaron a la tribu *${grupo.nombre}* en *TRIBOO* 🌟.\n\n` +
      `Para ingresar por primera vez:\n` +
      `1. Entrá a: https://destellos.vercel.app/login\n` +
      `2. Ingresá con tu WhatsApp: *${ws}* (o tu email)\n` +
      `3. Tu clave de acceso temporal: *${claveGenerada}*\n\n` +
      `Al entrar, el sistema te pedirá cambiar tu clave y subir tu foto de perfil para que todos te reconozcan. ¡Bienvenido/a a la Tribu! 🎉`;

    const wspUrl = `https://wa.me/${ws}?text=${encodeURIComponent(textoWsp)}`;

    return {
      ok: true,
      usuario: ins.data,
      clave_temporal: claveGenerada,
      wsp_url: wspUrl,
      texto_invitacion: textoWsp,
    };
  }

  if (b.accion === "modificar_integrante") {
    const ws = b.whatsapp !== undefined ? (b.whatsapp ? soloDigitos(b.whatsapp) : null) : undefined;
    const upd: Record<string, unknown> = {
      nombre: b.nombre,
      apodo: b.apodo || null,
      email: b.email ? b.email.toLowerCase() : null,
      whatsapp: ws,
      nacimiento: b.nacimiento || null,
    };
    if (b.rol) upd.rol = b.rol;

    const r = await db()
      .from("usuarios")
      .update(upd)
      .eq("id", b.id)
      .eq("grupo_id", grupo.id)
      .select("id");

    if (r.error) throw new Error(`DB: ${r.error.message}`);
    if (!r.data?.length) throw new ApiError(404, "Ese integrante no pertenece a esta familia.");
    return { ok: true };
  }

  if (b.accion === "resetear_clave") {
    const hash = await hashPassword(b.password);
    const r = await db()
      .from("usuarios")
      .update({
        password_hash: hash,
        intentos_fallidos: 0,
        bloqueado_hasta: null,
      })
      .eq("id", b.id)
      .eq("grupo_id", grupo.id)
      .select("id");

    if (r.error) throw new Error(`DB: ${r.error.message}`);
    if (!r.data?.length) throw new ApiError(404, "Ese integrante no pertenece a esta familia.");
    return { ok: true, mensaje: `Clave reseteada a ${b.password}` };
  }

  if (b.accion === "dar_de_baja") {
    // Verificar que el usuario pertenezca a la familia
    const miembro = must(
      await db().from("usuarios").select("id, nombre, rol").eq("id", b.id).eq("grupo_id", grupo.id).limit(1)
    )?.[0] as { id: string; nombre: string; rol: string } | undefined;

    if (!miembro) throw new ApiError(404, "Ese integrante no pertenece a esta familia.");

    // Si es el usuario actual, verificar si es el único admin
    if (b.id === usuario.id) {
      const otrosAdmins = await db()
        .from("usuarios")
        .select("id")
        .eq("grupo_id", grupo.id)
        .eq("rol", "admin")
        .neq("id", usuario.id);
      if (!otrosAdmins.data?.length && !esSuper) {
        throw new ApiError(400, "No podés darte de baja siendo el único administrador de la familia.");
      }
    }

    // Obtener rutas de fotos para borrarlas del Storage
    const [d, u] = await Promise.all([
      db().from("destellos").select("foto_path").eq("usuario_id", b.id),
      db().from("usuarios").select("foto_path").eq("id", b.id).limit(1),
    ]);
    const paths = [
      ...((d.data ?? []) as { foto_path: string }[]).map((x) => x.foto_path),
      (u.data?.[0] as { foto_path: string | null } | undefined)?.foto_path,
    ];

    const del = must(await db().from("usuarios").delete().eq("id", b.id).eq("grupo_id", grupo.id).select("id"));
    if (!del.length) throw new ApiError(404, "No se pudo eliminar al integrante.");
    await borrarArchivos(paths);

    return { ok: true };
  }

  throw new ApiError(400, "Acción desconocida.");
});
