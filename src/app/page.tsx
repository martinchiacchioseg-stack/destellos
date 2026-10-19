"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import { Camera, Crown, MessageSquare, Bell, Send } from "lucide-react";
import { llamar, ErrorApi } from "@/lib/cliente";
import { Navegacion } from "@/components/Navegacion";
import { MarquesinaArlequin } from "@/components/MarquesinaArlequin";
import { type MsgLed } from "@/components/LedBoard";
import { ChatArlequin } from "@/components/ChatArlequin";

import type { ModulosActivos } from "@/lib/types";

interface Pub { id: string; nombre: string; apodo: string | null; foto_url: string | null }
interface Comentario { id: string; texto: string; creado_en: string; autor: Pub | null }
interface Destello {
  id: string; fecha: string; autor: Pub | null; foto_url: string | null; descripcion: string | null; ganador: boolean;
  reacciones: Record<string, number>; mi_reaccion: string | null; comentarios: Comentario[];
  titulo_arlequin?: string | null;
  devolucion_arlequin?: string | null;
}
interface Anuncio { id: string; titulo: string; texto: string | null; enlace: string | null; imagen_url: string | null }
interface Home {
  bloqueado?: boolean;
  licencia: { estado: string; vence_en: string; dias: number };
  grupo: { nombre: string; emoji: string; hora_limite?: string; modulos_activos?: ModulosActivos };
  yo?: Pub & { esAdmin: boolean; esSuper: boolean };
  hoy?: string; cerrado?: boolean; subiHoy?: boolean;
  faltan?: { id: string; nombre: string }[]; totalMiembros?: number;
  pizarra?: MsgLed[]; muro?: Destello[];
  veredictos?: Record<string, { texto: string; destello_id: string | null }>;
  notificacionesSinLeer?: number; triviaJugada?: boolean; anuncios?: Anuncio[];
}

const EMOJIS = ["❤️", "😂", "😍", "👏", "🔥", "🥹"];
const nom = (p: Pub | null) => p?.apodo || p?.nombre || "Alguien";

function Avatar({ p }: { p: Pub | null }) {
  if (p?.foto_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={p.foto_url} alt="" className="h-9 w-9 rounded-full object-cover" />;
  }
  return <span className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-xs font-bold">{nom(p)[0]?.toUpperCase()}</span>;
}

export default function Inicio() {
  const router = useRouter();
  const [d, setD] = useState<Home | null>(null);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    try {
      setD(await llamar<Home>("/api/home"));
      setError("");
    } catch (e) {
      if (e instanceof ErrorApi && e.status === 401) router.replace("/login");
      else setError(e instanceof Error ? e.message : "No pudimos cargar.");
    }
  }, [router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar();
    const t = setInterval(cargar, 45_000);
    return () => clearInterval(t);
  }, [cargar]);

  return (
    <>
      <Navegacion />
      <main className="mx-auto max-w-3xl space-y-4 px-4 py-4">
        {error && <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
        {!d && !error && <p className="py-20 text-center text-suave">Cargando destellos…</p>}
        {d?.bloqueado && <Licencia d={d} />}
        {d && !d.bloqueado && <Contenido d={d} recargar={cargar} />}
      </main>
      {d && !d.bloqueado && <ChatArlequin />}
    </>
  );
}

function Licencia({ d }: { d: Home }) {
  return (
    <div className="tarjeta space-y-2 p-8 text-center">
      <p className="text-4xl">🎭</p>
      <h1 className="text-xl font-bold">{d.grupo.emoji} Familia {d.grupo.nombre}</h1>
      <p className="text-suave">
        {d.licencia.estado === "pausada"
          ? "El espacio de la familia está en pausa por ahora."
          : "La licencia de la familia venció, por eso las fotos están resguardadas."}
        {" "}Hablá con el administrador para reactivarlo y volver a brillar juntos.
      </p>
    </div>
  );
}

function Contenido({ d, recargar }: { d: Home; recargar: () => void }) {
  const [subiendo, setSubiendo] = useState(false);
  const [aviso, setAviso] = useState("");
  const hoy = d.hoy!;
  const veredictoHoy = d.veredictos?.[hoy];
  const faltan = (d.faltan ?? []).filter((f) => f.id !== d.yo?.id);

  async function subir(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSubiendo(true);
    setAviso("");
    try {
      await llamar("/api/destellos", { body: fd });
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.7 } });
      await recargar();
    } catch (err) {
      setAviso(err instanceof Error ? err.message : "No se pudo subir.");
    } finally {
      setSubiendo(false);
    }
  }

  async function recordar(id: string) {
    try {
      const r = await llamar<{ url: string; tieneWhatsapp: boolean; texto: string }>("/api/arlequin/recordatorio", { body: { usuarioId: id } });
      if (r.tieneWhatsapp) window.open(r.url, "_blank", "noopener");
      else await navigator.clipboard?.writeText(r.texto);
      setAviso(r.tieneWhatsapp ? "" : "No tiene WhatsApp cargado: copié el mensaje para que lo mandes por otro medio.");
    } catch (err) {
      setAviso(err instanceof Error ? err.message : "No se pudo armar el recordatorio.");
    }
  }

  const [previewFoto, setPreviewFoto] = useState<string | null>(null);
  const [mostrarSubirExtra, setMostrarSubirExtra] = useState(false);

  return (
    <>
      <MarquesinaArlequin mensajesIniciales={d.pizarra ?? []} />

      {/* HUB RÁPIDO: FOTO OCULTA, TARAMBANA, CEREBRO, TRAZO Y FEED JUNTOS */}
      <section className="rounded-3xl border-2 border-fuchsia-500/40 bg-gradient-to-r from-slate-950 via-purple-950/40 to-slate-950 p-4 shadow-[0_0_30px_rgba(255,0,127,0.18)]">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎭</span>
            <span className="text-xs font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-cyan-300">
              JUEGOS FAMILIARES & ACCESO DIRECTO
            </span>
          </div>
          <a href="/tarambana" className="text-[11px] font-bold text-fuchsia-300 hover:text-white transition">
            Abrir Club completo ➔
          </a>
        </div>
        <div className="flex flex-wrap gap-2 text-left">
          {/* FOTO OCULTA (Core) */}
          <a
            href="/tarambana"
            className="flex-1 min-w-[130px] flex items-center gap-2.5 p-3 rounded-2xl bg-amber-950/50 hover:bg-amber-900/60 border border-amber-400/40 transition group"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-400/20 text-amber-300 grid place-items-center shrink-0 text-lg group-hover:scale-110 transition">
              📸
            </div>
            <div>
              <p className="text-xs font-black text-amber-300">Foto Oculta</p>
              <p className="text-[10px] text-slate-400">Adiviná el autor</p>
            </div>
          </a>

          {/* TARAMBANA */}
          {(d.grupo.modulos_activos?.tarareo_ardilla ?? true) && (
            <a
              href="/tarambana"
              className="flex-1 min-w-[130px] flex items-center gap-2.5 p-3 rounded-2xl bg-fuchsia-950/50 hover:bg-fuchsia-900/60 border border-fuchsia-400/40 transition group"
            >
              <div className="w-9 h-9 rounded-xl bg-fuchsia-400/20 text-fuchsia-300 grid place-items-center shrink-0 text-lg group-hover:scale-110 transition">
                🔔
              </div>
              <div>
                <p className="text-xs font-black text-fuchsia-300">Tarambana</p>
                <p className="text-[10px] text-slate-400">Ronda de tarareos</p>
              </div>
            </a>
          )}

          {/* CEREBRO */}
          {(d.grupo.modulos_activos?.cerebro_fuga ?? true) && (
            <a
              href="/trivia"
              className="flex-1 min-w-[130px] flex items-center gap-2.5 p-3 rounded-2xl bg-orange-950/50 hover:bg-orange-900/60 border border-orange-400/40 transition group"
            >
              <div className="w-9 h-9 rounded-xl bg-orange-400/20 text-orange-300 grid place-items-center shrink-0 text-lg group-hover:scale-110 transition">
                🧠
              </div>
              <div>
                <p className="text-xs font-black text-orange-300">Cerebro</p>
                <p className="text-[10px] text-slate-400">Trivia diaria IA</p>
              </div>
            </a>
          )}

          {/* TRAZO */}
          {(d.grupo.modulos_activos?.trazo_loco ?? true) && (
            <a
              href="/tarambana"
              className="flex-1 min-w-[130px] flex items-center gap-2.5 p-3 rounded-2xl bg-lime-950/50 hover:bg-lime-900/60 border border-lime-400/40 transition group"
            >
              <div className="w-9 h-9 rounded-xl bg-lime-400/20 text-lime-300 grid place-items-center shrink-0 text-lg group-hover:scale-110 transition">
                ✏️
              </div>
              <div>
                <p className="text-xs font-black text-lime-300">Trazo</p>
                <p className="text-[10px] text-slate-400">Pizarra en vivo</p>
              </div>
            </a>
          )}

          {/* PRODE (Si está activo) */}
          {(d.grupo.modulos_activos?.prode_futbol) && (
            <a
              href="/prode"
              className="flex-1 min-w-[130px] flex items-center gap-2.5 p-3 rounded-2xl bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-400/40 transition group"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-400/20 text-emerald-300 grid place-items-center shrink-0 text-lg group-hover:scale-110 transition">
                ⚽
              </div>
              <div>
                <p className="text-xs font-black text-emerald-300">El Prode</p>
                <p className="text-[10px] text-slate-400">Pronósticos fecha</p>
              </div>
            </a>
          )}
        </div>
      </section>

      {/* 1. FOTO GANADORA / VEREDICTO DE ARLEQUÍN (SI YA FUE ELEGIDA HOY O AYER) */}
      {veredictoHoy && (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl border-2 border-amber-300/80 bg-gradient-to-br from-amber-950/60 via-slate-900 to-amber-950/30 p-5 shadow-[0_0_35px_rgba(251,191,36,0.3)] space-y-2"
        >
          <div className="flex items-center gap-2 font-black text-amber-300 text-sm">
            <Crown size={22} className="text-amber-400 animate-bounce" />
            <span className="tracking-wider uppercase">👑 FOTO DEL DÍA ELEGIDA POR ARLEQUÍN</span>
          </div>
          <p className="text-sm font-semibold text-amber-100 leading-relaxed">{veredictoHoy.texto}</p>
        </motion.section>
      )}

      {/* 2. TU DESTELLO DEL DÍA / SUBIR FOTO */}
      <section className="relative overflow-hidden rounded-3xl bg-slate-900/95 border-2 border-amber-300/40 p-5 shadow-[0_0_35px_rgba(251,191,36,0.15)] space-y-4">
        <div className="flex items-start gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-2xl shrink-0">
            📸
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-black uppercase tracking-wider">
                EL JUEGO PRINCIPAL
              </span>
              <span className="text-xs text-amber-300 font-bold">Un clic familiar</span>
            </div>
            <h2 className="text-xl font-black text-white">
              {d.cerrado
                ? "¡Cerró el escenario de hoy!"
                : d.subiHoy
                  ? "¡Tu destello ya brilla en el muro! ✨"
                  : `Hola ${d.yo?.apodo || d.yo?.nombre.split(" ")[0]}, ¿cuál es tu foto de hoy?`}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
              {d.cerrado
                ? "Mañana empieza otro día para brillar juntos."
                : faltan.length
                  ? `Faltan subir foto ${faltan.length + (d.subiHoy ? 0 : 1)} de ${d.totalMiembros} integrantes antes de las ${d.grupo.hora_limite} hs.`
                  : `¡Toda la familia subió su destello! Arlequín ya tiene todas las fotos en el muro.`}
            </p>
          </div>
          {d.yo?.esAdmin && (
            <a href="/admin" className="relative rounded-xl p-2.5 bg-slate-800 border border-white/10 text-suave hover:text-white" aria-label="Avisos">
              <Bell size={20} />
              {!!d.notificacionesSinLeer && <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{d.notificacionesSinLeer}</span>}
            </a>
          )}
        </div>

        {/* Si ya subió hoy, mostrar botón para agregar fotos extra en cualquier momento */}
        {d.subiHoy && !mostrarSubirExtra && (
          <div className="pt-1 flex items-center justify-between border-t border-white/10">
            <span className="text-xs text-emerald-300 font-semibold">
              ✨ Ya cumpliste con la foto del día.
            </span>
            <button
              onClick={() => setMostrarSubirExtra(true)}
              className="px-3.5 py-1.5 rounded-xl bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-bold transition flex items-center gap-1.5"
            >
              <Camera size={14} />
              <span>+ Subir otra foto para que Arlequín la titule</span>
            </button>
          </div>
        )}

        {/* Formulario de subida (si no subió hoy o si quiere subir una extra) */}
        {(!d.cerrado && (!d.subiHoy || mostrarSubirExtra)) && (
          <form onSubmit={subir} className="space-y-3 pt-2">
            <div className="relative">
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-amber-400/50 hover:border-amber-300 rounded-2xl p-4 bg-slate-950/60 cursor-pointer transition group">
                {previewFoto ? (
                  <div className="relative w-full max-h-56 overflow-hidden rounded-xl border border-white/20">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previewFoto} alt="Previsualización" className="w-full h-full object-cover max-h-56 mx-auto" />
                    <span className="absolute bottom-2 right-2 px-2.5 py-1 rounded-lg bg-black/80 text-[11px] font-bold text-amber-300">
                      Tocar para cambiar foto ↺
                    </span>
                  </div>
                ) : (
                  <div className="text-center py-4 space-y-2">
                    <Camera size={36} className="mx-auto text-amber-400 group-hover:scale-110 transition animate-bounce" />
                    <p className="text-sm font-black text-white">Elegir o sacar foto 📷</p>
                    <p className="text-xs text-slate-400">Arlequín le estampará un título impreso en el muro</p>
                  </div>
                )}
                <input
                  name="foto"
                  type="file"
                  accept="image/*"
                  required
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setPreviewFoto(URL.createObjectURL(f));
                    }
                  }}
                />
              </label>
            </div>

            <input name="descripcion" className="input text-sm" placeholder="Contá algo lindo sobre tu foto (opcional)" maxLength={200} />
            <div className="flex gap-2">
              <button className="btn btn-primario flex-1 font-black text-sm tracking-wide py-3 shadow-[0_0_20px_rgba(251,191,36,0.3)] hover:scale-[1.01] transition" disabled={subiendo}>
                <Camera size={20} />
                {subiendo ? "Brillando en el muro…" : "¡SUBIR DESTELLO AL MURO! 🌟"}
              </button>
              {mostrarSubirExtra && (
                <button
                  type="button"
                  onClick={() => { setMostrarSubirExtra(false); setPreviewFoto(null); }}
                  className="btn px-4 bg-slate-800 text-xs font-bold"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        )}

        {!d.cerrado && faltan.length > 0 && (
          <details className="text-xs border-t border-white/10 pt-3">
            <summary className="cursor-pointer text-slate-400 hover:text-white font-semibold">
              🔔 Avisar a los que faltan subir foto por WhatsApp ({faltan.length})
            </summary>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {faltan.map((f) => (
                <button key={f.id} className="btn px-3 py-1.5 text-xs font-bold bg-slate-800 hover:bg-slate-700" onClick={() => recordar(f.id)}>
                  <Send size={12} className="text-emerald-400" /> {f.nombre}
                </button>
              ))}
            </div>
          </details>
        )}
        {aviso && <p className="text-sm text-amber-200 font-bold">{aviso}</p>}
      </section>

      {/* 3. FEED CENTRAL: EL MURO DE FOTOS (EN EL COMIENZO MISMO) */}
      <section className="space-y-4 pt-1">
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">✨</span>
            <h3 className="text-sm font-black uppercase tracking-wider text-amber-300">
              Muro de Destellos Familiares
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-bold">{(d.muro ?? []).length} fotos compartidas</span>
        </div>

        {(d.muro ?? []).length === 0 && (
          <div className="py-12 text-center space-y-3 tarjeta">
            <p className="text-3xl">📷</p>
            <p className="font-bold text-white">Todavía no hay fotos en el muro.</p>
            <p className="text-xs text-suave">¡Sé el primero en subir tu foto de hoy!</p>
          </div>
        )}

        {(d.muro ?? []).map((x) => (
          <Tarjeta key={x.id} x={x} hoy={hoy} recargar={recargar} />
        ))}
      </section>

      {/* 4. SALA DE JUEGOS Y ENTRETENIMIENTO FAMILIAR (DESBLOQUEADOS) */}
      <div className="space-y-3 pt-4 border-t border-white/10">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm">🎮</span>
          <h4 className="text-xs font-black uppercase tracking-wider text-fuchsia-400">
            Juegos Familiares del Club
          </h4>
        </div>

        {/* Acceso a la suite SINCERICIDIO - El Club de los Tarambanas */}
        <div className="relative overflow-hidden rounded-3xl bg-slate-950 p-5 border-2 border-fuchsia-500/50 shadow-[0_0_30px_rgba(255,0,127,0.25)]">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-screen pointer-events-none"
            style={{ backgroundImage: "url('/logos/sincericidio-bg.jpg')" }}
          />
          <div className="absolute -top-12 -left-12 w-48 h-48 bg-fuchsia-600/30 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-cyan-400/30 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border-2 border-fuchsia-400 bg-slate-900 shadow-[0_0_15px_rgba(255,0,127,0.6)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logos/sincericidio-logo.jpg" alt="Sincericidio Logo" className="h-full w-full object-cover" />
              </div>
              <div className="space-y-0.5 text-left">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-pink-500 to-cyan-400 text-black uppercase tracking-wider animate-pulse">
                    SALA DE JUEGOS
                  </span>
                  <span className="text-xs text-cyan-300 font-bold">5 Módulos en Vivo</span>
                </div>
                <h3 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-pink-100 to-cyan-200">
                  SINCERICIDIO
                </h3>
                <p className="text-xs text-fuchsia-200">
                  El Club de los Tarambanas: Tarareo Ardilla, Trivia 3D y Trazo Loco.
                </p>
              </div>
            </div>

            {d.subiHoy ? (
              <a
                href="/tarambana"
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 via-fuchsia-600 to-cyan-400 text-white font-black text-xs tracking-wider shadow-lg hover:scale-105 active:scale-95 transition text-center whitespace-nowrap"
              >
                ENTRAR AL CLUB 🚀
              </a>
            ) : (
              <button
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                  setAviso('¡Primero tu Destello del Día! 📸 Subí tu foto de hoy para desbloquear Sincericidio.');
                }}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 border border-amber-400/50 text-amber-300 font-bold text-xs tracking-wider hover:bg-slate-700 transition text-center whitespace-nowrap flex items-center justify-center gap-1.5"
              >
                <span>🔒</span> Subí tu foto primero
              </button>
            )}
          </div>
        </div>

        {/* Acceso al Prode del Fin de Semana (Solo si está habilitado en este grupo) */}
        {(d.grupo.modulos_activos?.prode_futbol) && (
          <div className="relative overflow-hidden rounded-3xl bg-slate-900/90 p-5 border-2 border-emerald-400/40 shadow-[0_0_25px_rgba(16,185,129,0.2)]">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <span className="text-3xl p-2.5 rounded-2xl bg-emerald-400/10 border border-emerald-400/30">⚽</span>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-400 text-black uppercase tracking-wider">
                      FECHA EN JUEGO
                    </span>
                    <span className="text-xs text-emerald-300 font-bold">Fecha 14 • Clásicos</span>
                  </div>
                  <h3 className="text-lg font-black text-white">El Prode del Fin de Semana</h3>
                  <p className="text-xs text-slate-300">
                    Pronosticá Boca-River, Racing-Independiente y más. Pleno suma +8 pts al ranking.
                  </p>
                </div>
              </div>
              {d.subiHoy ? (
                <a
                  href="/prode"
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 text-black font-black text-xs tracking-wider shadow-lg hover:scale-105 active:scale-95 transition text-center whitespace-nowrap"
                >
                  JUGAR EL PRODE ⚽
                </a>
              ) : (
                <button
                  onClick={() => {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    setAviso('¡Primero tu Destello del Día! 📸 Subí tu foto de hoy para desbloquear El Prode.');
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 border border-amber-400/50 text-amber-300 font-bold text-xs tracking-wider hover:bg-slate-700 transition text-center whitespace-nowrap flex items-center justify-center gap-1.5"
                >
                  <span>🔒</span> Subí tu foto primero
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {d.licencia.estado === "por_vencer" && (
        <p className="rounded-lg bg-amber-400/10 p-3 text-sm text-amber-200">⏳ La licencia de la familia vence en {d.licencia.dias} día(s). Avisale al administrador.</p>
      )}

      {(!d.triviaJugada && (d.grupo.modulos_activos?.cerebro_fuga ?? true)) && (
        <a href="/trivia" className="tarjeta flex items-center gap-3 p-4 hover:bg-white/10">
          <span className="text-2xl">🧠</span>
          <span className="flex-1"><strong>Trivia de Arlequín</strong><br /><span className="text-sm text-suave">Tu turno de hoy te espera. ¡Sumá puntos!</span></span>
        </a>
      )}

      {(d.anuncios ?? []).map((a) => <Anuncio key={a.id} a={a} />)}
    </>
  );
}

function Anuncio({ a }: { a: Anuncio }) {
  const cuerpo = (
    <div className="tarjeta flex items-center gap-3 p-3">
      {a.imagen_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={a.imagen_url} alt="" className="h-14 w-14 rounded-lg object-cover" />
      )}
      <div className="flex-1"><p className="text-[10px] uppercase tracking-wider text-suave">Publicidad</p><p className="font-semibold">{a.titulo}</p>{a.texto && <p className="text-sm text-suave">{a.texto}</p>}</div>
    </div>
  );
  return a.enlace ? <a href={a.enlace} target="_blank" rel="noopener noreferrer sponsored">{cuerpo}</a> : cuerpo;
}

function Tarjeta({ x, hoy, recargar }: { x: Destello; hoy: string; recargar: () => void }) {
  const [txt, setTxt] = useState("");

  async function reaccionar(emoji: string) {
    await llamar(`/api/destellos/${x.id}/interaccion`, { body: { emoji: x.mi_reaccion === emoji ? null : emoji } });
    recargar();
  }
  async function comentar(e: React.FormEvent) {
    e.preventDefault();
    if (!txt.trim()) return;
    await llamar(`/api/destellos/${x.id}/interaccion`, { body: { comentario: txt } });
    setTxt("");
    recargar();
  }

  return (
    <article className={`tarjeta overflow-hidden ${x.ganador ? "border-amber-300/60 shadow-[0_0_30px_rgba(251,191,36,0.15)]" : ""}`}>
      <div className="flex items-center gap-3 p-3">
        <Avatar p={x.autor} />
        <div className="flex-1"><p className="font-semibold">{nom(x.autor)} {x.ganador && "🏆"}</p><p className="text-xs text-suave">{x.fecha === hoy ? "Hoy" : x.fecha}</p></div>
      </div>
      {x.foto_url && (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={x.foto_url} alt={`Destello de ${nom(x.autor)}`} className="max-h-[32rem] w-full object-cover" loading="lazy" />
          {x.titulo_arlequin && (
            <div className="absolute top-2 left-2 right-2 bg-black/85 backdrop-blur-md rounded-xl p-2.5 border border-pink-500/50 shadow-lg">
              <div className="flex items-center gap-1.5 text-[11px] font-black uppercase text-pink-300">
                <span>🎭</span> Arlequín:
              </div>
              <p className="text-xs font-black text-amber-300 leading-tight mt-0.5">
                "{x.titulo_arlequin}"
              </p>
              {x.devolucion_arlequin && (
                <p className="text-[11px] text-slate-200 mt-1 italic leading-snug">
                  "{x.devolucion_arlequin}"
                </p>
              )}
            </div>
          )}
        </div>
      )}
      {x.descripcion && <p className="px-3 pt-3 text-sm">{x.descripcion}</p>}
      <div className="flex flex-wrap gap-1.5 p-3">
        {EMOJIS.map((e) => (
          <button key={e} onClick={() => reaccionar(e)} className={`rounded-full border px-2.5 py-1 text-sm ${x.mi_reaccion === e ? "border-cyan-300 bg-cyan-300/20" : "border-white/10 bg-white/5"}`}>
            {e} {x.reacciones[e] ? <span className="text-xs text-suave">{x.reacciones[e]}</span> : null}
          </button>
        ))}
      </div>
      <div className="space-y-1.5 px-3 pb-3">
        {x.comentarios.map((c) => <p key={c.id} className="text-sm"><strong>{nom(c.autor)}</strong> {c.texto}</p>)}
        <form onSubmit={comentar} className="flex items-center gap-2 pt-1">
          <MessageSquare size={16} className="text-suave" />
          <input className="input py-2 text-sm" placeholder="Dejá un comentario con cariño…" value={txt} onChange={(e) => setTxt(e.target.value)} maxLength={300} />
        </form>
      </div>
    </article>
  );
}
