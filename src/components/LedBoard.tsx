"use client";

import type { ColorLed } from "@/lib/types";

export interface MsgLed {
  id: string;
  texto: string;
  color: ColorLed;
  destacado?: boolean;
}

/** Cartel LED vintage mejorado: marquesina continua derecha→izquierda en CSS, con badge en vivo de Arlequín y pausa al interactuar. */
export function LedBoard({ mensajes }: { mensajes: MsgLed[] }) {
  const lista: MsgLed[] = mensajes && mensajes.length > 0
    ? mensajes
    : [
        { id: "def-1", texto: "¡BIENVENIDOS A TRIBOO! · SUBÍ TU FOTO DEL DÍA PARA ACTIVAR EL MURO Y SUMAR PUNTOS", color: "ambar", destacado: true },
        { id: "def-2", texto: "🎭 ARLEQUÍN: EL QUE NO PARTICIPA PAGA LAS FACTURAS EL DOMINGO", color: "celeste" },
      ];

  // Duplicamos la lista para generar un flujo continuo sin baches
  const itemsExtendidos = [...lista, ...lista];
  const largo = lista.reduce((n, m) => n + m.texto.length + 10, 0);
  const dur = Math.max(22, Math.round(largo * 0.28));

  return (
    <div className="led flex items-stretch" role="marquee" aria-label="Pizarra de Arlequín en TRIBOO" tabIndex={0}>
      {/* Badge fijo a la izquierda */}
      <div className="relative z-10 flex items-center gap-2 px-3 sm:px-4 bg-[#060913] border-r-2 border-orange-500/40 shrink-0 shadow-[4px_0_12px_rgba(0,0,0,0.8)]">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500"></span>
        </span>
        <div className="flex items-center gap-1.5 font-black text-xs sm:text-sm tracking-wider uppercase">
          <span className="text-base">🎭</span>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-yellow-400 font-extrabold hidden xs:inline">
            ARLEQUÍN
          </span>
          <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30">
            VIVO
          </span>
        </div>
      </div>

      {/* Pista de texto deslizante continua */}
      <div className="relative flex-1 overflow-hidden flex items-center">
        <div className="led-pista flex items-center" style={{ ["--dur" as string]: `${dur}s` }}>
          {itemsExtendidos.map((m, idx) => (
            <span key={`${m.id}-${idx}`} className={`led-texto led-${m.color}`}>
              {m.destacado ? "★ " : ""}
              {m.texto}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

