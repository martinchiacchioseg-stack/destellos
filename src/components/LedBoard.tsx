'use client';

import { useState, useEffect, useRef } from 'react';
import { MensajePizarra, ColorLedPizarra } from '@/lib/types';

interface LedBoardProps {
  grupoId?: string;
}

const COLOR_MAP: Record<ColorLedPizarra, { color: string; glow: string; border: string }> = {
  rojo: {
    color: '#ff3344',
    glow: '0 0 4px #ff3344, 0 0 12px rgba(255, 51, 68, 0.75)',
    border: 'rgba(255, 51, 68, 0.4)',
  },
  verde: {
    color: '#00ff66',
    glow: '0 0 4px #00ff66, 0 0 12px rgba(0, 255, 102, 0.75)',
    border: 'rgba(0, 255, 102, 0.4)',
  },
  ambar: {
    color: '#ffb700',
    glow: '0 0 4px #ffb700, 0 0 12px rgba(255, 183, 0, 0.75)',
    border: 'rgba(255, 183, 0, 0.4)',
  },
  celeste: {
    color: '#00e5ff',
    glow: '0 0 4px #00e5ff, 0 0 12px rgba(0, 229, 255, 0.75)',
    border: 'rgba(0, 229, 255, 0.4)',
  },
  magenta: {
    color: '#ff00cc',
    glow: '0 0 4px #ff00cc, 0 0 12px rgba(255, 0, 204, 0.75)',
    border: 'rgba(255, 0, 204, 0.4)',
  },
};

const MENSAJES_FALLBACK: MensajePizarra[] = [
  {
    id: 'f1',
    group_id: 'all',
    text: '🎭 ¡BIENVENIDOS A DESTELLOS! Subí tu momento del día antes del cierre. ✨',
    type: 'aviso',
    priority: 'destacada',
    color: 'ambar',
    author: 'arlequin',
    status: 'activo',
    created_at: '',
  },
  {
    id: 'f2',
    group_id: 'all',
    text: '🏆 HOY HAY TRIVIA FAMILIAR: Poné a prueba tus conocimientos con Arlequín. 🧠',
    type: 'trivia',
    priority: 'normal',
    color: 'celeste',
    author: 'arlequin',
    status: 'activo',
    created_at: '',
  },
];

export default function LedBoard({ grupoId }: LedBoardProps) {
  const [mensajes, setMensajes] = useState<MensajePizarra[]>(MENSAJES_FALLBACK);
  const [estaPausado, setEstaPausado] = useState(false);
  const [indiceEstatico, setIndiceEstatico] = useState(0);
  const [esReducedMotion, setEsReducedMotion] = useState(false);

  // 1. Cargar mensajes y sondear cada 60s
  const cargarMensajes = async () => {
    try {
      const res = await fetch('/api/board/mensajes', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.mensajes) && data.mensajes.length > 0) {
          setMensajes(data.mensajes);
        }
      }
    } catch {}
  };

  useEffect(() => {
    cargarMensajes();
    const interval = setInterval(cargarMensajes, 60000);
    return () => clearInterval(interval);
  }, [grupoId]);

  // 2. Detectar prefers-reduced-motion
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      setEsReducedMotion(mq.matches);
      const listener = (e: MediaQueryListEvent) => setEsReducedMotion(e.matches);
      mq.addEventListener('change', listener);
      return () => mq.removeEventListener('change', listener);
    }
  }, []);

  // 3. Rotación para modo estático (prefers-reduced-motion)
  useEffect(() => {
    if (!esReducedMotion || mensajes.length <= 1) return;
    const t = setInterval(() => {
      setIndiceEstatico((prev) => (prev + 1) % mensajes.length);
    }, 6000);
    return () => clearInterval(t);
  }, [esReducedMotion, mensajes.length]);

  // Si no hay mensajes válidos, no renderizar nada para no ocupar espacio
  if (!mensajes || mensajes.length === 0) return null;

  return (
    <>
      {/* Import de fuente pixel/dot matrix de Google Fonts */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=DotGothic16&display=swap"
      />

      <style jsx>{`
        @keyframes ledMarquee {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            transform: translate3d(-50%, 0, 0);
          }
        }
        .animate-led-marquee {
          display: flex;
          width: max-content;
          will-change: transform;
          animation: ledMarquee 42s linear infinite;
        }
        .paused-animation {
          animation-play-state: paused !important;
        }
        .led-matrix-dots {
          background-image: radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px);
          background-size: 3px 3px;
        }
        .led-font {
          font-family: 'DotGothic16', 'Courier New', monospace;
          letter-spacing: 0.07em;
        }
      `}</style>

      <section
        role="region"
        aria-label="Pizarra General LED de Destellos"
        onMouseEnter={() => setEstaPausado(true)}
        onMouseLeave={() => setEstaPausado(false)}
        onTouchStart={() => setEstaPausado((prev) => !prev)}
        className="w-full relative select-none overflow-hidden h-[52px] bg-[#08080b] border-y border-[#201d28] shadow-[inset_0_2px_8px_rgba(0,0,0,0.9),0_2px_6px_rgba(0,0,0,0.4)] flex items-center z-20"
      >
        {/* Máscara de LEDs físicos (matriz de puntos radiales) */}
        <div className="absolute inset-0 led-matrix-dots pointer-events-none z-10 opacity-70" />

        {/* Borde biselado superior e inferior simulando gabinete de marquesina */}
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-black to-transparent pointer-events-none" />

        {/* Indicador sutil de pausa */}
        {estaPausado && (
          <div className="absolute right-2 top-2 z-20 px-1.5 py-0.5 rounded bg-black/80 border border-white/20 text-[9px] font-mono text-gray-300 uppercase tracking-widest backdrop-blur-xs">
            PAUSA
          </div>
        )}

        {/* VISTA A: Reducción de movimiento (Estático uno por uno) */}
        {esReducedMotion ? (
          <div className="w-full px-4 text-center z-10">
            {(() => {
              const msg = mensajes[indiceEstatico] || mensajes[0];
              const conf = COLOR_MAP[msg.color] || COLOR_MAP.ambar;
              return (
                <span
                  className="led-font text-xs sm:text-sm uppercase font-bold transition-opacity duration-500"
                  style={{
                    color: conf.color,
                    textShadow: conf.glow,
                  }}
                >
                  {msg.text}
                </span>
              );
            })()}
          </div>
        ) : (
          /* VISTA B: Desplazamiento continuo estilo LED vintage */
          <div
            className={`animate-led-marquee z-10 ${
              estaPausado ? 'paused-animation' : ''
            }`}
          >
            {/* Secuencia duplicada para marquesina infinita continua */}
            {[...mensajes, ...mensajes].map((msg, idx) => {
              const conf = COLOR_MAP[msg.color] || COLOR_MAP.ambar;
              return (
                <div
                  key={`${msg.id}-${idx}`}
                  className="inline-flex items-center gap-4 px-6 shrink-0"
                >
                  <span
                    className="led-font text-xs sm:text-sm uppercase font-bold tracking-wider"
                    style={{
                      color: conf.color,
                      textShadow: conf.glow,
                    }}
                  >
                    {msg.text}
                  </span>
                  {/* Separador de diodo LED */}
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full opacity-60"
                    style={{
                      backgroundColor: conf.color,
                      boxShadow: conf.glow,
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
