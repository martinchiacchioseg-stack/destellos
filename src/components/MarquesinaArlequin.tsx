"use client";

import React, { useEffect, useState } from "react";
import { LedBoard, type MsgLed } from "./LedBoard";

const COMENTARIOS_CONTINUOS_ARLEQUIN: MsgLed[] = [
  { id: "arl-c1", texto: "¡BIENVENIDOS A TRIBOO! · SUBÍ TU FOTO DIARIA PARA ACTIVAR LA RUEDA DE JUEGOS Y SUMAR PUNTOS.", color: "ambar", destacado: true },
  { id: "arl-c2", texto: "🎭 ARLEQUÍN AL ACECHO: HOY NO SE VALEN FOTOS BORROSAS NI DE HACE CINCO AÑOS... ¡QUEREMOS ROSTROS FRESCOS!", color: "celeste" },
  { id: "arl-c3", texto: "⚽ EL PICADO DE LA SEMANA: CONVOCATORIA ABIERTA. LOS PRIMEROS 10 JUEGAN, EL RESTO A LA BANCA DE SUPLENTES.", color: "verde" },
  { id: "arl-c4", texto: "🏆 EL PRODE DEL FINDE: NO TE DUERMAS CON LOS PRONÓSTICOS QUE LA TABLA FAMILIAR NO PERDONA PECHOS FRÍOS.", color: "ambar" },
  { id: "arl-c5", texto: "🧠 TRIVIA ACTIVADA: ¿QUIÉN ES EL VERDADERO CRÁNEO DE LA TRIBU? A DEMOSTRAR EN LA CANCHA DEL SABER.", color: "magenta" },
  { id: "arl-c6", texto: "🎭 ARLEQUÍN DIJO: 'EL QUE MENOS FOTOS SUBE, MÁS PENITENCIAS PAGA EN EL ASADO DEL DOMINGO'.", color: "rojo" },
  { id: "arl-c7", texto: "📸 RITUAL DEL DÍA: TODOS CON LA FOTO ARRIBA ANTES DE LAS 22:00 HS O SE CIERRA EL MURO FAMILIAR.", color: "celeste" },
];

export function MarquesinaArlequin({ mensajesIniciales }: { mensajesIniciales?: MsgLed[] }) {
  const [mensajes, setMensajes] = useState<MsgLed[]>(() => {
    if (mensajesIniciales && mensajesIniciales.length > 0) {
      return [...mensajesIniciales, ...COMENTARIOS_CONTINUOS_ARLEQUIN];
    }
    return COMENTARIOS_CONTINUOS_ARLEQUIN;
  });

  useEffect(() => {
    let cancelado = false;

    async function cargar() {
      try {
        const res = await fetch("/api/pizarra");
        const data = await res.json();
        if (!cancelado && Array.isArray(data.pizarra)) {
          // Fusionamos mensajes de la base de datos (pizarra/anuncios) con los comentarios vivos de Arlequín
          const combinados = data.pizarra.length > 0
            ? [...data.pizarra, ...COMENTARIOS_CONTINUOS_ARLEQUIN]
            : COMENTARIOS_CONTINUOS_ARLEQUIN;
          setMensajes(combinados);
        }
      } catch (e) {
        console.warn("Error cargando marquesina de Arlequín:", e);
      }
    }

    cargar();
    const interval = setInterval(cargar, 25_000);
    return () => {
      cancelado = true;
      clearInterval(interval);
    };
  }, []);

  return <LedBoard mensajes={mensajes} />;
}

