'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Clock, CheckCircle2, ChevronRight, Award, ShieldAlert, Sparkles, RefreshCw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Navegacion } from '@/components/Navegacion';

interface Partido {
  id: string;
  local: string;
  visitante: string;
  escudo_local: string;
  escudo_visitante: string;
  horario: string;
  estadio?: string;
  goles_local: number | null;
  goles_visitante: number | null;
  resultado_oficial: 'L' | 'E' | 'V' | null;
  finalizado: boolean;
}

interface FechaProde {
  id: string;
  numero_fecha: number;
  titulo: string;
  torneo: string;
  limite_pronostico: string;
  estado: 'abierta' | 'en_juego' | 'finalizada';
}

interface PronosticoUsuario {
  pronostico: 'L' | 'E' | 'V';
  golesLocal?: number;
  golesVisitante?: number;
  puntos?: number;
}

interface FamiliarPronostico {
  usuarioId: string;
  nombre: string;
  apodo: string | null;
  pronosticos: Record<string, { pronostico: string; golesLocal?: number; golesVisitante?: number; puntos?: number }>;
  totalPuntosFecha: number;
}

interface RankingUser {
  id: string;
  nombre: string;
  apodo: string | null;
  puntosTotales: number;
  partidosPronosticados: number;
  plenos: number;
  aciertosSimples: number;
}

export default function ProdePage() {
  const [fecha, setFecha] = useState<FechaProde | null>(null);
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [pronosticos, setPronosticos] = useState<Record<string, { pronostico: 'L' | 'E' | 'V'; golesLocal?: number; golesVisitante?: number }>>({});
  const [puntosGuardados, setPuntosGuardados] = useState<Record<string, number>>({});
  const [cerrada, setCerrada] = useState(false);
  const [esAdmin, setEsAdmin] = useState(false);
  const [familiares, setFamiliares] = useState<FamiliarPronostico[]>([]);
  const [ranking, setRanking] = useState<RankingUser[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [tabVista, setTabVista] = useState<'partidos' | 'posiciones' | 'admin'>('partidos');

  // Estado para carga de resultado admin
  const [adminPartidoId, setAdminPartidoId] = useState<string>('');
  const [adminGolesL, setAdminGolesL] = useState<number>(0);
  const [adminGolesV, setAdminGolesV] = useState<number>(0);
  const [procesandoResultado, setProcesandoResultado] = useState(false);

  const cargarDatos = useCallback(async () => {
    try {
      const res = await fetch('/api/prode');
      const data = await res.json();
      if (data.fecha) {
        setFecha(data.fecha);
        setPartidos(data.partidos || []);
        setCerrada(data.cerrada);
        setEsAdmin(data.esAdmin || false);
        setFamiliares(data.pronosticosFamilia || []);

        if (data.misPronosticos) {
          const inicial: Record<string, { pronostico: 'L' | 'E' | 'V'; golesLocal?: number; golesVisitante?: number }> = {};
          const ptsMap: Record<string, number> = {};
          for (const [pId, p] of Object.entries<any>(data.misPronosticos)) {
            inicial[pId] = {
              pronostico: p.pronostico,
              golesLocal: p.golesLocal,
              golesVisitante: p.golesVisitante,
            };
            if (p.puntos !== undefined) ptsMap[pId] = p.puntos;
          }
          setPronosticos(inicial);
          setPuntosGuardados(ptsMap);
        }
      }

      // Cargar ranking
      const resRank = await fetch('/api/prode/ranking');
      const dataRank = await resRank.json();
      if (dataRank.ranking) {
        setRanking(dataRank.ranking);
      }
    } catch (err) {
      console.error('Error al cargar prode:', err);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const setPronosticoSigno = (partidoId: string, signo: 'L' | 'E' | 'V') => {
    if (cerrada) return;
    setPronosticos(prev => ({
      ...prev,
      [partidoId]: {
        ...prev[partidoId],
        pronostico: signo,
      },
    }));
  };

  const setGoles = (partidoId: string, tipo: 'local' | 'visitante', valor: number) => {
    if (cerrada) return;
    const v = Math.max(0, Math.min(20, valor));
    setPronosticos(prev => {
      const actual = prev[partidoId] || { pronostico: 'L' };
      const gl = tipo === 'local' ? v : (actual.golesLocal ?? 0);
      const gv = tipo === 'visitante' ? v : (actual.golesVisitante ?? 0);
      const autoSigno = gl > gv ? 'L' : gl < gv ? 'V' : 'E';
      return {
        ...prev,
        [partidoId]: {
          ...actual,
          golesLocal: gl,
          golesVisitante: gv,
          pronostico: actual.pronostico || autoSigno,
        },
      };
    });
  };

  const guardarTodos = async () => {
    const listado = Object.entries(pronosticos).map(([partidoId, p]) => ({
      partidoId,
      pronostico: p.pronostico,
      golesLocal: p.golesLocal,
      golesVisitante: p.golesVisitante,
    }));

    if (listado.length === 0) return;

    setGuardando(true);
    try {
      const res = await fetch('/api/prode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pronosticos: listado }),
      });
      const data = await res.json();
      if (data.ok) {
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
        setMensajeExito('¡Pronósticos guardados con éxito!');
        setTimeout(() => setMensajeExito(null), 3500);
        await cargarDatos();
      } else {
        alert(data.error || 'No se pudieron guardar los pronósticos.');
      }
    } catch {
      alert('Error de conexión al guardar.');
    } finally {
      setGuardando(false);
    }
  };

  const registrarResultadoAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPartidoId) return;

    setProcesandoResultado(true);
    try {
      const res = await fetch('/api/prode/resultado', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partidoId: adminPartidoId,
          golesLocal: Number(adminGolesL),
          golesVisitante: Number(adminGolesV),
          finalizado: true,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        confetti({ particleCount: 100, spread: 90, origin: { y: 0.5 } });
        setMensajeExito(`¡Resultado oficial cargado! Se evaluaron ${data.pronosticosEvaluados} pronósticos.`);
        setTimeout(() => setMensajeExito(null), 4000);
        await cargarDatos();
      } else {
        alert(data.error || 'Error al procesar el resultado.');
      }
    } catch {
      alert('Error de conexión.');
    } finally {
      setProcesandoResultado(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#070b16] text-white flex flex-col justify-between selection:bg-[#00F5D4] selection:text-black">
      {/* Fondo Neón SINCERICIDIO */}
      <div
        className="fixed inset-0 bg-cover bg-center opacity-15 mix-blend-screen pointer-events-none z-0"
        style={{ backgroundImage: "url('/logos/sincericidio-bg.jpg')" }}
      />
      <div className="fixed top-1/4 -left-32 w-96 h-96 bg-fuchsia-600/15 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="fixed bottom-1/3 -right-32 w-96 h-96 bg-cyan-400/15 rounded-full blur-[140px] pointer-events-none z-0" />

      {/* Navegación Superior */}
      <div className="relative z-20">
        <Navegacion />
      </div>

      <main className="relative z-10 flex-1 w-full max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Cabecera del Prode */}
        <div className="relative overflow-hidden rounded-3xl bg-slate-900/90 border-2 border-fuchsia-500/40 p-6 shadow-[0_0_30px_rgba(255,0,127,0.2)]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-emerald-400 to-cyan-400 text-black uppercase tracking-wider">
                  FECHA {fecha?.numero_fecha || 14}
                </span>
                <span className="text-xs text-fuchsia-300 font-semibold">{fecha?.torneo || 'Liga Profesional'}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2.5">
                <span>⚽</span> EL PRODE DEL FIN DE SEMANA
              </h1>
              <p className="text-xs sm:text-sm text-slate-300">
                Pronosticá los clásicos: Acertar signo (L/E/V) suma <strong className="text-[#00F5D4]">+3 pts</strong>. ¡Marcador exacto otorga un <strong className="text-fuchsia-400">PLENO de +8 pts</strong>!
              </p>
            </div>

            {fecha && (
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-950/80 border border-white/10 shrink-0">
                <Clock size={16} className={cerrada ? "text-rose-400" : "text-amber-400 animate-pulse"} />
                <div className="text-right">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">
                    {cerrada ? 'FECHA CERRADA' : 'CIERRE DE CARGA'}
                  </span>
                  <span className="text-xs font-black text-white">
                    {new Date(fecha.limite_pronostico).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} hs
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Selector de Pestañas */}
          <div className="mt-6 flex items-center gap-2 border-t border-white/10 pt-4 overflow-x-auto">
            <button
              onClick={() => setTabVista('partidos')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
                tabVista === 'partidos'
                  ? 'bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white shadow-lg shadow-fuchsia-600/30'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white'
              }`}
            >
              <span>🎮</span> Mis Pronósticos
            </button>
            <button
              onClick={() => setTabVista('posiciones')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
                tabVista === 'posiciones'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-black shadow-lg shadow-cyan-500/30'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white'
              }`}
            >
              <Trophy size={14} /> Posiciones del Prode
            </button>
            <button
              onClick={() => setTabVista('admin')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
                tabVista === 'admin'
                  ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/30'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white'
              }`}
            >
              <span>⚡</span> Cargar Resultados
            </button>
          </div>
        </div>

        {/* Notificación flotante de guardado */}
        {mensajeExito && (
          <div className="p-4 rounded-2xl bg-emerald-950/90 border border-emerald-400/50 text-emerald-300 font-bold text-sm flex items-center gap-3 shadow-xl animate-bounce">
            <CheckCircle2 size={20} />
            <span>{mensajeExito}</span>
          </div>
        )}

        {cargando ? (
          <div className="py-20 text-center text-slate-400 flex items-center justify-center gap-2">
            <RefreshCw className="animate-spin" size={18} />
            <span>Cargando partidos de la fecha...</span>
          </div>
        ) : (
          <>
            {/* VISTA 1: PARTIDOS Y PRONÓSTICOS */}
            {tabVista === 'partidos' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-black text-white flex items-center gap-2">
                    <span>🔥</span> Partidos del Fin de Semana ({partidos.length})
                  </h2>
                  {!cerrada && (
                    <button
                      onClick={guardarTodos}
                      disabled={guardando || Object.keys(pronosticos).length === 0}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 text-black font-black text-xs shadow-lg hover:scale-105 active:scale-95 disabled:opacity-40 transition"
                    >
                      {guardando ? 'Guardando…' : 'Guardar Todo 💾'}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {partidos.map((p) => {
                    const pr = pronosticos[p.id];
                    const pts = puntosGuardados[p.id];

                    return (
                      <div
                        key={p.id}
                        className={`relative overflow-hidden rounded-2xl bg-slate-900/90 border p-4 shadow-xl transition ${
                          p.finalizado
                            ? pts === 8
                              ? 'border-fuchsia-400/80 shadow-[0_0_15px_rgba(255,0,127,0.3)]'
                              : pts === 3
                              ? 'border-emerald-400/80 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                              : 'border-slate-800 opacity-80'
                            : pr?.pronostico
                            ? 'border-cyan-400/50'
                            : 'border-white/10 hover:border-white/20'
                        }`}
                      >
                        {/* Estado o Badge Superior */}
                        <div className="flex items-center justify-between text-xs mb-3 text-slate-400">
                          <span className="font-semibold">{p.horario}</span>
                          <div className="flex items-center gap-2">
                            {p.estadio && <span className="text-[11px] text-slate-500">{p.estadio}</span>}
                            {p.finalizado ? (
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                                pts === 8 ? 'bg-fuchsia-500 text-white animate-pulse' :
                                pts === 3 ? 'bg-emerald-500 text-black' : 'bg-slate-700 text-slate-300'
                              }`}>
                                {pts === 8 ? '🎯 PLENO +8 PTS' : pts === 3 ? '✅ ACIERTO +3 PTS' : 'FINAL'}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-cyan-300">
                                POR JUGAR
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Equipos y Marcador */}
                        <div className="flex items-center justify-between gap-3 my-2">
                          {/* Local */}
                          <div className="flex-1 flex items-center gap-2">
                            <span className="text-2xl drop-shadow">{p.escudo_local}</span>
                            <span className="font-extrabold text-sm text-white">{p.local}</span>
                          </div>

                          {/* Marcador Real (si finalizó) o VS */}
                          <div className="px-3 py-1 rounded-xl bg-slate-950/80 border border-white/10 text-center shrink-0">
                            {p.finalizado ? (
                              <div className="flex items-center gap-1.5 font-black text-lg text-amber-300">
                                <span>{p.goles_local}</span>
                                <span>-</span>
                                <span>{p.goles_visitante}</span>
                              </div>
                            ) : (
                              <span className="text-xs font-black text-slate-500">VS</span>
                            )}
                          </div>

                          {/* Visitante */}
                          <div className="flex-1 flex items-center justify-end gap-2 text-right">
                            <span className="font-extrabold text-sm text-white">{p.visitante}</span>
                            <span className="text-2xl drop-shadow">{p.escudo_visitante}</span>
                          </div>
                        </div>

                        {/* Botones de Pronóstico L - E - V */}
                        <div className="mt-4 pt-3 border-t border-white/5 space-y-2.5">
                          <div className="flex items-center justify-between text-xs text-slate-400">
                            <span>Tu pronóstico:</span>
                            <span className="text-[11px] font-bold text-fuchsia-300">Marcador exacto (opcional):</span>
                          </div>

                          <div className="flex items-center justify-between gap-3">
                            {/* Botones L - E - V */}
                            <div className="grid grid-cols-3 gap-1.5 flex-1">
                              {(['L', 'E', 'V'] as const).map((signo) => {
                                const activo = pr?.pronostico === signo;
                                return (
                                  <button
                                    key={signo}
                                    type="button"
                                    disabled={cerrada}
                                    onClick={() => setPronosticoSigno(p.id, signo)}
                                    className={`py-2 rounded-xl font-black text-xs transition ${
                                      activo
                                        ? signo === 'L'
                                          ? 'bg-[#00F5D4] text-black shadow-lg shadow-[#00F5D4]/40 scale-105'
                                          : signo === 'E'
                                          ? 'bg-[#FFE600] text-black shadow-lg shadow-[#FFE600]/40 scale-105'
                                          : 'bg-[#FF007F] text-white shadow-lg shadow-[#FF007F]/40 scale-105'
                                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                    }`}
                                  >
                                    {signo === 'L' ? 'L (Local)' : signo === 'E' ? 'E (Empate)' : 'V (Visita)'}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Inputs de marcador exacto para Pleno */}
                            <div className="flex items-center gap-1 shrink-0 bg-slate-950/70 p-1 rounded-xl border border-white/10">
                              <input
                                type="number"
                                min={0}
                                max={15}
                                disabled={cerrada}
                                value={pr?.golesLocal ?? ''}
                                onChange={(e) => setGoles(p.id, 'local', parseInt(e.target.value) || 0)}
                                placeholder="0"
                                className="w-8 h-8 rounded-lg bg-slate-900 text-center font-black text-xs text-cyan-300 border border-cyan-400/30 focus:outline-none"
                              />
                              <span className="text-slate-500 font-bold text-xs">-</span>
                              <input
                                type="number"
                                min={0}
                                max={15}
                                disabled={cerrada}
                                value={pr?.golesVisitante ?? ''}
                                onChange={(e) => setGoles(p.id, 'visitante', parseInt(e.target.value) || 0)}
                                placeholder="0"
                                className="w-8 h-8 rounded-lg bg-slate-900 text-center font-black text-xs text-pink-300 border border-pink-400/30 focus:outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {!cerrada && (
                  <div className="pt-2 text-center">
                    <button
                      onClick={guardarTodos}
                      disabled={guardando || Object.keys(pronosticos).length === 0}
                      className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 text-black font-black text-sm tracking-wider shadow-[0_0_25px_rgba(0,245,212,0.4)] hover:scale-105 active:scale-95 disabled:opacity-40 transition"
                    >
                      {guardando ? 'GUARDANDO PRONÓSTICOS…' : 'GUARDAR MIS PRONÓSTICOS 🚀'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* VISTA 2: TABLA DE POSICIONES Y RANKING */}
            {tabVista === 'posiciones' && (
              <div className="space-y-6">
                <div className="bg-slate-900/90 rounded-2xl border border-white/10 p-5 shadow-xl">
                  <h3 className="text-lg font-black text-white flex items-center gap-2 mb-4">
                    <Trophy className="text-amber-400" /> Tabla Anual del Prode Familiar
                  </h3>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-white/10 text-xs font-black text-slate-400 uppercase">
                          <th className="py-2.5 px-3">#</th>
                          <th className="py-2.5 px-3">Familiar</th>
                          <th className="py-2.5 px-3 text-center">Pronósticos</th>
                          <th className="py-2.5 px-3 text-center text-fuchsia-400">Plenos (8pts)</th>
                          <th className="py-2.5 px-3 text-center text-emerald-400">Aciertos (3pts)</th>
                          <th className="py-2.5 px-3 text-right text-amber-300">Total Puntos</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {ranking.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-6 text-center text-slate-500">
                              Aún no hay puntos evaluados en esta fecha. ¡Cargá tus pronósticos!
                            </td>
                          </tr>
                        ) : (
                          ranking.map((r, idx) => (
                            <tr key={r.id} className="hover:bg-white/5 transition">
                              <td className="py-3 px-3 font-black text-slate-400">
                                {idx === 0 ? '👑 1' : idx + 1}
                              </td>
                              <td className="py-3 px-3 font-bold text-white flex items-center gap-2">
                                <span className="h-7 w-7 rounded-full bg-gradient-to-tr from-pink-500 to-cyan-400 flex items-center justify-center text-xs font-black text-black">
                                  {r.nombre[0]}
                                </span>
                                <span>{r.apodo || r.nombre}</span>
                              </td>
                              <td className="py-3 px-3 text-center text-slate-300">{r.partidosPronosticados}</td>
                              <td className="py-3 px-3 text-center font-extrabold text-fuchsia-400">{r.plenos}</td>
                              <td className="py-3 px-3 text-center font-extrabold text-emerald-400">{r.aciertosSimples}</td>
                              <td className="py-3 px-3 text-right font-black text-amber-300 text-base">{r.puntosTotales}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Pronósticos de la familia en vivo */}
                {familiares.length > 0 && (
                  <div className="bg-slate-900/90 rounded-2xl border border-white/10 p-5 shadow-xl space-y-4">
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                      <span>👥</span> Pronósticos de los miembros en la fecha actual
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {familiares.map((f) => (
                        <div key={f.usuarioId} className="p-3.5 rounded-xl bg-slate-950/70 border border-white/5 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm text-cyan-300">{f.apodo || f.nombre}</span>
                            <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-xs font-black">
                              {f.totalPuntosFecha} pts
                            </span>
                          </div>
                          <div className="text-xs text-slate-400">
                            Pronosticó {Object.keys(f.pronosticos).length} partidos
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* VISTA 3: CARGA / SIMULACIÓN DE RESULTADOS OFICIALES */}
            {tabVista === 'admin' && (
              <div className="bg-slate-900/90 rounded-3xl border-2 border-amber-400/40 p-6 shadow-2xl space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-black uppercase">
                      PANEL DE CONTROL
                    </span>
                    <span className="text-xs text-amber-300 font-bold">Carga Oficial de Partidos</span>
                  </div>
                  <h3 className="text-xl font-black text-white">Ingresar Resultados de la Fecha</h3>
                  <p className="text-xs text-slate-300 mt-1">
                    Al cargar el resultado real, el sistema calculará automáticamente los aciertos (+3) y plenos (+8) de cada familiar, sumando los puntos al ranking al instante.
                  </p>
                </div>

                <form onSubmit={registrarResultadoAdmin} className="space-y-4 max-w-lg">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Seleccionar Partido:</label>
                    <select
                      value={adminPartidoId}
                      onChange={(e) => {
                        setAdminPartidoId(e.target.value);
                        const match = partidos.find(p => p.id === e.target.value);
                        if (match && match.goles_local !== null) {
                          setAdminGolesL(match.goles_local);
                          setAdminGolesV(match.goles_visitante ?? 0);
                        }
                      }}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                      required
                    >
                      <option value="">-- Elegí un partido --</option>
                      {partidos.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.local} vs {p.visitante} {p.finalizado ? `(Actual: ${p.goles_local}-${p.goles_visitante})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-cyan-300 mb-1.5">Goles Local:</label>
                      <input
                        type="number"
                        min={0}
                        max={15}
                        value={adminGolesL}
                        onChange={(e) => setAdminGolesL(parseInt(e.target.value) || 0)}
                        className="w-full bg-slate-950 border border-cyan-400/40 rounded-xl p-3 text-center text-lg font-black text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-pink-300 mb-1.5">Goles Visitante:</label>
                      <input
                        type="number"
                        min={0}
                        max={15}
                        value={adminGolesV}
                        onChange={(e) => setAdminGolesV(parseInt(e.target.value) || 0)}
                        className="w-full bg-slate-950 border border-pink-400/40 rounded-xl p-3 text-center text-lg font-black text-white focus:outline-none focus:ring-2 focus:ring-pink-400"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={procesandoResultado || !adminPartidoId}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 disabled:opacity-40 text-black font-black text-sm tracking-wide shadow-lg transition"
                  >
                    {procesandoResultado ? 'Liquidando Partido…' : 'Liquidar Partido y Asignar Puntos 🏆'}
                  </button>
                </form>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
