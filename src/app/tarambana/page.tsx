'use client';

import React, { useState, useEffect } from 'react';
import { GlobalTarambanaHeader } from '@/components/tarambana/GlobalTarambanaHeader';
import { TarambanaTabBar, type TarambanaTab } from '@/components/tarambana/TarambanaTabBar';
import FeedCentralView from '@/components/tarambana/FeedCentralView';
import { FlashGrupalView } from '@/components/tarambana/FlashGrupalView';
import { LosTarambanaView } from '@/components/tarambana/LosTarambanaView';
import { CerebroEnFugaView } from '@/components/tarambana/CerebroEnFugaView';
import { TrazoLocoView } from '@/components/tarambana/TrazoLocoView';

export default function TarambanaPage() {
  const [seccionActiva, setSeccionActiva] = useState<TarambanaTab>('feed');
  const [puntos, setPuntos] = useState<number>(340);
  const [nombreGrupo] = useState<string>('El Club Tarambana');
  const [usuarioId] = useState<string>('user-actual');
  const [notificacionPuntos, setNotificacionPuntos] = useState<{ texto: string; pts: number } | null>(null);

  // Cargar puntos iniciales si existe endpoint o local
  useEffect(() => {
    fetch('/api/tarambana/puntos?usuarioId=' + usuarioId)
      .then(res => res.json())
      .then(data => {
        if (data?.totalPuntos !== undefined) {
          setPuntos(data.totalPuntos);
        }
      })
      .catch(() => {
        // En caso de offline o inicio, conservamos puntos locales iniciales
      });
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
    <div className="relative min-h-screen bg-[#070b16] text-white flex flex-col justify-between selection:bg-[#FF007F] selection:text-white pb-24 overflow-x-hidden">
      {/* Fondo inmersivo SINCERICIDIO con overlay cósmico de neón */}
      <div
        className="fixed inset-0 bg-cover bg-center opacity-25 mix-blend-screen pointer-events-none z-0"
        style={{ backgroundImage: "url('/logos/sincericidio-bg.jpg')" }}
      />
      {/* Luces volumétricas de neón rosa y cian */}
      <div className="fixed top-1/4 -left-32 w-96 h-96 bg-fuchsia-600/20 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="fixed bottom-1/3 -right-32 w-96 h-96 bg-cyan-400/20 rounded-full blur-[120px] pointer-events-none z-0" />

      {/* Header Global Persistente con puntajes en tiempo real */}
      <div className="relative z-20">
        <GlobalTarambanaHeader
          score={puntos}
          clubName={nombreGrupo}
        />
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

      {/* Contenido Principal según el módulo activo */}
      <main className="relative z-10 flex-1 w-full max-w-4xl mx-auto px-4 py-6">
        {seccionActiva === 'feed' && (
          <FeedCentralView onAbrirJuego={(seccion) => setSeccionActiva(seccion as TarambanaTab)} />
        )}

        {seccionActiva === 'flash' && (
          <FlashGrupalView onAddScore={handlePuntosGanados} />
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

      {/* Tab Bar inferior con las 5 secciones e identidades cromáticas */}
      <TarambanaTabBar
        activeTab={seccionActiva}
        onSelectTab={(tab) => setSeccionActiva(tab)}
      />
    </div>
  );
}
