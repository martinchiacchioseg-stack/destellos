'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Square, Play, Pause, Sliders, Volume2, Sparkles, Dices, Send, HeartCrack, Users, Crown, RefreshCw } from 'lucide-react';
import confetti from 'canvas-confetti';

interface TarambanaProps {
  onAddScore: (points: number, reason: string) => void;
}

interface Participante {
  id: string;
  nombre: string;
  apodo: string | null;
  nombreMostrar: string;
}

interface SorteoTarareo {
  id: string;
  activos_sorteados: {
    tarareadores: Participante[];
    adivinadores: Participante[];
    tema: {
      titulo: string;
      artista: string;
      pista: string;
      drama: string;
    };
  };
  mensaje_arlequin: string;
}

export function LosTarambanaView({ onAddScore }: TarambanaProps) {
  const [sorteo, setSorteo] = useState<SorteoTarareo | null>(null);
  const [cargandoSorteo, setCargandoSorteo] = useState(true);
  const [sorteando, setSorteando] = useState(false);

  // Grabación y Audio
  const [grabando, setGrabando] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [reproduciendo, setReproduciendo] = useState(false);
  const [pitchSemitonos, setPitchSemitonos] = useState(5);
  const [tempoFactor, setTempoFactor] = useState(1.25);

  // Mecánica a mitad de ronda
  const [segundosRonda] = useState(40);
  const [tiempoRestante, setTiempoRestante] = useState(40);
  const [rondaEnCurso, setRondaEnCurso] = useState(false);
  const [pistaMitadLiberada, setPistaMitadLiberada] = useState(false);

  // Adivinanzas y Sincericidios
  const [adivinanza, setAdivinanza] = useState('');
  const [miConfesion, setMiConfesion] = useState('');
  const [confesionesChat, setConfesionesChat] = useState<Array<{ autor: string; texto: string; hora: string }>>([]);
  const [resultadoAdivinanza, setResultadoAdivinanza] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);

  const cargarSorteo = useCallback(async () => {
    try {
      const res = await fetch('/api/tarambana/sorteo?juego=tarareo');
      const data = await res.json();
      if (data.sorteo) {
        setSorteo(data.sorteo);
      }
    } catch (err) {
      console.warn('Error al cargar sorteo de Arlequín:', err);
    } finally {
      setCargandoSorteo(false);
    }
  }, []);

  useEffect(() => {
    cargarSorteo();
  }, [cargarSorteo]);

  // Ejecutar nuevo sorteo por Arlequín
  const realizarSorteoArlequin = async () => {
    setSorteando(true);
    setResultadoAdivinanza(null);
    setPistaMitadLiberada(false);
    setAudioUrl(null);
    try {
      const res = await fetch('/api/tarambana/sorteo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ juego: 'tarareo', forzarNuevo: true }),
      });
      const data = await res.json();
      if (data.sorteo) {
        setSorteo(data.sorteo);
        setTiempoRestante(40);
        setRondaEnCurso(true);
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      }
    } catch {
      alert('No se pudo realizar el sorteo.');
    } finally {
      setSorteando(false);
    }
  };

  // Temporizador de la ronda: A MITAD DE CAMINO (segundo 20) Arlequín postea el tema dramático
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (rondaEnCurso && tiempoRestante > 0) {
      timer = setInterval(() => {
        setTiempoRestante((prev) => {
          const nuevo = prev - 1;
          if (nuevo <= segundosRonda / 2 && !pistaMitadLiberada) {
            setPistaMitadLiberada(true);
          }
          if (nuevo <= 0) {
            setRondaEnCurso(false);
          }
          return nuevo;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [rondaEnCurso, tiempoRestante, segundosRonda, pistaMitadLiberada]);

  // Grabación con micrófono
  const iniciarGrabacion = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        const arrayBuffer = await blob.arrayBuffer();
        const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        audioContextRef.current = ctx;
        audioBufferRef.current = await ctx.decodeAudioData(arrayBuffer);
      };

      mediaRecorder.start();
      setGrabando(true);
    } catch {
      alert('Por favor habilitá el micrófono para grabar el tarareo ardilla.');
    }
  };

  const detenerGrabacion = () => {
    if (mediaRecorderRef.current && grabando) {
      mediaRecorderRef.current.stop();
      setGrabando(false);
      onAddScore(25, 'Tarambanas: ¡Tarareo grabado y modulado (+25 pts)!');
    }
  };

  const reproducirModulado = () => {
    if (!audioBufferRef.current) return;

    if (reproduciendo) {
      audioSourceRef.current?.stop();
      setReproduciendo(false);
      return;
    }

    const ctx = audioContextRef.current || new AudioContext();
    audioContextRef.current = ctx;

    const source = ctx.createBufferSource();
    source.buffer = audioBufferRef.current;

    const pitchRatio = Math.pow(2, pitchSemitonos / 12);
    source.playbackRate.value = pitchRatio * (tempoFactor / 1.1);

    source.connect(ctx.destination);
    source.onended = () => setReproduciendo(false);
    source.start(0);

    audioSourceRef.current = source;
    setReproduciendo(true);
  };

  const verificarCancion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adivinanza.trim() || !sorteo) return;

    const cleanInput = adivinanza.toLowerCase().trim();
    const cleanTitulo = sorteo.activos_sorteados.tema.titulo.toLowerCase().trim();

    if (cleanInput.includes(cleanTitulo) || cleanTitulo.includes(cleanInput)) {
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      setResultadoAdivinanza(`¡ACERTASTE! 🎉 Era "${sorteo.activos_sorteados.tema.titulo}" de ${sorteo.activos_sorteados.tema.artista}.`);
      onAddScore(40, `Los Tarambana: ¡Adivinaste "${sorteo.activos_sorteados.tema.titulo}" (+40 pts)!`);
    } else {
      setResultadoAdivinanza(`¡Mmm no es esa! Escuchá el tarareo ardilla y leé la pista dramática de Arlequín 🎸`);
    }
  };

  const enviarConfesion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!miConfesion.trim()) return;

    setConfesionesChat((prev) => [
      ...prev,
      { autor: 'Vos', texto: miConfesion.trim(), hora: 'Recién' },
    ]);
    onAddScore(20, 'Sincericidio: ¡Confesión dramática compartida (+20 pts)!');
    setMiConfesion('');
  };

  const tema = sorteo?.activos_sorteados.tema;
  const tarareadores = sorteo?.activos_sorteados.tarareadores || [];
  const adivinadores = sorteo?.activos_sorteados.adivinadores || [];

  return (
    <div className="space-y-6 pb-24 text-white">
      {/* Cabecera del Juego con Sorteo de Arlequín */}
      <div className="relative overflow-hidden rounded-3xl border-2 border-[#FF007F] bg-gradient-to-br from-[#1b0520] via-[#0b0312] to-slate-950 p-6 shadow-[0_0_30px_rgba(255,0,127,0.3)]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-pink-500 to-cyan-400 text-black uppercase tracking-wider">
                SORTEO DE ARLEQUÍN • ROCK ARGENTINO
              </span>
              <span className="text-xs text-fuchsia-300 font-bold">Sin bots • Solo la familia</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-fuchsia-200 to-cyan-200">
              Ronda de Tarareos y Sincericidio
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
              Arlequín sortea roles entre los integrantes: a algunos les toca tararear y dejarlo grabado con voz de ardilla, y a la otra mitad adivinarlo. <strong>A mitad de ronda, Arlequín postea el tema dramático</strong> para el sincericidio familiar.
            </p>
          </div>

          <button
            onClick={realizarSorteoArlequin}
            disabled={sorteando}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-pink-500 via-fuchsia-600 to-cyan-400 text-white font-black text-xs tracking-wider shadow-[0_0_20px_rgba(255,0,127,0.5)] hover:scale-105 active:scale-95 disabled:opacity-50 transition flex items-center gap-2 shrink-0"
          >
            <Dices size={18} className={sorteando ? 'animate-spin' : ''} />
            <span>{sorteando ? 'SORTEANDO ROLES…' : '🎲 NUEVO SORTEO DE ARLEQUÍN'}</span>
          </button>
        </div>

        {/* Mensaje en vivo de Arlequín */}
        {sorteo?.mensaje_arlequin && (
          <div className="mt-4 p-3.5 rounded-2xl bg-purple-950/70 border border-fuchsia-400/40 text-xs sm:text-sm text-purple-200 font-semibold flex items-start gap-2.5 shadow-lg">
            <span className="text-xl">🎭</span>
            <p className="leading-relaxed">{sorteo.mensaje_arlequin}</p>
          </div>
        )}

        {/* División del sorteo entre integrantes reales */}
        {sorteo && (
          <div className="mt-5 pt-4 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-cyan-400/40">
              <div className="flex items-center gap-1.5 text-cyan-300 mb-1">
                <Mic size={16} />
                <span className="text-xs font-black uppercase tracking-wider">
                  LES TOCA TARAREAR ({tarareadores.length})
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tarareadores.map((t) => (
                  <span key={t.id} className="px-2.5 py-1 rounded-lg bg-cyan-400/20 text-cyan-200 text-xs font-bold border border-cyan-400/30">
                    🎤 {t.nombreMostrar}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 mt-2">Graban el estribillo con voz de ardilla y lo dejan guardado.</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-fuchsia-400/40">
              <div className="flex items-center gap-1.5 text-pink-300 mb-1">
                <Users size={16} />
                <span className="text-xs font-black uppercase tracking-wider">
                  LES TOCA ADIVINAR ({adivinadores.length})
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {adivinadores.map((a) => (
                  <span key={a.id} className="px-2.5 py-1 rounded-lg bg-fuchsia-400/20 text-fuchsia-200 text-xs font-bold border border-fuchsia-400/30">
                    👂 {a.nombreMostrar}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 mt-2">Escuchan el tarareo grabado y adivinan antes de que termine el tiempo.</p>
            </div>
          </div>
        )}

        {/* Barra de progreso de la ronda */}
        {rondaEnCurso && (
          <div className="mt-4 space-y-1.5">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-cyan-300">Tiempo de la Ronda</span>
              <span className={tiempoRestante <= 20 ? 'text-pink-400 animate-pulse font-black' : 'text-slate-300'}>
                {tiempoRestante}s restantes (A los 20s Arlequín postea el tema dramático)
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-950 overflow-hidden border border-white/10">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-pink-500 transition-all duration-1000"
                style={{ width: `${(tiempoRestante / segundosRonda) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* EVENTO CLAVE: ARLEQUÍN POSTEA EL TEMA DRAMÁTICO A MITAD DE RONDA */}
      <AnimatePresence>
        {pistaMitadLiberada && tema && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative overflow-hidden rounded-3xl border-2 border-pink-400 bg-gradient-to-r from-purple-950 via-rose-950 to-slate-950 p-6 shadow-[0_0_35px_rgba(244,63,94,0.4)]"
          >
            <div className="flex items-start gap-3.5">
              <div className="h-12 w-12 rounded-2xl bg-pink-500/20 border border-pink-400/50 flex items-center justify-center text-2xl shrink-0">
                🎭
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-pink-500 text-white uppercase tracking-wider animate-pulse">
                    ARLEQUÍN LIBERÓ EL TEMA A MITAD DE CAMINO
                  </span>
                  <span className="text-xs text-pink-300 font-bold">Rock Argentino</span>
                </div>
                <h3 className="text-xl font-black text-white">
                  Pista de Arlequín: "{tema.pista}"
                </h3>
                <p className="text-sm font-semibold text-rose-200 mt-1">
                  💔 <strong>Sincericidio de la canción:</strong> {tema.drama}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ZONA DE GRABACIÓN DE TARAREOS (PARA LOS QUE LES TOCÓ TARAREAR) */}
      <div className="rounded-3xl border-2 border-[#4A0E4E] bg-slate-900/90 p-6 shadow-2xl space-y-6">
        <div className="text-center space-y-1">
          <span className="text-[10px] font-black tracking-widest text-[#00F5D4] uppercase">ZONA DE TARAREO ARDILLA</span>
          <h3 className="text-lg font-black text-white">Grabá tu tarareo y dejalo listo para la familia</h3>
          {tema && (
            <p className="text-xs font-bold text-pink-300">
              Tema a tararear: "{tema.titulo}" — {tema.artista}
            </p>
          )}
        </div>

        {/* Ecualizador reactivo */}
        <div className="flex h-20 items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-slate-950 px-4 shadow-inner">
          {Array.from({ length: 24 }).map((_, i) => (
            <motion.div
              key={i}
              animate={{
                height: grabando || reproduciendo ? [8, 16 + (i % 5) * 10, 8] : 8,
                backgroundColor: grabando ? '#FF007F' : reproduciendo ? '#00F5D4' : '#4A0E4E',
              }}
              transition={{
                duration: 0.35 + (i % 3) * 0.1,
                repeat: Infinity,
                repeatType: 'reverse',
              }}
              className="w-2 rounded-full"
            />
          ))}
        </div>

        {/* Controles de grabación */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {!grabando ? (
            <button
              onClick={iniciarGrabacion}
              className="w-full sm:w-auto flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#FF007F] via-fuchsia-600 to-purple-700 px-8 py-3.5 font-black text-white shadow-[0_0_25px_rgba(255,0,127,0.4)] hover:scale-105 active:scale-95 transition"
            >
              <Mic size={22} />
              <span>GRABAR MI TARAREO (+25 PTS)</span>
            </button>
          ) : (
            <button
              onClick={detenerGrabacion}
              className="w-full sm:w-auto flex items-center justify-center gap-3 rounded-2xl bg-rose-600 px-8 py-3.5 font-black text-white shadow-[0_0_25px_rgba(225,29,72,0.6)] animate-pulse"
            >
              <Square size={22} />
              <span>PARAR Y DEJAR GRABADO</span>
            </button>
          )}

          {audioUrl && (
            <button
              onClick={reproducirModulado}
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl border-2 border-[#00F5D4] bg-[#00F5D4]/15 px-6 py-3 font-extrabold text-[#00F5D4] hover:bg-[#00F5D4]/25 transition"
            >
              {reproduciendo ? <Pause size={18} /> : <Play size={18} />}
              <span>ESCUCHAR CON VOZ DE ARDILLA (+{pitchSemitonos} semitonos)</span>
            </button>
          )}
        </div>

        {/* Sliders de modulación */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/5">
          <div className="space-y-1.5 p-3 rounded-2xl bg-slate-950/70 border border-white/5">
            <div className="flex justify-between text-xs text-slate-300 font-bold">
              <span>Tono Ardilla (Pitch):</span>
              <span className="text-[#FF007F]">+{pitchSemitonos} semitonos</span>
            </div>
            <input
              type="range"
              min="2"
              max="12"
              value={pitchSemitonos}
              onChange={(e) => setPitchSemitonos(Number(e.target.value))}
              className="w-full accent-[#FF007F]"
            />
          </div>

          <div className="space-y-1.5 p-3 rounded-2xl bg-slate-950/70 border border-white/5">
            <div className="flex justify-between text-xs text-slate-300 font-bold">
              <span>Velocidad (Tempo):</span>
              <span className="text-[#00F5D4]">{tempoFactor}x</span>
            </div>
            <input
              type="range"
              min="1.0"
              max="1.75"
              step="0.05"
              value={tempoFactor}
              onChange={(e) => setTempoFactor(Number(e.target.value))}
              className="w-full accent-[#00F5D4]"
            />
          </div>
        </div>
      </div>

      {/* ZONA DE ADIVINANZA Y MURO DE SINCERICIDIO (CERO BOTS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Adivinador */}
        <div className="rounded-3xl border-2 border-amber-400/40 bg-slate-900/90 p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2 text-sm font-black text-amber-300">
            <Volume2 size={20} />
            <span>¿QUÉ TEMA DE ROCK ES? (ZONA ADIVINADORES)</span>
          </div>
          <form onSubmit={verificarCancion} className="space-y-3">
            <input
              className="input w-full"
              placeholder="Ej. Crimen, Seminare, Paloma, Tratame suavemente..."
              value={adivinanza}
              onChange={(e) => setAdivinanza(e.target.value)}
            />
            <button className="btn btn-primario w-full font-black text-xs tracking-wider">
              ¡ARRIESGAR CANCIÓN (+40 PTS)! 🎸
            </button>
          </form>

          {resultadoAdivinanza && (
            <div className="p-3.5 rounded-2xl border border-cyan-400/40 bg-cyan-950/40 text-xs font-bold text-cyan-200">
              {resultadoAdivinanza}
            </div>
          )}
        </div>

        {/* Muro de Sincericidio entre los integrantes reales */}
        <div className="rounded-3xl border-2 border-fuchsia-500/40 bg-slate-900/90 p-6 shadow-xl space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-black text-fuchsia-300 mb-2">
              <HeartCrack size={18} />
              <span>SINCERICIDIOS FAMILIARES SOBRE EL TEMA</span>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {confesionesChat.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-4 text-center">
                  Todavía nadie se sinceró sobre este drama. ¡Sé el primero!
                </p>
              ) : (
                confesionesChat.map((c, i) => (
                  <div key={i} className="p-2.5 rounded-xl bg-slate-950/80 border border-white/5 text-xs space-y-0.5">
                    <div className="flex justify-between font-bold text-cyan-300 text-[11px]">
                      <span>{c.autor}</span>
                      <span className="text-slate-500">{c.hora}</span>
                    </div>
                    <p className="text-slate-200">{c.texto}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <form onSubmit={enviarConfesion} className="flex gap-2 pt-2 border-t border-white/5">
            <input
              className="input flex-1 text-xs"
              placeholder="Tu sincericidio familiar..."
              value={miConfesion}
              onChange={(e) => setMiConfesion(e.target.value)}
            />
            <button className="px-4 py-2 rounded-xl bg-pink-500 hover:bg-pink-400 text-white font-black text-xs transition">
              <Send size={14} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
