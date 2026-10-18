'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Square, Play, Pause, Sliders, Volume2, Sparkles, Dices, Send, AlertCircle, HeartCrack } from 'lucide-react';
import confetti from 'canvas-confetti';

interface TarambanaProps {
  onAddScore: (points: number, reason: string) => void;
}

interface TemaRockArgentino {
  id: string;
  titulo: string;
  artista: string;
  anio: number;
  dramaSincericidio: string;
  pistaMitad: string;
}

const TEMAS_ROCK_ARGENTINO: TemaRockArgentino[] = [
  {
    id: 'crimen',
    titulo: 'Crimen',
    artista: 'Gustavo Cerati',
    anio: 2006,
    dramaSincericidio: '¿La espera te agotó? Confesá ese sincericidio amoroso que nunca le dijiste en la cara a tu ex.',
    pistaMitad: 'Himno de desamor del 2006 de Gustavo Cerati: "La espera me agotó, no sé nada de vos..."',
  },
  {
    id: 'seminare',
    titulo: 'Seminare',
    artista: 'Serú Girán (Charly García)',
    anio: 1978,
    dramaSincericidio: '¿A quién seguís esperando bajo la lluvia sin que se acuerde de vos? Contá un papelón romántico.',
    pistaMitad: 'Clásico supremo de Charly y David Lebón: "Sigo esperando que te acuerdes de mí..."',
  },
  {
    id: 'paloma',
    titulo: 'Paloma',
    artista: 'Andrés Calamaro',
    anio: 1999,
    dramaSincericidio: 'Sinceridad brutal: ¿cuándo te diste cuenta de que tenías que mandar todo al diablo?',
    pistaMitad: 'Honestidad brutal de 1999: "No me gusta que me digan qué tengo que hacer..."',
  },
  {
    id: 'cancion_muerte',
    titulo: 'Canción para mi muerte',
    artista: 'Sui Generis',
    anio: 1972,
    dramaSincericidio: '¿Qué recuerdo de tu juventud te da ternura y vergüenza confesarle a la familia?',
    pistaMitad: 'Pista poética fundacional: "Hubo un tiempo que fue hermoso y fui libre de verdad..."',
  },
  {
    id: 'tan_solo',
    titulo: 'Tan Solo',
    artista: 'Los Piojos',
    anio: 1992,
    dramaSincericidio: 'En la soledad de la noche... ¿a quién de la familia le ocultaste una macana?',
    pistaMitad: 'Himno stone-piojoso de 1992: "Y en esta soledad... ¿a quién extrañás confesarle algo?"',
  },
  {
    id: 'seguir_viviendo',
    titulo: 'Seguir viviendo sin tu amor',
    artista: 'Luis Alberto Spinetta',
    anio: 1991,
    dramaSincericidio: '¿Qué locura o arrepentimiento hiciste por pasión que juraste jamás volver a cometer?',
    pistaMitad: 'Joya eterna del Flaco Spinetta: "Y hoy que enloquecido vuelvo buscando tu voz..."',
  },
  {
    id: 'amor_despues',
    titulo: 'El amor después del amor',
    artista: 'Fito Páez',
    anio: 1992,
    dramaSincericidio: 'El desahogo sincero del corazón roto: ¿alguna vez te enamoraste de la persona equivocada?',
    pistaMitad: 'El disco más vendido del rock nacional: "El amor después del amor, tal vez se parezca a este rayo..."',
  },
  {
    id: 'tratame_suavemente',
    titulo: 'Tratame suavemente',
    artista: 'Soda Stereo',
    anio: 1984,
    dramaSincericidio: '¿Quién en esta familia te trata con más firmeza y te gustaría que te trate suavemente?',
    pistaMitad: 'Balada de Daniel Melero inmortalizada por Soda: "No quiero soñar mil veces las mismas cosas..."',
  },
];

export function LosTarambanaView({ onAddScore }: TarambanaProps) {
  // Sorteo de Turno y Tema
  const [sorteando, setSorteando] = useState(false);
  const [temaSorteado, setTemaSorteado] = useState<TemaRockArgentino>(TEMAS_ROCK_ARGENTINO[0]);
  const [rol, setRol] = useState<'tarambana' | 'campeon'>('tarambana');
  const [tarambanaNombre, setTarambanaNombre] = useState('Nico (Chacho)');

  // Grabación y Audio
  const [grabando, setGrabando] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [reproduciendo, setReproduciendo] = useState(false);
  const [pitchSemitonos, setPitchSemitonos] = useState(5);
  const [tempoFactor, setTempoFactor] = useState(1.25);

  // Mecánica a mitad de ronda
  const [segundosRonda, setSegundosRonda] = useState(40);
  const [tiempoRestante, setTiempoRestante] = useState(40);
  const [rondaEnCurso, setRondaEnCurso] = useState(false);
  const [pistaMitadLiberada, setPistaMitadLiberada] = useState(false);

  // Adivinanzas y Sincericidios
  const [adivinanza, setAdivinanza] = useState('');
  const [miConfesion, setMiConfesion] = useState('');
  const [confesionesChat, setConfesionesChat] = useState<Array<{ autor: string; texto: string; hora: string }>>([
    {
      autor: 'Yasmin (Tati)',
      texto: '¡Seguro es Cerati! Esa intro desgarradora me suena a puro drama.',
      hora: 'Recién',
    },
  ]);
  const [resultadoAdivinanza, setResultadoAdivinanza] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);

  // Sorteo de rol y tema dramático
  const sortearRonda = () => {
    setSorteando(true);
    setResultadoAdivinanza(null);
    setPistaMitadLiberada(false);
    setAudioUrl(null);

    const nombres = ['Martin (papa)', 'Yasmin (Tati)', 'Claudio (Mencha)', 'Nicolás (Chacho)', 'Loli'];
    let iter = 0;
    const interval = setInterval(() => {
      const idx = Math.floor(Math.random() * TEMAS_ROCK_ARGENTINO.length);
      setTemaSorteado(TEMAS_ROCK_ARGENTINO[idx]);
      setTarambanaNombre(nombres[Math.floor(Math.random() * nombres.length)]);
      iter++;
      if (iter > 12) {
        clearInterval(interval);
        setSorteando(false);
        setTiempoRestante(40);
        setRondaEnCurso(true);
      }
    }, 100);
  };

  // Temporizador de la ronda para liberar la pista a mitad
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (rondaEnCurso && tiempoRestante > 0) {
      timer = setInterval(() => {
        setTiempoRestante((prev) => {
          const nuevo = prev - 1;
          // A MITAD EXACTA (segundo 20 de 40): Postear tema dramático de Rock Argentino
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
      alert('Permiso de micrófono requerido para tararear.');
    }
  };

  const detenerGrabacion = () => {
    if (mediaRecorderRef.current && grabando) {
      mediaRecorderRef.current.stop();
      setGrabando(false);
      onAddScore(20, 'Tarambanas: ¡Tarareo ardilla grabado!');
    }
  };

  // Reproducción modulada
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

  // Enviar adivinanza
  const verificarCancion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adivinanza.trim()) return;

    const cleanInput = adivinanza.toLowerCase().trim();
    const cleanTitulo = temaSorteado.titulo.toLowerCase().trim();
    const cleanArtista = temaSorteado.artista.toLowerCase().trim();

    if (cleanInput.includes(cleanTitulo) || cleanTitulo.includes(cleanInput)) {
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      setResultadoAdivinanza(`¡ACERTASTE, CAMPEÓN! 🎉 Era "${temaSorteado.titulo}" de ${temaSorteado.artista}.`);
      onAddScore(40, `Los Tarambana: ¡Adivinaste "${temaSorteado.titulo}"!`);
    } else {
      setResultadoAdivinanza(`¡Mmm no es esa! Escuchá bien el tarareo y leé la pista dramática a mitad de ronda 🎸`);
    }
  };

  // Enviar confesión / sincericidio al chat
  const enviarConfesion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!miConfesion.trim()) return;

    setConfesionesChat((prev) => [
      ...prev,
      { autor: 'Vos', texto: miConfesion.trim(), hora: 'Recién' },
    ]);
    onAddScore(15, 'Sincericidio: ¡Confesión dramática compartida!');
    setMiConfesion('');
  };

  return (
    <div className="space-y-6 pb-24 text-white">
      {/* Banner SINCERICIDIO & LOS TARAMBANA */}
      <div className="relative overflow-hidden rounded-3xl border-2 border-[#FF007F] bg-gradient-to-br from-[#1b0520] via-[#0b0312] to-slate-950 p-6 shadow-[0_0_30px_rgba(255,0,127,0.3)]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-pink-500 to-cyan-400 text-black uppercase tracking-wider">
                ROCK ARGENTINO • DRAMA Y SINCERICIDIO
              </span>
              <span className="text-xs text-fuchsia-300 font-bold">Por sorteo</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-fuchsia-200 to-cyan-200 drop-shadow">
              Los Tarambanas del Rock
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
              Se sortea un tema clásico de Rock Nacional con drama. El Tarambana tararea como ardilla, y <strong>a mitad de ronda se postea el tema dramático</strong> para que la familia se sincere y adivine.
            </p>
          </div>

          <button
            onClick={sortearRonda}
            disabled={sorteando}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-pink-500 via-fuchsia-600 to-cyan-400 text-white font-black text-xs tracking-wider shadow-[0_0_20px_rgba(255,0,127,0.5)] hover:scale-105 active:scale-95 disabled:opacity-50 transition flex items-center gap-2 shrink-0"
          >
            <Dices size={18} className={sorteando ? 'animate-spin' : ''} />
            <span>{sorteando ? 'SORTEANDO…' : '🎲 SORTEAR RONDA'}</span>
          </button>
        </div>

        {/* Tarjeta del Tema Sorteado */}
        <div className="mt-5 pt-4 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-fuchsia-500/30">
            <span className="text-[10px] font-black uppercase text-cyan-300 tracking-wider">TARAMBANA SORTEADO</span>
            <p className="text-lg font-black text-white mt-0.5">{tarambanaNombre}</p>
            <p className="text-xs text-slate-400">Le toca tararear el estribillo sin decir la letra.</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/80 border border-fuchsia-500/30">
            <span className="text-[10px] font-black uppercase text-pink-400 tracking-wider">TEMA ASIGNADO (ROCK ARGENTINO)</span>
            <p className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-300 to-amber-200 mt-0.5">
              "{temaSorteado.titulo}" — {temaSorteado.artista} ({temaSorteado.anio})
            </p>
            <p className="text-xs text-slate-400">Solo visible para el grupo en sala privada.</p>
          </div>
        </div>

        {/* Barra de progreso de la ronda y aviso de MITAD DE CAMINO */}
        {rondaEnCurso && (
          <div className="mt-4 space-y-1.5">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-cyan-300">Tiempo de la Ronda</span>
              <span className={tiempoRestante <= 20 ? 'text-pink-400 animate-pulse font-black' : 'text-slate-300'}>
                {tiempoRestante}s restantes (A los 20s se libera el drama)
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

      {/* EVENTO CLAVE: PISTA Y DRAMA DE SINCERICIDIO A MITAD DE RONDA */}
      <AnimatePresence>
        {pistaMitadLiberada && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative overflow-hidden rounded-3xl border-2 border-pink-400 bg-gradient-to-r from-purple-950 via-rose-950 to-slate-950 p-6 shadow-[0_0_35px_rgba(244,63,94,0.4)]"
          >
            <div className="flex items-start gap-3.5">
              <div className="h-12 w-12 rounded-2xl bg-pink-500/20 border border-pink-400/50 flex items-center justify-center text-2xl shrink-0">
                💔
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-pink-500 text-white uppercase tracking-wider animate-pulse">
                    ¡POSTEO A MITAD DE RONDA!
                  </span>
                  <span className="text-xs text-pink-300 font-bold">Momento Sincericidio</span>
                </div>
                <h3 className="text-xl font-black text-white">
                  Pista de Rock Nacional: {temaSorteado.pistaMitad}
                </h3>
                <p className="text-sm font-semibold text-rose-200 mt-1">
                  🔥 <strong>Desafío de Sincericidio:</strong> {temaSorteado.dramaSincericidio}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ecualizador Visual Interactivo y Grabador */}
      <div className="rounded-3xl border-2 border-[#4A0E4E] bg-slate-900/90 p-6 shadow-2xl space-y-6">
        <div className="text-center space-y-1">
          <span className="text-[10px] font-black tracking-widest text-[#00F5D4] uppercase">ZONA DE AUDIO ARDILLA</span>
          <h3 className="text-lg font-black text-white">Grabación de Tarareo y Modulación</h3>
        </div>

        {/* Barras reactivas */}
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

        {/* Botones de Grabación */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {!grabando ? (
            <button
              onClick={iniciarGrabacion}
              className="w-full sm:w-auto flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#FF007F] via-fuchsia-600 to-purple-700 px-8 py-3.5 font-black text-white shadow-[0_0_25px_rgba(255,0,127,0.4)] hover:scale-105 active:scale-95 transition"
            >
              <Mic size={22} />
              <span>GRABAR ESTRIBILLO TARAREADO</span>
            </button>
          ) : (
            <button
              onClick={detenerGrabacion}
              className="w-full sm:w-auto flex items-center justify-center gap-3 rounded-2xl bg-rose-600 px-8 py-3.5 font-black text-white shadow-[0_0_25px_rgba(225,29,72,0.6)] animate-pulse"
            >
              <Square size={22} />
              <span>PARAR Y PROCESAR ARDILLA</span>
            </button>
          )}

          {audioUrl && (
            <button
              onClick={reproducirModulado}
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl border-2 border-[#00F5D4] bg-[#00F5D4]/15 px-6 py-3 font-extrabold text-[#00F5D4] hover:bg-[#00F5D4]/25 transition"
            >
              {reproduciendo ? <Pause size={18} /> : <Play size={18} />}
              <span>ESCUCHAR CON VOZ DE ARDILLA ({pitchSemitonos > 0 ? `+${pitchSemitonos}` : pitchSemitonos} semitonos)</span>
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

      {/* ZONA DE ADIVINANZA Y CONFESIONES DE SINCERICIDIO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Panel Adivinador */}
        <div className="rounded-3xl border-2 border-amber-400/40 bg-slate-900/90 p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2 text-sm font-black text-amber-300">
            <Volume2 size={20} />
            <span>¿QUÉ TEMA DE ROCK ES? (ZONA CAMPEONES)</span>
          </div>
          <form onSubmit={verificarCancion} className="space-y-3">
            <input
              className="input w-full"
              placeholder="Ej. Crimen, Seminare, Paloma..."
              value={adivinanza}
              onChange={(e) => setAdivinanza(e.target.value)}
            />
            <button className="btn btn-primario w-full font-black text-xs tracking-wider">
              ¡ARRIESGAR CANCIÓN! 🎸
            </button>
          </form>

          {resultadoAdivinanza && (
            <div className="p-3.5 rounded-2xl border border-cyan-400/40 bg-cyan-950/40 text-xs font-bold text-cyan-200">
              {resultadoAdivinanza}
            </div>
          )}
        </div>

        {/* Panel de Confesiones de Sincericidio en vivo */}
        <div className="rounded-3xl border-2 border-fuchsia-500/40 bg-slate-900/90 p-6 shadow-xl space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-black text-fuchsia-300 mb-2">
              <HeartCrack size={18} />
              <span>MURO DE SINCERICIDIO DEL TEMA</span>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {confesionesChat.map((c, i) => (
                <div key={i} className="p-2.5 rounded-xl bg-slate-950/80 border border-white/5 text-xs space-y-0.5">
                  <div className="flex justify-between font-bold text-cyan-300 text-[11px]">
                    <span>{c.autor}</span>
                    <span className="text-slate-500">{c.hora}</span>
                  </div>
                  <p className="text-slate-200">{c.texto}</p>
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={enviarConfesion} className="flex gap-2 pt-2 border-t border-white/5">
            <input
              className="input flex-1 text-xs"
              placeholder="Tu sincericidio sobre este tema o drama..."
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
