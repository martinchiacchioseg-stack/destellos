'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Navbar from '@/components/Navbar';
import { Trophy, Crown, Sparkles, Award, Medal, Flame } from 'lucide-react';
import { SesionUsuario, RankingItem } from '@/lib/types';

export default function RankingPage() {
  const [usuario, setUsuario] = useState<SesionUsuario | null>(null);
  const [periodo, setPeriodo] = useState<'semanal' | 'mensual' | 'total'>('total');
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) setUsuario(data.usuario);
      });
  }, []);

  const cargarRanking = async (per: 'semanal' | 'mensual' | 'total') => {
    setCargando(true);
    try {
      const res = await fetch(`/api/ranking?periodo=${per}`);
      if (res.ok) {
        const data = await res.json();
        setRanking(data.ranking || []);
      }
    } catch (err) {
      console.error('Error cargando ranking:', err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarRanking(periodo);
  }, [periodo]);

  const primero = ranking.find((r) => r.posicion === 1);
  const segundo = ranking.find((r) => r.posicion === 2);
  const tercero = ranking.find((r) => r.posicion === 3);
  const resto = ranking.filter((r) => r.posicion > 3);
  const miItem = ranking.find((r) => r.usuario_id === usuario?.id);

  return (
    <div className="flex-1 flex flex-col pb-24 max-w-md mx-auto w-full min-h-screen bg-gray-50 dark:bg-[#121014]">
      <Header usuario={usuario} puntosTotales={miItem?.puntos || 0} />

      <main className="p-4 space-y-4">
        {/* Cabecera con selector de períodos */}
        <div className="bg-gradient-to-tr from-amber-500 via-[#FF7043] to-rose-400 p-5 rounded-3xl text-white shadow-soft text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center mx-auto shadow-sm">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold tracking-tight">Tabla de Posiciones ✨</h2>
            <p className="text-xs text-orange-100 mt-0.5">
              Puntos por subir a tiempo (+10), adivinar (+5) y ganar el Destello IA (+20)
            </p>
          </div>

          {/* Selector de Pestañas: Semanal / Mensual / Histórico */}
          <div className="flex p-1 bg-black/15 rounded-2xl backdrop-blur-xs max-w-xs mx-auto">
            {(['semanal', 'mensual', 'total'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriodo(p)}
                className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-black capitalize transition-all cursor-pointer ${
                  periodo === p ? 'bg-white text-gray-900 shadow-md scale-102' : 'text-white/80 hover:text-white'
                }`}
              >
                {p === 'semanal' ? 'Semana' : p === 'mensual' ? 'Mes' : 'Histórico'}
              </button>
            ))}
          </div>
        </div>

        {cargando ? (
          <div className="text-center py-12 text-sm text-gray-400">Cargando posiciones...</div>
        ) : ranking.length === 0 ? (
          <div className="bg-white dark:bg-[#1C1822] p-8 rounded-3xl text-center text-xs text-gray-400 border border-gray-100 dark:border-gray-800">
            Todavía no hay puntos registrados en este período.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Podio Top 3 */}
            <div className="flex items-end justify-center gap-2 pt-4 px-2">
              {/* 2do Puesto */}
              {segundo && (
                <div className="flex-1 flex flex-col items-center bg-white dark:bg-[#1C1822] p-3 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm relative">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 ring-2 ring-gray-300 flex items-center justify-center font-bold text-xs text-gray-700">
                    {segundo.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={segundo.avatar_url} alt={segundo.nombre} className="w-full h-full object-cover" />
                    ) : (
                      <span>{segundo.nombre.charAt(0)}</span>
                    )}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 mt-1">2° Lugar</span>
                  <p className="text-xs font-extrabold text-gray-800 dark:text-gray-100 truncate max-w-[85px] mt-0.5">
                    {segundo.apodo || segundo.nombre}
                  </p>
                  <span className="text-xs font-black text-gray-600 dark:text-gray-300 mt-1">{segundo.puntos} pts</span>
                </div>
              )}

              {/* 1er Puesto */}
              {primero && (
                <div className="flex-1 flex flex-col items-center bg-gradient-to-b from-amber-50 to-white dark:from-amber-950/40 dark:to-[#1C1822] p-4 rounded-3xl border-2 border-amber-300 shadow-md relative -translate-y-2">
                  <Crown className="w-5 h-5 text-amber-500 fill-amber-400 mb-1 animate-bounce" />
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-amber-100 ring-2 ring-amber-400 flex items-center justify-center font-black text-sm text-amber-700">
                    {primero.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={primero.avatar_url} alt={primero.nombre} className="w-full h-full object-cover" />
                    ) : (
                      <span>{primero.nombre.charAt(0)}</span>
                    )}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 mt-1">1° Campeón</span>
                  <p className="text-xs font-extrabold text-gray-900 dark:text-white truncate max-w-[95px] mt-0.5">
                    {primero.apodo || primero.nombre}
                  </p>
                  <span className="text-sm font-black text-amber-600 dark:text-amber-400 mt-1">{primero.puntos} pts</span>
                </div>
              )}

              {/* 3er Puesto */}
              {tercero && (
                <div className="flex-1 flex flex-col items-center bg-white dark:bg-[#1C1822] p-3 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm relative">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-orange-100 ring-2 ring-amber-600/40 flex items-center justify-center font-bold text-xs text-amber-800">
                    {tercero.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={tercero.avatar_url} alt={tercero.nombre} className="w-full h-full object-cover" />
                    ) : (
                      <span>{tercero.nombre.charAt(0)}</span>
                    )}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-700/80 mt-1">3° Lugar</span>
                  <p className="text-xs font-extrabold text-gray-800 dark:text-gray-100 truncate max-w-[85px] mt-0.5">
                    {tercero.apodo || tercero.nombre}
                  </p>
                  <span className="text-xs font-black text-gray-600 dark:text-gray-300 mt-1">{tercero.puntos} pts</span>
                </div>
              )}
            </div>

            {/* Resto de la lista */}
            {resto.length > 0 && (
              <div className="bg-white dark:bg-[#1C1822] rounded-3xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800 p-2 shadow-sm">
                {resto.map((item) => (
                  <div key={item.usuario_id} className="p-2.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-black text-gray-400 w-4 text-center">#{item.posicion}</span>
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center font-bold text-xs text-gray-600">
                        {item.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.avatar_url} alt={item.nombre} className="w-full h-full object-cover" />
                        ) : (
                          <span>{item.nombre.charAt(0)}</span>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-800 dark:text-gray-200">
                          {item.apodo || item.nombre}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          🏆 {item.destellos_ganados} destellos ganados
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.racha > 0 && (
                        <span className="text-[10px] font-black text-orange-600 bg-orange-50 dark:bg-orange-950/40 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                          <Flame className="w-3 h-3 fill-orange-500" />
                          <span>{item.racha}</span>
                        </span>
                      )}
                      <span className="text-xs font-black text-gray-700 dark:text-gray-300">{item.puntos} pts</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <Navbar />
    </div>
  );
}
