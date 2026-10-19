'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit3, RotateCcw, Send, Sparkles, CheckCircle2, Dices, Users, RefreshCw, Shield, Lock } from 'lucide-react';
import confetti from 'canvas-confetti';

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
  const [yo, setYo] = useState<{ id: string; nombre: string; apodo: string | null } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dibujando, setDibujando] = useState(false);
  const [colorTrazo, setColorTrazo] = useState('#70E000'); // Verde Lima por defecto
  const [grosor, setGrosor] = useState(4);
  const [trazosCount, setTrazosCount] = useState(0);

  // Adivinanza
  const [intento, setIntento] = useState('');
  const [evaluando, setEvaluando] = useState(false);
  const [feedback, setFeedback] = useState<{ acerto: boolean; explicacion: string } | null>(null);

  useEffect(() => {
    fetch('/api/yo')
      .then((r) => r.json())
      .then((data) => {
        if (data?.sesion) {
          setYo({ id: data.sesion.id, nombre: data.sesion.nombre, apodo: data.sesion.apodo });
        }
      })
      .catch(() => {});
  }, []);

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

  const dibujantes = sorteo?.activos_sorteados.dibujantes || [];
  const adivinadores = sorteo?.activos_sorteados.adivinadores || [];
  const palabra = sorteo?.activos_sorteados.palabraSecreta || 'Mascara Veneciana';

  // Si no hay dibujantes cargados aún (modo de prueba), permitir dibujar
  const esDibujante = Boolean(
    !dibujantes.length || (yo && dibujantes.some((d) => d.id === yo.id))
  );

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
    if (!esDibujante) return;
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
    if (!dibujando || !esDibujante) return;
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
    if (!esDibujante) return;
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
              <span className="text-xs text-lime-300 font-bold">Roles estrictos por sorteo</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-lime-300 via-emerald-200 to-cyan-200">
              Pizarra Familiar de Trazo Loco
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
              Solo a quienes les toca <strong>dibujar</strong> pueden tocar la pizarra. Al resto de la familia le toca <strong>adivinar</strong> sin poder tocar el lienzo.
            </p>
          </div>

          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-lime-950/80 border border-lime-400/40 text-xs font-bold text-lime-200 shrink-0">
            {esDibujante ? (
              <span className="text-lime-300 flex items-center gap-1.5 font-black">
                ✏️ ¡HOY TE TOCA DIBUJAR A VOS!
              </span>
            ) : (
              <span className="text-cyan-300 flex items-center gap-1.5 font-black">
                <Lock size={14} /> MODO ADIVINADOR (Pizarra protegida)
              </span>
            )}
          </div>
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
            <div className={`p-4 rounded-2xl border ${esDibujante ? 'bg-lime-950/60 border-lime-400 shadow-lg' : 'bg-slate-950/80 border-lime-400/40'}`}>
              <div className="flex items-center gap-1.5 text-lime-300 mb-1">
                <Edit3 size={16} />
                <span className="text-xs font-black uppercase tracking-wider">
                  LES TOCA DIBUJAR ({dibujantes.length})
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {dibujantes.map((d) => (
                  <span key={d.id} className="px-2.5 py-1 rounded-lg bg-lime-400/20 text-lime-200 text-xs font-bold border border-lime-400/30">
                    ✏️ {d.nombreMostrar} {yo?.id === d.id ? '(Vos)' : ''}
                  </span>
                ))}
              </div>
              {esDibujante ? (
                <p className="text-xs text-lime-200 mt-2.5 font-bold bg-black/40 p-2 rounded-xl border border-lime-400/30">
                  🎨 Tu palabra secreta para dibujar: <strong className="text-white text-sm uppercase underline select-all">"{palabra}"</strong>
                </p>
              ) : (
                <p className="text-[11px] text-slate-400 mt-2">
                  ❓ Consigna secreta: <span className="font-mono text-slate-500">*** Oculta para adivinar ***</span>
                </p>
              )}
            </div>

            <div className={`p-4 rounded-2xl border ${!esDibujante ? 'bg-cyan-950/60 border-cyan-400 shadow-lg' : 'bg-slate-950/80 border-cyan-400/40'}`}>
              <div className="flex items-center gap-1.5 text-cyan-300 mb-1">
                <Users size={16} />
                <span className="text-xs font-black uppercase tracking-wider">
                  LES TOCA ADIVINAR ({adivinadores.length})
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {adivinadores.map((a) => (
                  <span key={a.id} className="px-2.5 py-1 rounded-lg bg-cyan-400/20 text-cyan-200 text-xs font-bold border border-cyan-400/30">
                    🧠 {a.nombreMostrar} {yo?.id === a.id ? '(Vos)' : ''}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-slate-300 mt-2">
                {esDibujante
                  ? 'Tus familiares están esperando tu dibujo para adivinar.'
                  : 'Escribí abajo lo que ves en la pizarra. ¡Arlequín valida con IA!'}
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
            <span className="text-xs text-slate-400">
              {esDibujante ? 'Dibujá con tu dedo o mouse' : 'Pizarra en vivo (solo lectura para adivinadores)'}
            </span>
          </div>

          {esDibujante && (
            <div className="flex items-center gap-2">
              {/* Paleta de colores */}
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
          )}
        </div>

        {/* Lienzo */}
        <div className="relative overflow-hidden rounded-2xl border-2 border-lime-400/30 bg-[#121212] shadow-inner touch-none flex justify-center">
          <canvas
            ref={canvasRef}
            width={640}
            height={380}
            onPointerDown={iniciarDibujo}
            onPointerMove={moverDibujo}
            onPointerUp={terminarDibujo}
            onPointerLeave={terminarDibujo}
            className={`w-full max-w-2xl h-72 sm:h-96 ${esDibujante ? 'cursor-crosshair' : 'pointer-events-none cursor-not-allowed select-none opacity-90'}`}
          />

          {/* Bloqueo estricto para los que les toca adivinar */}
          {!esDibujante && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex flex-col items-center justify-center p-4 text-center pointer-events-none">
              <div className="p-3.5 rounded-2xl bg-slate-900/95 border-2 border-cyan-400/60 shadow-2xl space-y-1.5 max-w-md">
                <span className="text-3xl">🛡️</span>
                <p className="text-xs font-black uppercase text-cyan-300 tracking-wide">
                  Pizarra Bloqueada • Modo Adivinador
                </p>
                <p className="text-xs text-slate-200">
                  Hoy les toca dibujar a: <strong>{dibujantes.map((d) => d.nombreMostrar).join(', ') || 'los integrantes sorteados'}</strong>.
                </p>
                <p className="text-[11px] text-slate-400">
                  Por las reglas del juego, los adivinadores no pueden tocar la pizarra. ¡Tu misión es mirar el dibujo y escribir tu respuesta abajo para sumar puntos!
                </p>
              </div>
            </div>
          )}
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
            placeholder={esDibujante ? "Los adivinadores escribirán acá sus respuestas..." : "¿Qué están dibujando? Escribí tu respuesta acá..."}
            value={intento}
            onChange={(e) => setIntento(e.target.value)}
            disabled={esDibujante}
          />
          <button
            type="submit"
            disabled={evaluando || !intento.trim() || esDibujante}
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
