'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Navbar from '@/components/Navbar';
import { Gamepad2, Sparkles, Clock, Compass } from 'lucide-react';
import { SesionUsuario } from '@/lib/types';

export default function JuegosPage() {
  const [usuario, setUsuario] = useState<SesionUsuario | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) setUsuario(data.usuario);
      });
  }, []);

  const juegos = [
    {
      titulo: 'Reto del día',
      etapa: 'Etapa 4',
      puntos: '+2 pts',
      desc: 'Gemini propone un tema cada mañana (06:00 AR) y evalúa si tu foto encaja.',
      color: 'bg-orange-100 text-[#FF7043]',
    },
    {
      titulo: 'Votación cruzada',
      etapa: 'Etapa 4',
      puntos: '+5 pts',
      desc: 'El grupo vota su destello favorito del día para premiar al autor.',
      color: 'bg-rose-100 text-rose-600',
    },
    {
      titulo: 'Adiviná quién la sacó',
      etapa: 'Etapa 5',
      puntos: '+1 pt / acierto',
      desc: 'Las fotos aparecen sin nombre: adiviná de quién es cada una.',
      color: 'bg-blue-100 text-blue-600',
    },
    {
      titulo: 'Ruleta Rusa',
      etapa: 'Etapa 6',
      puntos: 'Dinámico',
      desc: 'Desafío sorpresa con giros familiares y puntos en juego.',
      color: 'bg-purple-100 text-purple-600',
    },
    {
      titulo: 'Prode automático',
      etapa: 'Etapa 7',
      puntos: 'Pronósticos',
      desc: 'Apostá quién ganará el destello de hoy antes del cierre.',
      color: 'bg-emerald-100 text-emerald-600',
    },
    {
      titulo: 'Foto del pasado',
      etapa: 'Etapa 8',
      puntos: '+3 pts',
      desc: 'Subí una foto vieja oculta y los demás adivinan el año y lugar.',
      color: 'bg-amber-100 text-amber-600',
    },
  ];

  return (
    <div className="flex-1 flex flex-col pb-20">
      <Header usuario={usuario} puntosTotales={16} />

      <main className="p-4 space-y-4">
        <div className="bg-white dark:bg-[#201D24] p-5 rounded-3xl border border-[var(--border-soft)] shadow-soft">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-orange-100 text-[#FF7043] flex items-center justify-center">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-gray-800 dark:text-gray-100">
                Mini-Juegos Familiares
              </h2>
              <p className="text-xs text-gray-400">
                Arquitectura de puntos modular lista
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
            Cada juego suma puntos directamente a la tabla centralizada de eventos (`puntos_eventos`). Se activarán progresivamente en sus respectivas etapas.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2.5">
          {juegos.map((j) => (
            <div
              key={j.titulo}
              className="bg-white dark:bg-[#201D24] p-3.5 rounded-2xl border border-[var(--border-soft)] shadow-sm flex items-start justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-gray-800 dark:text-gray-200">
                    {j.titulo}
                  </h3>
                  <span className="text-[10px] px-2 py-0.2 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-full font-semibold">
                    {j.etapa}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug">
                  {j.desc}
                </p>
              </div>
              <span className={`text-[10px] font-extrabold px-2 py-1 rounded-xl shrink-0 ${j.color}`}>
                {j.puntos}
              </span>
            </div>
          ))}
        </div>
      </main>

      <Navbar />
    </div>
  );
}
