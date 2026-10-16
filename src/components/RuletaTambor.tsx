'use client';

import { useState, useRef, useEffect } from 'react';
import { Sparkles, Volume2, VolumeX, Flame, ShieldAlert, RotateCw } from 'lucide-react';
import { dispararConfeti } from './ConfettiCelebration';

interface RuletaTamborProps {
  onGirarCompleto: (esBala: boolean, recamara: number) => void;
  deshabilitado?: boolean;
}

export default function RuletaTambor({ onGirarCompleto, deshabilitado = false }: RuletaTamborProps) {
  const [girando, setGirando] = useState(false);
  const [rotacionActual, setRotacionActual] = useState(0);
  const [recamaraSeleccionada, setRecamaraSeleccionada] = useState<number | null>(null);
  const [esBala, setEsBala] = useState(false);
  const [sonidoHabilitado, setSonidoHabilitado] = useState(true);
  const [mostrarResultado, setMostrarResultado] = useState(false);

  // Audio Context con Web Audio API para simular el giro del tambor mecánico
  const audioCtxRef = useRef<AudioContext | null>(null);

  const reproducirClick = () => {
    if (!sonidoHabilitado) return;
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320 + Math.random() * 80, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch {
      // Audio no permitido o silenciado
    }
  };

  const reproducirCampana = (esPeligro: boolean) => {
    if (!sonidoHabilitado) return;
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (esPeligro) {
        // Sonido de alerta juguetona / campana doble
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      } else {
        // Campanita alegre
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      }

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {}
  };

  const handleGirar = () => {
    if (girando || deshabilitado) return;

    setGirando(true);
    setMostrarResultado(false);

    // 1 de las 6 recámaras es bala (recámara número 3 por ejemplo o al azar)
    const recamaraBala = Math.floor(Math.random() * 6);
    const recamaraElegida = Math.floor(Math.random() * 6);
    const salioBala = recamaraElegida === recamaraBala;

    // Calcular grados de rotación: mínimo 5 giros completos (1800deg) + el ángulo de la recámara
    const anguloPorRecamara = 60; // 360 / 6
    const girosCompletos = 5 * 360;
    const anguloFinal = rotacionActual + girosCompletos + recamaraElegida * anguloPorRecamara;

    setRotacionActual(anguloFinal);
    setRecamaraSeleccionada(recamaraElegida + 1);
    setEsBala(salioBala);

    // Simular clics mecánicos con cadencia decreciente
    let delay = 60;
    const clicksTotal = 24;
    for (let i = 0; i < clicksTotal; i++) {
      setTimeout(() => {
        reproducirClick();
      }, i * delay);
      delay += 8;
    }

    // Frenado a los 3 segundos
    setTimeout(() => {
      setGirando(false);
      setMostrarResultado(true);
      reproducirCampana(salioBala);

      if (!salioBala) {
        dispararConfeti();
      }

      onGirarCompleto(salioBala, recamaraElegida + 1);
    }, 3200);
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 space-y-4">
      {/* Botón de Sonido */}
      <div className="w-full flex justify-end">
        <button
          type="button"
          onClick={() => setSonidoHabilitado(!sonidoHabilitado)}
          className="p-2 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#FF7043] border border-orange-200/50 hover:bg-orange-100 text-xs flex items-center gap-1 font-bold transition-colors"
          title={sonidoHabilitado ? 'Silenciar giro' : 'Activar sonido'}
        >
          {sonidoHabilitado ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          <span>{sonidoHabilitado ? 'Sonido ON' : 'Silencio'}</span>
        </button>
      </div>

      {/* Tambor Animado */}
      <div className="relative w-56 h-56 flex items-center justify-center">
        {/* Marcador superior (flecha/aguja que apunta a la recámara activa) */}
        <div className="absolute -top-3 z-20 flex flex-col items-center">
          <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[14px] border-t-[#FF7043] filter drop-shadow" />
        </div>

        {/* Cilindro / Tambor Giratorio */}
        <div
          className="relative w-48 h-48 rounded-full border-4 border-[#FFA726] shadow-2xl flex items-center justify-center transition-transform duration-[3200ms] ease-out"
          style={{
            transform: `rotate(${rotacionActual}deg)`,
            background: 'radial-gradient(circle, #FFE0B2 0%, #FFB74D 60%, #F57C00 100%)',
          }}
        >
          {/* Eje Central */}
          <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#E65100] to-[#FF9800] border-2 border-white shadow-inner flex items-center justify-center z-10">
            <div className="w-5 h-5 rounded-full bg-white/70 shadow-sm" />
          </div>

          {/* 6 Recámaras */}
          {[0, 1, 2, 3, 4, 5].map((index) => {
            const angulo = index * 60;
            const rad = (angulo * Math.PI) / 180;
            const radio = 62; // Distancia desde el centro
            const x = Math.round(radio * Math.sin(rad));
            const y = Math.round(-radio * Math.cos(rad));

            return (
              <div
                key={index}
                className="absolute w-10 h-10 rounded-full bg-gradient-to-b from-[#2E241E] to-[#17120F] border-2 border-amber-200/80 shadow-inner flex items-center justify-center text-[10px] font-black text-amber-300"
                style={{
                  transform: `translate(${x}px, ${y}px)`,
                }}
              >
                {index + 1}
              </div>
            );
          })}
        </div>
      </div>

      {/* Botón de Giro */}
      <div className="w-full max-w-xs space-y-2">
        <button
          onClick={handleGirar}
          disabled={girando || deshabilitado}
          className={`w-full py-4 px-6 rounded-2xl font-black text-base shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 ${
            girando
              ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-[#FF7043] via-[#FFA726] to-[#FF5722] hover:from-[#F4511E] hover:to-[#E64A19] text-white shadow-orange-500/30'
          }`}
        >
          <RotateCw className={`w-5 h-5 ${girando ? 'animate-spin' : ''}`} />
          <span>{girando ? '¡Girando el tambor...!' : '¡Girar Ruleta Rusa! 🎲'}</span>
        </button>
      </div>

      {/* Resultado tras girar */}
      {mostrarResultado && (
        <div
          className={`w-full max-w-xs p-4 rounded-2xl border text-center animate-in zoom-in-95 duration-300 ${
            esBala
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 text-rose-800 dark:text-rose-200'
              : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 text-amber-900 dark:text-amber-100'
          }`}
        >
          {esBala ? (
            <div className="space-y-1.5">
              <div className="inline-flex p-2 rounded-full bg-rose-200 dark:bg-rose-900 text-rose-700 dark:text-rose-300">
                <ShieldAlert className="w-6 h-6 animate-bounce" />
              </div>
              <h4 className="text-base font-black">¡SALIÓ LA BALA! 💥💣</h4>
              <p className="text-xs font-semibold leading-relaxed">
                ¡Te tocó responder con <b>foto o video corto</b>! No se admiten respuestas solo en texto.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="inline-flex p-2 rounded-full bg-amber-200 dark:bg-amber-900 text-amber-700 dark:text-amber-300">
                <Sparkles className="w-6 h-6" />
              </div>
              <h4 className="text-base font-black">¡Recámara {recamaraSeleccionada} libre! 😅</h4>
              <p className="text-xs font-semibold leading-relaxed">
                ¡Te salvaste de la bala! Podés responder esta pregunta escribiendo por texto.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
