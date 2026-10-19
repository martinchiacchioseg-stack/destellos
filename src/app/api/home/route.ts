import { api } from "@/lib/http";
import { db, must } from "@/lib/db";
import { requerirUsuario } from "@/lib/auth";
import { estadoLicencia, licenciaPermiteAcceso } from "@/lib/grupos";
import { diasHasta, hoyAR, ayerAR, pasoHoraLimite, sumarDias } from "@/lib/fecha";
import { mensajesVigentes } from "@/lib/pizarra";
import { asegurarVeredicto } from "@/lib/veredicto";
import { firmar } from "@/lib/storage";
import { miembrosDelGrupo, publicos, nombreCorto } from "@/lib/usuarios";

interface FilaDestello {
  id: string;
  usuario_id: string;
  fecha: string;
  foto_path: string;
  descripcion: string | null;
  creado_en: string;
}

/** Pantalla principal: todo lo que ve un integrante, filtrado por el grupo de su sesión. */
export const GET = api(async () => {
  const c = await requerirUsuario({ ignorarLicencia: true });
  const { usuario, grupo } = c;
  const lic = { estado: estadoLicencia(grupo), vence_en: grupo.vence_en, dias: diasHasta(grupo.vence_en) };

  if (!c.esSuper && !licenciaPermiteAcceso(grupo)) {
    return { bloqueado: true, grupo: { nombre: grupo.nombre, emoji: grupo.emoji }, licencia: lic };
  }

  const hoy = hoyAR();
  const desde = sumarDias(hoy, -2);
  const [miembros, filas, pizarra] = await Promise.all([
    miembrosDelGrupo(grupo.id),
    db().from("destellos").select("id,usuario_id,fecha,foto_path,descripcion,titulo_arlequin,devolucion_arlequin,creado_en").eq("grupo_id", grupo.id).gte("fecha", desde).order("creado_en", { ascending: false }),
    mensajesVigentes(grupo.id),
  ]);
  const destellos = (must(filas) ?? []) as (FilaDestello & { titulo_arlequin?: string | null; devolucion_arlequin?: string | null })[];

  const subieronHoy = new Set(destellos.filter((d) => d.fecha === hoy).map((d) => d.usuario_id));
  const faltan = miembros.filter((m) => !subieronHoy.has(m.id)).map((m) => ({ id: m.id, nombre: nombreCorto(m) }));
  const todosSubieron = miembros.length > 0 && faltan.length === 0;

  // Veredictos de hoy (si ya subieron todos o si pasó la hora límite) y de ayer.
  const cerrado = pasoHoraLimite(grupo.hora_limite);
  const fechasConFotos = new Set(destellos.map((d) => d.fecha));
  const vered: Record<string, { texto: string; destello_id: string | null; diploma_path: string | null }> = {};
  for (const f of [hoy, ayerAR()]) {
    if (f === hoy && !cerrado && !todosSubieron) continue;
    if (!fechasConFotos.has(f) && f === hoy) continue;
    if (!fechasConFotos.has(f) && f !== hoy) continue;
    vered[f] = await asegurarVeredicto(grupo, f);
  }

  const ids = destellos.map((d) => d.id);
  const [rx, cm] = ids.length
    ? await Promise.all([
        db().from("reacciones").select("destello_id,usuario_id,emoji").in("destello_id", ids),
        db().from("comentarios").select("id,destello_id,usuario_id,texto,creado_en").in("destello_id", ids).order("creado_en"),
      ])
    : [{ data: [], error: null }, { data: [], error: null }];

  const pubs = await publicos(miembros);
  const porId = new Map(pubs.map((p) => [p.id, p]));
  const urls = await firmar([...destellos.map((d) => d.foto_path), ...Object.values(vered).map((v) => v.diploma_path)]);

  const muro = destellos.map((d) => {
    const reacciones: Record<string, number> = {};
    let mia: string | null = null;
    for (const r of (must(rx) ?? []) as { destello_id: string; usuario_id: string; emoji: string }[]) {
      if (r.destello_id !== d.id) continue;
      reacciones[r.emoji] = (reacciones[r.emoji] ?? 0) + 1;
      if (r.usuario_id === usuario.id) mia = r.emoji;
    }
    const comentarios = ((must(cm) ?? []) as { id: string; destello_id: string; usuario_id: string; texto: string; creado_en: string }[])
      .filter((x) => x.destello_id === d.id)
      .map((x) => ({ id: x.id, texto: x.texto, creado_en: x.creado_en, autor: porId.get(x.usuario_id) ?? null }));
    const v = vered[d.fecha];
    return {
      id: d.id,
      fecha: d.fecha,
      autor: porId.get(d.usuario_id) ?? null,
      foto_url: (v?.destello_id === d.id && v.diploma_path && urls[v.diploma_path]) || urls[d.foto_path] || null,
      descripcion: d.descripcion,
      titulo_arlequin: d.titulo_arlequin ?? null,
      devolucion_arlequin: d.devolucion_arlequin ?? null,
      ganador: v?.destello_id === d.id,
      reacciones,
      mi_reaccion: mia,
      comentarios,
    };
  });


  const [ads, notif, triviaHoy] = await Promise.all([
    db().from("publicidades").select("id,titulo,texto,imagen_path,enlace").eq("ubicacion", "home").eq("activa", true).limit(3),
    usuario.rol === "admin" || c.esSuper
      ? db().from("notificaciones").select("id", { count: "exact", head: true }).eq("grupo_id", grupo.id).eq("leida", false)
      : Promise.resolve({ count: 0 }),
    db().from("trivia_intentos").select("id").eq("usuario_id", usuario.id).eq("fecha", hoy).limit(1),
  ]);
  const adRows = (ads.data ?? []) as { id: string; titulo: string; texto: string | null; imagen_path: string | null; enlace: string | null }[];
  const adUrls = await firmar(adRows.map((a) => a.imagen_path));

  const yo = (await publicos([usuario]))[0];
  const modulos = grupo.modulos_activos ?? {
    flash_grupal: true,
    prode_futbol: false,
    tarareo_ardilla: true,
    trazo_loco: true,
    cerebro_fuga: true,
  };

  return {
    yo: { ...yo, esAdmin: usuario.rol === "admin" || c.esSuper, esSuper: c.esSuper },
    grupo: {
      id: grupo.id,
      nombre: grupo.nombre,
      emoji: grupo.emoji,
      hora_limite: grupo.hora_limite,
      tipo_grupo: grupo.tipo_grupo ?? "family",
      modulos_activos: modulos,
    },
    licencia: lic,
    hoy,
    cerrado,
    subiHoy: subieronHoy.has(usuario.id),
    faltan,
    totalMiembros: miembros.length,
    pizarra,
    muro,
    veredictos: Object.fromEntries(Object.entries(vered).map(([f, v]) => [f, { texto: v.texto, destello_id: v.destello_id }])),
    notificacionesSinLeer: (notif as { count: number | null }).count ?? 0,
    triviaJugada: !!triviaHoy.data?.length,
    anuncios: adRows.map((a) => ({ id: a.id, titulo: a.titulo, texto: a.texto, enlace: a.enlace, imagen_url: a.imagen_path ? adUrls[a.imagen_path] ?? null : null })),
  };
});
