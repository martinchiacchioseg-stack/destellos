'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Navbar from '@/components/Navbar';
import { Trophy, Crown, Sparkles, Award } from 'lucide-react';
import { SesionUsuario } from '@/lib/types';

export default function RankingPage() {
  const [usuario, setUsuario] = useState<SesionUsuario | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) setUsuario(data.usuario);
      });
  }, []);

  return (
    <div className="flex-1 flex flex-col pb-20">
      <Header usuario={usuario} puntosTotales={16} />

      <main className="p-4 space-y-4">
        <div className="bg-gradient-to-tr from-amber-500 via-[#FF7043] to-rose-400 p-5 rounded-3xl text-white shadow-soft text-center">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-2">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-lg font-extrabold tracking-tight">Ranking Familiar</h2>
          <p className="text-xs text-orange-100 mt-1">
            Podio animado, coronas para el ganador del día y medallas.
          </p>
        </div>

        <div className="bg-white dark:bg-[#201D24] p-5 rounded-3xl border border-[var(--border-soft)] shadow-soft text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
            <Crown className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-extrabold text-gray-800 dark:text-gray-100">
            Próximamente en la Etapa 3
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed max-w-xs mx-auto">
            La elección automática del <b>Destello del Día con Gemini</b> y el podio con ranking diario, semanal y acumulado se activarán en la <b>Etapa 3</b>.
          </p>
        </div>
      </main>

      <Navbar />
    </div>
  );
}
