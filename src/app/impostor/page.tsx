'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye,
  Shield,
  ShieldAlert,
  Clock,
  Sparkles,
  Camera,
  Send,
  MessageSquare,
  Trophy,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Unlock,
  RefreshCw,
  HelpCircle,
  Award,
  Zap,
  RotateCcw,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Navegacion } from '@/components/Navegacion';

interface JugadorPista {
  usuarioId: string;
  nombre: string;
  tienePista: boolean;
  pistaTexto?: string | null;
  pistaFotoUrl?: string | null;
  esElMismo: boolean;
  votoSospechosoId?: string | null;
  rol?: 'civil' | 'impostor' | null;
  puntosObtenidos?: number;
  motivoPuntos?: string | null;
}

interface Comentario {
  id: string;
  nombre: string;
  mensaje: string;
  creadoEn: string;
  usuarioId: string;
}

interface RankingUser {
  usuarioId: string;
  nombre: string;
  puntos: number;
  partidas: number;
}

export default function ImpostorPage() {
  const [cargando, setCargando] = useState(true);
  const [activo, setActivo] = useState(false);
  const [enPausa, setEnPausa] = useState(false);
  const [motivoPausa, setMotivoPausa] = useState<string | null>(null);
  const [esAdmin, setEsAdmin] = useState(false);
  const [partida, setPartida] = useState<any>(null);
  const [miRol, setMiRol] = useState<'civil' | 'impostor'>('civil');
  const [soyImpostor, setSoyImpostor] = useState(false);
  const [miPista, setMiPista] = useState<{ texto: string | null; fotoUrl: string | null; enviada: boolean }>({
    texto: null,
    fotoUrl: null,
    enviada: false,
  });
  const [miVoto, setMiVoto] = useState<string | null>(null);
  const [jugadores, setJugadores] = useState<JugadorPista[]>([]);
  const [ranking, setRanking] = useState<RankingUser[]>([]);
  const [config, setConfig] = useState<any>(null);

  // Estados de interfaz
  const [mostrarRol, setMostrarRol] = useState(false);
  const [textoPistaInput, setTextoPistaInput] = useState('');
  const [archivoFoto, setArchivoFoto] = useState<File | null>(null);
  const [previewFoto, setPreviewFoto] = useState<string | null>(null);
  const [guardandoPista, setGuardandoPista] = useState(false);
  const [guardandoVoto, setGuardandoVoto] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  // Debate efímero
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [nuevoComentario, setNuevoComentario] = useState('');
  const [enviandoComentario, setEnviandoComentario] = useState(false);

  // Tiro de gracia
  const [tiroGraciaInput, setTiroGraciaInput] = useState('');
  const [enviandoTiro, setEnviandoTiro] = useState(false);
  const [resultadoTiro, setResultadoTiro] = useState<string | null>(null);

  // Modo de prueba admin
  const [ejecutandoTest, setEjecutandoTest] = useState(false);
  const [tabVista, setTabVista] = useState<'juego' | 'posiciones'>('juego');

  const cargarDatos = useCallback(async () => {
    try {
      const res = await fetch('/api/impostor');
      const data = await res.json();

      if (data.activo === false) {
        setActivo(false);
        setEsAdmin(data.esAdmin || false);
        setCargando(false);
        return;
      }

      setActivo(true);
      setEnPausa(data.enPausa || false);
      setMotivoPausa(data.motivoPausa || null);
      setEsAdmin(data.esAdmin || false);
      setConfig(data.config || null);

      if (data.partida) {
        setPartida(data.partida);
        setMiRol(data.miRol || 'civil');
        setSoyImpostor(data.soyImpostor || false);
        setMiPista(data.miPista || { texto: null, fotoUrl: null, enviada: false });
        if (data.miPista?.texto) setTextoPistaInput(data.miPista.texto);
        setMiVoto(data.miVoto || null);
        setJugadores(data.jugadores || []);
        setRanking(data.ranking || []);
      }
    } catch (err) {
      console.error('Error cargando El Impostor:', err);
    } finally {
      setCargando(false);
    }
  }, []);

  const cargarComentarios = useCallback(async () => {
    try {
      const res = await fetch('/api/impostor/comentario');
      const data = await res.json();
      if (Array.isArray(data.comentarios)) {
        setComentarios(data.comentarios);
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    cargarDatos();
    const interval = setInterval(cargarDatos, 30_000);
    return () => clearInterval(interval);
  }, [cargarDatos]);

  useEffect(() => {
    if (partida?.estado === 'fase_2_votacion') {
      cargarComentarios();
      const intervalC = setInterval(cargarComentarios, 10_000);
      return () => clearInterval(intervalC);
    }
  }, [partida?.estado, cargarComentarios]);

  // Enviar Pista (Fase 1)
  const handleEnviarPista = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textoPistaInput.trim()) return;

    setGuardandoPista(true);
    setAviso(null);

    try {
      const fd = new FormData();
      fd.append('pista', textoPistaInput.trim());
      if (archivoFoto) fd.append('foto', archivoFoto);

      const res = await fetch('/api/impostor/pista', {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();

      if (!res.ok) {
        setAviso({ tipo: 'error', texto: data.error || 'No se pudo guardar la pista.' });
      } else {
        setAviso({ tipo: 'ok', texto: '¡Pista guardada con éxito en secreto!' });
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
        await cargarDatos();
      }
    } catch (err: any) {
      setAviso({ tipo: 'error', texto: err.message || 'Error al conectar.' });
    } finally {
      setGuardandoPista(false);
    }
  };

  // Votar Sospechoso (Fase 2)
  const handleVotar = async (sospechosoId: string) => {
    setGuardandoVoto(true);
    setAviso(null);

    try {
      const res = await fetch('/api/impostor/voto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sospechosoId }),
      });
      const data = await res.json();

      if (!res.ok) {
        setAviso({ tipo: 'error', texto: data.error || 'No se pudo registrar el voto.' });
      } else {
        setMiVoto(sospechosoId);
        setAviso({ tipo: 'ok', texto: '¡Voto secreto registrado!' });
        await cargarDatos();
      }
    } catch (err: any) {
      setAviso({ tipo: 'error', texto: err.message || 'Error al votar.' });
    } finally {
      setGuardandoVoto(false);
    }
  };

  // Enviar Comentario de Debate
  const handleEnviarComentario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoComentario.trim()) return;

    setEnviandoComentario(true);
    try {
      const res = await fetch('/api/impostor/comentario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensaje: nuevoComentario.trim() }),
      });
      if (res.ok) {
        setNuevoComentario('');
        await cargarComentarios();
      }
    } catch (e) {} finally {
      setEnviandoComentario(false);
    }
  };

  // Enviar Tiro de Gracia (Fase 3 - Solo Impostor)
  const handleTiroGracia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tiroGraciaInput.trim()) return;

    setEnviandoTiro(true);
    setResultadoTiro(null);

    try {
      const res = await fetch('/api/impostor/tiro-gracia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intento: tiroGraciaInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAviso({ tipo: 'error', texto: data.error || 'Error al validar tiro de gracia.' });
      } else {
        setResultadoTiro(data.mensaje);
        if (data.acertado) {
          confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
        }
        await cargarDatos();
      }
    } catch (err: any) {
      setAviso({ tipo: 'error', texto: err.message || 'Error al conectar.' });
    } finally {
      setEnviandoTiro(false);
    }
  };

  // Acelerador de Pruebas (Admin)
  const handleAccionTest = async (accion: 'iniciar' | 'avanzar_fase_2' | 'avanzar_fase_3' | 'reiniciar') => {
    setEjecutandoTest(true);
    setAviso(null);
    try {
      const res = await fetch('/api/impostor/test-avance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAviso({ tipo: 'error', texto: data.error || 'Error en prueba.' });
      } else {
        setAviso({ tipo: 'ok', texto: data.mensaje });
        await cargarDatos();
      }
    } catch (e: any) {
      setAviso({ tipo: 'error', texto: e.message || 'Error al ejecutar test.' });
    } finally {
      setEjecutandoTest(false);
    }
  };

  if (cargando) {
    return (
      <div className="min-h-screen bg-[#070913] text-white flex flex-col">
        <Navegacion />
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="animate-spin text-purple-400" size={32} />
          <p className="text-sm font-bold text-slate-400">Cargando El Impostor…</p>
        </div>
      </div>
    );
  }

  if (!activo) {
    return (
      <div className="min-h-screen bg-[#070913] text-white flex flex-col">
        <Navegacion />
        <main className="flex-1 max-w-lg mx-auto px-4 py-16 text-center space-y-6">
          <div className="h-24 w-24 mx-auto rounded-3xl bg-slate-900 border-2 border-purple-500/30 flex items-center justify-center text-5xl shadow-[0_0_30px_rgba(168,85,247,0.2)]">
            🕵️
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-white">El Impostor no está activo</h2>
            <p className="text-sm text-slate-400">
              El administrador de tu Tribu aún no activó este módulo en los ajustes del grupo.
            </p>
          </div>
          {esAdmin && (
            <Link
              href="/admin"
              className="inline-block px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-black text-sm shadow-lg hover:scale-105 transition"
            >
              ⚙️ Ir a Ajustes de la Tribu para activarlo
            </Link>
          )}
        </main>
      </div>
    );
  }

  if (enPausa) {
    return (
      <div className="min-h-screen bg-[#070913] text-white flex flex-col">
        <Navegacion />
        <main className="flex-1 max-w-lg mx-auto px-4 py-16 text-center space-y-5">
          <div className="h-20 w-20 mx-auto rounded-3xl bg-amber-950/40 border border-amber-400/40 flex items-center justify-center text-4xl">
            ⚠️
          </div>
          <h2 className="text-xl font-black text-white">Juego pausado temporalmente</h2>
          <p className="text-sm text-slate-300 bg-slate-900/80 p-4 rounded-2xl border border-white/10">
            {motivoPausa || 'Se necesitan al menos 3 integrantes activos en la Tribu para poder sortear al Impostor.'}
          </p>
          <Link href="/" className="inline-block text-xs font-bold text-purple-300 hover:text-white transition">
            ← Volver al Muro de TRIBOO
          </Link>
        </main>
      </div>
    );
  }

  const estado = partida?.estado || 'fase_1_pistas';

  return (
    <div className="relative min-h-screen bg-[#070913] text-white flex flex-col selection:bg-purple-600 selection:text-white pb-24">
      {/* Fondo misterio con neón violeta y cian */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-[#070913] to-[#070913] pointer-events-none z-0" />
      <div className="fixed top-1/4 -left-32 w-80 h-80 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none z-0" />
      <div className="fixed bottom-1/3 -right-32 w-80 h-80 bg-cyan-600/10 rounded-full blur-[100px] pointer-events-none z-0" />

      <Navegacion />

      <main className="relative z-10 flex-1 w-full max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* BARRA DE PRUEBAS PARA ADMIN (⚡ Modo Acelerado) */}
        {esAdmin && (
          <div className="p-3 rounded-2xl bg-purple-950/40 border border-purple-500/30 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-amber-400" />
              <span className="font-black text-purple-300 uppercase tracking-wider">MODO TEST ADMIN:</span>
              <span className="text-slate-400">Adelantá fases al instante para probar el ciclo completo:</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => handleAccionTest('avanzar_fase_2')}
                disabled={ejecutandoTest || estado !== 'fase_1_pistas'}
                className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold hover:bg-cyan-500/40 disabled:opacity-40 transition"
                title="Destapar muro y abrir votación"
              >
                ⚡ Ir a Fase 2 (Votar)
              </button>
              <button
                onClick={() => handleAccionTest('avanzar_fase_3')}
                disabled={ejecutandoTest || estado !== 'fase_2_votacion'}
                className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold hover:bg-amber-500/40 disabled:opacity-40 transition"
                title="Cerrar votos y revelar impostor"
              >
                ⚡ Ir a Fase 3 (Desenmascarar)
              </button>
              <button
                onClick={() => handleAccionTest('reiniciar')}
                disabled={ejecutandoTest}
                className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold hover:bg-rose-500/40 disabled:opacity-40 transition flex items-center gap-1"
                title="Borrar partida de hoy y empezar de cero"
              >
                <RotateCcw size={12} /> Reiniciar Ronda
              </button>
            </div>
          </div>
        )}

        {/* NOTIFICACIÓN FLOTANTE */}
        {aviso && (
          <div
            className={`p-3.5 rounded-2xl border text-sm font-bold flex items-center gap-2.5 shadow-xl animate-fade-in ${
              aviso.tipo === 'ok'
                ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/90 border-rose-500/40 text-rose-300'
            }`}
          >
            {aviso.tipo === 'ok' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            <span>{aviso.texto}</span>
          </div>
        )}

        {/* CABECERA PRINCIPAL */}
        <div className="relative overflow-hidden rounded-3xl bg-slate-900/90 border-2 border-purple-500/40 p-6 shadow-[0_0_35px_rgba(168,85,247,0.25)]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-500 text-white uppercase tracking-wider">
                  MINIJUEGO ASÍNCRONO
                </span>
                <span className="text-xs text-purple-300 font-bold flex items-center gap-1">
                  {partida?.modoSeguroUsado ? (
                    <>
                      <Shield size={13} className="text-emerald-400" />
                      <span>Modo Seguro (Apto menores)</span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert size={13} className="text-amber-400" />
                      <span>Modo Libre</span>
                    </>
                  )}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
                <span>🕵️</span> EL IMPOSTOR ASÍNCRONO
              </h1>
              <p className="text-xs text-slate-300">
                Categoría del día:{' '}
                <strong className="text-purple-300 font-black">{partida?.categoria || 'Cotidiano'}</strong> ·
                Descubrí quién miente antes del cierre.
              </p>
            </div>

            {/* Selector de pestañas: Juego / Tabla */}
            <div className="flex bg-slate-950 p-1 rounded-2xl border border-white/10 shrink-0">
              <button
                onClick={() => setTabVista('juego')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition ${
                  tabVista === 'juego' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                Partida en Vivo
              </button>
              <button
                onClick={() => setTabVista('posiciones')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
                  tabVista === 'posiciones' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Trophy size={14} className="text-amber-400" />
                <span>Ranking</span>
              </button>
            </div>
          </div>
        </div>

        {tabVista === 'posiciones' ? (
          /* TABLA DE POSICIONES HISTÓRICA */
          <div className="bg-slate-900/90 rounded-3xl border border-white/10 p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <Trophy className="text-amber-400" /> Tabla Acumulada de El Impostor
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs font-black text-slate-400 uppercase">
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Miembro</th>
                    <th className="py-2.5 px-3 text-center">Partidas</th>
                    <th className="py-2.5 px-3 text-right text-amber-300">Puntos Totales</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {ranking.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-500">
                        Aún no hay puntos acumulados en El Impostor. ¡Completá la primera ronda!
                      </td>
                    </tr>
                  ) : (
                    ranking.map((r, idx) => (
                      <tr key={r.usuarioId} className="hover:bg-white/5 transition">
                        <td className="py-3 px-3 font-black text-slate-400">
                          {idx === 0 ? '👑 1' : idx + 1}
                        </td>
                        <td className="py-3 px-3 font-bold text-white">{r.nombre}</td>
                        <td className="py-3 px-3 text-center text-slate-300">{r.partidas}</td>
                        <td className="py-3 px-3 text-right font-black text-amber-300 text-base">{r.puntos}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* VISTA PRINCIPAL DEL JUEGO */
          <>
            {/* ESTADO DE LA FASE */}
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                    estado === 'fase_1_pistas'
                      ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40 animate-pulse'
                      : estado === 'fase_2_votacion'
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 animate-pulse'
                      : estado === 'fase_3_resolucion'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                      : 'bg-rose-500/20 text-rose-400'
                  }`}
                >
                  {estado === 'fase_1_pistas' && '🔒'}
                  {estado === 'fase_2_votacion' && '🗳️'}
                  {estado === 'fase_3_resolucion' && '🎭'}
                  {estado === 'cancelada' && '❌'}
                </div>
                <div>
                  <h3 className="font-black text-sm text-white">
                    {estado === 'fase_1_pistas' && 'Fase 1: Asignación y Pistas a Ciegas'}
                    {estado === 'fase_2_votacion' && 'Fase 2: Muro Destapado y Votación Secreta'}
                    {estado === 'fase_3_resolucion' && 'Fase 3: Veredicto y Desenmascaramiento'}
                    {estado === 'cancelada' && 'Ronda Cancelada'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {estado === 'fase_1_pistas' && 'Hasta las 19:00 hs para enviar tu pista. Nadie ve las pistas ajenas.'}
                    {estado === 'fase_2_votacion' && 'Hasta las 22:00 hs para debatir en el muro y votar a tu sospechoso.'}
                    {estado === 'fase_3_resolucion' && 'Votación finalizada. Mirá quién era el impostor y los puntos sumados.'}
                    {estado === 'cancelada' && (partida?.motivoCancelacion || 'El impostor faltó a la cita.')}
                  </p>
                </div>
              </div>
            </div>

            {/* TARJETA DE ROL CONFIDENCIAL */}
            <div className="rounded-3xl bg-gradient-to-r from-slate-950 via-purple-950/40 to-slate-950 border-2 border-purple-500/40 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-purple-400 tracking-wider flex items-center gap-1.5">
                  <Lock size={14} /> INFORMACIÓN CONFIDENCIAL
                </span>
                <button
                  onClick={() => setMostrarRol(!mostrarRol)}
                  className="px-3 py-1 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold hover:bg-purple-500/40 transition flex items-center gap-1.5"
                >
                  {mostrarRol ? <Lock size={12} /> : <Unlock size={12} />}
                  <span>{mostrarRol ? 'Ocultar mi rol' : 'Tocar para ver mi rol'}</span>
                </button>
              </div>

              <AnimatePresence>
                {mostrarRol ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`p-5 rounded-2xl border-2 text-center space-y-3 ${
                      soyImpostor
                        ? 'bg-rose-950/50 border-rose-500/60 shadow-[0_0_30px_rgba(244,63,94,0.3)]'
                        : 'bg-emerald-950/50 border-emerald-500/60 shadow-[0_0_30px_rgba(16,185,129,0.3)]'
                    }`}
                  >
                    <div className="text-4xl">{soyImpostor ? '🎭' : '🛡️'}</div>
                    <div>
                      <h4 className="text-xl font-black text-white uppercase tracking-wider">
                        {soyImpostor ? '¡SOS EL IMPOSTOR!' : '¡SOS CIVIL!'}
                      </h4>
                      {soyImpostor ? (
                        <p className="text-xs text-rose-200 mt-1 max-w-md mx-auto">
                          <strong>No conocés la palabra secreta.</strong> Leé con atención las pistas ajenas a las 19:00 hs, inventá una pista convincente y desviá sospechas hacia un inocente.
                        </p>
                      ) : (
                        <div className="space-y-1.5 mt-2">
                          <p className="text-xs text-slate-300">La Palabra Secreta de hoy es:</p>
                          <div className="inline-block px-5 py-2 rounded-2xl bg-emerald-500/20 border-2 border-emerald-400 text-2xl font-black text-emerald-300 tracking-wider">
                            {partida?.palabraSecreta}
                          </div>
                          <p className="text-[11px] text-emerald-200/80">
                            Dá una pista sutil que demuestre que la conocés sin regalársela al impostor.
                          </p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ) : (
                  <div
                    onClick={() => setMostrarRol(true)}
                    className="p-8 rounded-2xl border border-white/10 bg-slate-950/80 text-center cursor-pointer hover:border-purple-500/50 transition group"
                  >
                    <Eye className="mx-auto text-purple-400 group-hover:scale-110 transition-transform mb-2" size={32} />
                    <p className="text-sm font-black text-white">Tu rol está oculto</p>
                    <p className="text-xs text-slate-400 mt-0.5">Tocá acá para ver en secreto si sos Civil o Impostor.</p>
                  </div>
                )}
              </AnimatePresence>
            </div>

            {/* FASE 1: ENVÍO DE PISTA A CIEGAS */}
            {estado === 'fase_1_pistas' && (
              <div className="bg-slate-900/90 rounded-3xl border border-white/10 p-6 shadow-xl space-y-6">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <span>✍️</span> Tu Pista del Día
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Tenés tiempo hasta las 19:00 hs. Podés editarla cuantas veces quieras hasta el cierre.
                  </p>
                </div>

                <form onSubmit={handleEnviarPista} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Pista de texto (Obligatoria, máx 80 caracteres):
                    </label>
                    <input
                      type="text"
                      maxLength={80}
                      value={textoPistaInput}
                      onChange={(e) => setTextoPistaInput(e.target.value)}
                      placeholder="Ej: Se disfruta mejor con amigos y brasas..."
                      className="w-full bg-slate-950 border border-white/10 rounded-2xl p-3.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                      required
                    />
                    <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1 px-1">
                      <span>Sé sutil: si sos muy obvio, el impostor la adivina.</span>
                      <span>{textoPistaInput.length}/80</span>
                    </div>
                  </div>

                  {/* Foto opcional */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Pista fotográfica (Opcional):
                    </label>
                    <div className="flex items-center gap-3">
                      <label className="flex-1 cursor-pointer flex items-center justify-center gap-2 p-3 rounded-2xl bg-slate-950 border border-white/10 hover:border-purple-500/50 text-xs font-bold text-slate-300 transition">
                        <Camera size={16} className="text-purple-400" />
                        <span>{archivoFoto ? archivoFoto.name : miPista.fotoUrl ? 'Cambiar foto de pista' : 'Subir o sacar foto'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setArchivoFoto(e.target.files[0]);
                              setPreviewFoto(URL.createObjectURL(e.target.files[0]));
                            }
                          }}
                        />
                      </label>
                      {(previewFoto || miPista.fotoUrl) && (
                        <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-white/20 shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={previewFoto || miPista.fotoUrl!}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={guardandoPista || !textoPistaInput.trim()}
                    className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-500 text-white font-black text-sm tracking-wider shadow-lg hover:scale-105 active:scale-95 disabled:opacity-40 transition"
                  >
                    {guardandoPista ? 'GUARDANDO PISTA…' : miPista.enviada ? 'ACTUALIZAR MI PISTA 🚀' : 'ENVIAR MI PISTA 🚀'}
                  </button>
                </form>

                {/* Resumen de miembros que ya enviaron pista */}
                <div className="pt-4 border-t border-white/10 space-y-3">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">
                    ESTADO DE LA TRIBU EN FASE 1 ({jugadores.filter((j) => j.tienePista).length}/{jugadores.length} enviadas)
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {jugadores.map((j) => (
                      <div
                        key={j.usuarioId}
                        className="p-2.5 rounded-xl bg-slate-950/70 border border-white/5 flex items-center justify-between text-xs"
                      >
                        <span className="font-bold text-white truncate mr-2">{j.nombre}</span>
                        {j.tienePista ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black">
                            Enviada ✓
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black">
                            Pendiente
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* FASE 2: MURO DE PISTAS DESTAPADO, VOTACIÓN Y DEBATE */}
            {estado === 'fase_2_votacion' && (
              <div className="space-y-6">
                {/* 1. Muro de Pistas Aleatorias */}
                <div className="bg-slate-900/90 rounded-3xl border border-white/10 p-6 shadow-xl space-y-4">
                  <div>
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                      <span>🕵️</span> Muro de Pistas Destapado
                    </h3>
                    <p className="text-xs text-slate-400">
                      Las pistas están ordenadas al azar. Analizá cada una y votá quién creés que no conoce la palabra.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {jugadores.map((j) => (
                      <div
                        key={j.usuarioId}
                        className={`p-4 rounded-2xl border transition ${
                          miVoto === j.usuarioId
                            ? 'bg-rose-950/40 border-rose-500/60 shadow-[0_0_20px_rgba(244,63,94,0.2)]'
                            : 'bg-slate-950/80 border-white/10'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <span className="font-black text-sm text-cyan-300 flex items-center gap-1.5">
                              {j.nombre} {j.esElMismo && <span className="text-[10px] text-slate-400">(Vos)</span>}
                            </span>
                            <p className="text-sm font-medium text-white italic">
                              &ldquo;{j.pistaTexto}&rdquo;
                            </p>
                          </div>
                          {j.pistaFotoUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={j.pistaFotoUrl}
                              alt="Pista"
                              className="w-14 h-14 rounded-xl object-cover border border-white/20 shrink-0"
                            />
                          )}
                        </div>

                        {/* Botón de votar */}
                        {!j.esElMismo && (
                          <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                            <span className="text-[11px] text-slate-400">¿Es el impostor?</span>
                            <button
                              onClick={() => handleVotar(j.usuarioId)}
                              disabled={guardandoVoto}
                              className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1 ${
                                miVoto === j.usuarioId
                                  ? 'bg-rose-600 text-white shadow-lg'
                                  : 'bg-white/10 text-slate-300 hover:bg-rose-500/20 hover:text-rose-300'
                              }`}
                            >
                              {miVoto === j.usuarioId ? '✓ SOSPECHOSO ELEGIDO' : '🎯 VOTAR COMO IMPOSTOR'}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Debate Efímero */}
                <div className="bg-slate-900/90 rounded-3xl border border-white/10 p-6 shadow-xl space-y-4">
                  <div>
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                      <MessageSquare size={18} className="text-cyan-400" />
                      <span>Debate de la Tribu (Se borra al finalizar la jornada)</span>
                    </h3>
                    <p className="text-xs text-slate-400">Acusá, defendete y convencé a los demás antes de las 22:00 hs.</p>
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                    {comentarios.length === 0 ? (
                      <p className="text-xs text-slate-500 py-4 text-center">Todavía nadie comentó. ¡Abrí el fuego!</p>
                    ) : (
                      comentarios.map((c) => (
                        <div key={c.id} className="p-2.5 rounded-xl bg-slate-950/80 border border-white/5 text-xs">
                          <span className="font-bold text-cyan-300 mr-2">{c.nombre}:</span>
                          <span className="text-slate-200">{c.mensaje}</span>
                        </div>
                      ))
                    )}
                  </div>

                  <form onSubmit={handleEnviarComentario} className="flex gap-2">
                    <input
                      type="text"
                      maxLength={280}
                      value={nuevoComentario}
                      onChange={(e) => setNuevoComentario(e.target.value)}
                      placeholder="Escribí tu sospecha o defensa..."
                      className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    />
                    <button
                      type="submit"
                      disabled={enviandoComentario || !nuevoComentario.trim()}
                      className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs transition disabled:opacity-40"
                    >
                      <Send size={14} />
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* FASE 3: VEREDICTO, DESENMASCARAMIENTO Y TIRO DE GRACIA */}
            {estado === 'fase_3_resolucion' && (
              <div className="bg-slate-900/90 rounded-3xl border border-white/10 p-6 shadow-xl space-y-6">
                <div className="text-center space-y-2">
                  <div className="text-5xl">
                    {partida?.ganador === 'impostor' ? '🎭' : '🛡️'}
                  </div>
                  <h3 className="text-2xl font-black text-white uppercase tracking-tight">
                    {partida?.ganador === 'impostor' ? '¡VICTORIA DEL IMPOSTOR!' : '¡VICTORIA DE LOS CIVILES!'}
                  </h3>
                  <p className="text-xs text-slate-300">
                    La palabra secreta era: <strong className="text-emerald-300 text-sm font-black">{partida?.palabraSecreta}</strong>
                  </p>
                </div>

                {/* TIRO DE GRACIA (Si está disponible o si el impostor lo usó) */}
                {soyImpostor && partida?.tiroGraciaIntento === null && (
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-rose-950/70 to-purple-950/70 border-2 border-rose-500/50 shadow-2xl space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🎯</span>
                      <h4 className="text-base font-black text-rose-300">TIRO DE GRACIA: ¡ÚLTIMA OPORTUNIDAD!</h4>
                    </div>
                    <p className="text-xs text-slate-300">
                      El grupo te descubrió por mayoría, pero podés <strong>robar la victoria (+7 pts)</strong> si adivinás la palabra secreta ahora mismo. Nuestra IA Arlequín validará tu respuesta.
                    </p>
                    <form onSubmit={handleTiroGracia} className="flex gap-2">
                      <input
                        type="text"
                        maxLength={40}
                        value={tiroGraciaInput}
                        onChange={(e) => setTiroGraciaInput(e.target.value)}
                        placeholder="Escribí la palabra secreta..."
                        className="flex-1 bg-slate-950 border border-rose-400/50 rounded-xl px-4 py-2.5 text-sm text-white font-bold focus:outline-none focus:ring-2 focus:ring-rose-400"
                        required
                      />
                      <button
                        type="submit"
                        disabled={enviandoTiro || !tiroGraciaInput.trim()}
                        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-black font-black text-xs uppercase tracking-wider hover:scale-105 disabled:opacity-40 transition"
                      >
                        {enviandoTiro ? 'Evaluando…' : 'DISPARAR 🎯'}
                      </button>
                    </form>
                  </div>
                )}

                {resultadoTiro && (
                  <div className="p-4 rounded-2xl bg-slate-950 border border-white/10 text-xs font-bold text-center">
                    {resultadoTiro}
                  </div>
                )}

                {/* Desglose de Jugadores, Roles y Puntos */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">
                    Desenmascaramiento de la Ronda:
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {jugadores.map((j) => (
                      <div
                        key={j.usuarioId}
                        className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs ${
                          j.rol === 'impostor'
                            ? 'bg-rose-950/40 border-rose-500/50'
                            : 'bg-slate-950/70 border-white/5'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">{j.nombre}</span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                j.rol === 'impostor'
                                  ? 'bg-rose-500 text-white'
                                  : 'bg-emerald-500/20 text-emerald-300'
                              }`}
                            >
                              {j.rol === 'impostor' ? 'IMPOSTOR' : 'CIVIL'}
                            </span>
                          </div>
                          {j.motivoPuntos && (
                            <p className="text-[10px] text-slate-400">{j.motivoPuntos}</p>
                          )}
                        </div>
                        <span
                          className={`font-black text-sm px-2.5 py-1 rounded-xl ${
                            (j.puntosObtenidos || 0) > 0
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : (j.puntosObtenidos || 0) < 0
                              ? 'bg-rose-500/20 text-rose-300'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {(j.puntosObtenidos || 0) > 0 ? `+${j.puntosObtenidos}` : j.puntosObtenidos || 0} pts
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
