'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Brain,
  Clock,
  Sparkles,
  Trophy,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Share2,
  Flame,
  Zap,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';
import { DificultadTrivia, TriviaPregunta, TriviaIntento, SesionUsuario } from '@/lib/types';
import { dispararConfeti } from '@/components/ConfettiCelebration';

interface TriviaDiariaProps {
  usuario: SesionUsuario | null;
  onPuntosActualizados?: (delta: number) => void;
  onFinalizarDesafio?: () => void;
}

const OPCIONES_DIFICULTAD: Array<{
  id: DificultadTrivia;
  nombre: string;
  tiempo: number;
  opciones: number;
  puntosAcierto: number;
  puntosPenalizacion: number;
  descripcion: string;
  badge: string;
  gradiente: string;
  borde: string;
  textoColor: string;
}> = [
  {
    id: 'facil',
    nombre: 'Fácil 🎭',
    tiempo: 15,
    opciones: 3,
    puntosAcierto: 1,
    puntosPenalizacion: 0,
    descripcion: 'Cultura general, cine popular, música y curiosidades accesibles.',
    badge: '+1 pt · Sin penalización',
    gradiente: 'from-emerald-500/10 via-teal-500/10 to-green-500/10',
    borde: 'border-emerald-300 dark:border-emerald-800',
    textoColor: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    id: 'medio',
    nombre: 'Medio 💡',
    tiempo: 20,
    opciones: 4,
    puntosAcierto: 3,
    puntosPenalizacion: 0,
    descripcion: 'Ingenio, historia, deportes o ciencia cotidiana para pensar un poco.',
    badge: '+3 pts · Desafío equilibrado',
    gradiente: 'from-amber-500/10 via-orange-500/10 to-yellow-500/10',
    borde: 'border-amber-300 dark:border-amber-800',
    textoColor: 'text-amber-600 dark:text-amber-400',
  },
  {
    id: 'dificil',
    nombre: 'Experto 🔥',
    tiempo: 25,
    opciones: 4,
    puntosAcierto: 5,
    puntosPenalizacion: 0,
    descripcion: 'Datos insólitos, récords mundiales y preguntas desafiantes para sabiondos.',
    badge: '+5 pts · Máximo premio',
    gradiente: 'from-rose-500/10 via-red-500/10 to-purple-500/10',
    borde: 'border-rose-300 dark:border-rose-800',
    textoColor: 'text-rose-600 dark:text-rose-400',
  },
];

export default function TriviaDiaria({
  usuario,
  onPuntosActualizados,
  onFinalizarDesafio,
}: TriviaDiariaProps) {
  const [cargando, setCargando] = useState(true);
  const [yaJugo, setYaJugo] = useState(false);
  const [intentoPrevio, setIntentoPrevio] = useState<TriviaIntento | null>(null);
  const [preguntaJugada, setPreguntaJugada] = useState<TriviaPregunta | null>(null);

  // Estados del juego activo
  const [dificultadSeleccionada, setDificultadSeleccionada] = useState<DificultadTrivia | null>(null);
  const [preguntaActiva, setPreguntaActiva] = useState<TriviaPregunta | null>(null);
  const [jugando, setJugando] = useState(false);
  const [cargandoPregunta, setCargandoPregunta] = useState(false);
  const [tiempoRestante, setTiempoRestante] = useState(20);
  const [tiempoTotal, setTiempoTotal] = useState(20);
  const [respuestaSeleccionada, setRespuestaSeleccionada] = useState<number | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [resultadoFinal, setResultadoFinal] = useState<{
    acerto: boolean;
    puntos: number;
    intento: TriviaIntento;
    pregunta: TriviaPregunta;
    evaluacionArlequin?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Cargar estado del día al montar
  useEffect(() => {
    cargarEstadoTrivia();
  }, []);

  const cargarEstadoTrivia = async () => {
    try {
      setCargando(true);
      setError(null);
      const res = await fetch('/api/juegos/trivia');
      if (!res.ok) throw new Error('Error al consultar estado de la trivia');
      const data = await res.json();
      if (data.yaJugo) {
        setYaJugo(true);
        setIntentoPrevio(data.intento);
        setPreguntaJugada(data.pregunta);
      } else {
        setYaJugo(false);
      }
    } catch (err: any) {
      console.error(err);
      setError('No pudimos cargar la trivia. Intentá de nuevo.');
    } finally {
      setCargando(false);
    }
  };

  // 2. Temporizador regresivo en juego
  useEffect(() => {
    if (!jugando || enviando) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setTiempoRestante((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleResponder(-1, true); // Tiempo agotado
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [jugando, enviando, preguntaActiva]);

  // 3. Comenzar desafío con la dificultad elegida
  const handleElegirDificultad = async (dif: DificultadTrivia) => {
    try {
      setCargandoPregunta(true);
      setError(null);
      setDificultadSeleccionada(dif);

      const res = await fetch(`/api/juegos/trivia?dificultad=${dif}`);
      if (!res.ok) throw new Error('Error al obtener la pregunta del día');
      const data = await res.json();

      if (data.yaJugo) {
        setYaJugo(true);
        setIntentoPrevio(data.intento);
        setPreguntaJugada(data.pregunta);
        return;
      }

      const preg = data.pregunta;
      setPreguntaActiva(preg);
      setTiempoTotal(preg.time_limit_seconds || 20);
      setTiempoRestante(preg.time_limit_seconds || 20);
      setRespuestaSeleccionada(null);
      setJugando(true);
    } catch (err: any) {
      console.error(err);
      setError('No pudimos iniciar el juego. Probá de nuevo.');
    } finally {
      setCargandoPregunta(false);
    }
  };

  // 4. Enviar respuesta del usuario o timeout
  const handleResponder = async (indice: number, tiempoAgotado: boolean = false) => {
    if (!preguntaActiva || enviando) return;
    setEnviando(true);
    setJugando(false);
    setRespuestaSeleccionada(indice);

    if (timerRef.current) clearInterval(timerRef.current);

    try {
      const res = await fetch('/api/juegos/trivia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preguntaId: preguntaActiva.id,
          selectedIndex: indice,
          respuestaIndex: indice,
          tiempoAgotado,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al procesar respuesta');
      }

      setResultadoFinal(data);
      setYaJugo(true);
      setIntentoPrevio(data.intento);
      setPreguntaJugada(data.pregunta);

      if (data.acerto) {
        dispararConfeti();
      }

      if (onPuntosActualizados && data.puntos !== 0) {
        onPuntosActualizados(data.puntos);
      }

      // Disparar anuncio de fin de desafío luego de una pequeña pausa
      setTimeout(() => {
        if (onFinalizarDesafio) {
          onFinalizarDesafio();
        }
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al enviar tu respuesta.');
    } finally {
      setEnviando(false);
    }
  };

  // 5. Compartir en WhatsApp
  const handleCompartirWhatsApp = (
    acerto: boolean,
    puntos: number,
    dificultad: string,
    pregunta: string
  ) => {
    const estado = acerto
      ? `🎉 ¡Acerté la Trivia Diaria y sumé +${puntos} puntos!`
      : `😅 ¡Casi! La Trivia Diaria me sacó chispas en nivel ${dificultad}.`;
    const texto = `${estado}\n\nPregunta: "${pregunta}"\n\n¿Te animás a superarme hoy en Destellos? 🧠🔥`;
    const url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
    window.open(url, '_blank');
  };

  if (cargando) {
    return (
      <div className="p-8 text-center space-y-3 bg-white dark:bg-[#1E1B24] rounded-3xl border border-purple-100 dark:border-purple-900 shadow-soft">
        <RefreshCw className="w-8 h-8 mx-auto text-indigo-500 animate-spin" />
        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Cargando la Trivia Diaria...</p>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // VISTA A: Ya jugó hoy (o acaba de terminar su intento)
  // ---------------------------------------------------------------------------
  const intentoMostrar = resultadoFinal?.intento || intentoPrevio;
  const preguntaMostrar = resultadoFinal?.pregunta || preguntaJugada;

  if (yaJugo && intentoMostrar && preguntaMostrar) {
    const acerto = intentoMostrar.acerto;
    const tiempoAgotado = Boolean(intentoMostrar.tiempo_agotado || (intentoMostrar.selected_index !== undefined && intentoMostrar.selected_index < 0));
    const puntos = intentoMostrar.puntos_obtenidos;
    const reglaDif =
      OPCIONES_DIFICULTAD.find(
        (d) => d.id === (intentoMostrar.difficulty || preguntaMostrar.difficulty)
      ) || OPCIONES_DIFICULTAD[1];

    const correctIndex = preguntaMostrar.correct_answer_index ?? preguntaMostrar.correct_index ?? 0;
    const selectedIndex = intentoMostrar.respuesta_elegida_index ?? intentoMostrar.selected_index ?? -1;

    return (
      <div className="space-y-4">
        <div className="p-5 bg-white dark:bg-[#1E1B24] rounded-3xl border border-purple-200 dark:border-purple-800 shadow-soft space-y-4">
          {/* Header del resultado */}
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
            <div className="flex items-center gap-2">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                  acerto
                    ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                    : 'bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                }`}
              >
                {acerto ? <Trophy className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="text-base font-black text-gray-900 dark:text-white">
                  {acerto ? '¡Respuesta Correcta! 🎉' : tiempoAgotado ? '¡Tiempo Agotado! ⏳' : '¡Respuesta Incorrecta! ❌'}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Desafío del día completado · Nivel {reglaDif?.nombre || intentoMostrar.difficulty}
                </p>
              </div>
            </div>

            <div
              className={`px-3 py-1.5 rounded-full font-black text-xs ${
                puntos > 0
                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
              }`}
            >
              {puntos > 0 ? `+${puntos} pts` : `0 pts`}
            </div>
          </div>

          {/* Devolución con voz / personalidad de Arlequín */}
          {(resultadoFinal?.evaluacionArlequin || intentoMostrar.evaluacion_arlequin) && (
            <div className="p-3.5 bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-pink-500/10 rounded-2xl border border-purple-200 dark:border-purple-800 text-xs text-purple-900 dark:text-purple-200 space-y-1">
              <span className="font-black flex items-center gap-1.5 text-purple-700 dark:text-purple-300">
                <span>🎭</span> Devolución de Arlequín:
              </span>
              <p className="text-[12px] font-medium leading-relaxed italic">
                "{resultadoFinal?.evaluacionArlequin || intentoMostrar.evaluacion_arlequin}"
              </p>
            </div>
          )}

          {/* Pregunta y Opciones reveladas */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              <span>Categoría: {preguntaMostrar.category}</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> {preguntaMostrar.time_limit_seconds || 20}s
              </span>
            </div>

            <p className="text-sm font-black text-gray-800 dark:text-gray-100 leading-snug">
              {preguntaMostrar.question}
            </p>

            <div className="space-y-2 pt-1">
              {preguntaMostrar.options.map((opcion, idx) => {
                const esLaCorrecta = idx === correctIndex;
                const esLaElegida = idx === selectedIndex;

                let estilo =
                  'bg-gray-50 dark:bg-gray-800/40 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400';
                let icon = null;

                if (esLaCorrecta) {
                  estilo =
                    'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-400 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 font-black shadow-sm ring-1 ring-emerald-400';
                  icon = <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />;
                } else if (esLaElegida && !esLaCorrecta) {
                  estilo =
                    'bg-rose-50 dark:bg-rose-950/50 border-rose-400 dark:border-rose-700 text-rose-700 dark:text-rose-300 line-through';
                  icon = <XCircle className="w-4 h-4 text-rose-500 shrink-0" />;
                }

                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-2xl border text-xs flex items-center justify-between transition-all ${estilo}`}
                  >
                    <span>{opcion}</span>
                    {icon}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Explicación y Dato Curioso */}
          <div className="space-y-2.5 pt-2 border-t border-gray-100 dark:border-gray-800">
            {preguntaMostrar.explanation && (
              <div className="p-3 bg-blue-50/80 dark:bg-blue-950/30 rounded-2xl border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-200">
                <span className="font-bold flex items-center gap-1 mb-0.5">
                  <HelpCircle className="w-3.5 h-3.5 text-blue-500" />
                  ¿Por qué?
                </span>
                <p className="text-[11.5px] leading-relaxed">{preguntaMostrar.explanation}</p>
              </div>
            )}

            {preguntaMostrar.fun_fact && (
              <div className="p-3 bg-amber-50/80 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200">
                <span className="font-bold flex items-center gap-1 mb-0.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Dato Curioso:
                </span>
                <p className="text-[11.5px] leading-relaxed">{preguntaMostrar.fun_fact}</p>
              </div>
            )}
          </div>

          {/* Botón WhatsApp para picar al grupo */}
          <button
            onClick={() =>
              handleCompartirWhatsApp(
                acerto,
                puntos,
                reglaDif?.nombre || 'Trivia',
                preguntaMostrar.question
              )
            }
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 active:scale-98 transition-all"
          >
            <Share2 className="w-4 h-4" />
            Compartir resultado en el grupo de WhatsApp 📲
          </button>

          {/* Botón de reinicio para Superadmin */}
          {usuario?.rol === 'superadmin' && (
            <button
              onClick={async () => {
                await fetch('/api/juegos/trivia?reset=1');
                setYaJugo(false);
                setResultadoFinal(null);
                setIntentoPrevio(null);
                setPreguntaJugada(null);
                setJugando(false);
                setDificultadSeleccionada(null);
                setPreguntaActiva(null);
              }}
              className="w-full py-2.5 text-xs font-bold text-gray-500 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-300 border border-dashed border-gray-300 dark:border-gray-700 rounded-2xl transition-all flex items-center justify-center gap-2 hover:bg-purple-50 dark:hover:bg-purple-950/20"
            >
              🛠️ [Superadmin] Reiniciar turno para volver a probar
            </button>
          )}

          <p className="text-[11px] text-center text-gray-400">
            ⏰ Ya jugaste tu turno del día. Mañana a las 00:00 hs se renueva la Trivia Diaria.
          </p>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // VISTA B: Pregunta en curso (Contador regresivo activo)
  // ---------------------------------------------------------------------------
  if (jugando && preguntaActiva) {
    const porcentajeTiempo = Math.max(0, Math.min(100, (tiempoRestante / tiempoTotal) * 100));
    const esCritico = tiempoRestante <= 5;
    const reglaDif = OPCIONES_DIFICULTAD.find((d) => d.id === dificultadSeleccionada);

    return (
      <div className="p-5 bg-white dark:bg-[#1E1B24] rounded-3xl border border-purple-200 dark:border-purple-800 shadow-soft space-y-4">
        {/* Cabecera de la pregunta activa */}
        <div className="flex items-center justify-between">
          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            {preguntaActiva.category}
          </span>
          <span className="text-xs font-black text-purple-600 dark:text-purple-400">
            Nivel {reglaDif?.nombre} ({preguntaActiva.points_win} pts)
          </span>
        </div>

        {/* Barra de Tiempo Regresivo */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-black">
            <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
              <Clock className={`w-3.5 h-3.5 ${esCritico ? 'text-rose-500 animate-spin' : ''}`} />
              Tiempo restante:
            </span>
            <span
              className={`text-base font-black tabular-nums ${
                esCritico ? 'text-rose-600 animate-pulse' : 'text-gray-800 dark:text-gray-100'
              }`}
            >
              {tiempoRestante}s
            </span>
          </div>

          <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-1000 rounded-full ${
                esCritico
                  ? 'bg-rose-500'
                  : tiempoRestante <= 10
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${porcentajeTiempo}%` }}
            />
          </div>
        </div>

        {/* Texto de la Pregunta */}
        <div className="py-2">
          <h3 className="text-sm md:text-base font-black text-gray-900 dark:text-white leading-relaxed">
            {preguntaActiva.question}
          </h3>
        </div>

        {/* Botones de Opciones */}
        <div className="space-y-2.5">
          {preguntaActiva.options.map((opcion, idx) => {
            const esSeleccionada = respuestaSeleccionada === idx;
            return (
              <button
                key={idx}
                disabled={enviando}
                onClick={() => handleResponder(idx, false)}
                className={`w-full p-3.5 rounded-2xl border text-left text-xs font-bold transition-all shadow-sm flex items-center justify-between group active:scale-98 ${
                  esSeleccionada
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-indigo-500/20'
                    : 'bg-gray-50 dark:bg-gray-800/40 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40 border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-200 hover:border-indigo-300'
                }`}
              >
                <span>{opcion}</span>
                <span
                  className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-black shrink-0 ${
                    esSeleccionada
                      ? 'border-white text-white'
                      : 'border-gray-300 dark:border-gray-600 text-gray-400 group-hover:border-indigo-400 group-hover:text-indigo-500'
                  }`}
                >
                  {String.fromCharCode(65 + idx)}
                </span>
              </button>
            );
          })}
        </div>

        {enviando && (
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 rounded-2xl text-center text-xs text-indigo-600 dark:text-indigo-300 font-bold flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Verificando respuesta...
          </div>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // VISTA C: Selección de Nivel de Dificultad (Pantalla Principal)
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-4">
      {/* Banner Principal con Arlequín como Anfitrión */}
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-700 p-5 rounded-3xl text-white shadow-lg space-y-2">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl shadow-inner select-none">
            🎭
          </div>
          <div>
            <h3 className="text-base font-black text-white">Trivia de Arlequín ✨</h3>
            <p className="text-xs text-purple-100 font-medium">
              Tu anfitrión te desafía · Elegí la dificultad y sumá puntos
            </p>
          </div>
        </div>
        <p className="text-[11.5px] text-white/90 leading-relaxed pt-1">
          ¡A mayor nivel, mayor es el premio para el ranking familiar! Elegí con sabiduría y Arlequín evaluará tu respuesta.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/50 rounded-2xl border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Tarjetas de Nivel */}
      <div className="space-y-3">
        {OPCIONES_DIFICULTAD.map((dif) => {
          return (
            <div
              key={dif.id}
              className={`p-4 rounded-3xl border bg-gradient-to-br ${dif.gradiente} ${dif.borde} bg-white dark:bg-[#1E1B24] shadow-soft space-y-3 transition-all hover:shadow-md`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-1.5">
                    {dif.nombre === 'Fácil' && <Sparkles className="w-4 h-4 text-emerald-500" />}
                    {dif.nombre === 'Medio' && <Zap className="w-4 h-4 text-amber-500" />}
                    {dif.nombre.includes('Difícil') && <Flame className="w-4 h-4 text-rose-500" />}
                    Nivel {dif.nombre}
                  </h4>
                  <p className="text-[11.5px] text-gray-600 dark:text-gray-300 mt-0.5">{dif.descripcion}</p>
                </div>

                <span
                  className={`text-[10px] font-black px-2.5 py-1 rounded-full border bg-white dark:bg-black/30 shrink-0 ${dif.textoColor} ${dif.borde}`}
                >
                  {dif.badge}
                </span>
              </div>

              {/* Métricas rápidas */}
              <div className="flex items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400 font-medium pt-1">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  {dif.tiempo} segundos
                </span>
                <span>•</span>
                <span>{dif.opciones} opciones</span>
                <span>•</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">+{dif.puntosAcierto} pts</span>
              </div>

              {/* Botón de Jugar */}
              <button
                disabled={cargandoPregunta}
                onClick={() => handleElegirDificultad(dif.id)}
                className={`w-full py-3 px-4 rounded-2xl font-black text-xs text-white shadow-md active:scale-98 transition-all flex items-center justify-center gap-2 ${
                  dif.id === 'facil'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-emerald-500/20'
                    : dif.id === 'medio'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-amber-500/20'
                    : 'bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 shadow-rose-500/20'
                }`}
              >
                {cargandoPregunta && dificultadSeleccionada === dif.id ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Cargando pregunta...
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4" />
                    Jugar en {dif.nombre} ({dif.tiempo}s) 🚀
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
