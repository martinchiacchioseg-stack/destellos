'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Navbar from '@/components/Navbar';
import UploadModal from '@/components/UploadModal';
import { dispararConfeti } from '@/components/ConfettiCelebration';
import {
  Sparkles,
  Camera,
  RefreshCw,
  Clock,
  Users,
  Heart,
  Crown,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Download,
  Share2,
  ArrowRight,
  Flame,
} from 'lucide-react';
import { SesionUsuario, Destello, FeedPost } from '@/lib/types';
import { formatFechaBonita, getFechaArgentina } from '@/lib/date-utils';

export default function HomePage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<SesionUsuario | null>(null);
  const [cargando, setCargando] = useState(true);

  // Estado del día
  const [estadoDia, setEstadoDia] = useState<any>(null);
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([]);

  // Estados de subida y modales
  const [modalUploadAbierto, setModalUploadAbierto] = useState(false);
  const [adivinando, setAdivinando] = useState(false);
  const [asignaciones, setAsignaciones] = useState<Record<string, string>>({}); // destelloId -> userId
  const [resultadoAdivina, setResultadoAdivina] = useState<any | null>(null);
  const [errorAdivina, setErrorAdivina] = useState<string | null>(null);

  const cargarDatos = async () => {
    try {
      const meRes = await fetch('/api/auth/me');
      const meData = await meRes.json();
      if (!meData.authenticated) {
        router.push('/login');
        return;
      }
      setUsuario(meData.usuario);

      const [hoyRes, feedRes] = await Promise.all([
        fetch('/api/destellos/hoy'),
        fetch('/api/feed'),
      ]);

      if (hoyRes.ok) {
        const dataHoy = await hoyRes.json();
        setEstadoDia(dataHoy);
      }

      if (feedRes.ok) {
        const dataFeed = await feedRes.json();
        setFeedPosts(dataFeed.feed || []);
      }
    } catch (err) {
      console.error('Error cargando hoy:', err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
    const interval = setInterval(() => cargarDatos(), 8000);
    return () => clearInterval(interval);
  }, []);

  const handleEnviarAdivinanzas = async () => {
    setErrorAdivina(null);
    const destellos = estadoDia?.destellosParaAdivinar || [];
    const asignados = Object.values(asignaciones);

    if (asignados.length < destellos.length) {
      setErrorAdivina('Debés asignar un nombre a cada una de las fotos.');
      return;
    }

    const setNombres = new Set(asignados);
    if (setNombres.size !== asignados.length) {
      setErrorAdivina('No podés asignar la misma persona a más de una foto.');
      return;
    }

    setAdivinando(true);
    try {
      const res = await fetch('/api/juegos/adivina', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fecha: estadoDia.fechaHoy,
          asignaciones,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorAdivina(data.error || 'Error al enviar adivinanzas.');
      } else {
        setResultadoAdivina(data);
        dispararConfeti();
        cargarDatos();
      }
    } catch {
      setErrorAdivina('Error de conexión.');
    } finally {
      setAdivinando(false);
    }
  };

  const handleReaccionar = async (feedPostId: string, emoji: string) => {
    try {
      const res = await fetch('/api/feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedPostId, emoji }),
      });
      if (res.ok) {
        const data = await res.json();
        setFeedPosts((prev) =>
          prev.map((p) => (p.id === feedPostId ? { ...p, reacciones: data.post.reacciones } : p))
        );
      }
    } catch {}
  };

  if (cargando) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-sm text-gray-400">
        Cargando Destellos... ✨
      </div>
    );
  }

  const fase = estadoDia?.fase || 'subida';
  const grupo = estadoDia?.grupo || { nombre: 'Mi Grupo', emoji_or_logo: '✨' };
  const subieron = estadoDia?.subieron || [];
  const faltan = estadoDia?.faltan || [];
  const miDestello = estadoDia?.mi_destello;
  const destellosParaAdivinar = estadoDia?.destellosParaAdivinar || [];
  const candidatos = estadoDia?.candidatosParaAdivinar || [];
  const yaAdivino = estadoDia?.yaAdivino;

  return (
    <div className="flex-1 flex flex-col pb-24 max-w-md mx-auto w-full min-h-screen bg-gray-50 dark:bg-[#121014]">
      <Header usuario={usuario} puntosTotales={10} />

      <main className="p-4 space-y-4">
        {/* Banner Superior del Grupo */}
        <div className="bg-gradient-to-br from-[#FF7043] via-[#F4511E] to-[#E64A19] p-5 rounded-3xl text-white shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider mb-2">
            <span className="bg-black/20 backdrop-blur-xs px-2.5 py-1 rounded-full text-white">
              {formatFechaBonita(getFechaArgentina())}
            </span>
            <span className="bg-white/20 backdrop-blur-xs px-2.5 py-1 rounded-full text-white flex items-center gap-1">
              <span>{grupo.emoji_or_logo || '✨'}</span>
              <span>{grupo.nombre}</span>
            </span>
          </div>

          <h2 className="text-xl font-black text-white">
            ¡Hola, {usuario?.apodo || usuario?.nombre?.split(' ')[0]}! ✨
          </h2>
          <p className="text-xs text-orange-100 mt-0.5">
            {fase === 'subida' && 'Fase 1: Subí tu momento del día antes del cierre.'}
            {fase === 'adivinanza' && 'Fase 2: ¡Todos subieron! Adiviná de quién es cada foto.'}
            {fase === 'cerrado' && 'Fase 3: ¡El veredicto de la IA ya está listo!'}
          </p>

          <div className="mt-3 flex items-center gap-1.5 text-[11px] font-bold text-white/90 bg-black/25 px-3 py-1 rounded-full w-fit">
            <Clock className="w-3.5 h-3.5 text-amber-300" />
            <span>Cierre a las {grupo.hora_limite || '22:00'} hs</span>
          </div>
        </div>

        {/* ------------------------------------------------------------------- */}
        {/* FASE 1: SUBIDA DE DESTELLOS */}
        {/* ------------------------------------------------------------------- */}
        {fase === 'subida' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            {/* Estado de participación comunitaria (quién subió y quién falta, sin fotos) */}
            <div className="bg-white dark:bg-[#1C1822] p-4 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-[#FF7043]" />
                  Participación del Grupo
                </span>
                <span className="text-[11px] font-bold text-[#FF7043] bg-orange-50 dark:bg-orange-950/40 px-2 py-0.5 rounded-full">
                  {subieron.length} de {subieron.length + faltan.length} subieron
                </span>
              </div>

              {/* Miembros que ya subieron */}
              <div>
                <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mb-1.5">
                  ✓ Ya subieron su destello:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {subieron.length === 0 ? (
                    <span className="text-xs text-gray-400 italic">Todavía nadie subió hoy. ¡Sé el primero!</span>
                  ) : (
                    subieron.map((s: any) => (
                      <span
                        key={s.id}
                        className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800 flex items-center gap-1"
                      >
                        <span>✓</span>
                        <span>{s.apodo || s.nombre}</span>
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* Miembros que faltan */}
              {faltan.length > 0 && (
                <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                  <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 mb-1.5">
                    ⏳ Esperando su momento:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {faltan.map((f: any) => (
                      <span
                        key={f.id}
                        className="px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-xs font-bold border border-amber-200 dark:border-amber-800"
                      >
                        {f.apodo || f.nombre}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Tarjeta de Subida del Usuario */}
            <div className="bg-white dark:bg-[#1C1822] p-5 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm text-center space-y-4">
              {miDestello ? (
                <div className="space-y-3">
                  <div className="relative aspect-square rounded-2xl overflow-hidden shadow-md border-2 border-[#FF7043]/30">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={miDestello.media_url}
                      alt="Tu destello"
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute top-2.5 left-2.5 bg-[#FF7043] text-white text-[11px] font-black px-2.5 py-0.5 rounded-full shadow-sm">
                      Tu destello de hoy (+10 pts)
                    </span>
                  </div>

                  {miDestello.pie_de_foto && (
                    <p className="text-xs text-gray-600 dark:text-gray-300 italic">
                      &ldquo;{miDestello.pie_de_foto}&rdquo;
                    </p>
                  )}

                  <button
                    onClick={() => setModalUploadAbierto(true)}
                    className="py-2.5 px-4 rounded-2xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-xs font-bold text-gray-700 dark:text-gray-200 flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Reemplazar foto antes del cierre</span>
                  </button>
                </div>
              ) : (
                <div className="py-6 space-y-3">
                  <div className="w-16 h-16 rounded-3xl bg-orange-100 dark:bg-orange-950/60 text-[#FF7043] flex items-center justify-center mx-auto shadow-inner">
                    <Camera className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-gray-900 dark:text-white">
                      Todavía no subiste tu foto de hoy
                    </h3>
                    <p className="text-xs text-gray-500 max-w-xs mx-auto mt-0.5">
                      Sacá una foto espontánea o elegila de tu galería para no perder la racha.
                    </p>
                  </div>
                  <button
                    onClick={() => setModalUploadAbierto(true)}
                    className="py-3 px-6 rounded-2xl bg-[#FF7043] hover:bg-[#F4511E] text-white font-black text-xs shadow-lg shadow-[#FF7043]/30 flex items-center justify-center gap-2 mx-auto active:scale-95 transition-transform cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Subir mi destello ahora</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* FASE 2: ADIVINANZA (¿Quién sacó cada foto?) */}
        {/* ------------------------------------------------------------------- */}
        {fase === 'adivinanza' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 rounded-3xl text-white shadow-md space-y-1">
              <h3 className="text-sm font-black flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4" />
                Fase de Adivinanza Activa 🎯
              </h3>
              <p className="text-xs text-purple-100">
                Adiviná quién sacó cada una de estas fotos. ¡Sumás +5 puntos por cada acierto!
              </p>
            </div>

            {yaAdivino || resultadoAdivina ? (
              <div className="bg-white dark:bg-[#1C1822] p-6 rounded-3xl border border-gray-200 dark:border-gray-800 text-center space-y-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                <h4 className="text-base font-black text-gray-900 dark:text-white">
                  ¡Adivinanzas enviadas!
                </h4>
                <p className="text-xs text-gray-500">
                  Esperando que los demás completen sus votos o llegue la hora de cierre para conocer al ganador de la IA.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {errorAdivina && (
                  <div className="p-3 bg-red-50 text-red-700 text-xs font-bold rounded-2xl border border-red-200">
                    {errorAdivina}
                  </div>
                )}

                {destellosParaAdivinar.map((d: any, idx: number) => (
                  <div
                    key={d.id}
                    className="bg-white dark:bg-[#1C1822] p-4 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-3"
                  >
                    <div className="aspect-square rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={d.media_url} alt="Foto" className="w-full h-full object-cover" />
                    </div>

                    {d.pie_de_foto && (
                      <p className="text-xs text-gray-600 dark:text-gray-300 italic text-center">
                        &ldquo;{d.pie_de_foto}&rdquo;
                      </p>
                    )}

                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 mb-1">
                        ¿Quién sacó esta foto? (Foto #{idx + 1})
                      </label>
                      <select
                        value={asignaciones[d.id] || ''}
                        onChange={(e) =>
                          setAsignaciones((prev) => ({ ...prev, [d.id]: e.target.value }))
                        }
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#25202D] text-xs font-bold text-gray-800 dark:text-white"
                      >
                        <option value="">Seleccionar familiar...</option>
                        {candidatos.map((c: any) => (
                          <option key={c.id} value={c.id}>
                            {c.nombre} {c.apodo ? `("${c.apodo}")` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}

                <button
                  onClick={handleEnviarAdivinanzas}
                  disabled={adivinando}
                  className="w-full py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {adivinando ? 'Calculando aciertos...' : 'Confirmar mis adivinanzas'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* FASE 3 / CERRADO: VEREDICTO DE LA IA Y FEED */}
        {/* ------------------------------------------------------------------- */}
        {fase === 'cerrado' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            {/* Foto ganadora con Diploma Oficial */}
            {estadoDia?.destelloGanador && (
              <div className="bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-yellow-500/10 p-4 rounded-3xl border-2 border-amber-300 shadow-md space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                    <Crown className="w-4 h-4 fill-amber-500" />
                    Destello del Día (Elegido por IA +20 pts)
                  </span>
                </div>

                <div className="relative aspect-square rounded-2xl overflow-hidden shadow-lg border border-amber-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={estadoDia.destelloGanador.diploma_url || estadoDia.destelloGanador.media_url}
                    alt="Destello Ganador con Diploma"
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="text-center">
                  <p className="text-sm font-black text-gray-900 dark:text-white">
                    ¡Felicitaciones a {estadoDia.destelloGanador.autor_nombre}!
                  </p>
                  {estadoDia.destelloGanador.pie_de_foto && (
                    <p className="text-xs text-gray-500 italic mt-0.5">
                      &ldquo;{estadoDia.destelloGanador.pie_de_foto}&rdquo;
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Feed del Grupo */}
            <div className="space-y-3">
              <h3 className="text-sm font-black text-gray-800 dark:text-gray-200">
                Feed de Destellos Ganadores
              </h3>

              {feedPosts.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6 bg-white dark:bg-[#1C1822] rounded-3xl border border-gray-100 dark:border-gray-800">
                  Aún no hay publicaciones anteriores en el feed.
                </p>
              ) : (
                feedPosts.map((post) => (
                  <div
                    key={post.id}
                    className="bg-white dark:bg-[#1C1822] p-4 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-3"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-black text-gray-900 dark:text-white">
                        🏆 {post.nombre_ganador}
                      </span>
                      <span className="text-gray-400 text-[11px]">{post.fecha}</span>
                    </div>

                    <div className="aspect-square rounded-2xl overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={post.diploma_url} alt="Diploma" className="w-full h-full object-cover" />
                    </div>

                    {post.pie_de_foto && (
                      <p className="text-xs text-gray-600 dark:text-gray-300 italic">
                        &ldquo;{post.pie_de_foto}&rdquo;
                      </p>
                    )}

                    {/* Barra de Reacciones y Descarga */}
                    <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-gray-800">
                      <div className="flex items-center gap-1.5">
                        {['❤️', '👏', '😂', '🔥'].map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => handleReaccionar(post.id, emoji)}
                            className="px-2 py-1 rounded-xl bg-gray-50 dark:bg-[#25202D] hover:bg-gray-100 text-xs flex items-center gap-1 cursor-pointer transition-transform active:scale-90"
                          >
                            <span>{emoji}</span>
                            <span className="text-[10px] font-bold text-gray-500">
                              {post.reacciones?.[emoji] || 0}
                            </span>
                          </button>
                        ))}
                      </div>

                      <a
                        href={post.diploma_url}
                        download={`destello-${post.fecha}.jpg`}
                        className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                        title="Descargar foto con diploma"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      <Navbar />

      {/* Modal de Subida de Imagen */}
      {modalUploadAbierto && (
        <UploadModal
          onClose={() => setModalUploadAbierto(false)}
          onUploadSuccess={() => {
            setModalUploadAbierto(false);
            cargarDatos();
          }}
        />
      )}
    </div>
  );
}
