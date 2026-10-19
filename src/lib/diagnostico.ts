import "server-only";
import { db, BUCKET } from "./db";
import { envOpt } from "./env";
import { normalizarCodigo, estadoLicencia } from "./grupos";
import { geminiConfigurado, decir } from "./gemini";
import { mailConfigurado } from "./mail";
import { asegurarVeredicto } from "./veredicto";
import { ayerAR, hoyAR } from "./fecha";
import type { Grupo } from "./types";

export type EstadoModulo = "ok" | "reparado" | "alerta" | "error";
export interface ResultadoModulo {
  modulo: string;
  estado: EstadoModulo;
  detalle: string;
  reparaciones: number;
}

const TABLAS = ["grupos", "usuarios", "destellos", "reacciones", "comentarios", "veredictos", "puntos", "trivia_intentos", "pizarra", "publicidades", "notificaciones", "reset_codigos"];

async function seguro(modulo: string, fn: () => Promise<Omit<ResultadoModulo, "modulo">>): Promise<ResultadoModulo> {
  try {
    return { modulo, ...(await fn()) };
  } catch (e) {
    return { modulo, estado: "error", detalle: e instanceof Error ? e.message.slice(0, 200) : "Error inesperado", reparaciones: 0 };
  }
}

/** Recorre todos los módulos y repara inconsistencias leves. */
export async function ejecutarDiagnostico() {
  const r: ResultadoModulo[] = [];

  r.push(await seguro("Base de datos (Supabase)", async () => {
    const fallas: string[] = [];
    for (const t of TABLAS) {
      const { error } = await db().from(t).select("*", { count: "exact", head: true });
      if (error) fallas.push(`${t}: ${error.message}`);
    }
    return fallas.length
      ? { estado: "error", detalle: `Faltan o fallan ${fallas.length} tabla(s). ¿Se ejecutó supabase/schema.sql? ${fallas[0]}`, reparaciones: 0 }
      : { estado: "ok", detalle: `${TABLAS.length} tablas accesibles.`, reparaciones: 0 };
  }));

  r.push(await seguro("Almacenamiento de fotos", async () => {
    const { data } = await db().storage.getBucket(BUCKET);
    if (data) return { estado: "ok", detalle: `Bucket "${BUCKET}" disponible (privado: ${!data.public}).`, reparaciones: 0 };
    const c = await db().storage.createBucket(BUCKET, { public: false });
    if (c.error) return { estado: "error", detalle: `No existe el bucket y no se pudo crear: ${c.error.message}`, reparaciones: 0 };
    return { estado: "reparado", detalle: `Se creó el bucket privado "${BUCKET}".`, reparaciones: 1 };
  }));

  r.push(await seguro("Configuración del servidor", async () => {
    const supabaseOk = !!(envOpt("NEXT_PUBLIC_SUPABASE_URL") || envOpt("SUPABASE_URL")) && !!(envOpt("SUPABASE_SERVICE_ROLE_KEY") || envOpt("SUPABASE_ANON_KEY"));
    if (!supabaseOk) return { estado: "error", detalle: "Faltan credenciales de Supabase.", reparaciones: 0 };
    const opt = ["CRON_SECRET"].filter((k) => !envOpt(k));
    return opt.length
      ? { estado: "alerta", detalle: `Servidor activo con sesión segura. Opcional sin configurar: ${opt.join(", ")}.`, reparaciones: 0 }
      : { estado: "ok", detalle: "Servidor configurado y autenticación activa.", reparaciones: 0 };
  }));

  r.push(await seguro("Familias y códigos", async () => {
    const { data } = await db().from("grupos").select("*");
    let rep = 0;
    for (const g of (data ?? []) as Grupo[]) {
      const cambios: Record<string, unknown> = {};
      if (g.codigo_norm !== normalizarCodigo(g.codigo)) cambios.codigo_norm = normalizarCodigo(g.codigo);
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(g.hora_limite)) cambios.hora_limite = "22:00";
      if (!g.emoji?.trim()) cambios.emoji = "✨";
      if (Object.keys(cambios).length) {
        const u = await db().from("grupos").update(cambios).eq("id", g.id);
        if (!u.error) rep++;
      }
    }
    return rep ? { estado: "reparado", detalle: `Se corrigieron ${rep} familia(s) con datos inconsistentes.`, reparaciones: rep } : { estado: "ok", detalle: `${data?.length ?? 0} familia(s) consistentes.`, reparaciones: 0 };
  }));

  r.push(await seguro("Integrantes y accesos", async () => {
    const ahora = new Date().toISOString();
    const lim = await db().from("usuarios").update({ bloqueado_hasta: null, intentos_fallidos: 0 }).lt("bloqueado_hasta", ahora).select("id");
    const { data: gs } = await db().from("grupos").select("id,nombre");
    const { data: ad } = await db().from("usuarios").select("grupo_id").eq("rol", "admin");
    const conAdmin = new Set((ad ?? []).map((a: { grupo_id: string }) => a.grupo_id));
    const sin = ((gs ?? []) as { id: string; nombre: string }[]).filter((g) => !conAdmin.has(g.id));
    const rep = lim.data?.length ?? 0;
    if (sin.length) return { estado: "alerta", detalle: `Familias sin administrador: ${sin.map((s) => s.nombre).join(", ")}. Asigná uno al modificar la familia.`, reparaciones: rep };
    return rep ? { estado: "reparado", detalle: `Se desbloquearon ${rep} cuenta(s) con bloqueo vencido.`, reparaciones: rep } : { estado: "ok", detalle: "Todas las familias tienen administrador.", reparaciones: 0 };
  }));

  r.push(await seguro("Licencias", async () => {
    const { data } = await db().from("grupos").select("nombre,activo,vence_en");
    const g = (data ?? []) as Pick<Grupo, "nombre" | "activo" | "vence_en">[];
    const venc = g.filter((x) => estadoLicencia(x) === "vencida").map((x) => x.nombre);
    const por = g.filter((x) => estadoLicencia(x) === "por_vencer").map((x) => x.nombre);
    if (venc.length || por.length)
      return { estado: "alerta", detalle: `${venc.length ? `Vencidas: ${venc.join(", ")}. ` : ""}${por.length ? `Por vencer: ${por.join(", ")}.` : ""}`.trim(), reparaciones: 0 };
    return { estado: "ok", detalle: "Todas las licencias vigentes.", reparaciones: 0 };
  }));

  r.push(await seguro("Fotos (base de datos vs. Storage)", async () => {
    const { data: ds } = await db().from("destellos").select("id,foto_path").order("creado_en", { ascending: false }).limit(500);
    const { data: lista } = await db().storage.from(BUCKET).list("fotos", { limit: 1000 });
    const existentes = new Set((lista ?? []).map((f) => `fotos/${f.name}`));
    const huerfanos = ((ds ?? []) as { id: string; foto_path: string }[]).filter((d) => !existentes.has(d.foto_path));
    return huerfanos.length
      ? { estado: "alerta", detalle: `${huerfanos.length} destello(s) apuntan a un archivo inexistente (no reparable automáticamente).`, reparaciones: 0 }
      : { estado: "ok", detalle: `${ds?.length ?? 0} destello(s) revisados con su archivo presente.`, reparaciones: 0 };
  }));

  r.push(await seguro("Pizarra LED", async () => {
    const d = await db().from("pizarra").delete().lt("vence_en", new Date().toISOString()).select("id");
    const n = d.data?.length ?? 0;
    return n ? { estado: "reparado", detalle: `Se retiraron ${n} mensaje(s) vencidos.`, reparaciones: n } : { estado: "ok", detalle: "Sin mensajes vencidos.", reparaciones: 0 };
  }));

  r.push(await seguro("Recuperación de claves", async () => {
    const corte = new Date(Date.now() - 24 * 3600_000).toISOString();
    const d = await db().from("reset_codigos").delete().or(`vence_en.lt.${corte},usado.eq.true`).select("id");
    const n = d.data?.length ?? 0;
    return n ? { estado: "reparado", detalle: `Se depuraron ${n} código(s) viejos.`, reparaciones: n } : { estado: "ok", detalle: "Sin códigos viejos.", reparaciones: 0 };
  }));

  r.push(await seguro("Trivia diaria", async () => {
    const { data } = await db().from("trivia_intentos").select("id").eq("respondida", false).lt("fecha", hoyAR());
    const ids = (data ?? []).map((x: { id: string }) => x.id);
    if (ids.length) await db().from("trivia_intentos").update({ respondida: true, acerto: false, puntos: 0, evaluacion: "Tiempo agotado." }).in("id", ids);
    return ids.length ? { estado: "reparado", detalle: `Se cerraron ${ids.length} turno(s) de días anteriores sin responder.`, reparaciones: ids.length } : { estado: "ok", detalle: "Sin turnos colgados.", reparaciones: 0 };
  }));

  r.push(await seguro("Veredictos de la Foto del Día", async () => {
    const ayer = ayerAR();
    const { data: ds } = await db().from("destellos").select("grupo_id").eq("fecha", ayer);
    const { data: vs } = await db().from("veredictos").select("grupo_id").eq("fecha", ayer);
    const hechos = new Set((vs ?? []).map((v: { grupo_id: string }) => v.grupo_id));
    const pendientes = [...new Set((ds ?? []).map((d: { grupo_id: string }) => d.grupo_id))].filter((g) => !hechos.has(g));
    let rep = 0;
    for (const gid of pendientes) {
      const { data } = await db().from("grupos").select("*").eq("id", gid).limit(1);
      if (data?.[0]) { await asegurarVeredicto(data[0] as Grupo, ayer); rep++; }
    }
    return rep ? { estado: "reparado", detalle: `Se emitieron ${rep} veredicto(s) pendientes de ayer.`, reparaciones: rep } : { estado: "ok", detalle: "Sin veredictos pendientes.", reparaciones: 0 };
  }));

  r.push(await seguro("Arlequín (Gemini)", async () => {
    if (!geminiConfigurado()) return { estado: "alerta", detalle: "GEMINI_API_KEY sin configurar: Arlequín usa textos de respaldo.", reparaciones: 0 };
    const t = await decir("Respondé solo con la palabra: listo");
    return t ? { estado: "ok", detalle: "Gemini 2.5 Flash responde correctamente.", reparaciones: 0 } : { estado: "error", detalle: "Gemini no respondió (¿clave inválida o sin cuota?).", reparaciones: 0 };
  }));

  r.push(await seguro("Correo electrónico", async () =>
    mailConfigurado()
      ? { estado: "ok", detalle: "RESEND_API_KEY presente.", reparaciones: 0 }
      : { estado: "alerta", detalle: "RESEND_API_KEY sin configurar: no se envían códigos de recuperación ni avisos al administrador.", reparaciones: 0 },
  ));

  const peso: Record<EstadoModulo, number> = { ok: 1, reparado: 1, alerta: 0.5, error: 0 };
  const salud = Math.round((r.reduce((a, m) => a + peso[m.estado], 0) / r.length) * 100);
  return { fecha: new Date().toISOString(), salud, modulos: r };
}
