"use client";

import React, { useEffect, useState } from "react";
import { LedBoard, type MsgLed } from "./LedBoard";

export function MarquesinaArlequin({ mensajesIniciales }: { mensajesIniciales?: MsgLed[] }) {
  const [mensajes, setMensajes] = useState<MsgLed[]>(mensajesIniciales || []);

  useEffect(() => {
    if (mensajesIniciales && mensajesIniciales.length > 0) {
      setMensajes(mensajesIniciales);
      return;
    }

    let cancelado = false;

    async function cargar() {
      try {
        const res = await fetch("/api/pizarra");
        const data = await res.json();
        if (!cancelado && Array.isArray(data.pizarra)) {
          setMensajes(data.pizarra);
        }
      } catch (e) {
        console.warn("Error cargando marquesina de Arlequín:", e);
      }
    }

    cargar();
    const interval = setInterval(cargar, 30_000);
    return () => {
      cancelado = true;
      clearInterval(interval);
    };
  }, [mensajesIniciales]);

  return <LedBoard mensajes={mensajes} />;
}
