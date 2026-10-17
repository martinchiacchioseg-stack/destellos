"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import { Camera, Crown, MessageSquare, Bell, Send } from "lucide-react";
import { llamar, ErrorApi } from "@/lib/cliente";
import { Navegacion } from "@/components/Navegacion";
import { LedBoard, type MsgLed } from "@/components/LedBoard";
import { ChatArlequin } from "@/components/ChatArlequin";

interface Pub { id: string; nombre: string; apodo: string | null; foto_url: string | null }
interface Comentario { id: string; texto: string; creado_en: string; autor: Pub | null }
interface Destello {
  id: string; fecha: string; autor: Pub | null; foto_url: string | null; descripcion: string | null; ganador: boolean;
  reacciones: Record<string, number>; mi_reaccion: string | null; comentarios: Comentario[];
}
interface Anuncio { id: string; titulo: string; texto: string | null; enlace: string | null; imagen_url: string | null }
interface Home {
  bloqueado?: boolean;
  licencia: { estado: string; vence_en: string; dias: number };
  grupo: { nombre: string; emoji: string; hora_limite?: string };
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

  return (
    <>
      <LedBoard mensajes={d.pizarra ?? []} />

      {d.licencia.estado === "por_vencer" && (
        <p className="rounded-lg bg-amber-400/10 p-3 text-sm text-amber-200">⏳ La licencia de la familia vence en {d.licencia.dias} día(s). Avisale al administrador.</p>
      )}

      <section className="tarjeta space-y-3 p-4">
        <div className="flex items-start gap-3">
          <span className="text-3xl">🎭</span>
          <div className="flex-1">
            <p className="font-semibold">
              {d.cerrado
                ? "¡Cerró el escenario de hoy!"
                : d.subiHoy
                  ? "¡Tu destello ya brilla en el muro!"
                  : `Hola ${d.yo?.apodo || d.yo?.nombre.split(" ")[0]}, ¿ya subiste tu destello?`}
            </p>
            <p className="text-sm text-suave">
              {d.cerrado
                ? "Mañana empieza otro día para brillar."
                : faltan.length
                  ? `Faltan ${faltan.length + (d.subiHoy ? 0 : 1)} de ${d.totalMiembros} antes de las ${d.grupo.hora_limite} hs.`
                  : `¡Subió toda la familia! Cierre a las ${d.grupo.hora_limite} hs.`}
            </p>
          </div>
          {d.yo?.esAdmin && (
            <a href="/admin" className="relative rounded-lg p-2 text-suave hover:text-white" aria-label="Avisos">
              <Bell size={20} />
              {!!d.notificacionesSinLeer && <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{d.notificacionesSinLeer}</span>}
            </a>
          )}
        </div>

        {!d.cerrado && !d.subiHoy && (
          <form onSubmit={subir} className="space-y-2">
            <input name="foto" type="file" accept="image/*" required className="input text-sm" />
            <input name="descripcion" className="input" placeholder="Contá algo de tu destello (opcional)" maxLength={200} />
            <button className="btn btn-primario w-full" disabled={subiendo}><Camera size={18} />{subiendo ? "Subiendo…" : "Subir mi destello"}</button>
          </form>
        )}

        {!d.cerrado && faltan.length > 0 && (
          <details className="text-sm">
            <summary className="cursor-pointer text-suave">Recordar a los demorados por WhatsApp</summary>
            <div className="mt-2 flex flex-wrap gap-2">
              {faltan.map((f) => (
                <button key={f.id} className="btn px-3 py-1.5 text-sm" onClick={() => recordar(f.id)}><Send size={14} />{f.nombre}</button>
              ))}
            </div>
          </details>
        )}
        {aviso && <p className="text-sm text-amber-200">{aviso}</p>}
      </section>

      {veredictoHoy && (
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="tarjeta border-amber-300/40 bg-amber-300/5 p-4">
          <p className="flex items-center gap-2 font-semibold text-amber-200"><Crown size={18} /> Veredicto de Arlequín</p>
          <p className="mt-1">{veredictoHoy.texto}</p>
        </motion.section>
      )}

      {!d.triviaJugada && (
        <a href="/trivia" className="tarjeta flex items-center gap-3 p-4 hover:bg-white/10">
          <span className="text-2xl">🧠</span>
          <span className="flex-1"><strong>Trivia de Arlequín</strong><br /><span className="text-sm text-suave">Tu turno de hoy te espera. ¡Sumá puntos!</span></span>
        </a>
      )}

      {(d.anuncios ?? []).map((a) => <Anuncio key={a.id} a={a} />)}

      <section className="space-y-4">
        {(d.muro ?? []).length === 0 && <p className="py-10 text-center text-suave">Todavía no hay destellos. ¡Sé el primero! ✨</p>}
        {(d.muro ?? []).map((x) => <Tarjeta key={x.id} x={x} hoy={hoy} recargar={recargar} />)}
      </section>
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
        // eslint-disable-next-line @next/next/no-img-element
        <img src={x.foto_url} alt={`Destello de ${nom(x.autor)}`} className="max-h-[32rem] w-full object-cover" loading="lazy" />
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
