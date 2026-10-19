"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import { Share2, RotateCcw } from "lucide-react";
import { llamar } from "@/lib/cliente";
import { Navegacion } from "@/components/Navegacion";
import { MarquesinaArlequin } from "@/components/MarquesinaArlequin";
import { NIVELES, type NivelTrivia } from "@/lib/types";

interface Vista {
  nivel: NivelTrivia; segundos_total: number; restante: number; pregunta: string; opciones: string[]; respondida: boolean;
  correcta?: number; elegida?: number | null; acerto?: boolean; puntos?: number; explicacion?: string; dato_curioso?: string; evaluacion?: string;
}
interface Estado { jugada: boolean; intento?: Vista; puedeReiniciar?: boolean }

export default function Trivia() {
  const [est, setEst] = useState<Estado | null>(null);
  const [v, setV] = useState<Vista | null>(null);
  const [restante, setRestante] = useState(0);
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const enviado = useRef(false);

  const cargar = useCallback(async () => {
    const r = await llamar<Estado>("/api/trivia");
    setEst(r);
    setV(r.intento ?? null);
    setRestante(r.intento?.restante ?? 0);
    enviado.current = false;
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar().catch((e) => setError(e.message));
  }, [cargar]);

  const responder = useCallback(async (opcion: number | null) => {
    if (enviado.current) return;
    enviado.current = true;
    setOcupado(true);
    try {
      const r = await llamar<{ intento: Vista }>("/api/trivia/responder", { body: { opcion } });
      setV(r.intento);
      if (r.intento.acerto) confetti({ particleCount: 140, spread: 90, origin: { y: 0.6 } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo enviar.");
    } finally {
      setOcupado(false);
    }
  }, []);

  // Cuenta regresiva: la validación real del tiempo se hace en el servidor.
  useEffect(() => {
    if (!v || v.respondida) return;
    const t = setInterval(() => {
      setRestante((s) => {
        if (s <= 1) { clearInterval(t); responder(null); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [v, responder]);

  async function empezar(nivel: NivelTrivia) {
    setOcupado(true);
    setError("");
    try {
      const r = await llamar<{ intento: Vista }>("/api/trivia/iniciar", { body: { nivel } });
      enviado.current = false;
      setV(r.intento);
      setRestante(r.intento.restante);
      setEst({ jugada: true, intento: r.intento, puedeReiniciar: est?.puedeReiniciar });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo empezar.");
    } finally {
      setOcupado(false);
    }
  }

  async function reiniciar() {
    await llamar("/api/trivia/reiniciar", { body: {} });
    setV(null);
    await cargar();
  }

  function compartir() {
    if (!v) return;
    const t = `🎭 Trivia de Arlequín (${NIVELES[v.nivel].etiqueta}): ${v.acerto ? `¡acerté! +${v.puntos} punto(s) 🎉` : "hoy no me salió, pero mañana hay revancha 💪"}\n¿Te animás? #TRIBOO`;
    window.open(`https://wa.me/?text=${encodeURIComponent(t)}`, "_blank", "noopener");
  }

  const reiniciarBtn = est?.puedeReiniciar && (
    <button onClick={reiniciar} className="btn mx-auto text-xs"><RotateCcw size={14} />[Superadmin] Reiniciar turno para volver a probar</button>
  );

  return (
    <>
      <Navegacion />
      <main className="mx-auto max-w-xl space-y-4 px-4 py-6">
        <h1 className="text-center text-2xl font-extrabold">🧠 Trivia de Arlequín</h1>
        {error && <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}

        {est && !v && (
          <div className="space-y-3">
            <p className="text-center text-suave">Un solo intento por día (se renueva a las 00:00). Elegí tu desafío:</p>
            {(Object.keys(NIVELES) as NivelTrivia[]).map((n) => (
              <button key={n} disabled={ocupado} onClick={() => empezar(n)} className="tarjeta flex w-full items-center gap-4 p-4 text-left transition hover:bg-white/10 disabled:opacity-50">
                <span className="text-3xl">{NIVELES[n].emoji}</span>
                <span className="flex-1"><strong>{NIVELES[n].etiqueta}</strong><br /><span className="text-sm text-suave">{NIVELES[n].segundos} segundos · 4 opciones</span></span>
                <span className="rounded-full bg-cyan-300/15 px-3 py-1 text-sm font-bold text-cyan-200">+{NIVELES[n].puntos}</span>
              </button>
            ))}
          </div>
        )}

        {v && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="tarjeta space-y-4 p-5">
            <div className="flex items-center justify-between text-sm text-suave">
              <span>{NIVELES[v.nivel].emoji} {NIVELES[v.nivel].etiqueta}</span>
              {!v.respondida && <span className={`font-mono text-lg font-bold ${restante <= 5 ? "text-red-300" : "text-cyan-200"}`}>{restante}s</span>}
            </div>
            {!v.respondida && <div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-cyan-300 transition-all duration-1000 ease-linear" style={{ width: `${(restante / v.segundos_total) * 100}%` }} /></div>}
            <p className="text-lg font-semibold">{v.pregunta}</p>
            <div className="grid gap-2">
              {v.opciones.map((o, i) => {
                const correcta = v.respondida && i === v.correcta;
                const mala = v.respondida && i === v.elegida && i !== v.correcta;
                return (
                  <button key={i} disabled={v.respondida || ocupado} onClick={() => responder(i)}
                    className={`btn justify-start text-left ${correcta ? "!border-emerald-400 !bg-emerald-400/20 text-emerald-100" : ""} ${mala ? "!border-red-400 !bg-red-400/15 text-red-200 line-through" : ""}`}>
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/10 text-xs">{"ABCD"[i]}</span>{o}
                  </button>
                );
              })}
            </div>

            {v.respondida && (
              <div className="space-y-3">
                <p className="rounded-xl bg-white/5 p-3">🎭 {v.evaluacion}</p>
                {v.explicacion && <p className="text-sm">{v.explicacion}</p>}
                {v.dato_curioso && <p className="text-sm text-suave">💡 Dato curioso: {v.dato_curioso}</p>}
                <p className="font-semibold">{v.acerto ? `+${v.puntos} punto(s) para tu ranking 🎉` : v.elegida == null ? "Se acabó el tiempo ⏳" : "Esta vez no sumó, ¡mañana hay otra!"}</p>
                <button onClick={compartir} className="btn btn-primario w-full"><Share2 size={16} />Compartir en WhatsApp</button>
              </div>
            )}
          </motion.div>
        )}
        {reiniciarBtn}
      </main>
    </>
  );
}
