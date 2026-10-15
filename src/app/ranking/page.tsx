'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Navbar from '@/components/Navbar';
import InterstitialAdModal from '@/components/InterstitialAdModal';
import { Trophy, Crown, Sparkles, Award, Medal, Flame, Star, TrendingUp } from 'lucide-react';
import { SesionUsuario } from '@/lib/types';

interface ItemRanking {
  posicion: number;
  usuario_id: string;
  nombre: string;
  apodo?: string;
  avatar_url?: string;
  puntos: number;
  destellos_ganados: number;
  racha?: number;
}

export default function RankingPage() {
  const [usuario, setUsuario] = useState<SesionUsuario | null>(null);
  const [periodo, setPeriodo] = useState<'diario' | 'semanal' | 'total'>('total');
  const [ranking, setRanking] = useState<ItemRanking[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarAdRanking, setMostrarAdRanking] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) setUsuario(data.usuario);
      });
  }, []);

  const cargarRanking = async (per: 'diario' | 'semanal' | 'total') => {
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
    <div className="flex-1 flex flex-col pb-20">
      <Header usuario={usuario} puntosTotales={miItem?.puntos || 16} />

      <InterstitialAdModal
        ubicacion="interstitial_ranking"
        isOpen={mostrarAdRanking}
        onClose={() => setMostrarAdRanking(false)}
      />

      <main className="p-4 space-y-4 max-w-lg mx-auto w-full">
        {/* Cabecera con selector de períodos */}
        <div className="bg-gradient-to-tr from-amber-500 via-[#FF7043] to-rose-400 p-5 rounded-3xl text-white shadow-soft text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto shadow-sm">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold tracking-tight">Tabla de Posiciones ✨</h2>
            <p className="text-xs text-orange-100 mt-0.5">
              ¡Sumá puntos con el Destello del Día y los mini-juegos!
            </p>
          </div>

          {/* Selector de Pestañas: Diario / Semanal / Total */}
          <div className="flex p-1 bg-black/15 rounded-2xl backdrop-blur-sm max-w-xs mx-auto">
            {(['diario', 'semanal', 'total'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriodo(p)}
                className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-black capitalize transition-all ${
                  periodo === p ? 'bg-white text-gray-900 shadow-md scale-102' : 'text-white/80 hover:text-white'
                }`}
              >
                {p === 'diario' ? 'Hoy' : p === 'semanal' ? 'Semana' : 'Total'}
              </button>
            ))}
          </div>
        </div>

        {cargando ? (
          <div className="p-8 text-center text-xs text-gray-400">Calculando podio... 🏆</div>
        ) : (
          <>
            {/* ------------------------------------------------------------- */}
            {/* PODIO DE LOS 3 PRIMEROS */}
            {/* ------------------------------------------------------------- */}
            {ranking.length > 0 && (
              <div className="bg-white dark:bg-[#201D24] p-5 rounded-3xl border border-[var(--border-soft)] shadow-soft">
                <div className="flex items-end justify-center gap-2 pt-6 pb-2">
                  {/* 2º LUGAR (Plata) */}
                  <div className="flex-1 flex flex-col items-center">
                    {segundo ? (
                      <>
                        <div className="relative mb-2">
                          <div className="w-14 h-14 rounded-full bg-slate-100 border-2 border-slate-300 flex items-center justify-center font-black text-slate-600 shadow-md">
                            {segundo.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={segundo.avatar_url}
                                alt={segundo.nombre}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              <span>{segundo.apodo ? segundo.apodo[0] : segundo.nombre[0]}</span>
                            )}
                          </div>
                          <span className="absolute -bottom-1.5 -right-1 w-6 h-6 rounded-full bg-slate-300 text-slate-800 text-xs font-black flex items-center justify-center border border-white">
                            2
                          </span>
                        </div>
                        <span className="text-xs font-black text-gray-800 dark:text-gray-100 truncate max-w-[80px]">
                          {segundo.apodo || segundo.nombre.split(' ')[0]}
                        </span>
                        <span className="text-[11px] font-extrabold text-[#FF7043]">{segundo.puntos} pts</span>
                        {/* Pedestal */}
                        <div className="w-full h-20 bg-slate-100 dark:bg-slate-800/60 rounded-t-2xl mt-2 flex items-center justify-center text-slate-400 font-black text-lg shadow-inner">
                          🥈
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-20" />
                    )}
                  </div>

                  {/* 1º LUGAR (Oro y Corona) */}
                  <div className="flex-1 flex flex-col items-center -mt-6">
                    {primero ? (
                      <>
                        <Crown className="w-6 h-6 text-amber-500 fill-amber-400 animate-bounce mb-1" />
                        <div className="relative mb-2">
                          <div className="w-18 h-18 rounded-full bg-amber-50 border-4 border-amber-400 flex items-center justify-center font-black text-amber-700 shadow-lg ring-4 ring-amber-200/50">
                            {primero.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={primero.avatar_url}
                                alt={primero.nombre}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              <span className="text-lg">
                                {primero.apodo ? primero.apodo[0] : primero.nombre[0]}
                              </span>
                            )}
                          </div>
                          <span className="absolute -bottom-1.5 -right-1 w-7 h-7 rounded-full bg-amber-400 text-amber-950 text-xs font-black flex items-center justify-center border-2 border-white shadow-sm">
                            1
                          </span>
                        </div>
                        <span className="text-xs font-black text-gray-900 dark:text-gray-50 truncate max-w-[90px]">
                          {primero.apodo || primero.nombre.split(' ')[0]}
                        </span>
                        <span className="text-xs font-black text-[#FF7043]">{primero.puntos} pts</span>
                        {/* Pedestal más alto */}
                        <div className="w-full h-28 bg-gradient-to-t from-amber-200 to-amber-100 dark:from-amber-950/80 dark:to-amber-900/40 rounded-t-2xl mt-2 flex items-center justify-center text-amber-600 font-black text-2xl shadow-inner">
                          👑
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-28" />
                    )}
                  </div>

                  {/* 3º LUGAR (Bronce) */}
                  <div className="flex-1 flex flex-col items-center">
                    {tercero ? (
                      <>
                        <div className="relative mb-2">
                          <div className="w-14 h-14 rounded-full bg-amber-900/10 border-2 border-amber-700/50 flex items-center justify-center font-black text-amber-900 dark:text-amber-300 shadow-md">
                            {tercero.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={tercero.avatar_url}
                                alt={tercero.nombre}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              <span>{tercero.apodo ? tercero.apodo[0] : tercero.nombre[0]}</span>
                            )}
                          </div>
                          <span className="absolute -bottom-1.5 -right-1 w-6 h-6 rounded-full bg-amber-700 text-amber-100 text-xs font-black flex items-center justify-center border border-white">
                            3
                          </span>
                        </div>
                        <span className="text-xs font-black text-gray-800 dark:text-gray-100 truncate max-w-[80px]">
                          {tercero.apodo || tercero.nombre.split(' ')[0]}
                        </span>
                        <span className="text-[11px] font-extrabold text-[#FF7043]">{tercero.puntos} pts</span>
                        {/* Pedestal */}
                        <div className="w-full h-16 bg-amber-100/60 dark:bg-amber-950/30 rounded-t-2xl mt-2 flex items-center justify-center text-amber-700 font-black text-lg shadow-inner">
                          🥉
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-16" />
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* LISTA DE POSICIONES COMPLETA */}
            {/* ------------------------------------------------------------- */}
            <div className="space-y-2">
              <h3 className="text-xs font-black text-gray-500 uppercase tracking-wider px-1">
                Todos los puestos
              </h3>

              {ranking.map((item) => {
                const esYo = item.usuario_id === usuario?.id;

                return (
                  <div
                    key={item.usuario_id}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                      esYo
                        ? 'bg-orange-50/80 dark:bg-orange-950/30 border-orange-300 dark:border-orange-800 shadow-sm ring-1 ring-[#FF7043]'
                        : 'bg-white dark:bg-[#201D24] border-[var(--border-soft)] shadow-xs'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 text-center font-black text-xs text-gray-400">
                        #{item.posicion}
                      </span>

                      <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center font-black text-xs text-gray-700 dark:text-gray-200">
                        {item.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.avatar_url}
                            alt={item.nombre}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <span>{item.apodo ? item.apodo[0] : item.nombre[0]}</span>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-black text-gray-800 dark:text-gray-100">
                            {item.apodo || item.nombre}
                          </h4>
                          {esYo && (
                            <span className="text-[9px] font-black px-1.5 py-0.2 bg-[#FF7043] text-white rounded-full">
                              ¡Sos vos!
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5">
                          {item.destellos_ganados > 0 && (
                            <span className="flex items-center gap-0.5 text-amber-600 font-bold">
                              <Crown className="w-3 h-3" />
                              {item.destellos_ganados} ganado(s)
                            </span>
                          )}
                          {item.racha && item.racha > 1 && (
                            <span className="flex items-center gap-0.5 text-orange-600 font-bold">
                              <Flame className="w-3 h-3 fill-orange-500" />
                              {item.racha} días racha
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-black text-[#FF7043]">{item.puntos}</span>
                      <span className="text-[10px] text-gray-400 block font-bold">pts</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>

      <Navbar />
    </div>
  );
}
