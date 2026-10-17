"use client";

import type { ColorLed } from "@/lib/types";

export interface MsgLed {
  id: string;
  texto: string;
  color: ColorLed;
  destacado?: boolean;
}

/** Cartel LED vintage: marquesina derecha→izquierda en CSS, pausa al tocar o pasar el mouse. */
export function LedBoard({ mensajes }: { mensajes: MsgLed[] }) {
  const lista: MsgLed[] = mensajes.length
    ? mensajes
    : [{ id: "vacio", texto: "Bienvenidos a Destellos · un clic familiar", color: "ambar" }];
  const largo = lista.reduce((n, m) => n + m.texto.length + 8, 0);
  const dur = Math.max(18, Math.round(largo * 0.35));

  return (
    <div className="led" role="marquee" aria-label="Pizarra general de la familia" tabIndex={0}>
      <div className="led-pista" style={{ ["--dur" as string]: `${dur}s` }}>
        {lista.map((m) => (
          <span key={m.id} className={`led-texto led-${m.color}`}>
            {m.destacado ? "★ " : ""}
            {m.texto}
          </span>
        ))}
      </div>
    </div>
  );
}
