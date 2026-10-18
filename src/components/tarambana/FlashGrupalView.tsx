"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, Sparkles, CheckCircle2, AlertCircle, RefreshCw, Camera } from "lucide-react";
import confetti from "canvas-confetti";

interface FlashProps {
  onAddScore: (points: number, reason: string) => void;
}

interface DestelloReal {
  id: string;
  foto_url: string | null;
  descripcion: string | null;
  titulo_arlequin?: string | null;
  devolucion_arlequin?: string | null;
  autor: {
    id: string;
    nombre: string;
    apodo: string | null;
  } | null;
}

export function FlashGrupalView({ onAddScore }: FlashProps) {
  const [destellos, setDestellos] = useState<DestelloReal[]>([]);
  const [destelloActivo, setDestelloActivo] = useState<DestelloReal | null>(null);
  const [opcionesFamiliares, setOpcionesFamiliares] = useState<string[]>([]);
  const [cargando, setCargando] = useState(true);

  const [revelada, setRevelada] = useState(false);
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [veredictoArlequin, setVeredictoArlequin] = useState<string | null>(null);

  useEffect(() => {
    async function cargarFotosReales() {
      try {
        const res = await fetch("/api/home");
        const data = await res.json();

        // Obtener miembros reales de la familia
        const miembros: string[] = [];
        if (data.faltan) {
          data.faltan.forEach((m: { nombre: string }) => miembros.push(m.nombre));
        }
        if (data.yo?.nombre) {
          miembros.push(data.yo.apodo || data.yo.nombre);
        }

        // Si hay destellos reales con foto
        const fotosConUrl = (data.muro || []).filter((d: DestelloReal) => !!d.foto_url);
        setDestellos(fotosConUrl);

        if (fotosConUrl.length > 0) {
          const elegida = fotosConUrl[Math.floor(Math.random() * fotosConUrl.length)];
          setDestelloActivo(elegida);

          // Construir opciones únicas con la familia real
          const nombreAutor = elegida.autor?.apodo || elegida.autor?.nombre || "Familiar";
          const listaNombres = Array.from(new Set([nombreAutor, ...miembros, "Martin (papa)", "Yasmin (Tati)", "Claudio (Mencha)", "Nicolás (Chacho)", "Loli"]));
          setOpcionesFamiliares(listaNombres.slice(0, 5).sort(() => Math.random() - 0.5));
        } else {
          // Si todavía no hay fotos hoy
          const listaNombres = ["Martin (papa)", "Yasmin (Tati)", "Claudio (Mencha)", "Nicolás (Chacho)", "Loli"];
          setOpcionesFamiliares(listaNombres);
        }
      } catch (err) {
        console.warn("Error cargando fotos de la familia:", err);
      } finally {
        setCargando(false);
      }
    }

    cargarFotosReales();
  }, []);

  const autorCorrecto = destelloActivo?.autor?.apodo || destelloActivo?.autor?.nombre;

  const adivinar = (autor: string) => {
    if (revelada || !destelloActivo) return;
    setSeleccionado(autor);
    setRevelada(true);

    const esCorrecto = autor === autorCorrecto;
    if (esCorrecto) {
      confetti({ particleCount: 110, spread: 75, origin: { y: 0.6 } });
      onAddScore(25, `Flash Grupal: ¡Adivinaste que la foto era de ${autorCorrecto}!`);
      setFeedback(`¡EXCELENTE OJO! Es la foto de ${autorCorrecto} 🎉`);
    } else {
      setFeedback(`¡Casi! Era la foto de ${autorCorrecto || "la familia"} 😂`);
    }

    const devolucion = destelloActivo.devolucion_arlequin || 
      `Arlequín dice: "¡Hermosa captura de la familia Chiacchios! Cada destello hace brillar más nuestro club."`;
    setVeredictoArlequin(devolucion);
  };

  const siguienteFoto = () => {
    if (destellos.length <= 1) return;
    const restantes = destellos.filter(d => d.id !== destelloActivo?.id);
    const nueva = restantes[Math.floor(Math.random() * restantes.length)];
    setDestelloActivo(nueva);
    setRevelada(false);
    setSeleccionado(null);
    setFeedback(null);
    setVeredictoArlequin(null);
  };

  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-amber-300">
        <RefreshCw size={32} className="animate-spin mb-3" />
        <p className="font-bold text-sm">Cargando destellos de la familia Chiacchios…</p>
      </div>
    );
  }

  // Si no hay fotos todavía en el muro
  if (!destelloActivo || !destelloActivo.foto_url) {
    return (
      <div className="space-y-6 pb-24 text-white">
        <div className="rounded-2xl border-2 border-[#FFE600] bg-[#1E1E24] p-5 shadow-[0_0_20px_rgba(255,230,0,0.15)]">
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 rounded-full bg-[#FFE600] animate-pulse" />
            <span className="text-xs font-black tracking-widest text-[#FFE600] uppercase">FLASH GRUPAL DIARIO</span>
          </div>
          <h2 className="mt-1 text-2xl font-black tracking-tight">Fotos de la Familia</h2>
          <p className="text-sm text-neutral-400">
            Aquí solo jugamos con las fotos reales de Martin, Yasmin, Claudio, Nicolás y Loli. ¡Cero bots!
          </p>
        </div>

        <div className="p-8 rounded-3xl border-2 border-dashed border-amber-400/40 bg-slate-900/80 text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-3xl">
            📷
          </div>
          <h3 className="text-lg font-black text-amber-200">Todavía no hay fotos subidas en el muro</h3>
          <p className="text-xs text-slate-300 max-w-md mx-auto">
            La regla principal es que cada integrante suba su foto del día. En cuanto suban una foto, acá aparecerá oculta con blur para que adivinen de quién es.
          </p>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-pink-500 text-black font-black text-xs tracking-wider shadow-lg hover:scale-105 active:scale-95 transition"
          >
            <Camera size={18} />
            <span>SUBIR FOTO AHORA</span>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 text-white">
      {/* Banner temático */}
      <div className="rounded-2xl border-2 border-[#FFE600] bg-[#1E1E24] p-5 shadow-[0_0_20px_rgba(255,230,0,0.15)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 rounded-full bg-[#FFE600] animate-pulse" />
              <span className="text-xs font-black tracking-widest text-[#FFE600] uppercase">FLASH GRUPAL DIARIO</span>
            </div>
            <h2 className="mt-1 text-2xl font-black tracking-tight">¿De quién es esta foto familiar?</h2>
            <p className="text-sm text-neutral-400">
              Adiviná cuál de los integrantes de la familia capturó este destello antes de revelarlo.
            </p>
          </div>
          {destellos.length > 1 && (
            <button
              onClick={siguienteFoto}
              className="px-3 py-2 rounded-xl bg-slate-800 border border-amber-400/40 text-amber-300 text-xs font-bold hover:bg-slate-700 transition flex items-center gap-1.5 shrink-0"
            >
              <RefreshCw size={14} />
              <span>Otra foto</span>
            </button>
          )}
        </div>
      </div>

      {/* Contenedor de la foto con Unblur interactivo */}
      <div className="relative mx-auto aspect-square w-full max-w-md overflow-hidden rounded-3xl border-4 border-[#FFE600]/80 bg-[#121214] shadow-2xl">
        <motion.div
          animate={{ filter: revelada ? "blur(0px)" : "blur(28px)", scale: revelada ? 1 : 1.05 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          className="h-full w-full"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={destelloActivo.foto_url} alt="Flash de la familia" className="h-full w-full object-cover" />
        </motion.div>

        {!revelada && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 p-4 text-center backdrop-blur-xs">
            <Eye size={40} className="mb-2 text-[#FFE600]" />
            <p className="text-lg font-black tracking-wide text-white drop-shadow-md">
              FOTO OCULTA
            </p>
            <p className="text-xs font-medium text-neutral-300">
              Elegí abajo cuál de los integrantes la sacó para desbloquearla
            </p>
          </div>
        )}

        {/* Título de Arlequín si ya está revelada */}
        {revelada && destelloActivo.titulo_arlequin && (
          <div className="absolute top-3 left-3 right-3 bg-black/85 backdrop-blur-md rounded-xl p-2.5 border border-pink-500/50 shadow-lg">
            <p className="text-[10px] font-black uppercase text-pink-300">🎭 Arlequín:</p>
            <p className="text-xs font-black text-amber-300">"{destelloActivo.titulo_arlequin}"</p>
          </div>
        )}
      </div>

      {/* Opciones de autores familiares reales (CERO BOTS) */}
      <div className="space-y-3">
        <p className="text-xs font-bold text-slate-400 text-center uppercase tracking-wider">
          ¿Quién sacó esta foto? Elegí un integrante:
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {opcionesFamiliares.map((autor) => {
            const esSeleccionado = seleccionado === autor;
            const esElCorrecto = revelada && autor === autorCorrecto;

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
                <span>{autor}</span>
                {esElCorrecto && <CheckCircle2 size={16} />}
                {esSeleccionado && !esElCorrecto && <AlertCircle size={16} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Devolución de Arlequín */}
      <AnimatePresence>
        {revelada && veredictoArlequin && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2 rounded-2xl border-2 border-emerald-400/40 bg-emerald-950/20 p-4 text-sm text-emerald-200"
          >
            <div className="flex items-center gap-2 font-black text-emerald-300">
              <Sparkles size={18} />
              <span>{feedback}</span>
            </div>
            <div className="flex items-start gap-2 pt-1 border-t border-emerald-500/20 text-xs italic text-emerald-100">
              <span className="text-base not-italic">🎭</span>
              <p>"{veredictoArlequin}"</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
