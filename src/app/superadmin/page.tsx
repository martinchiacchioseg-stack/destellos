"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { llamar, ErrorApi } from "@/lib/cliente";
import { COLORES_LED } from "@/lib/types";

interface Familia {
  id: string; nombre: string; emoji: string; codigo: string; hora_limite: string; admin_nombre: string | null; admin_email: string | null; admin_whatsapp: string | null;
  vence_en: string; activo: boolean; estado: "activa" | "por_vencer" | "vencida" | "pausada"; dias_restantes: number; integrantes: number; destellos: number;
}
interface Integrante { id: string; nombre: string; apodo: string | null; email: string | null; whatsapp: string | null; nacimiento: string | null; rol: string; bloqueado: boolean }
interface Metricas { familias_activas: number; familias_total: number; integrantes: number; destellos: number }
interface Modulo { modulo: string; estado: "ok" | "reparado" | "alerta" | "error"; detalle: string; reparaciones: number }
interface Diag { fecha: string; salud: number; modulos: Modulo[] }

const badge: Record<string, string> = {
  activa: "bg-emerald-400/15 text-emerald-200", por_vencer: "bg-amber-400/15 text-amber-200",
  vencida: "bg-red-400/15 text-red-200", pausada: "bg-slate-400/15 text-slate-200",
};
const etiqueta: Record<string, string> = { activa: "Activa", por_vencer: "Por vencer", vencida: "Vencida", pausada: "Pausada" };

export default function Superadmin() {
  const router = useRouter();
  const [tab, setTab] = useState<"familias" | "pizarra" | "ads" | "diag">("familias");
  const [m, setM] = useState<Metricas | null>(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    llamar<Metricas>("/api/superadmin/metricas").then((r) => { setM(r); setOk(true); }).catch((e) => {
      if (e instanceof ErrorApi && (e.status === 403 || e.status === 401)) router.replace("/login");
    });
  }, [router, tab]);

  async function salir() {
    await llamar("/api/auth/logout", { body: {} });
    router.replace("/login");
    router.refresh();
  }
  if (!ok) return <p className="py-20 text-center text-suave">Verificando…</p>;

  return (
    <main className="mx-auto max-w-4xl space-y-4 px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">Panel de control</h1>
        <button className="btn px-3 py-1.5 text-sm" onClick={salir}>Salir</button>
      </div>
      {m && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[["Familias activas", `${m.familias_activas}/${m.familias_total}`], ["Integrantes", m.integrantes], ["Destellos", m.destellos]].map(([k, v]) => (
            <div key={k as string} className="tarjeta p-4"><p className="text-xs text-suave">{k}</p><p className="text-2xl font-bold">{v}</p></div>
          ))}
        </div>
      )}
      <div className="flex gap-1 overflow-x-auto rounded-xl bg-white/5 p-1">
        {([["familias", "Familias"], ["pizarra", "Pizarra"], ["ads", "Publicidades"], ["diag", "Diagnóstico"]] as const).map(([k, t]) => (
          <button key={k} onClick={() => setTab(k)} className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm ${tab === k ? "bg-white/15" : "text-suave"}`}>{t}</button>
        ))}
      </div>
      {tab === "familias" && <Familias />}
      {tab === "pizarra" && <Pizarra />}
      {tab === "ads" && <Publicidades />}
      {tab === "diag" && <Diagnostico />}
    </main>
  );
}

/* ------------------------------ FAMILIAS ------------------------------ */
function Familias() {
  const [lista, setLista] = useState<Familia[]>([]);
  const [msg, setMsg] = useState("");
  const [creada, setCreada] = useState<{ codigo: string; email: string; clave: string; nombre: string; admin_nombre: string; mail: boolean } | null>(null);
  const [copiado, setCopiado] = useState(false);

  const cargar = useCallback(() => llamar<{ familias: Familia[] }>("/api/superadmin/familias").then((r) => setLista(r.familias)).catch((e) => setMsg(e.message)), []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { cargar(); }, [cargar]);

  async function crear(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = e.currentTarget;
    const g = (n: string) => (f.elements.namedItem(n) as HTMLInputElement).value;
    setMsg("");
    try {
      const r = await llamar<{ familia: Familia; admin: { nombre?: string; email: string; clave: string; clave_temporal: string; mail_enviado: boolean } }>("/api/superadmin/familias", {
        body: {
          nombre: g("nombre"),
          emoji: g("emoji") || "✨",
          hora_limite: g("hora"),
          admin_nombre: g("admin_nombre"),
          admin_email: g("admin_email"),
          admin_whatsapp: g("admin_whatsapp") || undefined,
          admin_password: g("admin_password") || "123456",
          codigo: g("codigo") || undefined,
          meses: Number(g("meses")),
        },
      });
      setCreada({
        codigo: r.familia.codigo,
        nombre: r.familia.nombre,
        admin_nombre: r.admin.nombre || g("admin_nombre"),
        email: r.admin.email,
        clave: r.admin.clave || r.admin.clave_temporal,
        mail: r.admin.mail_enviado,
      });
      f.reset();
      cargar();
    } catch (err) { setMsg(err instanceof Error ? err.message : "Error"); }
  }

  const copiarWsp = () => {
    if (!creada) return;
    const url = typeof window !== "undefined" ? `${window.location.origin}/login` : "https://destellos.vercel.app/login";
    const texto = `¡Hola ${creada.admin_nombre}! Ya está creado el espacio de la familia ${creada.nombre} en Destellos 🎭.\n\nPara ingresar:\n1. Entrá a: ${url}\n2. Código de familia: ${creada.codigo}\n3. Tu usuario: ${creada.admin_nombre}\n4. Tu clave para entrar: ${creada.clave}\n\n¡Listo! Ya podés compartir tu primera foto del día 📸`;
    navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  return (
    <div className="space-y-4">
      <form onSubmit={crear} className="tarjeta grid gap-3 p-5 sm:grid-cols-2">
        <h2 className="font-bold sm:col-span-2">Nueva familia</h2>
        <input name="nombre" className="input" placeholder="Nombre de la familia" required />
        <input name="emoji" className="input" placeholder="Emoji (✨)" maxLength={8} />
        <input name="admin_nombre" className="input" placeholder="Nombre del administrador" required />
        <input name="admin_email" type="email" className="input" placeholder="Email del administrador" required />
        <input name="admin_whatsapp" className="input" placeholder="WhatsApp del administrador (ej: 54911...)" />
        <input name="admin_password" type="text" className="input" placeholder="Clave del admin (por defecto 123456)" defaultValue="123456" required />
        <input name="codigo" className="input" placeholder="Código (opcional, se genera solo)" />
        <input name="hora" type="time" defaultValue="22:00" className="input" required />
        <select name="meses" className="input" defaultValue="3"><option value="1">Licencia 1 mes</option><option value="3">Licencia 3 meses</option><option value="12">Licencia 1 año</option></select>
        <button className="btn btn-primario sm:col-span-2">Crear familia</button>
      </form>
      {msg && <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{msg}</p>}
      {creada && (
        <div className="tarjeta space-y-2 border-emerald-400/40 p-4 text-sm bg-emerald-950/20">
          <p className="font-bold text-emerald-200">¡Familia creada con éxito!</p>
          <div className="p-3 bg-black/40 rounded-xl space-y-1 font-mono text-xs">
            <p>Código de familia: <strong className="text-cyan-300 select-all text-sm">{creada.codigo}</strong></p>
            <p>Administrador: <strong className="text-white select-all">{creada.admin_nombre}</strong> ({creada.email})</p>
            <p>Clave de acceso: <strong className="text-emerald-300 select-all text-sm">{creada.clave}</strong></p>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <button type="button" className="btn btn-primario text-xs font-bold" onClick={copiarWsp}>
              {copiado ? "¡Mensaje copiado! ✔" : "📲 Copiar datos para enviar por WhatsApp"}
            </button>
            <button type="button" className="btn px-3 py-1 text-xs" onClick={() => setCreada(null)}>Cerrar aviso</button>
          </div>
        </div>
      )}
      {lista.length === 0 && <p className="py-8 text-center text-suave">Todavía no hay familias. Creá la primera arriba.</p>}
      {lista.map((f) => <TarjetaFamilia key={f.id} f={f} cambio={cargar} />)}
    </div>
  );
}

function TarjetaFamilia({ f, cambio }: { f: Familia; cambio: () => void }) {
  const [editar, setEditar] = useState(false);
  const [ver, setVer] = useState(false);
  const [err, setErr] = useState("");
  const [copiado, setCopiado] = useState(false);

  async function patch(body: object) {
    setErr("");
    try { await llamar(`/api/superadmin/familias/${f.id}`, { method: "PATCH", body }); setEditar(false); cambio(); }
    catch (e) { setErr(e instanceof Error ? e.message : "Error"); }
  }
  async function eliminar() {
    if (!confirm(`¿Eliminar PARA SIEMPRE la familia ${f.nombre}? Se borran integrantes, fotos y puntos. No se puede deshacer.`)) return;
    try { await llamar(`/api/superadmin/familias/${f.id}`, { method: "DELETE" }); cambio(); } catch (e) { setErr(e instanceof Error ? e.message : "Error"); }
  }
  function guardar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const g = (n: string) => (e.currentTarget.elements.namedItem(n) as HTMLInputElement).value;
    patch({
      nombre: g("nombre"),
      emoji: g("emoji"),
      codigo: g("codigo"),
      hora_limite: g("hora"),
      admin_nombre: g("admin_nombre"),
      admin_email: g("admin_email"),
      admin_whatsapp: g("admin_whatsapp") || null,
      vence_en: g("vence"),
    });
  }

  const copiarDatosWsp = () => {
    const url = typeof window !== "undefined" ? `${window.location.origin}/login` : "https://destellos.vercel.app/login";
    const texto = `¡Hola ${f.admin_nombre || "familia"}! Ya podés ingresar al espacio de ${f.nombre} en Destellos 🎭.\n\n1. Entrá a: ${url}\n2. Código de familia: ${f.codigo}\n3. Tu usuario: ${f.admin_nombre || "Administrador"}\n4. Clave inicial: 123456 (al ingresar podés cambiarla por tu propia clave)\n\n¡Listo! Ya podés compartir tu primera foto del día 📸`;
    navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  return (
    <div className="tarjeta space-y-3 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-lg font-bold">{f.emoji} {f.nombre}</h3>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge[f.estado]}`}>{etiqueta[f.estado]}</span>
        <span className="ml-auto text-sm text-suave">{f.integrantes} integrantes · {f.destellos} destellos</span>
      </div>
      <p className="text-sm text-suave">
        Código <strong className="select-all tracking-widest text-white">{f.codigo}</strong> · cierre {f.hora_limite} · vence {f.vence_en} ({f.dias_restantes} d) · admin {f.admin_nombre} &lt;{f.admin_email}&gt; {f.admin_whatsapp ? `· 📲 +${f.admin_whatsapp}` : "· sin WhatsApp"}
      </p>

      {editar && (
        <form onSubmit={guardar} className="grid gap-2 rounded-xl bg-white/5 p-3 sm:grid-cols-2">
          <input name="nombre" className="input" defaultValue={f.nombre} placeholder="Nombre" required />
          <input name="emoji" className="input" defaultValue={f.emoji} placeholder="Emoji" />
          <input name="codigo" className="input" defaultValue={f.codigo} placeholder="Código" required />
          <input name="hora" type="time" className="input" defaultValue={f.hora_limite} required />
          <input name="admin_nombre" className="input" defaultValue={f.admin_nombre ?? ""} placeholder="Administrador" />
          <input name="admin_email" type="email" className="input" defaultValue={f.admin_email ?? ""} placeholder="Email admin" />
          <input name="admin_whatsapp" className="input sm:col-span-2" defaultValue={f.admin_whatsapp ?? ""} placeholder="WhatsApp del administrador (ej: 54911...)" />
          <label className="text-xs text-suave sm:col-span-2">Vencimiento de licencia<input name="vence" type="date" className="input mt-1" defaultValue={f.vence_en} required /></label>
          <button className="btn btn-primario">Guardar cambios</button>
          <button type="button" className="btn" onClick={() => setEditar(false)}>Cancelar</button>
        </form>
      )}

      <div className="flex flex-wrap gap-2 text-sm">
        <button className="btn px-3 py-1.5" onClick={() => setEditar((v) => !v)}>Modificar</button>
        <button className="btn px-3 py-1.5" onClick={() => setVer((v) => !v)}>{ver ? "Ocultar integrantes" : `Integrantes (${f.integrantes})`}</button>
        <button className="btn px-3 py-1.5 text-emerald-300 font-semibold" onClick={copiarDatosWsp} title="Copiar datos para enviar al administrador por WhatsApp">
          {copiado ? "¡Copiado! ✔" : "📲 Copiar invitación WhatsApp"}
        </button>
        {([1, 3, 12] as const).map((n) => <button key={n} className="btn px-3 py-1.5" onClick={() => patch({ extender_meses: n })}>+{n === 12 ? "1 año" : `${n} m`}</button>)}
        <button className="btn px-3 py-1.5" onClick={() => patch({ activo: !f.activo })}>{f.activo ? "Pausar" : "Reactivar"}</button>
        <button className="btn btn-peligro ml-auto px-3 py-1.5" onClick={eliminar}>Eliminar permanente</button>
      </div>
      {err && <p className="text-sm text-red-300">{err}</p>}
      {ver && <Integrantes familiaId={f.id} cambio={cambio} />}
    </div>
  );
}

function Integrantes({ familiaId, cambio }: { familiaId: string; cambio: () => void }) {
  const router = useRouter();
  const [lista, setLista] = useState<Integrante[] | null>(null);
  const [editando, setEditando] = useState<string | null>(null);
  const [agregando, setAgregando] = useState(false);
  const [err, setErr] = useState("");
  const [exito, setExito] = useState("");

  const cargar = useCallback(() => llamar<{ integrantes: Integrante[] }>(`/api/superadmin/familias/${familiaId}`).then((r) => setLista(r.integrantes)).catch((e) => setErr(e.message)), [familiaId]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { cargar(); }, [cargar]);

  async function crearNuevo(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const g = (n: string) => (form.elements.namedItem(n) as HTMLInputElement).value;
    setErr("");
    setExito("");
    try {
      await llamar(`/api/superadmin/familias/${familiaId}`, {
        body: {
          nombre: g("nombre"),
          apodo: g("apodo") || null,
          email: g("email") || null,
          whatsapp: g("whatsapp") || null,
          password: g("password") || "123456",
          rol: g("rol") || "miembro",
        },
      });
      setExito(`✔ Integrante "${g("nombre")}" agregado con éxito (clave inicial: ${g("password") || "123456"})`);
      form.reset();
      setAgregando(false);
      cargar();
      cambio();
    } catch (er) { setErr(er instanceof Error ? er.message : "Error al agregar integrante"); }
  }

  async function guardar(e: React.FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault();
    const g = (n: string) => (e.currentTarget.elements.namedItem(n) as HTMLInputElement).value;
    const body: Record<string, unknown> = { nombre: g("nombre"), apodo: g("apodo") || null, email: g("email") || null, whatsapp: g("whatsapp") || null, nacimiento: g("nacimiento") || null, rol: g("rol") };
    if (g("password")) body.password = g("password");
    try { await llamar(`/api/superadmin/integrantes/${id}`, { method: "PATCH", body }); setEditando(null); cargar(); } catch (er) { setErr(er instanceof Error ? er.message : "Error"); }
  }
  async function eliminar(u: Integrante) {
    if (!confirm(`¿Eliminar PARA SIEMPRE a ${u.nombre}? Se borran también sus fotos y puntos.`)) return;
    try { await llamar(`/api/superadmin/integrantes/${u.id}`, { method: "DELETE" }); cargar(); cambio(); } catch (er) { setErr(er instanceof Error ? er.message : "Error"); }
  }
  async function blanquearClave(u: Integrante) {
    if (!confirm(`¿Cambiar la clave de ${u.nombre} a "123456"?`)) return;
    try {
      await llamar(`/api/superadmin/integrantes/${u.id}`, { method: "PATCH", body: { password: "123456", desbloquear: true } });
      setExito(`✔ Clave de ${u.nombre} restablecida a "123456"`);
      cargar();
    } catch (er) { setErr(er instanceof Error ? er.message : "Error"); }
  }
  async function accion(id: string, a: "entrar" | "reiniciar_trivia") {
    try {
      await llamar(`/api/superadmin/integrantes/${id}`, { body: { accion: a } });
      if (a === "entrar") { router.push("/"); router.refresh(); } else setExito("Trivia de hoy reiniciada ✔");
    } catch (er) { setErr(er instanceof Error ? er.message : "Error"); }
  }

  if (!lista) return <p className="text-sm text-suave">Cargando…</p>;
  return (
    <div className="space-y-3 border-t border-white/10 pt-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-white/90">Integrantes ({lista.length})</h4>
        <button
          type="button"
          className="btn btn-primario px-3 py-1 text-xs font-semibold"
          onClick={() => setAgregando((v) => !v)}
        >
          {agregando ? "Cancelar carga" : "+ Cargar otro integrante"}
        </button>
      </div>

      {exito && <p className="rounded-lg bg-emerald-500/10 p-2 text-xs text-emerald-300 font-semibold">{exito}</p>}
      {err && <p className="rounded-lg bg-red-500/10 p-2 text-xs text-red-300">{err}</p>}

      {agregando && (
        <form onSubmit={crearNuevo} className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-3 space-y-2 text-sm">
          <p className="font-bold text-cyan-200 text-xs">Cargar nuevo integrante a la familia:</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <input name="nombre" className="input" placeholder="Nombre completo (ej: Juan Pérez)" required />
            <input name="apodo" className="input" placeholder="Apodo (ej: Juancito)" />
            <input name="email" type="email" className="input" placeholder="Email (opcional)" />
            <input name="whatsapp" className="input" placeholder="WhatsApp (ej: 54911...)" />
            <input name="password" type="text" className="input" defaultValue="123456" placeholder="Clave inicial" required />
            <select name="rol" className="input" defaultValue="miembro">
              <option value="miembro">Miembro familiar</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          <div className="flex gap-2 pt-1">
            <button className="btn btn-primario text-xs">Guardar integrante</button>
            <button type="button" className="btn text-xs" onClick={() => setAgregando(false)}>Cancelar</button>
          </div>
        </form>
      )}

      {lista.length === 0 && <p className="text-sm text-suave">Sin integrantes todavía.</p>}
      {lista.map((u) => (
        <div key={u.id} className="rounded-xl bg-white/5 p-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <strong>{u.nombre}</strong>{u.apodo && <span className="text-suave">({u.apodo})</span>}
            <span className="rounded bg-white/10 px-1.5 text-xs">{u.rol}</span>{u.bloqueado && <span className="rounded bg-red-400/20 px-1.5 text-xs text-red-200">bloqueado</span>}
            <span className="ml-auto text-xs text-suave">{u.email ?? "sin mail"} · {u.whatsapp ? `📲 +${u.whatsapp}` : "sin WhatsApp"}</span>
          </div>
          {editando === u.id ? (
            <form onSubmit={(e) => guardar(e, u.id)} className="mt-2 grid gap-2 sm:grid-cols-2">
              <input name="nombre" className="input" defaultValue={u.nombre} required />
              <input name="apodo" className="input" defaultValue={u.apodo ?? ""} placeholder="Apodo" />
              <input name="email" type="email" className="input" defaultValue={u.email ?? ""} placeholder="Email" />
              <input name="whatsapp" className="input" defaultValue={u.whatsapp ?? ""} placeholder="WhatsApp (ej: 54911...)" />
              <input name="nacimiento" type="date" className="input" defaultValue={u.nacimiento ?? ""} />
              <select name="rol" className="input" defaultValue={u.rol}><option value="miembro">miembro</option><option value="admin">admin</option></select>
              <input name="password" type="text" className="input sm:col-span-2" placeholder="Nueva clave (dejar vacío para no cambiarla)" minLength={4} autoComplete="off" />
              <button className="btn btn-primario">Guardar</button><button type="button" className="btn" onClick={() => setEditando(null)}>Cancelar</button>
            </form>
          ) : (
            <div className="mt-2 flex flex-wrap gap-2">
              <button className="btn px-3 py-1 text-xs" onClick={() => setEditando(u.id)}>Modificar</button>
              <button className="btn px-3 py-1 text-xs text-cyan-300 font-semibold" onClick={() => blanquearClave(u)} title="Restablecer clave a 123456">🔑 Resetear clave (123456)</button>
              <button className="btn px-3 py-1 text-xs" onClick={() => accion(u.id, "entrar")}>Entrar como…</button>
              <button className="btn px-3 py-1 text-xs" onClick={() => accion(u.id, "reiniciar_trivia")}>Reiniciar trivia</button>
              <button className="btn btn-peligro ml-auto px-3 py-1 text-xs" onClick={() => eliminar(u)}>Eliminar permanente</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------- PIZARRA ------------------------------- */
interface MsgP { id: string; texto: string; color: string; origen: string; destacado: boolean; vence_en: string | null; grupos: { nombre: string } | null }

function Pizarra() {
  const [lista, setLista] = useState<MsgP[]>([]);
  const [familias, setFamilias] = useState<Familia[]>([]);
  const [err, setErr] = useState("");
  const cargar = useCallback(async () => {
    const [a, b] = await Promise.all([llamar<{ mensajes: MsgP[] }>("/api/superadmin/pizarra"), llamar<{ familias: Familia[] }>("/api/superadmin/familias")]);
    setLista(a.mensajes); setFamilias(b.familias);
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { cargar().catch((e) => setErr(e.message)); }, [cargar]);

  async function crear(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = e.currentTarget;
    const g = (n: string) => (f.elements.namedItem(n) as HTMLInputElement).value;
    try {
      await llamar("/api/superadmin/pizarra", { body: { texto: g("texto"), color: g("color"), grupo_id: g("grupo") || null, horas: Number(g("horas")), destacado: true } });
      f.reset(); setErr(""); cargar();
    } catch (er) { setErr(er instanceof Error ? er.message : "Error"); }
  }
  async function borrar(id: string) { await llamar("/api/superadmin/pizarra", { method: "DELETE", body: { id } }); cargar(); }

  return (
    <div className="space-y-4">
      <form onSubmit={crear} className="tarjeta grid gap-3 p-5 sm:grid-cols-2">
        <input name="texto" className="input sm:col-span-2" placeholder="Mensaje destacado para el cartel LED" maxLength={200} required />
        <select name="color" className="input" defaultValue="magenta">{COLORES_LED.map((c) => <option key={c}>{c}</option>)}</select>
        <select name="grupo" className="input" defaultValue=""><option value="">Todas las familias</option>{familias.map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)}</select>
        <select name="horas" className="input" defaultValue="24"><option value="1">Dura 1 hora</option><option value="24">Dura 24 horas</option><option value="168">Dura 7 días</option></select>
        <button className="btn btn-primario">Publicar</button>
      </form>
      {err && <p className="text-sm text-red-300">{err}</p>}
      {lista.map((m) => (
        <div key={m.id} className="tarjeta flex items-center gap-3 p-3 text-sm">
          <span className="flex-1"><span className={`led-${m.color} font-bold`}>{m.texto}</span><br /><span className="text-xs text-suave">{m.origen} · {m.grupos?.nombre ?? "global"} · vence {m.vence_en ? new Date(m.vence_en).toLocaleString("es-AR") : "nunca"}</span></span>
          <button className="btn btn-peligro px-3 py-1 text-xs" onClick={() => borrar(m.id)}>Quitar</button>
        </div>
      ))}
    </div>
  );
}

/* ---------------------------- PUBLICIDADES ---------------------------- */
interface Ad { id: string; titulo: string; texto: string | null; enlace: string | null; ubicacion: string; activa: boolean; imagen_url: string | null }

function Publicidades() {
  const [lista, setLista] = useState<Ad[]>([]);
  const [err, setErr] = useState("");
  const cargar = useCallback(() => llamar<{ publicidades: Ad[] }>("/api/superadmin/publicidades").then((r) => setLista(r.publicidades)).catch((e) => setErr(e.message)), []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { cargar(); }, [cargar]);

  async function crear(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = e.currentTarget;
    try { await llamar("/api/superadmin/publicidades", { body: new FormData(f) }); f.reset(); setErr(""); cargar(); } catch (er) { setErr(er instanceof Error ? er.message : "Error"); }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={crear} className="tarjeta grid gap-3 p-5 sm:grid-cols-2">
        <input name="titulo" className="input" placeholder="Título" required />
        <select name="ubicacion" className="input" defaultValue="home"><option value="home">Pantalla principal</option><option value="login">Ingreso</option><option value="trivia">Trivia</option></select>
        <input name="texto" className="input sm:col-span-2" placeholder="Texto breve" />
        <input name="enlace" className="input" placeholder="https://enlace…" />
        <input name="imagen" type="file" accept="image/*" className="input text-sm" />
        <button className="btn btn-primario sm:col-span-2">Agregar publicidad</button>
      </form>
      {err && <p className="text-sm text-red-300">{err}</p>}
      {lista.map((a) => (
        <div key={a.id} className="tarjeta flex items-center gap-3 p-3 text-sm">
          {a.imagen_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={a.imagen_url} alt="" className="h-14 w-14 rounded-lg object-cover" />
          )}
          <span className="flex-1"><strong>{a.titulo}</strong> <span className="text-xs text-suave">· {a.ubicacion}</span><br /><span className="text-suave">{a.texto} {a.enlace}</span></span>
          <button className="btn px-3 py-1 text-xs" onClick={async () => { await llamar("/api/superadmin/publicidades", { method: "PATCH", body: { id: a.id, activa: !a.activa } }); cargar(); }}>{a.activa ? "Desactivar" : "Activar"}</button>
          <button className="btn btn-peligro px-3 py-1 text-xs" onClick={async () => { await llamar("/api/superadmin/publicidades", { method: "DELETE", body: { id: a.id } }); cargar(); }}>Eliminar</button>
        </div>
      ))}
    </div>
  );
}

/* ----------------------------- DIAGNÓSTICO ----------------------------- */
const icono: Record<string, string> = { ok: "✅", reparado: "🛠️", alerta: "⚠️", error: "❌" };

function Diagnostico() {
  const [d, setD] = useState<Diag | null>(null);
  const [cargando, setCargando] = useState(false);
  const [err, setErr] = useState("");

  async function correr() {
    setCargando(true); setErr("");
    try { setD(await llamar<Diag>("/api/superadmin/diagnostico", { body: {} })); } catch (e) { setErr(e instanceof Error ? e.message : "Error"); } finally { setCargando(false); }
  }

  async function pdf() {
    if (!d) return;
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    const ancho = doc.internal.pageSize.getWidth();
    doc.setFontSize(18); doc.text("Destellos — Informe de diagnóstico", 14, 18);
    doc.setFontSize(10); doc.setTextColor(110);
    doc.text(`Generado: ${new Date(d.fecha).toLocaleString("es-AR")}   ·   by Rolφ`, 14, 25);
    doc.setTextColor(0); doc.setFontSize(14); doc.text(`Salud general: ${d.salud}%`, 14, 36);
    doc.setDrawColor(200); doc.rect(14, 40, ancho - 28, 5); doc.setFillColor(d.salud >= 80 ? 34 : d.salud >= 50 ? 245 : 220, d.salud >= 80 ? 197 : d.salud >= 50 ? 158 : 38, d.salud >= 80 ? 94 : d.salud >= 50 ? 11 : 38);
    doc.rect(14, 40, ((ancho - 28) * d.salud) / 100, 5, "F");
    let y = 56;
    const nombres = { ok: "OK", reparado: "REPARADO", alerta: "ALERTA", error: "ERROR" };
    for (const m of d.modulos) {
      const lineas = doc.splitTextToSize(m.detalle, ancho - 28) as string[];
      if (y + 8 + lineas.length * 5 > 280) { doc.addPage(); y = 20; }
      doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.text(`${m.modulo}  —  ${nombres[m.estado]}${m.reparaciones ? ` (${m.reparaciones} reparación/es)` : ""}`, 14, y);
      doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.text(lineas, 14, y + 6);
      y += 10 + lineas.length * 5;
    }
    doc.save(`diagnostico-destellos-${d.fecha.slice(0, 10)}.pdf`);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-primario" onClick={correr} disabled={cargando}>{cargando ? "Revisando todos los módulos…" : "Ejecutar diagnóstico y reparar"}</button>
        {d && <button className="btn" onClick={pdf}>Descargar Diagnóstico PDF</button>}
      </div>
      {err && <p className="text-sm text-red-300">{err}</p>}
      {d && (
        <>
          <div className="tarjeta p-5"><p className="text-sm text-suave">Salud general</p><p className="text-4xl font-extrabold">{d.salud}%</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10"><div className={`h-full ${d.salud >= 80 ? "bg-emerald-400" : d.salud >= 50 ? "bg-amber-400" : "bg-red-400"}`} style={{ width: `${d.salud}%` }} /></div></div>
          {d.modulos.map((m) => (
            <div key={m.modulo} className="tarjeta p-4 text-sm"><p className="font-semibold">{icono[m.estado]} {m.modulo}</p><p className="text-suave">{m.detalle}</p></div>
          ))}
        </>
      )}
    </div>
  );
}
