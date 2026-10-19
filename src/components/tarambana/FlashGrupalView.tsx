"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, Sparkles, CheckCircle2, HelpCircle, RefreshCw, Camera, Upload, ArrowRight, Trophy } from "lucide-react";
import confetti from "canvas-confetti";
import { llamar } from "@/lib/cliente";

interface FlashProps {
  onAddScore: (points: number, reason: string) => void;
  onIrAlFeed?: () => void;
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

interface MiembroFamilia {
  id: string;
  nombre: string;
  apodo: string | null;
  nombreMostrar: string;
}

export function FlashGrupalView({ onAddScore, onIrAlFeed }: FlashProps) {
  const [destellos, setDestellos] = useState<DestelloReal[]>([]);
  const [miembros, setMiembros] = useState<MiembroFamilia[]>([]);
  const [cargando, setCargando] = useState(true);

  // Registro de adivinanzas: { [destelloId]: { seleccionado: string, esCorrecto: boolean } }
  const [adivinanzas, setAdivinanzas] = useState<Record<string, { seleccionado: string; esCorrecto: boolean }>>({});

  // Subir foto oculta extra
  const [mostrarSubir, setMostrarSubir] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [previewSubida, setPreviewSubida] = useState<string | null>(null);
  const [pista, setPista] = useState("");

  const cargarDatos = useCallback(async () => {
    try {
      const res = await fetch("/api/home");
      const data = await res.json();

      const fotosConUrl = (data.muro || []).filter((d: DestelloReal) => Boolean(d.foto_url));
      setDestellos(fotosConUrl);

      // Extraer miembros reales sin ningún dato inventado
      const listaMiembros: MiembroFamilia[] = [];
      const vistos = new Set<string>();

      // Miembro actual
      if (data.yo?.nombre) {
        vistos.add(data.yo.nombre);
        listaMiembros.push({
          id: data.yo.id,
          nombre: data.yo.nombre,
          apodo: data.yo.apodo,
          nombreMostrar: data.yo.apodo || data.yo.nombre.split(" ")[0],
        });
      }

      // Faltantes o autores de fotos
      if (data.faltan) {
        data.faltan.forEach((m: { id: string; nombre: string }) => {
          if (!vistos.has(m.nombre)) {
            vistos.add(m.nombre);
            listaMiembros.push({
              id: m.id,
              nombre: m.nombre,
              apodo: null,
              nombreMostrar: m.nombre.split(" ")[0],
            });
          }
        });
      }

      fotosConUrl.forEach((d: DestelloReal) => {
        if (d.autor?.nombre && !vistos.has(d.autor.nombre)) {
          vistos.add(d.autor.nombre);
          listaMiembros.push({
            id: d.autor.id,
            nombre: d.autor.nombre,
            apodo: d.autor.apodo,
            nombreMostrar: d.autor.apodo || d.autor.nombre.split(" ")[0],
          });
        }
      });

      setMiembros(listaMiembros);
    } catch (err) {
      console.warn("Error cargando fotos de la familia:", err);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const adivinar = (destello: DestelloReal, nombreElegido: string) => {
    if (adivinanzas[destello.id]) return;

    const autorNombreReal = destello.autor?.apodo || destello.autor?.nombre || "";
    const esCorrecto =
      nombreElegido.toLowerCase().trim() === autorNombreReal.toLowerCase().trim() ||
      autorNombreReal.toLowerCase().includes(nombreElegido.toLowerCase()) ||
      nombreElegido.toLowerCase().includes(autorNombreReal.toLowerCase());

    setAdivinanzas((prev) => ({
      ...prev,
      [destello.id]: { seleccionado: nombreElegido, esCorrecto },
    }));

    if (esCorrecto) {
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
      onAddScore(25, `Foto Oculta: ¡Acertaste que la foto era de ${nombreElegido}! (+25 pts)`);
    }
  };

  const subirFotoExtra = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setSubiendo(true);
    try {
      await llamar("/api/destellos", { body: fd });
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.7 } });
      setMostrarSubir(false);
      setPreviewSubida(null);
      setPista("");
      await cargarDatos();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al subir foto");
    } finally {
      setSubiendo(false);
    }
  };

  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-amber-300">
        <RefreshCw size={32} className="animate-spin mb-3" />
        <p className="font-bold text-sm">Cargando la galería de fotos ocultas familiares…</p>
      </div>
    );
  }

  const todasAdivinadas = destellos.length > 0 && destellos.every((d) => Boolean(adivinanzas[d.id]));

  return (
    <div className="space-y-6 pb-24 text-white">
      {/* Cabecera del juego Foto Oculta */}
      <div className="relative overflow-hidden rounded-3xl border-2 border-amber-400/50 bg-gradient-to-br from-amber-950/70 via-slate-900 to-slate-950 p-6 shadow-[0_0_35px_rgba(251,191,36,0.2)]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-black uppercase tracking-wider">
                FOTO OCULTA FAMILIAR • ARRIESGÁ DE QUIÉN ES
              </span>
              <span className="text-xs text-amber-300 font-bold">Sin revelar autor</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-white">
              Galería Misteriosa de la Familia
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
              Acá están todas las fotos de hoy reunidas sin nombres. Mirá cada foto y arriesgá de quién es. ¡Una vez que descubras a los autores, pasan con sus títulos y veredictos al Muro familiar!
            </p>
          </div>

          <button
            onClick={() => setMostrarSubir((v) => !v)}
            className="btn btn-primario px-4 py-2.5 text-xs font-black flex items-center gap-1.5 shadow-lg shrink-0"
          >
            <Camera size={16} />
            <span>+ Subir Foto Misteriosa</span>
          </button>
        </div>

        {/* Mensaje de Arlequín */}
        <div className="mt-4 p-3.5 rounded-2xl bg-amber-950/60 border border-amber-400/30 text-xs sm:text-sm text-amber-200 font-semibold flex items-start gap-2.5">
          <span className="text-xl">🎭</span>
          <p className="leading-relaxed">
            Arlequín dice: "¡A ver qué tan bien se conocen! ¿Quién sacó cada foto? ¡Elegí tu candidato antes de que caiga la noche!"
          </p>
        </div>
      </div>

      {/* Formulario para subir foto misteriosa extra */}
      {mostrarSubir && (
        <form onSubmit={subirFotoExtra} className="rounded-3xl border-2 border-amber-400/50 bg-slate-900/95 p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-amber-300 uppercase">Subir Foto para que la familia adivine</h3>
            <button type="button" onClick={() => setMostrarSubir(false)} className="text-xs text-slate-400 hover:text-white">✕ Cancelar</button>
          </div>
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-amber-400/40 rounded-2xl p-4 bg-black/40 cursor-pointer hover:border-amber-300 transition">
            {previewSubida ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewSubida} alt="Preview" className="max-h-48 rounded-xl object-contain" />
            ) : (
              <div className="text-center py-3 space-y-1">
                <Camera size={28} className="mx-auto text-amber-400" />
                <p className="text-xs font-bold text-white">Elegir foto misteriosa o recuerdo 📷</p>
              </div>
            )}
            <input
              name="foto"
              type="file"
              accept="image/*"
              required
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setPreviewSubida(URL.createObjectURL(f));
              }}
            />
          </label>
          <input
            name="descripcion"
            className="input text-xs"
            placeholder="Pista misteriosa (ej: 'Miren bien el fondo', 'Fue en vacaciones') (opcional)"
            value={pista}
            onChange={(e) => setPista(e.target.value)}
          />
          <button className="btn btn-primario w-full text-xs font-black py-3" disabled={subiendo}>
            {subiendo ? "Subiendo foto misteriosa…" : "¡Publicar foto en el juego! 🚀"}
          </button>
        </form>
      )}

      {/* Si no hay fotos todavía */}
      {destellos.length === 0 && (
        <div className="tarjeta p-12 text-center space-y-4 border-amber-400/30">
          <div className="w-16 h-16 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 grid place-items-center mx-auto text-3xl">
            📷
          </div>
          <h3 className="text-lg font-black text-white">Todavía no hay fotos en juego hoy</h3>
          <p className="text-xs text-slate-300 max-w-md mx-auto">
            ¡Sé el primero en subir una foto misteriosa o tu destello del día para que tu familia juegue a adivinar!
          </p>
          <button onClick={() => setMostrarSubir(true)} className="btn btn-primario text-xs font-black px-5 py-2.5 mx-auto">
            Subir la primera foto 🌟
          </button>
        </div>
      )}

      {/* Galería de fotos para adivinar */}
      {destellos.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <span className="text-xs font-black uppercase text-amber-300 tracking-wider">
              {destellos.length} {destellos.length === 1 ? "Foto para adivinar" : "Fotos para adivinar"}
            </span>
            {todasAdivinadas && (
              <span className="text-xs font-bold text-emerald-300 flex items-center gap-1">
                <CheckCircle2 size={14} /> ¡Completaste todas las adivinanzas!
              </span>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {destellos.map((d, index) => {
              const adivinanza = adivinanzas[d.id];
              const autorReal = d.autor?.apodo || d.autor?.nombre || "Familiar";

              return (
                <div
                  key={d.id}
                  className="rounded-3xl border-2 border-white/10 bg-slate-900/95 overflow-hidden shadow-2xl flex flex-col justify-between"
                >
                  <div className="relative">
                    <div className="aspect-[4/3] bg-black/60 relative overflow-hidden flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={d.foto_url!}
                        alt="Foto oculta"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/80 backdrop-blur-md border border-white/20 text-[11px] font-black text-amber-300">
                      Foto Misteriosa #{index + 1}
                    </div>

                    {adivinanza && (
                      <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-emerald-600 text-white font-black text-[11px] shadow-lg flex items-center gap-1">
                        <CheckCircle2 size={12} /> Revelada
                      </div>
                    )}
                  </div>

                  <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                    <div>
                      {d.descripcion && (
                        <p className="text-xs text-slate-300 italic mb-2">
                          "{d.descripcion}"
                        </p>
                      )}

                      {/* Si ya adivinó este destello */}
                      {adivinanza ? (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className={`p-3 rounded-2xl border text-xs space-y-1.5 ${
                            adivinanza.esCorrecto
                              ? "bg-emerald-950/80 border-emerald-400 text-emerald-200"
                              : "bg-amber-950/80 border-amber-400 text-amber-200"
                          }`}
                        >
                          <p className="font-black text-sm">
                            {adivinanza.esCorrecto ? "🎉 ¡ACERTASTE!" : "👀 ¡ERA DE OTRA PERSONA!"}
                          </p>
                          <p>
                            Esta foto pertenece a: <strong className="text-white text-sm underline">{autorReal}</strong>
                          </p>
                          {d.titulo_arlequin && (
                            <p className="text-[11px] text-amber-300 font-bold">
                              Título de Arlequín: "{d.titulo_arlequin}"
                            </p>
                          )}
                        </motion.div>
                      ) : (
                        /* Si aún no adivinó: Botones con los miembros de la familia */
                        <div className="space-y-2">
                          <p className="text-xs font-black text-amber-300 flex items-center gap-1">
                            <HelpCircle size={14} /> ¿Quién sacó esta foto? Arriesgá (+25 pts):
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {miembros.map((m) => (
                              <button
                                key={m.id}
                                onClick={() => adivinar(d, m.nombreMostrar)}
                                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-amber-400 hover:text-black border border-white/10 text-xs font-bold transition active:scale-95"
                              >
                                {m.nombreMostrar}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Banner de conclusión y botón al feed */}
          {todasAdivinadas && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="tarjeta p-6 text-center space-y-3 border-emerald-400/50 bg-gradient-to-br from-emerald-950/60 to-slate-900"
            >
              <Trophy size={36} className="mx-auto text-amber-400 animate-bounce" />
              <h3 className="text-lg font-black text-white">¡Descubrieron todas las fotos del día!</h3>
              <p className="text-xs text-slate-300 max-w-md mx-auto">
                Las fotos ya están listas con sus autores confirmados y veredictos en el Muro de Destellos familiar.
              </p>
              {onIrAlFeed && (
                <button onClick={onIrAlFeed} className="btn btn-primario text-xs font-black px-6 py-3 mx-auto flex items-center gap-2">
                  <span>Ir a ver el Muro Familiar</span>
                  <ArrowRight size={16} />
                </button>
              )}
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}
