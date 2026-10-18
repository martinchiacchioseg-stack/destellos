'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit3, RotateCcw, Send, Sparkles, CheckCircle2, Dices, Users, RefreshCw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { llamar } from '@/lib/cliente';

interface TrazoProps {
  onAddScore: (points: number, reason: string) => void;
}

interface Participante {
  id: string;
  nombre: string;
  apodo: string | null;
  nombreMostrar: string;
}

interface SorteoDibujo {
  id: string;
  activos_sorteados: {
    dibujantes: Participante[];
    adivinadores: Participante[];
    palabraSecreta: string;
  };
  mensaje_arlequin: string;
}

export function TrazoLocoView({ onAddScore }: TrazoProps) {
  const [sorteo, setSorteo] = useState<SorteoDibujo | null>(null);
  const [cargandoSorteo, setCargandoSorteo] = useState(true);
  const [sorteando, setSorteando] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dibujando, setDibujando] = useState(false);
  const [colorTrazo, setColorTrazo] = useState('#70E000'); // Verde Lima por defecto
  const [grosor, setGrosor] = useState(4);
  const [trazosCount, setTrazosCount] = useState(0);

  // Adivinanza
  const [intento, setIntento] = useState('');
  const [evaluando, setEvaluando] = useState(false);
  const [feedback, setFeedback] = useState<{ acerto: boolean; explicacion: string } | null>(null);

  const cargarSorteo = useCallback(async () => {
    try {
      const res = await fetch('/api/tarambana/sorteo?juego=dibujo');
      const data = await res.json();
      if (data.sorteo) {
        setSorteo(data.sorteo);
      }
    } catch (err) {
      console.warn('Error al cargar sorteo de dibujo:', err);
    } finally {
      setCargandoSorteo(false);
    }
  }, []);

  useEffect(() => {
    cargarSorteo();
  }, [cargarSorteo]);

  const realizarSorteo = async () => {
    setSorteando(true);
    setFeedback(null);
    limpiarCanvas();
    try {
      const res = await fetch('/api/tarambana/sorteo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ juego: 'dibujo', forzarNuevo: true }),
      });
      const data = await res.json();
      if (data.sorteo) {
        setSorteo(data.sorteo);
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      }
    } catch {
      alert('Error al realizar el sorteo.');
    } finally {
      setSorteando(false);
    }
  };

  // Inicializar canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#121212';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const iniciarDibujo = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = colorTrazo;
    ctx.lineWidth = grosor;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    setDibujando(true);
  };

  const moverDibujo = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dibujando) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    setTrazosCount((prev) => prev + 1);
  };

  const terminarDibujo = () => {
    if (dibujando) {
      setDibujando(false);
      if (trazosCount > 15) {
        onAddScore(25, 'Trazo Loco: ¡Dibujo completado en la pizarra (+25 pts)!');
      }
    }
  };

  const limpiarCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#121212';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setTrazosCount(0);
  };

  const validarIntento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!intento.trim() || !sorteo) return;

    setEvaluando(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/tarambana/semantica', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          palabraSecreta: sorteo.activos_sorteados.palabraSecreta,
          intento: intento.trim(),
        }),
      });
      const data = await res.json();

      setFeedback(data);
      if (data.acerto) {
        confetti({ particleCount: 100, spread: 75, origin: { y: 0.6 } });
        onAddScore(35, `Trazo Loco: ¡Acertaste "${sorteo.activos_sorteados.palabraSecreta}" (+35 pts)!`);
      }
    } catch {
      setFeedback({ acerto: false, explicacion: 'Error al evaluar con la IA.' });
    } finally {
      setEvaluando(false);
    }
  };

  const dibujantes = sorteo?.activos_sorteados.dibujantes || [];
  const adivinadores = sorteo?.activos_sorteados.adivinadores || [];
  const palabra = sorteo?.activos_sorteados.palabraSecreta || 'Mascara Veneciana';

  return (
    <div className="space-y-6 pb-24 text-white">
      {/* Cabecera con Sorteo de Dibujo por Arlequín */}
      <div className="relative overflow-hidden rounded-3xl border-2 border-lime-400/60 bg-gradient-to-br from-[#0c1f07] via-slate-950 to-[#070b16] p-6 shadow-[0_0_30px_rgba(112,224,0,0.25)]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-lime-400 text-black uppercase tracking-wider">
                TRAZO LOCO • PIZARRA EN VIVO
              </span>
              <span className="text-xs text-lime-300 font-bold">Por sorteo • Sin bots</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-lime-300 via-emerald-200 to-cyan-200">
              Pizarra Familiar de Trazo Loco
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
              Arlequín sortea: a dos o tres integrantes les toca <strong>dibujar la consigna</strong> en la pizarra táctil, y al resto de la familia adivinarla a contrarreloj.
            </p>
          </div>

          <button
            onClick={realizarSorteo}
            disabled={sorteando}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-lime-400 via-emerald-500 to-cyan-400 text-black font-black text-xs tracking-wider shadow-[0_0_20px_rgba(112,224,0,0.4)] hover:scale-105 active:scale-95 disabled:opacity-50 transition flex items-center gap-2 shrink-0"
          >
            <Dices size={18} className={sorteando ? 'animate-spin' : ''} />
            <span>{sorteando ? 'SORTEANDO…' : '🎨 NUEVO SORTEO DE ARLEQUÍN'}</span>
          </button>
        </div>

        {/* Mensaje de Arlequín */}
        {sorteo?.mensaje_arlequin && (
          <div className="mt-4 p-3.5 rounded-2xl bg-emerald-950/70 border border-lime-400/40 text-xs sm:text-sm text-emerald-200 font-semibold flex items-start gap-2.5 shadow-lg">
            <span className="text-xl">🎭</span>
            <p className="leading-relaxed">{sorteo.mensaje_arlequin}</p>
          </div>
        )}

        {/* División del sorteo */}
        {sorteo && (
          <div className="mt-5 pt-4 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-lime-400/40">
              <div className="flex items-center gap-1.5 text-lime-300 mb-1">
                <Edit3 size={16} />
                <span className="text-xs font-black uppercase tracking-wider">
                  LES TOCA DIBUJAR ({dibujantes.length})
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {dibujantes.map((d) => (
                  <span key={d.id} className="px-2.5 py-1 rounded-lg bg-lime-400/20 text-lime-200 text-xs font-bold border border-lime-400/30">
                    ✏️ {d.nombreMostrar}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                Consigna secreta para los dibujantes: <strong className="text-lime-300 font-black">"{palabra}"</strong>
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-cyan-400/40">
              <div className="flex items-center gap-1.5 text-cyan-300 mb-1">
                <Users size={16} />
                <span className="text-xs font-black uppercase tracking-wider">
                  LES TOCA ADIVINAR ({adivinadores.length})
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {adivinadores.map((a) => (
                  <span key={a.id} className="px-2.5 py-1 rounded-lg bg-cyan-400/20 text-cyan-200 text-xs font-bold border border-cyan-400/30">
                    🧠 {a.nombreMostrar}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                Escriban lo que ven en el lienzo. Arlequín valida con IA semántica.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Pizarra de Dibujo HTML5 Canvas */}
      <div className="rounded-3xl border-2 border-lime-400/40 bg-slate-900/90 p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-lime-300 uppercase">PIZARRA TÁCTIL</span>
            <span className="text-xs text-slate-400">Dibujá con el dedo o mouse</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Paleta rápida */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-white/10">
              {['#70E000', '#FF007F', '#00F5D4', '#FFE600', '#FFFFFF'].map((c) => (
                <button
                  key={c}
                  onClick={() => setColorTrazo(c)}
                  className={`w-6 h-6 rounded-lg transition ${colorTrazo === c ? 'scale-125 ring-2 ring-white' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>

            <button
              onClick={limpiarCanvas}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 flex items-center gap-1 transition"
            >
              <RotateCcw size={14} /> Limpiar
            </button>
          </div>
        </div>

        {/* Lienzo */}
        <div className="overflow-hidden rounded-2xl border-2 border-lime-400/30 bg-[#121212] shadow-inner touch-none flex justify-center">
          <canvas
            ref={canvasRef}
            width={640}
            height={380}
            onPointerDown={iniciarDibujo}
            onPointerMove={moverDibujo}
            onPointerUp={terminarDibujo}
            onPointerLeave={terminarDibujo}
            className="w-full max-w-2xl h-72 sm:h-96 cursor-crosshair"
          />
        </div>
      </div>

      {/* Panel de Adivinanza con Validación Semántica */}
      <div className="rounded-3xl border-2 border-cyan-400/40 bg-slate-900/90 p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-2 text-sm font-black text-cyan-300">
          <Sparkles size={18} />
          <span>ZONA DE ADIVINADORES • VALIDACIÓN INTELIGENTE CON ARLEQUÍN</span>
        </div>

        <form onSubmit={validarIntento} className="flex flex-col sm:flex-row gap-3">
          <input
            className="input flex-1 text-sm font-bold"
            placeholder="¿Qué están dibujando los chicos? Escribí acá..."
            value={intento}
            onChange={(e) => setIntento(e.target.value)}
          />
          <button
            type="submit"
            disabled={evaluando || !intento.trim()}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 disabled:opacity-40 text-black font-black text-xs tracking-wider shadow-lg hover:scale-105 active:scale-95 transition whitespace-nowrap"
          >
            {evaluando ? 'Arlequín evaluando…' : 'ADIVINAR (+35 PTS) 🚀'}
          </button>
        </form>

        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-2xl border flex items-start gap-3 ${
              feedback.acerto
                ? 'bg-emerald-950/80 border-emerald-400/50 text-emerald-300'
                : 'bg-rose-950/80 border-rose-400/50 text-rose-300'
            }`}
          >
            {feedback.acerto ? <CheckCircle2 size={20} className="shrink-0 mt-0.5" /> : <span className="text-xl">🤔</span>}
            <div>
              <p className="text-xs font-black uppercase">
                {feedback.acerto ? '¡ARLEQUÍN CONFIRMÓ EL ACIERTO!' : 'ARLEQUÍN DICE:'}
              </p>
              <p className="text-sm font-bold mt-0.5">{feedback.explicacion}</p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
