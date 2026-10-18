'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Square, Play, Pause, Sliders, Volume2, Sparkles, Dices, Send, HeartCrack, Users, Crown, RefreshCw, CheckCircle2, Music2 } from 'lucide-react';
import confetti from 'canvas-confetti';

interface TarambanaProps {
  onAddScore: (points: number, reason: string) => void;
  usuarioId?: string;
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

// Melodías melódicas para que Arlequín les haga escuchar antes de tararear
const MELODIAS_ROCK: Record<string, { frecuencias: number[]; duraciones: number[]; letraGuia: string }> = {
  Crimen: {
    // C#4, E4, G#4, B4, A4, G#4, E4, F#4
    frecuencias: [277.18, 329.63, 415.30, 493.88, 440.0, 415.30, 329.63, 369.99],
    duraciones: [0.6, 0.4, 0.6, 0.8, 0.5, 0.5, 0.5, 1.2],
    letraGuia: "🎶 'La espera me agotó... no sé nada de vos... ¿de qué sirve la culpa? La culpa es una trampa...' 🎶",
  },
  Seminare: {
    // D4, F#4, A4, B4, A4, F#4, G4, E4, D4
    frecuencias: [293.66, 369.99, 440.0, 493.88, 440.0, 369.99, 392.0, 329.63, 293.66],
    duraciones: [0.6, 0.5, 0.5, 0.8, 0.5, 0.5, 0.6, 0.6, 1.2],
    letraGuia: "🎶 'Sigo esperando que te acuerdes de mí... que me lleves con vos donde sea...' 🎶",
  },
  Paloma: {
    // A3, C4, D4, E4, G4, E4, D4, C4
    frecuencias: [220.0, 261.63, 293.66, 329.63, 392.0, 329.63, 293.66, 261.63],
    duraciones: [0.5, 0.5, 0.5, 0.7, 0.8, 0.5, 0.5, 1.0],
    letraGuia: "🎶 'No me gusta que me digan qué tengo que hacer... mi corazón con plumas...' 🎶",
  },
  "Canción para mi muerte": {
    // C4, E4, G4, C5, B4, A4, G4, F4, E4
    frecuencias: [261.63, 329.63, 392.0, 523.25, 493.88, 440.0, 392.0, 349.23, 329.63],
    duraciones: [0.5, 0.5, 0.5, 0.8, 0.5, 0.5, 0.6, 0.6, 1.2],
    letraGuia: "🎶 'Hubo un tiempo que fue hermoso y fui libre de verdad... guardaba todos mis sueños...' 🎶",
  },
  "Tan Solo": {
    // E4, G4, A4, B4, A4, G4, E4, D4, E4
    frecuencias: [329.63, 392.0, 440.0, 493.88, 440.0, 392.0, 329.63, 293.66, 329.63],
    duraciones: [0.5, 0.5, 0.6, 0.8, 0.5, 0.5, 0.5, 0.5, 1.2],
    letraGuia: "🎶 'Y en esta soledad... qué linda noche para estar con vos...' 🎶",
  },
  "Seguir viviendo sin tu amor": {
    // D4, G4, A4, C5, B4, A4, G4, E4
    frecuencias: [293.66, 392.0, 440.0, 523.25, 493.88, 440.0, 392.0, 329.63],
    duraciones: [0.6, 0.5, 0.5, 0.8, 0.5, 0.5, 0.6, 1.2],
    letraGuia: "🎶 'Y hoy que enloquecido vuelvo buscando tu voz... nada es como antes sin tu amor...' 🎶",
  },
  "El amor después del amor": {
    // C4, F4, G4, A4, G4, F4, E4, F4
    frecuencias: [261.63, 349.23, 392.0, 440.0, 392.0, 349.23, 329.63, 349.23],
    duraciones: [0.5, 0.5, 0.6, 0.8, 0.5, 0.5, 0.6, 1.2],
    letraGuia: "🎶 'El amor después del amor tal vez... se parezca a este rayo de sol...' 🎶",
  },
  "Tratame suavemente": {
    // A3, C#4, E4, G#4, F#4, E4, C#4, B3
    frecuencias: [220.0, 277.18, 329.63, 415.30, 369.99, 329.63, 277.18, 246.94],
    duraciones: [0.6, 0.5, 0.5, 0.8, 0.6, 0.5, 0.5, 1.2],
    letraGuia: "🎶 'No quiero soñar mil veces las mismas cosas... tratame suavemente...' 🎶",
  },
};

export function LosTarambanaView({ onAddScore, usuarioId }: TarambanaProps) {
  const [sorteo, setSorteo] = useState<SorteoTarareo | null>(null);
  const [cargandoSorteo, setCargandoSorteo] = useState(true);
  const [sorteando, setSorteando] = useState(false);

  // Estados de la dinámica por pasos
  const [desafioAceptado, setDesafioAceptado] = useState(false);
  const [escuchandoMelodia, setEscuchandoMelodia] = useState(false);
  const [melodiaEscuchada, setMelodiaEscuchada] = useState(false);
  const [mostrarConsolaGrabacion, setMostrarConsolaGrabacion] = useState(false);
  const [tarareoGuardado, setTarareoGuardado] = useState(false);

  // Grabación y Audio
  const [grabando, setGrabando] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [reproduciendo, setReproduciendo] = useState(false);
  const [pitchSemitonos, setPitchSemitonos] = useState(5);
  const [tempoFactor, setTempoFactor] = useState(1.25);

  // Reloj de la ronda: NO EMPIEZA CON EL SORTEO. Solo se activa si la familia inicia la adivinanza
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
  const synthOscillatorsRef = useRef<OscillatorNode[]>([]);

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

  // Ejecutar nuevo sorteo por Arlequín:
  // REGLA CLAVE: NO DEBE EMPEZAR LA CUENTA REGRESIVA AL SORTEAR.
  const realizarSorteoArlequin = async () => {
    setSorteando(true);
    setResultadoAdivinanza(null);
    setPistaMitadLiberada(false);
    setAudioUrl(null);
    setDesafioAceptado(false);
    setEscuchandoMelodia(false);
    setMelodiaEscuchada(false);
    setMostrarConsolaGrabacion(false);
    setTarareoGuardado(false);
    setRondaEnCurso(false); // ¡CUENTA REGRESIVA DETENIDA!
    setTiempoRestante(40);

    try {
      const res = await fetch('/api/tarambana/sorteo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ juego: 'tarareo', forzarNuevo: true }),
      });
      const data = await res.json();
      if (data.sorteo) {
        setSorteo(data.sorteo);
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      }
    } catch {
      alert('No se pudo realizar el sorteo.');
    } finally {
      setSorteando(false);
    }
  };

  // Reproducir melodía con Arlequín usando Web Audio API
  const reproducirMelodiaArlequin = () => {
    if (escuchandoMelodia) {
      // Detener si estaba sonando
      synthOscillatorsRef.current.forEach((osc) => {
        try { osc.stop(); } catch {}
      });
      synthOscillatorsRef.current = [];
      setEscuchandoMelodia(false);
      return;
    }

    const temaTitulo = sorteo?.activos_sorteados.tema.titulo || 'Crimen';
    const config = MELODIAS_ROCK[temaTitulo] || MELODIAS_ROCK['Crimen'];

    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      audioContextRef.current = ctx;

      setEscuchandoMelodia(true);
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.25, ctx.currentTime);
      masterGain.connect(ctx.destination);

      let tiempoAcumulado = ctx.currentTime + 0.1;
      const oscs: OscillatorNode[] = [];

      config.frecuencias.forEach((freq, i) => {
        const dur = config.duraciones[i] || 0.5;

        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();

        osc.type = 'triangle'; // Tono melódico dulce de rock argentino
        osc.frequency.setValueAtTime(freq, tiempoAcumulado);

        // Envolvente de volumen (ataque rápido y caída suave)
        noteGain.gain.setValueAtTime(0, tiempoAcumulado);
        noteGain.gain.linearRampToValueAtTime(0.4, tiempoAcumulado + 0.05);
        noteGain.gain.exponentialRampToValueAtTime(0.001, tiempoAcumulado + dur);

        osc.connect(noteGain);
        noteGain.connect(masterGain);

        osc.start(tiempoAcumulado);
        osc.stop(tiempoAcumulado + dur);
        oscs.push(osc);

        tiempoAcumulado += dur;
      });

      synthOscillatorsRef.current = oscs;

      // Al terminar la melodía
      const duracionTotalMs = (tiempoAcumulado - ctx.currentTime) * 1000;
      setTimeout(() => {
        setEscuchandoMelodia(false);
        setMelodiaEscuchada(true);
      }, duracionTotalMs);

    } catch (err) {
      console.warn('Error al reproducir sintetizador de Arlequín:', err);
      setEscuchandoMelodia(false);
      setMelodiaEscuchada(true);
    }
  };

  // Temporizador de adivinanza (SOLO corre si la familia decide iniciar la ronda)
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

  // Iniciar la ronda de adivinanza formal (activar cronómetro)
  const iniciarRondaAdivinanza = () => {
    setTiempoRestante(40);
    setPistaMitadLiberada(false);
    setRondaEnCurso(true);
    confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
  };

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

  const confirmarTarareoParaElMuro = () => {
    setTarareoGuardado(true);
    confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
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
  const configMelodia = tema ? MELODIAS_ROCK[tema.titulo] || MELODIAS_ROCK['Crimen'] : null;

  return (
    <div className="space-y-6 pb-24 text-white">
      {/* 1. Cabecera del Juego con Sorteo de Arlequín */}
      <div className="relative overflow-hidden rounded-3xl border-2 border-[#FF007F] bg-gradient-to-br from-[#1b0520] via-[#0b0312] to-slate-950 p-6 shadow-[0_0_30px_rgba(255,0,127,0.3)]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-pink-500 to-cyan-400 text-black uppercase tracking-wider">
                SORTEO DE ARLEQUÍN • ROCK ARGENTINO
              </span>
              <span className="text-xs text-fuchsia-300 font-bold">Familia Chiacchios • Sin bots</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-fuchsia-200 to-cyan-200">
              Ronda de Tarareos y Sincericidio
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
              Arlequín sortea quiénes tararean y quiénes adivinan. A los elegidos <strong>les avisa directamente</strong> y <strong>les hace escuchar la música primero</strong> para que la tarareen una vez que acepten el desafío.
            </p>
          </div>

          <button
            onClick={realizarSorteoArlequin}
            disabled={sorteando}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-pink-500 via-fuchsia-600 to-cyan-400 text-white font-black text-xs tracking-wider shadow-[0_0_20px_rgba(255,0,127,0.5)] hover:scale-105 active:scale-95 disabled:opacity-50 transition flex items-center gap-2 shrink-0"
          >
            <Dices size={18} className={sorteando ? 'animate-spin' : ''} />
            <span>{sorteando ? 'SORTEANDO ROLES…' : '🎲 SORTEAR QUIÉNES CANTAN'}</span>
          </button>
        </div>

        {/* 2. AVISO DIRECTO DE ARLEQUÍN A LOS SORTEADOS */}
        {sorteo && (
          <div className="mt-5 p-4 rounded-2xl bg-gradient-to-r from-purple-950/90 to-fuchsia-950/90 border-2 border-fuchsia-500/60 shadow-xl space-y-3">
            <div className="flex items-start gap-3">
              <div className="h-12 w-12 rounded-2xl bg-fuchsia-500/20 border border-fuchsia-400 flex items-center justify-center text-3xl shrink-0 animate-bounce">
                🎭
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-pink-500 text-white uppercase tracking-wider">
                    AVISO DE ARLEQUÍN
                  </span>
                  <span className="text-xs text-amber-300 font-bold">Sin cuenta regresiva todavía</span>
                </div>
                <p className="text-sm sm:text-base font-black text-white leading-snug">
                  ¡Atención <span className="text-[#00F5D4]">{tarareadores.map(t => t.nombreMostrar).join(', ')}</span>! Les tocó a ustedes grabarlo hoy.
                </p>
                <p className="text-xs text-slate-300">
                  Acepten el desafío acá abajo para que Arlequín les haga escuchar la música primero antes de cantar.
                  {adivinadores.length > 0 && (
                    <span className="block mt-1 text-slate-400 italic">
                      (Adivinadores: {adivinadores.map(a => a.nombreMostrar).join(', ')}, esperen a que terminen de grabar).
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Botón para aceptar el desafío si aún no se aceptó */}
            {!desafioAceptado && (
              <div className="pt-2">
                <button
                  onClick={() => setDesafioAceptado(true)}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-amber-400 via-pink-500 to-cyan-400 text-black font-black text-xs tracking-wider shadow-[0_0_20px_rgba(255,0,127,0.5)] hover:scale-105 active:scale-95 transition flex items-center justify-center gap-2"
                >
                  <Crown size={16} />
                  <span>ACEPTAR DESAFÍO Y ESCUCHAR LA MÚSICA CON ARLEQUÍN 🎶</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Roles asignados */}
        {sorteo && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-cyan-400/40">
              <div className="flex items-center gap-1.5 text-cyan-300 text-xs font-black uppercase">
                <Mic size={15} />
                <span>ELEGIDOS PARA TARAREAR ({tarareadores.length})</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tarareadores.map((t) => (
                  <span key={t.id} className="px-2.5 py-1 rounded-lg bg-cyan-400/20 text-cyan-200 text-xs font-bold border border-cyan-400/30">
                    🎤 {t.nombreMostrar}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-fuchsia-400/40">
              <div className="flex items-center gap-1.5 text-pink-300 text-xs font-black uppercase">
                <Users size={15} />
                <span>ADIVINADORES ({adivinadores.length})</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {adivinadores.map((a) => (
                  <span key={a.id} className="px-2.5 py-1 rounded-lg bg-fuchsia-400/20 text-fuchsia-200 text-xs font-bold border border-fuchsia-400/30">
                    👂 {a.nombreMostrar}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. ARLEQUÍN HACE ESCUCHAR LA MÚSICA PRIMERO (UNA VEZ ACEPTADO EL DESAFÍO) */}
      <AnimatePresence>
        {desafioAceptado && tema && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative overflow-hidden rounded-3xl border-2 border-cyan-400 bg-gradient-to-br from-slate-950 via-cyan-950/50 to-slate-950 p-6 shadow-[0_0_35px_rgba(0,245,212,0.3)] space-y-5"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="h-14 w-14 rounded-2xl bg-cyan-400/20 border-2 border-cyan-400 flex items-center justify-center text-3xl shrink-0 shadow-lg">
                  🎭
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-cyan-400 text-black uppercase tracking-wider">
                      PASO 1 • ESCUCHAR LA MÚSICA
                    </span>
                    <span className="text-xs text-cyan-300 font-bold">Rock Argentino</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-white mt-1">
                    "{tema.titulo}" — <span className="text-cyan-300">{tema.artista}</span>
                  </h3>
                  <p className="text-xs text-slate-300">
                    Arlequín les hace escuchar la melodía para que la puedan tararear a su estilo.
                  </p>
                </div>
              </div>

              {/* Botón de reproducción de la melodía */}
              <button
                onClick={reproducirMelodiaArlequin}
                className={`px-6 py-3.5 rounded-2xl font-black text-xs tracking-wider flex items-center gap-2.5 transition shrink-0 shadow-lg ${
                  escuchandoMelodia
                    ? 'bg-rose-500 text-white animate-pulse'
                    : 'bg-gradient-to-r from-cyan-400 to-emerald-400 text-black hover:scale-105 active:scale-95'
                }`}
              >
                {escuchandoMelodia ? <Pause size={18} /> : <Play size={18} />}
                <span>{escuchandoMelodia ? 'PAUSAR MELODÍA' : '🎵 ESCUCHAR MELODÍA CON ARLEQUÍN 🎶'}</span>
              </button>
            </div>

            {/* Ecualizador de la música de Arlequín */}
            <div className="flex h-16 items-center justify-center gap-1.5 rounded-2xl border border-cyan-400/30 bg-slate-950 px-4">
              {Array.from({ length: 26 }).map((_, i) => (
                <motion.div
                  key={i}
                  animate={{
                    height: escuchandoMelodia ? [6, 12 + ((i * 7) % 28), 6] : 6,
                    backgroundColor: escuchandoMelodia ? '#00F5D4' : '#334155',
                  }}
                  transition={{
                    duration: 0.3 + (i % 4) * 0.08,
                    repeat: Infinity,
                    repeatType: 'reverse',
                  }}
                  className="w-2 rounded-full"
                />
              ))}
            </div>

            {/* Guía lírica y tarareable de Arlequín */}
            {configMelodia && (
              <div className="p-3.5 rounded-2xl bg-cyan-950/60 border border-cyan-400/30 text-xs text-cyan-200 text-center font-medium">
                <p className="font-black text-cyan-300 uppercase tracking-wider mb-1">Guía del Estribillo:</p>
                <p className="italic text-sm">{configMelodia.letraGuia}</p>
              </div>
            )}

            {/* Botón para avanzar a la grabación una vez escuchada */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/10">
              <span className="text-xs text-slate-300">
                {melodiaEscuchada
                  ? '✨ ¡Melodía escuchada! Ya están listos para cantar.'
                  : 'Tocá "Escuchar melodía" para repasar el tema antes de grabar.'}
              </span>

              <button
                onClick={() => setMostrarConsolaGrabacion(true)}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 via-fuchsia-600 to-purple-700 text-white font-black text-xs tracking-wider shadow-lg hover:scale-105 active:scale-95 transition flex items-center justify-center gap-2"
              >
                <Mic size={16} />
                <span>PASO 2 • EMPEZAR A GRABAR MI TARAREO (+25 PTS) 🎙️</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. ZONA DE GRABACIÓN DE TARAREOS CON VOZ DE ARDILLA */}
      <AnimatePresence>
        {mostrarConsolaGrabacion && tema && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="rounded-3xl border-2 border-[#4A0E4E] bg-slate-900/90 p-6 shadow-2xl space-y-6"
          >
            <div className="text-center space-y-1">
              <div className="flex items-center justify-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-pink-500 text-white uppercase tracking-wider">
                  GRABACIÓN ACTIVA
                </span>
                <span className="text-[10px] font-black tracking-widest text-[#00F5D4] uppercase">
                  TARAREO ARDILLA
                </span>
              </div>
              <h3 className="text-lg font-black text-white">
                Grabá tu tarareo de "{tema.titulo}" y dejalo listo para la familia
              </h3>
            </div>

            {/* Ecualizador reactivo del micrófono */}
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
                  <span>PARAR Y ESCUCHAR MODULADO</span>
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

            {/* Botón para confirmar y guardar el tarareo para la familia */}
            {audioUrl && !tarareoGuardado && (
              <div className="pt-2 text-center">
                <button
                  onClick={confirmarTarareoParaElMuro}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-400 to-cyan-400 text-black font-black text-xs tracking-wider shadow-[0_0_25px_rgba(16,185,129,0.4)] hover:scale-105 active:scale-95 transition flex items-center justify-center gap-2 mx-auto"
                >
                  <CheckCircle2 size={18} />
                  <span>DEJAR TARAREO GUARDADO PARA QUE LA FAMILIA ADIVINE 🚀</span>
                </button>
              </div>
            )}

            {tarareoGuardado && (
              <div className="p-4 rounded-2xl bg-emerald-950/70 border-2 border-emerald-400 text-emerald-200 text-center font-bold text-sm">
                ¡Tarareo ardilla guardado con éxito! 🎉 La pista ya está lista para que la familia adivine.
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. ZONA DE ADIVINANZA Y RELOJ DE RONDA (CONTROLADO) */}
      <div className="rounded-3xl border-2 border-amber-400/40 bg-slate-900/90 p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-black text-amber-300">
              <Volume2 size={20} />
              <span>ZONA DE ADIVINADORES • ¿QUÉ TEMA DE ROCK ES?</span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Escuchen el tarareo de los Tarambanas y arriesguen el tema.
            </p>
          </div>

          {!rondaEnCurso ? (
            <button
              onClick={iniciarRondaAdivinanza}
              className="px-5 py-2.5 rounded-xl bg-amber-400 text-black font-black text-xs tracking-wider hover:bg-amber-300 active:scale-95 transition shrink-0 shadow-lg"
            >
              ⏱️ ACTIVAR RELOJ DE ADIVINANZA (40s)
            </button>
          ) : (
            <div className="text-xs font-bold text-pink-400 animate-pulse">
              Tiempo restante: {tiempoRestante}s
            </div>
          )}
        </div>

        {/* Barra de progreso de la ronda de adivinanza */}
        {rondaEnCurso && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-cyan-300">Reloj de Adivinanza</span>
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

        {/* Pista liberada a mitad de camino */}
        <AnimatePresence>
          {pistaMitadLiberada && tema && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="p-4 rounded-2xl border border-pink-400 bg-pink-950/40 text-xs sm:text-sm text-pink-200 font-semibold space-y-1 shadow-lg"
            >
              <div className="flex items-center gap-1.5 text-pink-300 font-black uppercase text-[11px]">
                <span>🎭</span> Pista de Arlequín a mitad de ronda:
              </div>
              <p>"{tema.pista}"</p>
              <p className="text-amber-300 font-bold mt-1">💔 Drama: {tema.drama}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={verificarCancion} className="space-y-3">
          <input
            className="input w-full"
            placeholder="Escribí el nombre del tema (ej. Crimen, Seminare, Paloma, Tratame suavemente...)"
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

      {/* 6. MURO DE SINCERICIDIO ENTRE LOS INTEGRANTES REALES */}
      <div className="rounded-3xl border-2 border-fuchsia-500/40 bg-slate-900/90 p-6 shadow-xl space-y-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-black text-fuchsia-300 mb-1">
            <HeartCrack size={18} />
            <span>SINCERICIDIOS FAMILIARES SOBRE EL TEMA</span>
          </div>
          <p className="text-xs text-slate-300">
            {tema ? `En base a "${tema.titulo}": ${tema.drama}` : 'Confesiones dramáticas de la familia.'}
          </p>
        </div>

        <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
          {confesionesChat.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-4 text-center">
              Todavía nadie confesó su sincericidio sobre este tema. ¡Sé el primero en sincerarte!
            </p>
          ) : (
            confesionesChat.map((c, i) => (
              <div key={i} className="p-2.5 rounded-xl bg-slate-950 border border-fuchsia-500/20 text-xs">
                <span className="font-black text-pink-400">{c.autor}: </span>
                <span className="text-slate-200">{c.texto}</span>
              </div>
            ))
          )}
        </div>

        <form onSubmit={enviarConfesion} className="flex gap-2">
          <input
            className="input flex-1 text-xs"
            placeholder="Confesá tu sincericidio familiar con este tema…"
            value={miConfesion}
            onChange={(e) => setMiConfesion(e.target.value)}
          />
          <button className="btn btn-primario px-4 text-xs font-black">
            <Send size={14} />
          </button>
        </form>
      </div>
    </div>
  );
}
