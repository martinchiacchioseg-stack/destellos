'use client';

import { useEffect, useState, useTransition } from 'react';
import Header from '@/components/Header';
import Navbar from '@/components/Navbar';
import RuletaTambor from '@/components/RuletaTambor';
import SponsorAd from '@/components/SponsorAd';
import { dispararConfeti } from '@/components/ConfettiCelebration';
import {
  Gamepad2,
  Sparkles,
  Trophy,
  Flame,
  Clock,
  HelpCircle,
  Vote,
  Camera,
  RotateCw,
  Check,
  AlertCircle,
  Calendar,
  Send,
  Trash2,
  Smile,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import {
  SesionUsuario,
  JuegoRuletaRonda,
  JuegoRuletaPregunta,
  ProdeFecha,
  ProdePartido,
  ProdePronostico,
  RetoDiario,
  Publicidad,
} from '@/lib/types';
import UploadModal from '@/components/UploadModal';

type TabJuego = 'ruleta' | 'prode' | 'reto' | 'voto' | 'adivina' | 'pasado';

export default function JuegosPage() {
  const [usuario, setUsuario] = useState<(SesionUsuario & { grupo_nombre?: string }) | null>(null);
  const [tabActivo, setTabActivo] = useState<TabJuego>('ruleta');
  const [cargando, setCargando] = useState(true);
  const [puntosTotales, setPuntosTotales] = useState(16);
  const [modalUploadAbierto, setModalUploadAbierto] = useState(false);

  // Estados de Ruleta Rusa
  const [rondaRuleta, setRondaRuleta] = useState<JuegoRuletaRonda | null>(null);
  const [preguntasRuleta, setPreguntasRuleta] = useState<JuegoRuletaPregunta[]>([]);
  const [textoPregunta, setTextoPregunta] = useState('');
  const [nivelPregunta, setNivelPregunta] = useState<'suave' | 'picante' | 'extra_picante'>('suave');
  const [preguntaAsignada, setPreguntaAsignada] = useState<JuegoRuletaPregunta | null>(null);
  const [esBalaAsignada, setEsBalaAsignada] = useState(false);
  const [respuestaRuleta, setRespuestaRuleta] = useState('');
  const [enviandoPregunta, setEnviandoPregunta] = useState(false);
  const [enviandoRespuesta, setEnviandoRespuesta] = useState(false);
  const [errorRuleta, setErrorRuleta] = useState<string | null>(null);
  const [mensajeExitoRuleta, setMensajeExitoRuleta] = useState<string | null>(null);

  // Estados de Prode
  const [prodeFecha, setProdeFecha] = useState<ProdeFecha | null>(null);
  const [prodePartidos, setProdePartidos] = useState<ProdePartido[]>([]);
  const [misPronosticos, setMisPronosticos] = useState<ProdePronostico[]>([]);
  const [prodeAd, setProdeAd] = useState<Publicidad | null>(null);
  const [marcadorInputs, setMarcadorInputs] = useState<Record<string, { local: string; visitante: string }>>({});
  const [sincronizandoProde, setSincronizandoProde] = useState(false);

  // Estados de Reto del Día
  const [retoDiario, setRetoDiario] = useState<RetoDiario | null>(null);

  // Estados de Votación Cruzada
  const [votoCandidatos, setVotoCandidatos] = useState<any[]>([]);
  const [miVotoId, setMiVotoId] = useState<string | null>(null);

  // Estados de Adiviná Quién la Sacó
  const [adivinaData, setAdivinaData] = useState<{
    destellos: any[];
    miembros: any[];
    yaRespondio: boolean;
    respuestasGuardadas: Record<string, string>;
  } | null>(null);
  const [respuestasAdivina, setRespuestasAdivina] = useState<Record<string, string>>({});

  // Estados de Foto del Pasado
  const [fotoPasado, setFotoPasado] = useState<any | null>(null);
  const [miAdivinanzaPasado, setMiAdivinanzaPasado] = useState<any | null>(null);
  const [anioInput, setAnioInput] = useState('');

  // Cargar usuario inicial
  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) setUsuario(data.usuario);
      });
  }, []);

  // Cargar datos del juego activo
  const cargarJuego = async (tab: TabJuego) => {
    setCargando(true);
    try {
      if (tab === 'ruleta') {
        const res = await fetch('/api/juegos/ruleta');
        if (res.ok) {
          const data = await res.json();
          setRondaRuleta(data.ronda);
          setPreguntasRuleta(data.preguntas || []);
          // Ver si ya tiene una pregunta asignada al usuario
          if (data.ronda && data.ronda.estado !== 'preguntas' && usuario) {
            const asignada = (data.preguntas || []).find((p: JuegoRuletaPregunta) => p.destinatario_id === usuario.id);
            if (asignada) {
              setPreguntaAsignada(asignada);
              setEsBalaAsignada(Boolean(asignada.es_bala));
            }
          }
        }
      } else if (tab === 'prode') {
        const res = await fetch('/api/juegos/prode');
        if (res.ok) {
          const data = await res.json();
          setProdeFecha(data.fecha);
          setProdePartidos(data.partidos || []);
          setMisPronosticos(data.misPronosticos || []);
          setProdeAd(data.publicidad || null);

          // Inicializar marcadores
          const marcadoresMap: Record<string, { local: string; visitante: string }> = {};
          (data.misPronosticos || []).forEach((p: ProdePronostico) => {
            marcadoresMap[p.partido_id] = {
              local: p.goles_local !== null && p.goles_local !== undefined ? String(p.goles_local) : '',
              visitante: p.goles_visitante !== null && p.goles_visitante !== undefined ? String(p.goles_visitante) : '',
            };
          });
          setMarcadorInputs(marcadoresMap);
        }
      } else if (tab === 'reto') {
        const res = await fetch('/api/juegos/reto');
        if (res.ok) {
          const data = await res.json();
          setRetoDiario(data.reto);
        }
      } else if (tab === 'voto') {
        const res = await fetch('/api/juegos/voto-cruzado');
        if (res.ok) {
          const data = await res.json();
          setVotoCandidatos(data.candidatos || []);
          setMiVotoId(data.miVotoDestelloId || null);
        }
      } else if (tab === 'adivina') {
        const res = await fetch('/api/juegos/adivina');
        if (res.ok) {
          const data = await res.json();
          setAdivinaData(data);
          if (data.respuestasGuardadas) {
            setRespuestasAdivina(data.respuestasGuardadas);
          }
        }
      } else if (tab === 'pasado') {
        const res = await fetch('/api/juegos/foto-pasado');
        if (res.ok) {
          const data = await res.json();
          setFotoPasado(data.foto);
          setMiAdivinanzaPasado(data.miAdivinanza);
        }
      }
    } catch (err) {
      console.error('Error cargando juego:', err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarJuego(tabActivo);
  }, [tabActivo, usuario?.id]);

  // Ruleta: Abrir Ronda (Admin)
  const handleAbrirRondaRuleta = async () => {
    try {
      const res = await fetch('/api/juegos/ruleta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'abrir_ronda', nivelMaximo: 'extra_picante' }),
      });
      if (res.ok) {
        cargarJuego('ruleta');
      }
    } catch {}
  };

  // Ruleta: Enviar Pregunta con moderación Gemini
  const handleEnviarPregunta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rondaRuleta || !textoPregunta.trim()) return;

    setEnviandoPregunta(true);
    setErrorRuleta(null);
    setMensajeExitoRuleta(null);

    try {
      const res = await fetch('/api/juegos/ruleta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: 'enviar_pregunta',
          rondaId: rondaRuleta.id,
          texto: textoPregunta,
          nivel: nivelPregunta,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorRuleta(data.error || 'La pregunta fue observada por Gemini.');
        return;
      }

      setTextoPregunta('');
      setMensajeExitoRuleta(data.mensaje || '¡Pregunta anónima cargada!');
      dispararConfeti();
      cargarJuego('ruleta');
    } catch {
      setErrorRuleta('Error de conexión al enviar la pregunta.');
    } finally {
      setEnviandoPregunta(false);
    }
  };

  // Ruleta: Tambor giró
  const handleRuletaGirada = async (salioBala: boolean, recamara: number) => {
    if (!rondaRuleta) return;
    try {
      await fetch('/api/juegos/ruleta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'girar', rondaId: rondaRuleta.id }),
      });
      cargarJuego('ruleta');
    } catch {}
  };

  // Ruleta: Responder pregunta
  const handleResponderRuleta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preguntaAsignada) return;

    setEnviandoRespuesta(true);
    setErrorRuleta(null);

    try {
      const res = await fetch('/api/juegos/ruleta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: 'responder',
          preguntaId: preguntaAsignada.id,
          respuestaTexto: respuestaRuleta,
          respuestaMediaUrl: '',
        }),
      });

      if (res.ok) {
        dispararConfeti();
        setRespuestaRuleta('');
        cargarJuego('ruleta');
      }
    } catch {
      setErrorRuleta('Error al guardar respuesta.');
    } finally {
      setEnviandoRespuesta(false);
    }
  };

  // Ruleta: Pasar pregunta (1 vez por ronda)
  const handlePasarRuleta = async () => {
    if (!preguntaAsignada) return;
    try {
      const res = await fetch('/api/juegos/ruleta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'pasar', preguntaId: preguntaAsignada.id }),
      });
      if (res.ok) {
        cargarJuego('ruleta');
      }
    } catch {}
  };

  // Ruleta: Reaccionar a una respuesta
  const handleReaccionarRuleta = async (preguntaId: string, tipo: 'risa' | 'fuego' | 'amor') => {
    try {
      await fetch('/api/juegos/ruleta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'reaccionar', preguntaId, tipo }),
      });
      cargarJuego('ruleta');
    } catch {}
  };

  // Prode: Guardar Pronóstico
  const handlePronosticar = async (partidoId: string, pronostico: 'local' | 'empate' | 'visitante') => {
    try {
      const marcador = marcadorInputs[partidoId] || { local: '', visitante: '' };
      const res = await fetch('/api/juegos/prode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: 'pronosticar',
          partidoId,
          pronostico,
          golesLocal: marcador.local !== '' ? parseInt(marcador.local) : undefined,
          golesVisitante: marcador.visitante !== '' ? parseInt(marcador.visitante) : undefined,
        }),
      });

      if (res.ok) {
        cargarJuego('prode');
      }
    } catch {}
  };

  // Prode: Sincronizar partidos (Admin)
  const handleSincronizarProde = async () => {
    setSincronizandoProde(true);
    try {
      await fetch('/api/juegos/prode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'sincronizar' }),
      });
      cargarJuego('prode');
    } catch {
    } finally {
      setSincronizandoProde(false);
    }
  };

  // Votación Cruzada: Votar
  const handleVotar = async (destelloId: string) => {
    try {
      const res = await fetch('/api/juegos/voto-cruzado', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destelloId }),
      });
      if (res.ok) {
        setMiVotoId(destelloId);
        dispararConfeti();
        cargarJuego('voto');
      }
    } catch {}
  };

  // Adiviná Quién la Sacó: Enviar respuestas
  const handleEnviarAdivinanzas = async () => {
    if (!adivinaData) return;
    const arrayRespuestas = Object.entries(respuestasAdivina).map(([destello_id, usuario_adivinado_id]) => ({
      destello_id,
      usuario_adivinado_id,
    }));

    try {
      const res = await fetch('/api/juegos/adivina', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ respuestas: arrayRespuestas }),
      });
      if (res.ok) {
        dispararConfeti();
        cargarJuego('adivina');
      }
    } catch {}
  };

  // Foto del Pasado: Adivinar año
  const handleAdivinarFotoPasado = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fotoPasado || !anioInput) return;

    try {
      const res = await fetch('/api/juegos/foto-pasado', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: 'adivinar',
          foto_pasado_id: fotoPasado.id,
          anio_adivinado: parseInt(anioInput),
        }),
      });

      if (res.ok) {
        dispararConfeti();
        cargarJuego('pasado');
      }
    } catch {}
  };

  const tabs: { id: TabJuego; label: string; icon: any; badge?: string }[] = [
    { id: 'ruleta', label: 'Ruleta Rusa', icon: RotateCw, badge: 'Etapa 6' },
    { id: 'prode', label: 'Prode', icon: Trophy, badge: 'Etapa 7' },
    { id: 'reto', label: 'Reto Diario', icon: Flame, badge: '+2 pts' },
    { id: 'voto', label: 'Voto Cruzado', icon: Vote, badge: '+1 pt' },
    { id: 'adivina', label: 'Adiviná Quién', icon: HelpCircle, badge: '+1 pt' },
    { id: 'pasado', label: 'Foto del Pasado', icon: Calendar, badge: '+3 pts' },
  ];

  return (
    <div className="flex-1 flex flex-col pb-20">
      <Header usuario={usuario} puntosTotales={puntosTotales} />

      <main className="p-4 space-y-4 max-w-lg mx-auto w-full">
        {/* Selector de Juegos (Pills horizontales scrolleables) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {tabs.map((t) => {
            const Icon = t.icon;
            const activo = tabActivo === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTabActivo(t.id)}
                className={`px-3.5 py-2.5 rounded-2xl font-black text-xs shrink-0 flex items-center gap-1.5 transition-all shadow-sm ${
                  activo
                    ? 'bg-gradient-to-r from-[#FF7043] to-[#FFA726] text-white shadow-orange-500/20 scale-102'
                    : 'bg-white dark:bg-[#201D24] text-gray-700 dark:text-gray-300 border border-[var(--border-soft)] hover:bg-orange-50/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${activo ? 'animate-bounce' : ''}`} />
                <span>{t.label}</span>
                {t.badge && (
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                      activo ? 'bg-white/30 text-white' : 'bg-orange-100 text-[#FF7043]'
                    }`}
                  >
                    {t.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ------------------------------------------------------------------------- */}
        {/* 1. RULETA RUSA */}
        {/* ------------------------------------------------------------------------- */}
        {tabActivo === 'ruleta' && (
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-rose-500/10 p-5 rounded-3xl border border-amber-200 dark:border-amber-900/50 shadow-soft">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-[#FF7043] flex items-center justify-center">
                  <RotateCw className="w-4 h-4 animate-spin-slow" />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-800 dark:text-gray-100">
                    Ruleta Rusa Familiar 🎲
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Preguntas anónimas moderadas por Gemini y 1 recámara con bala 💥
                  </p>
                </div>
              </div>

              {/* Botón Admin para abrir ronda */}
              {!rondaRuleta && (usuario?.rol === 'admin' || usuario?.rol === 'superadmin') && (
                <div className="mt-4 p-4 bg-white dark:bg-[#201D24] rounded-2xl border text-center space-y-2">
                  <p className="text-xs text-gray-600 dark:text-gray-300 font-medium">
                    No hay ronda activa. Como administrador podés abrir la Ruleta de la semana:
                  </p>
                  <button
                    onClick={handleAbrirRondaRuleta}
                    className="w-full py-3 px-4 rounded-xl bg-[#FF7043] text-white font-black text-xs hover:bg-[#F4511E] shadow-md shadow-orange-500/20"
                  >
                    Abrir Nueva Ronda de Ruleta 🎯
                  </button>
                </div>
              )}

              {/* Estado: Preguntas Abiertas */}
              {rondaRuleta && rondaRuleta.estado === 'preguntas' && (
                <div className="mt-4 space-y-4">
                  <div className="p-3 bg-white dark:bg-[#201D24] rounded-2xl border border-[var(--border-soft)]">
                    <h4 className="text-xs font-black text-gray-700 dark:text-gray-200 mb-2 flex items-center gap-1.5">
                      <Send className="w-3.5 h-3.5 text-[#FF7043]" />
                      Escribí tu pregunta anónima
                    </h4>

                    <form onSubmit={handleEnviarPregunta} className="space-y-3">
                      <textarea
                        value={textoPregunta}
                        onChange={(e) => setTextoPregunta(e.target.value)}
                        placeholder="Ej: ¿Quién es el más vago para lavar los platos después de cenar? 🤔"
                        rows={2}
                        className="w-full p-3 text-xs rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-black/20 focus:ring-2 focus:ring-[#FF7043] outline-none"
                      />

                      {/* Nivel de picante */}
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-gray-500">Nivel:</span>
                        {(['suave', 'picante', 'extra_picante'] as const).map((lvl) => (
                          <button
                            key={lvl}
                            type="button"
                            onClick={() => setNivelPregunta(lvl)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-black capitalize transition-colors ${
                              nivelPregunta === lvl
                                ? lvl === 'suave'
                                  ? 'bg-emerald-500 text-white'
                                  : lvl === 'picante'
                                  ? 'bg-amber-500 text-white'
                                  : 'bg-rose-500 text-white'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                            }`}
                          >
                            {lvl === 'suave' ? 'Suave 🌿' : lvl === 'picante' ? 'Picante 🌶️' : 'Extra 🔥'}
                          </button>
                        ))}
                      </div>

                      {/* Error moderación Gemini */}
                      {errorRuleta && (
                        <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          <span>{errorRuleta}</span>
                        </div>
                      )}

                      {mensajeExitoRuleta && (
                        <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                          <Check className="w-4 h-4 shrink-0" />
                          <span>{mensajeExitoRuleta}</span>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={enviandoPregunta || !textoPregunta.trim()}
                        className="w-full py-2.5 px-4 rounded-xl bg-[#FF7043] hover:bg-[#F4511E] disabled:bg-gray-300 text-white font-bold text-xs shadow-md shadow-orange-500/20 flex items-center justify-center gap-1.5"
                      >
                        {enviandoPregunta ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Gemini moderando pregunta...</span>
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Cargar pregunta anónima</span>
                          </>
                        )}
                      </button>
                    </form>
                  </div>

                  {/* Tambor Ruleta para girar cuando ya hay preguntas */}
                  <div className="bg-white dark:bg-[#201D24] p-4 rounded-3xl border border-[var(--border-soft)] text-center space-y-3">
                    <p className="text-xs text-gray-500 font-bold">
                      Preguntas cargadas: {preguntasRuleta.length}
                    </p>
                    <RuletaTambor onGirarCompleto={handleRuletaGirada} />
                  </div>
                </div>
              )}

              {/* Estado: Girada y esperando respuestas */}
              {rondaRuleta && rondaRuleta.estado !== 'preguntas' && (
                <div className="mt-4 space-y-4">
                  {preguntaAsignada && !preguntaAsignada.respondida ? (
                    <div className="p-4 bg-white dark:bg-[#201D24] rounded-2xl border-2 border-[#FF7043] space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-orange-100 text-[#FF7043]">
                          Pregunta para vos
                        </span>
                        {esBalaAsignada && (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-500 text-white animate-pulse">
                            ¡Salió la Bala! 💥
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-black text-gray-800 dark:text-gray-100">
                        {preguntaAsignada.texto}
                      </h4>

                      {esBalaAsignada ? (
                        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 text-center space-y-2">
                          <p className="text-xs text-rose-700 dark:text-rose-300 font-bold">
                            ¡Tenés que responder con una foto o video corto! 📸🎬
                          </p>
                          <button
                            onClick={() => setModalUploadAbierto(true)}
                            className="py-2 px-4 rounded-xl bg-rose-500 text-white text-xs font-black shadow-md flex items-center justify-center gap-1.5 mx-auto"
                          >
                            <Camera className="w-4 h-4" />
                            <span>Subir foto o video</span>
                          </button>
                        </div>
                      ) : (
                        <form onSubmit={handleResponderRuleta} className="space-y-2">
                          <textarea
                            value={respuestaRuleta}
                            onChange={(e) => setRespuestaRuleta(e.target.value)}
                            placeholder="Escribí tu respuesta sincera y divertida... ✍️"
                            rows={3}
                            className="w-full p-3 text-xs rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-black/20 focus:ring-2 focus:ring-[#FF7043] outline-none"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              type="submit"
                              disabled={enviandoRespuesta || !respuestaRuleta.trim()}
                              className="flex-1 py-2.5 px-4 rounded-xl bg-[#FF7043] text-white font-bold text-xs shadow-md"
                            >
                              {enviandoRespuesta ? 'Enviando...' : 'Responder (+2 pts) 🚀'}
                            </button>
                            {!preguntaAsignada.pasada && (
                              <button
                                type="button"
                                onClick={handlePasarRuleta}
                                className="px-3 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-bold"
                              >
                                Pasar (1 vez)
                              </button>
                            )}
                          </div>
                        </form>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 rounded-2xl text-center text-xs text-emerald-800 dark:text-emerald-300 font-bold">
                      ¡Ya respondiste tu recámara de la Ruleta! Mirá abajo las del grupo. ✨
                    </div>
                  )}

                  {/* Feed de Preguntas y Respuestas con Reacciones */}
                  <div className="space-y-3 pt-2">
                    <h4 className="text-xs font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Respuestas del grupo
                    </h4>
                    {preguntasRuleta
                      .filter((p) => p.respondida)
                      .map((p) => (
                        <div
                          key={p.id}
                          className="p-4 bg-white dark:bg-[#201D24] rounded-2xl border border-[var(--border-soft)] space-y-2 shadow-sm"
                        >
                          <div className="flex items-center justify-between text-[11px] text-gray-400">
                            <span>
                              Preguntó: <b>{p.autor_nombre || 'Anónimo'}</b>
                            </span>
                            <span>
                              Respondió: <b>{p.destinatario_nombre || 'Miembro'}</b>
                            </span>
                          </div>

                          <p className="text-xs font-bold text-gray-800 dark:text-gray-100">
                            &quot;{p.texto}&quot;
                          </p>

                          <div className="p-2.5 rounded-xl bg-orange-50/60 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30 text-xs text-gray-700 dark:text-gray-200">
                            {p.respuesta_texto || (
                              <span className="italic text-gray-400">Respuesta multimedia subida 📸</span>
                            )}
                          </div>

                          {/* Reacciones */}
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              onClick={() => handleReaccionarRuleta(p.id, 'risa')}
                              className="px-2.5 py-1 rounded-lg bg-gray-50 dark:bg-gray-800 text-xs font-bold flex items-center gap-1 hover:scale-105 transition-transform"
                            >
                              <span>😂</span>
                              <span>{p.reacciones_risa || 0}</span>
                            </button>
                            <button
                              onClick={() => handleReaccionarRuleta(p.id, 'fuego')}
                              className="px-2.5 py-1 rounded-lg bg-gray-50 dark:bg-gray-800 text-xs font-bold flex items-center gap-1 hover:scale-105 transition-transform"
                            >
                              <span>🔥</span>
                              <span>{p.reacciones_fuego || 0}</span>
                            </button>
                            <button
                              onClick={() => handleReaccionarRuleta(p.id, 'amor')}
                              className="px-2.5 py-1 rounded-lg bg-gray-50 dark:bg-gray-800 text-xs font-bold flex items-center gap-1 hover:scale-105 transition-transform"
                            >
                              <span>❤️</span>
                              <span>{p.reacciones_amor || 0}</span>
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------------- */}
        {/* 2. PRODE DEL FIN DE SEMANA */}
        {/* ------------------------------------------------------------------------- */}
        {tabActivo === 'prode' && (
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-blue-500/10 p-5 rounded-3xl border border-emerald-200 dark:border-emerald-900/50 shadow-soft">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                    <Trophy className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-gray-800 dark:text-gray-100">
                      {prodeFecha?.torneo_nombre || 'Liga Profesional de Fútbol ⚽'}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {prodeFecha?.nombre || 'Fecha del fin de semana'}
                    </p>
                  </div>
                </div>

                {usuario?.rol === 'admin' && (
                  <button
                    onClick={handleSincronizarProde}
                    disabled={sincronizandoProde}
                    className="p-2 rounded-xl bg-emerald-100 text-emerald-700 text-xs font-bold hover:bg-emerald-200 transition-colors"
                    title="Sincronizar fixture con la API"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${sincronizandoProde ? 'animate-spin' : ''}`} />
                  </button>
                )}
              </div>

              {/* Publicidad de Prode si existe */}
              {prodeAd && (
                <div className="mb-4">
                  <SponsorAd publicidad={prodeAd} />
                </div>
              )}

              {/* Lista de Partidos */}
              <div className="space-y-3">
                {prodePartidos.map((partido) => {
                  const pick = misPronosticos.find((p) => p.partido_id === partido.id);
                  const bloqueado = partido.estado !== 'programado';

                  return (
                    <div
                      key={partido.id}
                      className="p-4 bg-white dark:bg-[#201D24] rounded-2xl border border-[var(--border-soft)] space-y-3 shadow-sm"
                    >
                      {/* Horario y Estado */}
                      <div className="flex items-center justify-between text-[11px] font-bold text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {partido.fecha_hora_texto || 'Fin de semana'} hs (Hora Arg)
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] ${
                            partido.estado === 'finalizado'
                              ? 'bg-gray-100 text-gray-600'
                              : partido.estado === 'en_juego'
                              ? 'bg-rose-100 text-rose-600 animate-pulse'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {partido.estado === 'finalizado'
                            ? `Final: ${partido.goles_local} - ${partido.goles_visitante}`
                            : partido.estado === 'en_juego'
                            ? 'En vivo 🔴'
                            : 'Abierto'}
                        </span>
                      </div>

                      {/* Equipos */}
                      <div className="flex items-center justify-between gap-3 text-center">
                        {/* Local */}
                        <div className="flex-1 flex flex-col items-center gap-1.5">
                          <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-800 p-1.5 flex items-center justify-center shadow-inner">
                            {partido.escudo_local ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={partido.escudo_local}
                                alt={partido.equipo_local}
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <span className="text-xs font-black">⚽</span>
                            )}
                          </div>
                          <span className="text-xs font-black text-gray-800 dark:text-gray-100 leading-tight">
                            {partido.equipo_local}
                          </span>
                        </div>

                        <span className="text-xs font-extrabold text-gray-300">VS</span>

                        {/* Visitante */}
                        <div className="flex-1 flex flex-col items-center gap-1.5">
                          <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-800 p-1.5 flex items-center justify-center shadow-inner">
                            {partido.escudo_visitante ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={partido.escudo_visitante}
                                alt={partido.equipo_visitante}
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <span className="text-xs font-black">⚽</span>
                            )}
                          </div>
                          <span className="text-xs font-black text-gray-800 dark:text-gray-100 leading-tight">
                            {partido.equipo_visitante}
                          </span>
                        </div>
                      </div>

                      {/* Botones de Pronóstico: Local / Empate / Visitante */}
                      <div className="grid grid-cols-3 gap-2 pt-1">
                        <button
                          disabled={bloqueado}
                          onClick={() => handlePronosticar(partido.id, 'local')}
                          className={`py-2 px-3 rounded-xl text-xs font-black transition-all ${
                            pick?.pronostico === 'local'
                              ? 'bg-emerald-600 text-white shadow-md scale-102'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-emerald-50'
                          }`}
                        >
                          L (Gana Local)
                        </button>

                        <button
                          disabled={bloqueado}
                          onClick={() => handlePronosticar(partido.id, 'empate')}
                          className={`py-2 px-3 rounded-xl text-xs font-black transition-all ${
                            pick?.pronostico === 'empate'
                              ? 'bg-emerald-600 text-white shadow-md scale-102'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-emerald-50'
                          }`}
                        >
                          X (Empate)
                        </button>

                        <button
                          disabled={bloqueado}
                          onClick={() => handlePronosticar(partido.id, 'visitante')}
                          className={`py-2 px-3 rounded-xl text-xs font-black transition-all ${
                            pick?.pronostico === 'visitante'
                              ? 'bg-emerald-600 text-white shadow-md scale-102'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-emerald-50'
                          }`}
                        >
                          V (Visitante)
                        </button>
                      </div>

                      {/* Estado del Acierto */}
                      {pick && partido.estado === 'finalizado' && (
                        <div
                          className={`p-2 rounded-xl text-center text-xs font-bold ${
                            pick.acertado
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {pick.acertado
                            ? `¡Acertaste! +${pick.puntos_ganados} pts 🎯`
                            : 'No acertaste esta vez ❌'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------------- */}
        {/* 3. RETO DEL DÍA */}
        {/* ------------------------------------------------------------------------- */}
        {tabActivo === 'reto' && (
          <div className="bg-white dark:bg-[#201D24] p-5 rounded-3xl border border-[var(--border-soft)] shadow-soft space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-orange-100 text-[#FF7043] flex items-center justify-center">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-black text-gray-800 dark:text-gray-100">
                  Reto Creativo de Hoy 🎯
                </h3>
                <p className="text-xs text-gray-400">Generado cada mañana por Gemini</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-br from-[#FFF8EE] to-[#FFF0E0] dark:from-[#29221C] dark:to-[#1F1916] border border-[#FFE0B2] dark:border-[#3E2D22] space-y-2">
              <span className="text-[10px] font-black uppercase text-[#FF7043] tracking-wider">
                Tema del día
              </span>
              <h4 className="text-base font-black text-gray-900 dark:text-gray-100">
                {retoDiario?.tema || 'Cosas rojas o una merienda casera ☕🍰'}
              </h4>
              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                {retoDiario?.descripcion ||
                  'Subí una foto donde predomine el color rojo o se vea una rica comida compartida en familia. Si cumplís el reto, sumás +2 puntos extra.'}
              </p>
            </div>

            <button
              onClick={() => setModalUploadAbierto(true)}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#FF7043] to-[#FFA726] text-white font-black text-xs shadow-md shadow-orange-500/20 flex items-center justify-center gap-2"
            >
              <Camera className="w-4 h-4" />
              <span>Subir foto con este reto (+2 pts)</span>
            </button>
          </div>
        )}

        {/* ------------------------------------------------------------------------- */}
        {/* 4. VOTACIÓN CRUZADA */}
        {/* ------------------------------------------------------------------------- */}
        {tabActivo === 'voto' && (
          <div className="bg-white dark:bg-[#201D24] p-5 rounded-3xl border border-[var(--border-soft)] shadow-soft space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                <Vote className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-black text-gray-800 dark:text-gray-100">
                  Votación Cruzada del Día
                </h3>
                <p className="text-xs text-gray-400">Elegí tu destello favorito (+1 pt al votar)</p>
              </div>
            </div>

            {votoCandidatos.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-400">
                Aún no hay suficientes fotos de otros miembros para votar hoy. ¡Avisales al grupo! 📲
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {votoCandidatos.map((cand) => {
                  const yaVoteEste = miVotoId === cand.id;
                  return (
                    <div
                      key={cand.id}
                      className={`p-3 rounded-2xl border transition-all ${
                        yaVoteEste
                          ? 'border-rose-400 bg-rose-50/50 dark:bg-rose-950/20 shadow-md'
                          : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1E1B22]'
                      }`}
                    >
                      <div className="relative aspect-square rounded-xl overflow-hidden bg-black/5 mb-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={cand.media_url}
                          alt="Destello para votar"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-300 italic mb-2 line-clamp-2">
                        &quot;{cand.pie_de_foto || 'Sin descripción'}&quot;
                      </p>
                      <button
                        onClick={() => handleVotar(cand.id)}
                        disabled={Boolean(miVotoId)}
                        className={`w-full py-2 px-3 rounded-xl text-xs font-black transition-all ${
                          yaVoteEste
                            ? 'bg-rose-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-rose-50'
                        }`}
                      >
                        {yaVoteEste ? '¡Tu voto! ❤️' : 'Votar este destello'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------------------- */}
        {/* 5. ADIVINÁ QUIÉN LA SACÓ */}
        {/* ------------------------------------------------------------------------- */}
        {tabActivo === 'adivina' && (
          <div className="bg-white dark:bg-[#201D24] p-5 rounded-3xl border border-[var(--border-soft)] shadow-soft space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                <HelpCircle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-black text-gray-800 dark:text-gray-100">
                  Adiviná Quién la Sacó 🕵️‍♂️
                </h3>
                <p className="text-xs text-gray-400">Fotos sin nombre: ¿sabés quién fue?</p>
              </div>
            </div>

            {adivinaData?.destellos && adivinaData.destellos.length > 0 ? (
              <div className="space-y-4">
                {adivinaData.destellos.map((d: any) => (
                  <div
                    key={d.id}
                    className="p-3.5 bg-gray-50/70 dark:bg-gray-900/40 rounded-2xl border border-gray-200/70 dark:border-gray-800 space-y-2.5"
                  >
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-black/5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={d.media_url} alt="Foto para adivinar" className="w-full h-full object-cover" />
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-gray-500">¿Quién la sacó?:</span>
                      <select
                        disabled={adivinaData.yaRespondio}
                        value={respuestasAdivina[d.id] || ''}
                        onChange={(e) =>
                          setRespuestasAdivina({ ...respuestasAdivina, [d.id]: e.target.value })
                        }
                        className="flex-1 p-2 text-xs rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1E1B22]"
                      >
                        <option value="">Seleccionar miembro...</option>
                        {adivinaData.miembros.map((m: any) => (
                          <option key={m.id} value={m.id}>
                            {m.apodo || m.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}

                {!adivinaData.yaRespondio && (
                  <button
                    onClick={handleEnviarAdivinanzas}
                    className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md"
                  >
                    Confirmar mis respuestas (+1 pt por acierto) 🎯
                  </button>
                )}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-gray-400">
                No hay fotos pendientes para adivinar hoy. ¡Volvé más tarde! 🌟
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------------------- */}
        {/* 6. FOTO DEL PASADO */}
        {/* ------------------------------------------------------------------------- */}
        {tabActivo === 'pasado' && (
          <div className="bg-white dark:bg-[#201D24] p-5 rounded-3xl border border-[var(--border-soft)] shadow-soft space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-black text-gray-800 dark:text-gray-100">
                  Foto del Pasado 🕰️
                </h3>
                <p className="text-xs text-gray-400">Juego semanal retro: ¿de qué año es?</p>
              </div>
            </div>

            {fotoPasado ? (
              <div className="space-y-3">
                <div className="relative aspect-4/3 rounded-2xl overflow-hidden shadow-md bg-black/5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={fotoPasado.media_url} alt="Foto del pasado" className="w-full h-full object-cover" />
                </div>

                <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 rounded-2xl border border-amber-200/50 text-xs text-amber-900 dark:text-amber-200">
                  <b>Pista:</b> {fotoPasado.pista || 'Vacaciones familiares inolvidables...'}
                </div>

                {!miAdivinanzaPasado && !fotoPasado.esPropia ? (
                  <form onSubmit={handleAdivinarFotoPasado} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1950"
                        max="2025"
                        placeholder="Ej: 1998"
                        value={anioInput}
                        onChange={(e) => setAnioInput(e.target.value)}
                        className="w-full p-3 text-sm rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1E1B22] font-black text-center"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!anioInput}
                      className="w-full py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs shadow-md"
                    >
                      Adivinar año (+3 pts año exacto / +1 aprox) 🚀
                    </button>
                  </form>
                ) : (
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 rounded-2xl text-center space-y-1">
                    <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      Año real: <b>{fotoPasado.anio_real}</b> ({fotoPasado.lugar_real})
                    </p>
                    {miAdivinanzaPasado && (
                      <p className="text-xs text-gray-500">
                        Tu respuesta: {miAdivinanzaPasado.anio_adivinado} — Puntos ganados:{' '}
                        +{miAdivinanzaPasado.puntos_ganados} pts ✨
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-gray-400">
                Esta semana todavía no subieron una Foto del Pasado. ¡El primero que suba una suma puntos! 📸
              </div>
            )}
          </div>
        )}
      </main>

      <UploadModal
        isOpen={modalUploadAbierto}
        onClose={() => setModalUploadAbierto(false)}
        onUploadSuccess={() => cargarJuego(tabActivo)}
      />

      <Navbar />
    </div>
  );
}
