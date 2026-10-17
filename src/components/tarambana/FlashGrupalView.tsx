"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";
import confetti from "canvas-confetti";

interface FlashProps {
  onAddScore: (points: number, reason: string) => void;
}

const MOCK_FLASH = {
  id: "flash-1",
  fotoUrl: "https://images.unsplash.com/photo-1543852786-1cf6624b9987?auto=format&fit=crop&w=800&q=80",
  autorReal: "Julieta",
  opciones: ["Julieta", "Martín", "Agustina", "Mateo"],
};

export function FlashGrupalView({ onAddScore }: FlashProps) {
  const [revelada, setRevelada] = useState(false);
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [veredictoIa, setVeredictoIa] = useState<string | null>(null);

  const adivinar = (autor: string) => {
    if (revelada) return;
    setSeleccionado(autor);
    setRevelada(true);

    const acerto = autor === MOCK_FLASH.autorReal;
    if (acerto) {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      onAddScore(25, "Flash Grupal: ¡Adivinaste el autor!");
      setFeedback("¡EXCELENTE OJO! Es la foto de " + MOCK_FLASH.autorReal + " 🎉");
    } else {
      setFeedback("¡Casi! Era de " + MOCK_FLASH.autorReal + " 😂");
    }

    setVeredictoIa(
      "Juez IA: 'Una captura con composición espontánea, ternura extrema y energía caótica. Candidata firme al Flash de Oro del día.'"
    );
  };

  return (
    <div className="space-y-6 pb-24 text-white">
      {/* Banner temático */}
      <div className="rounded-2xl border-2 border-[#FFE600] bg-[#1E1E24] p-5 shadow-[0_0_20px_rgba(255,230,0,0.15)]">
        <div className="flex items-center gap-2">
          <span className="flex h-3 w-3 rounded-full bg-[#FFE600] animate-pulse" />
          <span className="text-xs font-black tracking-widest text-[#FFE600] uppercase">FLASH GRUPAL DIARIO</span>
        </div>
        <h2 className="mt-1 text-2xl font-black tracking-tight">¿De quién es esta foto?</h2>
        <p className="text-sm text-neutral-400">
          Adivina quién capturó este destello antes de que se revele el unblur completo.
        </p>
      </div>

      {/* Contenedor de la foto con Unblur interactivo */}
      <div className="relative mx-auto aspect-square w-full max-w-md overflow-hidden rounded-3xl border-4 border-[#FFE600]/80 bg-[#121214] shadow-2xl">
        <motion.div
          animate={{ filter: revelada ? "blur(0px)" : "blur(28px)", scale: revelada ? 1 : 1.05 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          className="h-full w-full"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={MOCK_FLASH.fotoUrl} alt="Flash del día" className="h-full w-full object-cover" />
        </motion.div>

        {!revelada && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 p-4 text-center backdrop-blur-xs">
            <Eye size={40} className="mb-2 text-[#FFE600]" />
            <p className="text-lg font-black tracking-wide text-white drop-shadow-md">
              FOTO OCULTA
            </p>
            <p className="text-xs font-medium text-neutral-300">
              Elegí abajo quién creés que es el autor para desbloquearla
            </p>
          </div>
        )}
      </div>

      {/* Opciones de autores */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {MOCK_FLASH.opciones.map((autor) => {
            const esSeleccionado = seleccionado === autor;
            const esElCorrecto = revelada && autor === MOCK_FLASH.autorReal;

            return (
              <button
                key={autor}
                disabled={revelada}
                onClick={() => adivinar(autor)}
                className={`flex items-center justify-center gap-2 rounded-xl border-2 py-3.5 px-4 font-black transition-all ${
                  esElCorrecto
                    ? "border-emerald-400 bg-emerald-500/20 text-emerald-300"
                    : esSeleccionado && !esElCorrecto
                    ? "border-red-500 bg-red-500/20 text-red-300"
                    : "border-neutral-700 bg-[#1E1E24] text-white hover:border-[#FFE600] active:scale-95"
                }`}
              >
                {autor}
                {esElCorrecto && <CheckCircle2 size={16} />}
                {esSeleccionado && !esElCorrecto && <AlertCircle size={16} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Veredicto de la IA */}
      <AnimatePresence>
        {revelada && veredictoIa && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2 rounded-2xl border-2 border-emerald-400/40 bg-emerald-950/20 p-4 text-sm text-emerald-200"
          >
            <div className="flex items-center gap-2 font-black text-emerald-300">
              <Sparkles size={18} />
              <span>{feedback}</span>
            </div>
            <p className="italic text-emerald-100/90">{veredictoIa}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
