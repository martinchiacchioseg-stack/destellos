import { z } from "zod";
import { api, json } from "@/lib/http";
import { db, must } from "@/lib/db";
import { requerirSuperadmin, hashPassword } from "@/lib/auth";
import { estadoLicencia, generarCodigoUnico, normalizarCodigo } from "@/lib/grupos";
import { diasHasta, hoyAR, sumarMeses } from "@/lib/fecha";
import { ApiError } from "@/lib/env";
import { enviarMail } from "@/lib/mail";
import type { Grupo } from "@/lib/types";
import { claveTemporal } from "@/lib/clave";

export const GET = api(async () => {
  await requerirSuperadmin();
  const [gs, us, ds] = await Promise.all([
    db().from("grupos").select("*").order("creado_en", { ascending: false }),
    db().from("usuarios").select("grupo_id,rol,whatsapp"),
    db().from("destellos").select("grupo_id"),
  ]);
  const cuenta = (rows: { grupo_id: string }[] | null) => {
    const m = new Map<string, number>();
    for (const r of rows ?? []) m.set(r.grupo_id, (m.get(r.grupo_id) ?? 0) + 1);
    return m;
  };
  const cu = cuenta(us.data), cd = cuenta(ds.data);
  const adminWspMap = new Map(
    (us.data ?? []).filter((u: any) => u.rol === "admin" && u.whatsapp).map((u: any) => [u.grupo_id, u.whatsapp])
  );

  const familias = ((must(gs) ?? []) as Grupo[]).map((g) => ({
    ...g,
    admin_whatsapp: adminWspMap.get(g.id) ?? null,
    estado: estadoLicencia(g),
    dias_restantes: diasHasta(g.vence_en),
    integrantes: cu.get(g.id) ?? 0,
    destellos: cd.get(g.id) ?? 0,
  }));
  return { familias };
});

const Crear = z.object({
  nombre: z.string().trim().min(2, "Poné un nombre para la familia.").max(60),
  emoji: z.string().trim().max(8).default("✨"),
  hora_limite: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora límite inválida (HH:MM).").default("22:00"),
  admin_nombre: z.string().trim().min(2, "Falta el nombre del administrador.").max(80),
  admin_email: z.string().trim().email("Email del administrador inválido."),
  admin_whatsapp: z.string().trim().max(30).optional(),
  admin_password: z.string().trim().min(4, "La clave debe tener al menos 4 caracteres.").max(100).optional(),
  codigo: z.string().trim().max(30).optional(),
  meses: z.union([z.literal(1), z.literal(3), z.literal(12)]).default(3),
  tipo_grupo: z.enum(["family", "friends", "sports_club", "custom"]).default("family"),
  modulos_activos: z
    .object({
      flash_grupal: z.boolean().default(true),
      prode_futbol: z.boolean().default(false),
      picado_futbol: z.boolean().default(true),
      tarareo_ardilla: z.boolean().default(true),
      trazo_loco: z.boolean().default(true),
      cerebro_fuga: z.boolean().default(true),
    })
    .optional(),
});

/** Crea una familia + su administrador con WhatsApp y clave inicial. */
export const POST = api(async (req: Request) => {
  await requerirSuperadmin();
  const b = await json(req, Crear);
  const codigo = b.codigo || (await generarCodigoUnico(b.nombre));
  const norm = normalizarCodigo(codigo);
  if (norm.length < 4) throw new ApiError(400, "El código debe tener al menos 4 letras o números.");

  const ins = await db()
    .from("grupos")
    .insert({
      nombre: b.nombre,
      emoji: b.emoji,
      codigo,
      codigo_norm: norm,
      hora_limite: b.hora_limite,
      admin_nombre: b.admin_nombre,
      admin_email: b.admin_email.toLowerCase(),
      vence_en: sumarMeses(hoyAR(), b.meses),
      tipo_grupo: b.tipo_grupo,
      modulos_activos: b.modulos_activos ?? {
        flash_grupal: true,
        prode_futbol: b.tipo_grupo === "friends" || b.tipo_grupo === "sports_club",
        picado_futbol: b.tipo_grupo !== "family",
        tarareo_ardilla: b.tipo_grupo !== "sports_club",
        trazo_loco: b.tipo_grupo !== "sports_club",
        cerebro_fuga: true,
      },
    })
    .select("*")
    .single();
  if (ins.error) {
    if (ins.error.code === "23505") throw new ApiError(409, "Ese código de familia ya existe. Elegí otro.");
    throw new Error(`DB: ${ins.error.message}`);
  }
  const grupo = ins.data as Grupo;

  const claveAdmin = b.admin_password?.trim() || "123456";
  const wsp = b.admin_whatsapp ? b.admin_whatsapp.replace(/\D/g, "") : null;
  const adm = await db().from("usuarios").insert({
    grupo_id: grupo.id,
    nombre: b.admin_nombre,
    email: b.admin_email.toLowerCase(),
    whatsapp: wsp,
    rol: "admin",
    password_hash: await hashPassword(claveAdmin),
  });
  if (adm.error) {
    await db().from("grupos").delete().eq("id", grupo.id);
    throw new Error(`DB: ${adm.error.message}`);
  }
  const enviado = await enviarMail({
    para: b.admin_email,
    asunto: `Tu familia ${grupo.nombre} ya está en Destellos 🎭`,
    texto: `Hola ${b.admin_nombre}. Código de familia: ${codigo}\nIngresá con tu email y esta clave de acceso: ${claveAdmin}\nPodés cambiarla desde "Olvidé mi contraseña".`,
  });
  return {
    familia: grupo,
    admin: {
      nombre: b.admin_nombre,
      email: b.admin_email,
      clave_temporal: claveAdmin,
      clave: claveAdmin,
      mail_enviado: enviado,
    },
  };
});
