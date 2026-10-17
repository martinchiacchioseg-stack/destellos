"use client";

import React, { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Edit3, RotateCcw, Send, Sparkles, CheckCircle2 } from "lucide-react";
import confetti from "canvas-confetti";
import { llamar } from "@/lib/cliente";

interface TrazoProps {
  onAddScore: (points: number, reason: string) => void;
}

const PALABRAS = ["Mate", "Guitarra", "Perro", "Helado", "Avión", "Pelota", "Sol", "Castillo"];

export function TrazoLocoView({ onAddScore }: TrazoProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dibujando, setDibujando] = useState(false);
  const [palabraSecreta, setPalabraSecreta] = useState("Guitarra");
  const [intento, setIntento] = useState("");
  const [evaluando, setEvaluando] = useState(false);
  const [feedback, setFeedback] = useState<{ acerto: boolean; explicacion: string } | null>(null);
  const [trazosCount, setTrazosCount] = useState(0);

  // Inicializar canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#70E000";
    ctx.lineWidth = 4;
  }, []);

  const empezarTrazo = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setDibujando(true);
  };

  const moverTrazo = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dibujando) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const terminarTrazo = () => {
    if (dibujando) {
      setDibujando(false);
      setTrazosCount((c) => c + 1);
    }
  };

  const limpiarPizarra = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setTrazosCount(0);
    setFeedback(null);
  };

  const cambiarPalabra = () => {
    const random = PALABRAS[Math.floor(Math.random() * PALABRAS.length)];
    setPalabraSecreta(random);
    limpiarPizarra();
  };

  const validarAdivinanza = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!intento.trim() || evaluando) return;

    setEvaluando(true);
    setFeedback(null);

    try {
      const res = await llamar<{ acerto: boolean; similitud: number; explicacion: string }>(
        "/api/tarambana/semantica",
        {
          body: { palabraSecreta, intento },
        }
      );

      setFeedback(res);

      if (res.acerto) {
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
        onAddScore(35, `Trazo Loco: ¡Adivinaste "${palabraSecreta}"!`);
      }
    } catch {
      // Fallback local
      const coincide = intento.trim().toLowerCase() === palabraSecreta.toLowerCase();
      setFeedback({
        acerto: coincide,
        explicacion: coincide ? "¡Acierto exacto!" : "No coincide con el dibujo.",
      });
      if (coincide) onAddScore(35, "Trazo Loco: Acierto");
    } finally {
      setEvaluando(false);
    }
  };

  return (
    <div className="space-y-6 pb-24 text-white">
      {/* Header temático Trazo Loco */}
      <div className="rounded-2xl border-2 border-[#70E000] bg-[#121212] p-5 shadow-[0_0_24px_rgba(112,224,0,0.2)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Edit3 size={20} className="text-[#70E000]" />
            <span className="text-xs font-black tracking-widest text-[#70E000] uppercase">TRAZO LOCO</span>
          </div>
          <button
            onClick={cambiarPalabra}
            className="rounded-full border border-[#70E000]/40 bg-[#70E000]/10 px-3 py-1 text-xs font-bold text-[#70E000] hover:bg-[#70E000]/20"
          >
            NUEVA PALABRA
          </button>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-xs text-neutral-400">Palabra secreta a dibujar:</span>
          <span className="text-xl font-black text-[#70E000] uppercase underline">{palabraSecreta}</span>
        </div>
      </div>

      {/* Pizarra Táctil interactiva */}
      <div className="relative mx-auto aspect-4/3 w-full max-w-md overflow-hidden rounded-3xl border-3 border-[#70E000] bg-[#121212] shadow-2xl touch-none">
        <canvas
          ref={canvasRef}
          width={400}
          height={300}
          onPointerDown={empezarTrazo}
          onPointerMove={moverTrazo}
          onPointerUp={terminarTrazo}
          className="h-full w-full cursor-crosshair"
        />

        {trazosCount === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs font-semibold text-neutral-600">
            Dibuja aquí con tu dedo o mouse
          </div>
        )}

        <button
          onClick={limpiarPizarra}
          className="absolute top-3 right-3 flex items-center gap-1.5 rounded-xl border border-white/10 bg-neutral-900/80 px-3 py-1.5 text-xs font-bold text-neutral-300 hover:text-white"
        >
          <RotateCcw size={14} /> Limpiar
        </button>
      </div>

      {/* Zona de adivinanza con validación semántica */}
      <form onSubmit={validarAdivinanza} className="space-y-3">
        <label className="block text-xs font-black tracking-wider text-[#70E000] uppercase">
          ZONA DE ADIVINADORES (VALIDACIÓN SEMÁNTICA POR IA)
        </label>
        <div className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="¿Qué creés que representa este dibujo?..."
            value={intento}
            onChange={(e) => setIntento(e.target.value)}
          />
          <button className="btn btn-primario px-5" disabled={evaluando}>
            <Send size={18} />
          </button>
        </div>

        <AnimatePresence>
          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-start gap-3 rounded-2xl border p-4 text-sm ${
                feedback.acerto
                  ? "border-emerald-500/40 bg-emerald-950/20 text-emerald-300"
                  : "border-red-500/30 bg-red-950/20 text-red-300"
              }`}
            >
              {feedback.acerto ? <CheckCircle2 size={20} /> : <Sparkles size={20} />}
              <div>
                <p className="font-black">{feedback.acerto ? "¡ADIVINASTE!" : "RESPUESTA INCORRECTA"}</p>
                <p className="text-xs text-neutral-300">{feedback.explicacion}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </div>
  );
}
