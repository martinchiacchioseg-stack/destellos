'use client';

import React, { useState } from 'react';
import { Navegacion } from '@/components/Navegacion';
import { MarquesinaArlequin } from '@/components/MarquesinaArlequin';
import { TrazoLocoView } from '@/components/tarambana/TrazoLocoView';

export default function TrazoLocoPage() {
  const [notif, setNotif] = useState<{ texto: string; pts: number } | null>(null);

  const handlePuntos = async (pts: number, motivo: string) => {
    setNotif({ texto: motivo || '¡Acierto en Trazo Loco!', pts });
    setTimeout(() => setNotif(null), 3500);

    try {
      await fetch('/api/tarambana/puntos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          puntos: pts,
          juego: 'trazo_loco',
          descripcion: motivo || 'Puntos en Trazo Loco',
        }),
      });
    } catch (e) {
      console.warn('Error al persistir puntos:', e);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white flex flex-col justify-between selection:bg-orange-500 selection:text-white pb-12">
      <Navegacion />

      {notif && (
        <div className="fixed top-20 right-4 z-50 animate-bounce">
          <div className="px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-3 border bg-emerald-950/90 border-emerald-400/50 text-emerald-300">
            <span className="text-xl">🎨</span>
            <div>
              <p className="text-xs font-bold">{notif.texto}</p>
              <p className="text-sm font-black">+{notif.pts} PTS</p>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-6 space-y-4">
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/30 text-pink-300 text-xs font-black uppercase tracking-wider">
            <span>🎨</span> Pictionary Familiar en Vivo
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-300 to-cyan-300">
            Trazo Loco
          </h1>
          <p className="text-xs text-slate-300 max-w-lg mx-auto">
            Uno dibuja con el dedo o mouse en la pizarra digital, los demás adivinan en el chat en tiempo real.
          </p>
        </div>

        <TrazoLocoView onAddScore={handlePuntos} />
      </main>
    </div>
  );
}
