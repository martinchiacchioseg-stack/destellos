'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Camera, Lock, ArrowRight, RefreshCw } from 'lucide-react';
import { GlobalTarambanaHeader } from '@/components/tarambana/GlobalTarambanaHeader';
import { TarambanaTabBar, type TarambanaTab } from '@/components/tarambana/TarambanaTabBar';
import FeedCentralView from '@/components/tarambana/FeedCentralView';
import { FlashGrupalView } from '@/components/tarambana/FlashGrupalView';
import { LosTarambanaView } from '@/components/tarambana/LosTarambanaView';
import { CerebroEnFugaView } from '@/components/tarambana/CerebroEnFugaView';
import { TrazoLocoView } from '@/components/tarambana/TrazoLocoView';
import { MarquesinaArlequin } from '@/components/MarquesinaArlequin';
import type { ModulosActivos } from '@/lib/types';

export default function TarambanaPage() {
  const [seccionActiva, setSeccionActiva] = useState<TarambanaTab>('feed');
  const [puntos, setPuntos] = useState<number>(340);
  const [nombreGrupo, setNombreGrupo] = useState<string>('El Club de los Tarambanas');
  const [usuarioId, setUsuarioId] = useState<string>('user-actual');
  const [subiHoy, setSubiHoy] = useState<boolean | null>(null);
  const [modulosActivos, setModulosActivos] = useState<ModulosActivos | undefined>(undefined);
  const [notificacionPuntos, setNotificacionPuntos] = useState<{ texto: string; pts: number } | null>(null);

  // Verificar si el usuario cumplió con el juego principal (subir foto hoy)
  useEffect(() => {
    fetch('/api/yo')
      .then(res => res.json())
      .then(data => {
        if (data?.sesion) {
          setSubiHoy(!!data.sesion.subiHoy);
          if (data.sesion.id) setUsuarioId(data.sesion.id);
          if (data.sesion.familia) setNombreGrupo(`Familia ${data.sesion.familia}`);
          if (data.sesion.modulos_activos) setModulosActivos(data.sesion.modulos_activos);
        } else {
          // Si no hay sesión, permitir explorar
          setSubiHoy(true);
        }
      })
      .catch(() => {
        setSubiHoy(true);
      });

    fetch('/api/tarambana/puntos?usuarioId=' + usuarioId)
      .then(res => res.json())
      .then(data => {
        if (data?.totalPuntos !== undefined) {
          setPuntos(data.totalPuntos);
        }
      })
      .catch(() => {});
  }, [usuarioId]);

  // Manejador centralizado para sumar o restar puntos desde cualquier juego
  const handlePuntosGanados = async (pts: number, motivo: string) => {
    setPuntos(prev => Math.max(0, prev + pts));
    
    // Feedback visual flotante
    setNotificacionPuntos({
      texto: motivo || (pts >= 0 ? '¡Puntos ganados!' : 'Penalización aplicada'),
      pts,
    });
    setTimeout(() => setNotificacionPuntos(null), 3500);

    // Enviar al motor de puntos relacional
    try {
      await fetch('/api/tarambana/puntos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuarioId,
          puntos: pts,
          juego: seccionActiva,
          descripcion: motivo || `Puntaje en ${seccionActiva}`,
        }),
      });
    } catch (err) {
      console.warn('Error al persistir puntos:', err);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#0a0e1a] text-white flex flex-col justify-between selection:bg-[#FF7700] selection:text-white pb-24 overflow-x-hidden">
      {/* Fondo inmersivo TRIBOO con overlay cósmico */}
      <div
        className="fixed inset-0 bg-cover bg-center opacity-30 mix-blend-screen pointer-events-none z-0"
        style={{ backgroundImage: "url('/logos/triboo-banner.jpg')" }}
      />
      {/* Luces volumétricas de neón naranja, verde y azul */}
      <div className="fixed top-1/4 -left-32 w-96 h-96 bg-orange-600/20 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="fixed bottom-1/3 -right-32 w-96 h-96 bg-sky-500/20 rounded-full blur-[120px] pointer-events-none z-0" />

      {/* Header Global Persistente con puntajes en tiempo real */}
      <div className="relative z-20">
        <GlobalTarambanaHeader
          score={puntos}
          clubName={nombreGrupo}
        />
        <div className="max-w-4xl mx-auto px-4 pt-2">
          <MarquesinaArlequin />
        </div>
      </div>

      {/* Notificación flotante de puntos */}
      {notificacionPuntos && (
        <div className="fixed top-20 right-4 z-50 animate-bounce">
          <div className={`px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-3 border ${
            notificacionPuntos.pts >= 0
              ? 'bg-emerald-950/90 border-emerald-400/50 text-emerald-300'
              : 'bg-rose-950/90 border-rose-400/50 text-rose-300'
          }`}>
            <span className="text-xl">{notificacionPuntos.pts >= 0 ? '🎉' : '⚠️'}</span>
            <div>
              <p className="text-xs font-bold">{notificacionPuntos.texto}</p>
              <p className="text-sm font-black">
                {notificacionPuntos.pts >= 0 ? `+${notificacionPuntos.pts}` : notificacionPuntos.pts} PTS
              </p>
            </div>
          </div>
        </div>
      )}

      {/* CONDICIÓN FUNDAMENTAL: Debe cumplir primero con el juego principal (Fotos) */}
      {subiHoy === null ? (
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
          <RefreshCw className="animate-spin text-cyan-400" size={28} />
          <p className="text-sm font-bold">Verificando tu Destello del día…</p>
        </div>
      ) : subiHoy === false ? (
        <main className="relative z-10 flex-1 w-full max-w-lg mx-auto px-4 py-12 flex flex-col items-center justify-center text-center space-y-6">
          <div className="relative">
            <div className="h-28 w-28 rounded-3xl bg-slate-900/90 border-2 border-amber-400 flex items-center justify-center text-5xl shadow-[0_0_35px_rgba(251,191,36,0.5)]">
              📸
            </div>
            <span className="absolute -bottom-2 -right-2 p-2.5 rounded-2xl bg-rose-600 text-white border-2 border-slate-950 shadow-lg">
              <Lock size={18} />
            </span>
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full text-[10px] font-black bg-amber-400 text-black uppercase tracking-wider">
              REGLA DE LA FAMILIA
            </span>
            <h2 className="text-2xl font-black text-white">
              ¡Primero cumplí con el juego principal!
            </h2>
            <p className="text-sm text-slate-300">
              Para desbloquear <strong className="text-fuchsia-400">SINCERICIDIO</strong>, la ronda de tarareos ardilla y todos los juegos, primero tenés que <strong>subir tu foto del día al muro familiar</strong>.
            </p>
          </div>

          <Link
            href="/"
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-400 to-pink-500 text-black font-black text-sm tracking-wider shadow-[0_0_30px_rgba(251,191,36,0.4)] hover:scale-105 active:scale-95 transition flex items-center justify-center gap-2"
          >
            <Camera size={20} />
            <span>SUBIR MI FOTO AHORA</span>
            <ArrowRight size={18} />
          </Link>
        </main>
      ) : (
        /* Contenido Principal habilitado una vez subida la foto */
        <main className="relative z-10 flex-1 w-full max-w-4xl mx-auto px-4 py-6">
          {seccionActiva === 'feed' && (
            <FeedCentralView onAbrirJuego={(seccion) => setSeccionActiva(seccion as TarambanaTab)} />
          )}

          {seccionActiva === 'flash' && (
            <FlashGrupalView
              onAddScore={handlePuntosGanados}
              onIrAlFeed={() => setSeccionActiva('feed')}
            />
          )}

          {seccionActiva === 'tarambana' && (
            <LosTarambanaView onAddScore={handlePuntosGanados} />
          )}

          {seccionActiva === 'cerebro' && (
            <CerebroEnFugaView onAddScore={handlePuntosGanados} />
          )}

          {seccionActiva === 'trazo' && (
            <TrazoLocoView onAddScore={handlePuntosGanados} />
          )}
        </main>
      )}

      {/* Tab Bar inferior con las secciones habilitadas por el superadmin */}
      {subiHoy && (
        <TarambanaTabBar
          activeTab={seccionActiva}
          onSelectTab={(tab) => setSeccionActiva(tab)}
          modulosActivos={modulosActivos}
        />
      )}
    </div>
  );
}
