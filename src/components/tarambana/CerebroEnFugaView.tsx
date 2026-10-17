"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Clock, Award, ShieldAlert } from "lucide-react";
import confetti from "canvas-confetti";

interface CerebroProps {
  onAddScore: (points: number, reason: string) => void;
}

interface Pregunta {
  pregunta: string;
  opciones: string[];
  correcta: number;
  explicacion: string;
}

const PREGUNTAS_POR_NIVEL: Record<number, Pregunta[]> = {
  1: [
    {
      pregunta: "¿Qué animal es conocido como el mejor amigo del hombre?",
      opciones: ["Gato", "Perro", "Caballo", "Loro"],
      correcta: 1,
      explicacion: "El perro acompaña al ser humano desde hace más de 15.000 años.",
    },
  ],
  2: [
    {
      pregunta: "¿Cuál es el río más caudaloso del mundo?",
      opciones: ["Nilo", "Paraná", "Amazonas", "Misisipi"],
      correcta: 2,
      explicacion: "El Amazonas transporta más agua que el Nilo, el Yangtsé y el Misisipi juntos.",
    },
  ],
  3: [
    {
      pregunta: "¿En qué año se descifró la estructura en doble hélice del ADN?",
      opciones: ["1945", "1953", "1969", "1975"],
      correcta: 1,
      explicacion: "Watson y Crick publicaron su célebre artículo en Nature en 1953.",
    },
  ],
};

export function CerebroEnFugaView({ onAddScore }: CerebroProps) {
  const [nivel, setNivel] = useState<number | null>(null);
  const [preguntaActiva, setPreguntaActiva] = useState<Pregunta | null>(null);
  const [segundos, setSegundos] = useState(15);
  const [respondida, setRespondida] = useState(false);
  const [seleccionada, setSeleccionada] = useState<number | null>(null);
  const [mensaje, setMensaje] = useState("");

  const iniciarNivel = (n: number) => {
    setNivel(n);
    const tiempo = n === 1 ? 20 : n === 2 ? 15 : 10;
    setSegundos(tiempo);
    setPreguntaActiva(PREGUNTAS_POR_NIVEL[n][0]);
    setRespondida(false);
    setSeleccionada(null);
    setMensaje("");
  };

  // Timer regresivo con penalización si llega a cero
  useEffect(() => {
    if (!preguntaActiva || respondida) return;

    if (segundos <= 0) {
      setRespondida(true);
      setMensaje("¡TIEMPO AGOTADO! Penalización de -5 puntos ⏳🔥");
      onAddScore(-5, "Cerebro en Fuga: Tiempo agotado (-5 pts)");
      return;
    }

    const t = setInterval(() => setSegundos((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [segundos, preguntaActiva, respondida, onAddScore]);

  const responder = (idx: number) => {
    if (respondida || !preguntaActiva) return;
    setRespondida(true);
    setSeleccionada(idx);

    const acerto = idx === preguntaActiva.correcta;
    const basePuntos = nivel === 1 ? 15 : nivel === 2 ? 30 : 50;

    if (acerto) {
      confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 } });
      setMensaje(`¡RESPUESTA BRILLANTE! Sumaste +${basePuntos} puntos 🎉`);
      onAddScore(basePuntos, `Cerebro en Fuga (Nivel ${nivel}): Acierto`);
    } else {
      setMensaje("¡ERROR FATAL! Penalización de -10 puntos ❌");
      onAddScore(-10, `Cerebro en Fuga (Nivel ${nivel}): Error (-10 pts)`);
    }
  };

  return (
    <div className="space-y-6 pb-24 text-white">
      {/* Header temático Cerebro en Fuga */}
      <div className="rounded-2xl border-2 border-[#FB6107] bg-[#05112E] p-5 shadow-[0_0_24px_rgba(251,97,7,0.25)]">
        <div className="flex items-center gap-2">
          <Flame size={20} className="text-[#FB6107]" />
          <span className="text-xs font-black tracking-widest text-[#FB6107] uppercase">CEREBRO EN FUGA</span>
        </div>
        <h2 className="mt-1 text-2xl font-black">Trivia a contrarreloj</h2>
        <p className="text-sm text-neutral-300">
          Mayor nivel = más puntos, pero cuidado: equivocarse o agotar el tiempo resta puntos.
        </p>
      </div>

      {/* Selector de nivel 1, 2, 3 */}
      {!preguntaActiva ? (
        <div className="space-y-3">
          <p className="text-center text-xs font-bold tracking-widest text-neutral-400 uppercase">
            ELIGE LA DIFICULTAD
          </p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { lvl: 1, label: "Fácil", pts: "+15", color: "border-sky-400 text-sky-300" },
              { lvl: 2, label: "Medio", pts: "+30", color: "border-amber-400 text-amber-300" },
              { lvl: 3, label: "Extremo", pts: "+50", color: "border-red-500 text-red-400" },
            ].map((d) => (
              <button
                key={d.lvl}
                onClick={() => iniciarNivel(d.lvl)}
                className={`flex flex-col items-center justify-center rounded-2xl border-2 bg-[#0A2463] p-4 transition-all hover:scale-105 active:scale-95 ${d.color}`}
              >
                <span className="text-2xl font-black">NIVEL {d.lvl}</span>
                <span className="text-xs font-semibold text-neutral-300">{d.label}</span>
                <span className="mt-2 rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-black">
                  {d.pts} pts
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Reloj con animación 3D */}
          <div className="flex items-center justify-between rounded-xl border border-[#FB6107]/40 bg-[#0A2463] px-5 py-3">
            <span className="flex items-center gap-2 text-xs font-black text-[#FB6107]">
              <Clock size={16} /> TIEMPO RESTANTE
            </span>
            <motion.span
              key={segundos}
              initial={{ scale: 1.4, rotateX: 90 }}
              animate={{ scale: 1, rotateX: 0 }}
              className={`font-mono text-2xl font-black ${
                segundos <= 4 ? "text-red-400 animate-pulse" : "text-white"
              }`}
            >
              {segundos}s
            </motion.span>
          </div>

          {/* Pregunta */}
          <div className="rounded-2xl border-2 border-white/10 bg-[#0E2A72] p-6 shadow-xl">
            <p className="text-lg font-black text-white">{preguntaActiva.pregunta}</p>

            <div className="mt-4 grid gap-3">
              {preguntaActiva.opciones.map((opc, idx) => {
                const esCorrecta = respondida && idx === preguntaActiva.correcta;
                const esIncorrecta = respondida && idx === seleccionada && !esCorrecta;

                return (
                  <button
                    key={idx}
                    disabled={respondida}
                    onClick={() => responder(idx)}
                    className={`flex items-center gap-3 rounded-xl border-2 p-3.5 text-left font-bold transition-all ${
                      esCorrecta
                        ? "border-emerald-400 bg-emerald-500/20 text-emerald-300"
                        : esIncorrecta
                        ? "border-red-500 bg-red-500/20 text-red-300 line-through"
                        : "border-white/10 bg-[#05112E] text-white hover:border-[#FB6107] active:scale-98"
                    }`}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10 text-xs font-black">
                      {"ABCD"[idx]}
                    </span>
                    <span>{opc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Feedback y Explicación */}
          <AnimatePresence>
            {respondida && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2 rounded-2xl border border-white/20 bg-white/5 p-4 text-sm"
              >
                <p className="font-black text-amber-300">{mensaje}</p>
                <p className="text-neutral-300">{preguntaActiva.explicacion}</p>
                <button
                  onClick={() => setPreguntaActiva(null)}
                  className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-[#FB6107] px-4 py-2 font-black text-white"
                >
                  <Award size={16} /> OTRA PREGUNTA
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
