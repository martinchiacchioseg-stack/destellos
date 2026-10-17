"use client";

import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Mic, Square, Play, Pause, FastForward, Sliders, Volume2 } from "lucide-react";
import confetti from "canvas-confetti";

interface TarambanaProps {
  onAddScore: (points: number, reason: string) => void;
}

export function LosTarambanaView({ onAddScore }: TarambanaProps) {
  const [rol] = useState<"campeon" | "tarambana">("tarambana");
  const [grabando, setGrabando] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [reproduciendo, setReproduciendo] = useState(false);
  const [pitchSemitonos, setPitchSemitonos] = useState(5);
  const [tempoFactor, setTempoFactor] = useState(1.25);
  const [adivinanza, setAdivinanza] = useState("");
  const [resultado, setResultado] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);

  // Iniciar grabación de micrófono
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
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        // Decodificar para Web Audio API y modular pitch/tempo
        const arrayBuffer = await blob.arrayBuffer();
        const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        audioContextRef.current = ctx;
        audioBufferRef.current = await ctx.decodeAudioData(arrayBuffer);
      };

      mediaRecorder.start();
      setGrabando(true);
    } catch {
      alert("Permiso de micrófono requerido para cantar el tarareo.");
    }
  };

  const detenerGrabacion = () => {
    if (mediaRecorderRef.current && grabando) {
      mediaRecorderRef.current.stop();
      setGrabando(false);
      onAddScore(15, "Los Tarambana: ¡Tarareo grabado!");
    }
  };

  // Reproducción modulada con Web Audio API (playbackRate afecta pitch y tempo simultáneamente)
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

    // Modulación: Factor de pitch = 2^(semitonos/12)
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
    if (!adivinanza.trim()) return;

    const objetivo = "de musica ligera";
    if (adivinanza.toLowerCase().includes("musica ligera") || adivinanza.toLowerCase().includes("soda")) {
      confetti({ particleCount: 120, spread: 80 });
      setResultado("¡ACERTASTE, CAMPEÓN! Era 'De Música Ligera' 🎸✨");
      onAddScore(40, "Los Tarambana: ¡Canción adivinada!");
    } else {
      setResultado("¡Mmm no! Ese tarareo ardilla sigue siendo un misterio 😂");
    }
  };

  return (
    <div className="space-y-6 pb-24 text-white">
      {/* Header temático Tarambana */}
      <div className="rounded-2xl border-2 border-[#FF007F] bg-[#120216] p-5 shadow-[0_0_24px_rgba(255,0,127,0.2)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎵</span>
            <span className="text-xs font-black tracking-widest text-[#FF007F] uppercase">LOS TARAMBANA</span>
          </div>
          <span className="rounded-full bg-[#4A0E4E] px-3 py-1 text-xs font-black text-[#00F5D4]">
            ROL: {rol.toUpperCase()}
          </span>
        </div>
        <h2 className="mt-2 text-2xl font-black">Tararea, modula y desorienta</h2>
        <p className="text-sm text-neutral-300">
          Graba el estribillo tarareando. La modulación de pitch tipo ardilla (+5 semitonos) despistará al Campeón.
        </p>
      </div>

      {/* Ecualizador Visual Interactivo */}
      <div className="flex h-20 items-center justify-center gap-1.5 rounded-2xl border-2 border-[#4A0E4E] bg-[#120216] px-4 shadow-inner">
        {Array.from({ length: 24 }).map((_, i) => (
          <motion.div
            key={i}
            animate={{
              height: grabando || reproduciendo ? [8, 16 + (i % 5) * 10, 8] : 8,
              backgroundColor: grabando ? "#FF007F" : reproduciendo ? "#00F5D4" : "#4A0E4E",
            }}
            transition={{
              duration: 0.35 + (i % 3) * 0.1,
              repeat: Infinity,
              repeatType: "reverse",
            }}
            className="w-2 rounded-full"
          />
        ))}
      </div>

      {/* Controles de grabación */}
      <div className="flex flex-col items-center justify-center gap-3">
        {!grabando ? (
          <button
            onClick={iniciarGrabacion}
            className="flex items-center gap-3 rounded-full bg-gradient-to-r from-[#FF007F] to-[#4A0E4E] px-8 py-4 font-black text-white shadow-[0_0_25px_rgba(255,0,127,0.4)] transition-all hover:scale-105 active:scale-95"
          >
            <Mic size={24} />
            <span>GRABAR TARAREO</span>
          </button>
        ) : (
          <button
            onClick={detenerGrabacion}
            className="flex items-center gap-3 rounded-full bg-red-600 px-8 py-4 font-black text-white shadow-[0_0_25px_rgba(239,68,68,0.5)] animate-pulse"
          >
            <Square size={24} />
            <span>PARAR Y PROCESAR</span>
          </button>
        )}

        {audioUrl && (
          <button
            onClick={reproducirModulado}
            className="flex items-center gap-2 rounded-xl border-2 border-[#00F5D4] bg-[#00F5D4]/10 px-6 py-2.5 font-bold text-[#00F5D4] hover:bg-[#00F5D4]/20"
          >
            {reproduciendo ? <Pause size={18} /> : <Play size={18} />}
            <span>ESCUCHAR MODULADO ({pitchSemitonos > 0 ? `+${pitchSemitonos}` : pitchSemitonos} semitonos)</span>
          </button>
        )}
      </div>

      {/* Sliders de modulación */}
      <div className="space-y-4 rounded-2xl border border-white/10 bg-[#1E1E24] p-5">
        <div className="flex items-center gap-2 text-sm font-bold text-[#00F5D4]">
          <Sliders size={18} />
          <span>MODULACIÓN DE PITCH Y TEMPO</span>
        </div>

        <div>
          <div className="flex justify-between text-xs text-neutral-300">
            <span>Pitch (Tono Ardilla):</span>
            <span className="font-bold text-[#FF007F]">+{pitchSemitonos} semitonos</span>
          </div>
          <input
            type="range"
            min="1"
            max="12"
            value={pitchSemitonos}
            onChange={(e) => setPitchSemitonos(Number(e.target.value))}
            className="w-full accent-[#FF007F]"
          />
        </div>

        <div>
          <div className="flex justify-between text-xs text-neutral-300">
            <span>Velocidad (Tempo):</span>
            <span className="font-bold text-[#00F5D4]">{tempoFactor}x</span>
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

      {/* Adivinanza de la canción */}
      <form onSubmit={verificarCancion} className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-[#FFE600]">
          <Volume2 size={18} />
          <span>¿QUÉ CANCIÓN ES? (ZONA CAMPEÓN)</span>
        </div>
        <div className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="Escribe el nombre de la canción..."
            value={adivinanza}
            onChange={(e) => setAdivinanza(e.target.value)}
          />
          <button className="btn btn-primario px-5">
            <FastForward size={18} />
          </button>
        </div>
        {resultado && (
          <p className="rounded-xl border border-cyan-400/30 bg-cyan-950/30 p-3 text-sm font-bold text-[#00F5D4]">
            {resultado}
          </p>
        )}
      </form>
    </div>
  );
}
