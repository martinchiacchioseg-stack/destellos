"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Clock, Award, ShieldAlert, Sparkles, RefreshCw, HelpCircle } from "lucide-react";
import confetti from "canvas-confetti";
import { llamar } from "@/lib/cliente";

interface CerebroProps {
  onAddScore: (points: number, reason: string) => void;
}

interface Pregunta {
  pregunta: string;
  opciones: string[];
  correcta: number;
  explicacion: string;
  dato_curioso?: string;
}

const POOL_PREGUNTAS: Record<number, Pregunta[]> = {
  1: [
    {
      pregunta: "¿Qué animal es conocido tradicionalmente como el mejor amigo del hombre?",
      opciones: ["Gato", "Perro", "Caballo", "Delfín"],
      correcta: 1,
      explicacion: "El perro acompaña a la humanidad desde hace más de 15.000 años.",
      dato_curioso: "Tienen un sentido del olfato hasta 100.000 veces más sensible que el nuestro.",
    },
    {
      pregunta: "¿Qué infusión tradicional se toma con bombilla en Argentina y Uruguay?",
      opciones: ["Café con leche", "Té negro", "Mate", "Submarino"],
      correcta: 2,
      explicacion: "El mate es la infusión emblemática rioplatense.",
      dato_curioso: "En Argentina se consumen unos 100 litros de mate por persona al año.",
    },
    {
      pregunta: "¿Cuántos días tiene un año bisiesto?",
      opciones: ["364", "365", "366", "367"],
      correcta: 2,
      explicacion: "Se le añade un día extra al mes de febrero (29 de febrero).",
      dato_curioso: "Ocurre cada 4 años para compensar que la Tierra tarda 365,242 días en dar la vuelta al Sol.",
    },
    {
      pregunta: "¿Qué selección de fútbol ganó la Copa del Mundo en Qatar 2022?",
      opciones: ["Francia", "Argentina", "Brasil", "Alemania"],
      correcta: 1,
      explicacion: "Argentina conquistó su tercera estrella de la mano de Lionel Messi.",
      dato_curioso: "La final de 2022 es considerada una de las más emocionantes de todos los tiempos.",
    },
    {
      pregunta: "¿Cuál es el color primario que, mezclado con amarillo, produce el color verde?",
      opciones: ["Rojo", "Azul", "Blanco", "Negro"],
      correcta: 1,
      explicacion: "En la teoría del color sustractiva, azul + amarillo da verde.",
      dato_curioso: "El ojo humano percibe más matices de verde que de cualquier otro color.",
    },
  ],
  2: [
    {
      pregunta: "¿Cuál es el río más caudaloso del mundo?",
      opciones: ["Nilo", "Paraná", "Amazonas", "Misisipi"],
      correcta: 2,
      explicacion: "El Amazonas transporta más agua que el Nilo, el Yangtsé y el Misisipi juntos.",
      dato_curioso: "Desemboca en el Atlántico con tanta fuerza que diluye la sal del mar por más de 150 km mar adentro.",
    },
    {
      pregunta: "¿En qué año se declaró la Independencia Argentina en el Congreso de Tucumán?",
      opciones: ["1810", "1816", "1820", "1853"],
      correcta: 1,
      explicacion: "Se declaró formalmente el 9 de julio de 1816.",
      dato_curioso: "La proclamación se imprimió en castellano, quechua y aymara.",
    },
    {
      pregunta: "¿Qué planeta de nuestro Sistema Solar es conocido como el planeta rojo?",
      opciones: ["Venus", "Marte", "Júpiter", "Mercurio"],
      correcta: 1,
      explicacion: "El óxido de hierro abundante en su superficie le otorga esa tonalidad.",
      dato_curioso: "Tiene el volcán más grande del sistema solar, el Monte Olimpo, de 21 km de altura.",
    },
    {
      pregunta: "¿Cuál es el hueso más largo del cuerpo humano?",
      opciones: ["Húmero", "Tibia", "Fémur", "Costilla"],
      correcta: 2,
      explicacion: "El fémur forma la estructura del muslo y soporta gran parte del peso corporal.",
      dato_curioso: "Es cuatro veces más resistente que el concreto sólido ante la compresión.",
    },
    {
      pregunta: "¿Quién compuso la icónica canción 'De música ligera' de Soda Stereo?",
      opciones: ["Charly García", "Gustavo Cerati", "Fito Páez", "Luis Alberto Spinetta"],
      correcta: 1,
      explicacion: "Cerati y Zeta Bosio crearon este himno del rock en español en 1990.",
      dato_curioso: "La canción fue el tema de cierre del concierto despedida en River en 1997.",
    },
  ],
  3: [
    {
      pregunta: "¿En qué año se descifró la estructura en doble hélice del ADN?",
      opciones: ["1945", "1953", "1969", "1975"],
      correcta: 1,
      explicacion: "Watson y Crick publicaron su célebre artículo en Nature en 1953.",
      dato_curioso: "La célebre Fotografía 51 de Rosalind Franklin fue crucial para descifrar la estructura.",
    },
    {
      pregunta: "¿Qué científico argentino fue galardonado con el Premio Nobel de Medicina en 1984?",
      opciones: ["Bernardo Houssay", "Luis Federico Leloir", "César Milstein", "René Favaloro"],
      correcta: 2,
      explicacion: "Milstein desarrolló la técnica de producción de anticuerpos monoclonales.",
      dato_curioso: "Se negó a patentar su técnica para que estuviese a libre disposición de la salud pública mundial.",
    },
    {
      pregunta: "¿Cuál es el punto más alto del continente americano?",
      opciones: ["Cerro Aconcagua", "Monte Denali", "Huascarán", "Nevado Ojos del Salado"],
      correcta: 0,
      explicacion: "El Aconcagua, en Mendoza (Argentina), se eleva a 6.961 metros.",
      dato_curioso: "Es el pico más elevado de todo el planeta fuera del sistema del Himalaya.",
    },
    {
      pregunta: "¿Qué elemento de la tabla periódica tiene como símbolo químico la letra 'W'?",
      opciones: ["Wolframio (Tungsteno)", "Vanadio", "Yterbio", "Wurtzita"],
      correcta: 0,
      explicacion: "El wolframio tiene número atómico 74 y símbolo W.",
      dato_curioso: "Tiene el punto de fusión más alto de todos los metales: 3.422 grados Celsius.",
    },
    {
      pregunta: "¿Cuántos corazones tiene un pulpo?",
      opciones: ["1 corazón", "2 corazones", "3 corazones", "4 corazones"],
      correcta: 2,
      explicacion: "Posee tres corazones: dos bombean sangre a las branquias y uno al resto del cuerpo.",
      dato_curioso: "Su sangre es azul debido a que transporta oxígeno mediante hemocianina rica en cobre.",
    },
  ],
};

const indicesUsados: Record<number, number> = { 1: 0, 2: 0, 3: 0 };

export function CerebroEnFugaView({ onAddScore }: CerebroProps) {
  const [nivel, setNivel] = useState<number | null>(null);
  const [preguntaActiva, setPreguntaActiva] = useState<Pregunta | null>(null);
  const [segundos, setSegundos] = useState(15);
  const [respondida, setRespondida] = useState(false);
  const [seleccionada, setSeleccionada] = useState<number | null>(null);
  const [mensaje, setMensaje] = useState("");
  const [devolucionArlequin, setDevolucionArlequin] = useState("");
  const [cargandoIA, setCargandoIA] = useState(false);

  const iniciarNivel = async (n: number) => {
    setNivel(n);
    setCargandoIA(true);
    setRespondida(false);
    setSeleccionada(null);
    setMensaje("");
    setDevolucionArlequin("");

    const nivelKey = n === 1 ? "facil" : n === 2 ? "medio" : "experto";
    const tiempo = n === 1 ? 20 : n === 2 ? 15 : 10;
    setSegundos(tiempo);

    try {
      // Intentar obtener pregunta fresca generada por Gemini
      const r = await llamar<{ intento?: { pregunta: Pregunta } }>("/api/trivia/iniciar", {
        body: { nivel: nivelKey },
      });
      if (r?.intento?.pregunta) {
        setPreguntaActiva(r.intento.pregunta);
        setCargandoIA(false);
        return;
      }
    } catch {
      // Si ya jugó hoy en la ruta general o no hay API, usar pregunta rotativa del pool extenso
    }

    // Pool rotativo garantizando que NUNCA repita la misma pregunta
    const lista = POOL_PREGUNTAS[n];
    const idx = indicesUsados[n] % lista.length;
    indicesUsados[n] = (indicesUsados[n] + 1) % lista.length;
    setPreguntaActiva(lista[idx]);
    setCargandoIA(false);
  };

  // Timer regresivo con penalización si llega a cero
  useEffect(() => {
    if (!preguntaActiva || respondida || cargandoIA) return;

    if (segundos <= 0) {
      setRespondida(true);
      setMensaje("¡TIEMPO AGOTADO! Penalización de -5 puntos ⏳🔥");
      setDevolucionArlequin("Arlequín dice: '¡Se fue el tiempo volando! El que no arriesga no cruza el charco. ¡A afilar los reflejos para la próxima!' 🎭");
      onAddScore(-5, "Cerebro en Fuga: Tiempo agotado (-5 pts)");
      return;
    }

    const t = setInterval(() => setSegundos((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [segundos, preguntaActiva, respondida, cargandoIA, onAddScore]);

  const responder = (idx: number) => {
    if (respondida || !preguntaActiva) return;
    setRespondida(true);
    setSeleccionada(idx);

    const acerto = idx === preguntaActiva.correcta;
    const basePuntos = nivel === 1 ? 15 : nivel === 2 ? 30 : 50;

    if (acerto) {
      confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 } });
      setMensaje(`¡RESPUESTA BRILLANTE! Sumaste +${basePuntos} puntos 🎉`);
      setDevolucionArlequin("Arlequín dice: '¡Qué puntería descomunal! Sabés más que la enciclopedia. Sumaste puntos de oro para la familia.' 🎭🧠");
      onAddScore(basePuntos, `Cerebro en Fuga (Nivel ${nivel}): Acierto`);
    } else {
      setMensaje(`¡ERROR! La correcta era: "${preguntaActiva.opciones[preguntaActiva.correcta]}" (-10 pts) ❌`);
      setDevolucionArlequin(`Arlequín dice: '¡Casi casi! La respuesta era "${preguntaActiva.opciones[preguntaActiva.correcta]}". ¡De los tropiezos se aprende!' 🎭💪`);
      onAddScore(-10, `Cerebro en Fuga (Nivel ${nivel}): Error (-10 pts)`);
    }
  };

  return (
    <div className="space-y-6 pb-24 text-white">
      {/* Header temático Cerebro en Fuga */}
      <div className="rounded-2xl border-2 border-[#FB6107] bg-[#05112E] p-5 shadow-[0_0_24px_rgba(251,97,7,0.25)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#FB6107] text-white uppercase tracking-wider">
                TRIVIA CON IA GEMINI • CEREBRO EN FUGA
              </span>
              <span className="text-xs text-orange-400 font-bold flex items-center gap-1">
                <Sparkles size={12} /> Preguntas dinámicas sin repetir
              </span>
            </div>
            <h2 className="text-2xl font-black text-white">Cerebro en Fuga</h2>
            <p className="text-xs text-slate-300">
              Desafíos de cultura general, curiosidades y rapidez mental conducidos por Arlequín.
            </p>
          </div>

          <div className="flex gap-2">
            {[
              { id: 1, label: "Fácil (+15)", icon: "🟢" },
              { id: 2, label: "Medio (+30)", icon: "🟡" },
              { id: 3, label: "Experto (+50)", icon: "🔴" },
            ].map((d) => (
              <button
                key={d.id}
                onClick={() => iniciarNivel(d.id)}
                className={`px-3 py-2 rounded-xl text-xs font-black transition border ${
                  nivel === d.id
                    ? "bg-[#FB6107] text-white border-white scale-105 shadow-lg"
                    : "bg-slate-900/80 text-slate-300 border-white/10 hover:border-orange-400"
                }`}
              >
                <span>{d.icon}</span> {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {cargandoIA && (
        <div className="p-12 text-center text-orange-400 flex flex-col items-center justify-center gap-3">
          <RefreshCw size={32} className="animate-spin text-[#FB6107]" />
          <p className="font-bold text-sm">Arlequín y Gemini están creando una pregunta nueva para vos…</p>
        </div>
      )}

      {/* Pregunta Activa */}
      {preguntaActiva && !cargandoIA && (
        <motion.div
          key={preguntaActiva.pregunta}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border-2 border-orange-500/40 bg-slate-900/90 p-6 space-y-5 shadow-2xl relative overflow-hidden"
        >
          {/* Barra de progreso de tiempo */}
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <span className="text-xs font-black tracking-wider text-orange-400 uppercase">
              Nivel {nivel === 1 ? "Fácil" : nivel === 2 ? "Medio" : "Experto"} • {segundos}s restantes
            </span>
            <div className="flex items-center gap-1.5 font-mono text-sm font-bold text-white">
              <Clock size={16} className={segundos <= 5 ? "text-red-400 animate-spin" : "text-orange-400"} />
              <span className={segundos <= 5 ? "text-red-400 font-black text-base" : ""}>{segundos}s</span>
            </div>
          </div>

          <h3 className="text-lg sm:text-xl font-black text-white leading-snug">
            {preguntaActiva.pregunta}
          </h3>

          <div className="grid gap-2.5 sm:grid-cols-2">
            {preguntaActiva.opciones.map((opcion, idx) => {
              const esCorrecta = idx === preguntaActiva.correcta;
              const fueSeleccionada = idx === seleccionada;

              let btnStyle = "bg-slate-800/80 border-white/10 text-white hover:bg-slate-700 hover:border-orange-400";
              if (respondida) {
                if (esCorrecta) {
                  btnStyle = "bg-emerald-600/90 border-emerald-400 text-white font-black scale-[1.02] shadow-lg shadow-emerald-950";
                } else if (fueSeleccionada) {
                  btnStyle = "bg-rose-600/90 border-rose-400 text-white font-black";
                } else {
                  btnStyle = "bg-slate-900/50 border-white/5 text-slate-500 opacity-50";
                }
              }

              return (
                <button
                  key={idx}
                  disabled={respondida}
                  onClick={() => responder(idx)}
                  className={`p-4 rounded-2xl border text-left text-sm font-bold transition flex items-center justify-between ${btnStyle}`}
                >
                  <span>{opcion}</span>
                  {respondida && esCorrecta && <span>✔</span>}
                  {respondida && fueSeleccionada && !esCorrecta && <span>✖</span>}
                </button>
              );
            })}
          </div>

          {/* Explicación y Dato Curioso */}
          <AnimatePresence>
            {respondida && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="rounded-2xl bg-black/40 border border-white/10 p-4 space-y-2 text-xs"
              >
                <p className="font-bold text-sm text-amber-300">{mensaje}</p>
                <p className="text-slate-300 leading-relaxed">
                  <strong>Explicación:</strong> {preguntaActiva.explicacion}
                </p>
                {preguntaActiva.dato_curioso && (
                  <p className="text-cyan-300 flex items-start gap-1.5 pt-1">
                    <Sparkles size={14} className="shrink-0 mt-0.5" />
                    <span><strong>Dato curioso:</strong> {preguntaActiva.dato_curioso}</span>
                  </p>
                )}
                {devolucionArlequin && (
                  <div className="mt-2 pt-2 border-t border-white/10 text-amber-200 font-semibold italic">
                    {devolucionArlequin}
                  </div>
                )}
                <div className="pt-2">
                  <button
                    onClick={() => iniciarNivel(nivel || 1)}
                    className="btn btn-primario px-4 py-2 text-xs font-bold"
                  >
                    Jugar otra pregunta 🎲
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Pantalla Inicial si no eligió nivel */}
      {!preguntaActiva && !cargandoIA && (
        <div className="tarjeta p-8 text-center space-y-4 border-orange-500/30">
          <div className="w-16 h-16 rounded-full bg-orange-500/20 text-[#FB6107] border border-orange-400/40 grid place-items-center mx-auto text-3xl">
            🧠
          </div>
          <h3 className="text-xl font-black text-white">¡Poné a prueba tu conocimiento familiar!</h3>
          <p className="text-xs text-slate-300 max-w-md mx-auto">
            Elegí un nivel arriba para comenzar. Cada acierto suma puntos para tu perfil y el ranking de la familia. ¡Cuidado con el reloj!
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <button onClick={() => iniciarNivel(1)} className="btn btn-primario text-xs font-black px-5 py-2.5">
              Comenzar en Nivel Fácil 🚀
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
