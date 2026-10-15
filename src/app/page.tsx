'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Navbar from '@/components/Navbar';
import PolaroidCard from '@/components/PolaroidCard';
import LightboxModal from '@/components/LightboxModal';
import UploadModal from '@/components/UploadModal';
import SponsorAd from '@/components/SponsorAd';
import { dispararConfeti } from '@/components/ConfettiCelebration';
import {
  Sparkles,
  Camera,
  RefreshCw,
  Clock,
  Users,
  Heart,
  MessageCircle,
  Ghost,
  Flame,
  Crown,
  Eye,
  Lock,
  ExternalLink,
  Check,
} from 'lucide-react';
import { Destello, SesionUsuario, Publicidad, ReglasGrupo, UsuarioPublico } from '@/lib/types';
import { formatFechaBonita, getFechaArgentina } from '@/lib/date-utils';

export default function HomePage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<(SesionUsuario & { grupo_nombre?: string }) | null>(null);
  const [miDestello, setMiDestello] = useState<Destello | null>(null);
  const [destellosGrupo, setDestellosGrupo] = useState<Destello[]>([]);
  const [tiempoRestante, setTiempoRestante] = useState<{ horas: number; minutos: number; texto: string }>({
    horas: 0,
    minutos: 0,
    texto: '',
  });
  const [cargando, setCargando] = useState(true);

  // Estados sociales
  const [racha, setRacha] = useState<number>(1);
  const [faltantesHoy, setFaltantesHoy] = useState<any[]>([]);
  const [colgadosAyer, setColgadosAyer] = useState<UsuarioPublico[]>([]);
  const [publicidadGanadora, setPublicidadGanadora] = useState<Publicidad | null>(null);
  const [reglasGrupo, setReglasGrupo] = useState<ReglasGrupo | null>(null);
  const [destelloGanadorAyer, setDestelloGanadorAyer] = useState<Destello | null>(null);
  const [destelloAyerRevelado, setDestelloAyerRevelado] = useState(false);
  const [puntosTotales, setPuntosTotales] = useState<number>(10);

  // Modales
  const [modalUploadAbierto, setModalUploadAbierto] = useState(false);
  const [destelloSeleccionado, setDestelloSeleccionado] = useState<Destello | null>(null);

  const cargarDatos = async (silencioso = false) => {
    if (!silencioso) setCargando(true);
    try {
      if (!usuario) {
        const meRes = await fetch('/api/auth/me');
        const meData = await meRes.json();
        if (!meData.authenticated) {
          router.push('/login');
          return;
        }
        setUsuario(meData.usuario);
      }

      const [hoyRes, socRes] = await Promise.all([
        fetch('/api/destellos/hoy'),
        fetch('/api/destellos/social'),
      ]);

      if (hoyRes.ok) {
        const hoyData = await hoyRes.json();
        setMiDestello((prev) => {
          if (!prev && !hoyData.miDestello) return prev;
          if (
            prev?.id === hoyData.miDestello?.id &&
            prev?.actualizado_en === hoyData.miDestello?.actualizado_en &&
            prev?.media_url === hoyData.miDestello?.media_url
          ) {
            return prev;
          }
          return hoyData.miDestello;
        });

        setDestellosGrupo((prev) => {
          const nuevos = hoyData.destellosGrupo || [];
          if (
            prev.length === nuevos.length &&
            prev.every(
              (d, i) =>
                d.id === nuevos[i]?.id &&
                d.actualizado_en === nuevos[i]?.actualizado_en &&
                d.media_url === nuevos[i]?.media_url
            )
          ) {
            return prev;
          }
          return nuevos;
        });

        if (hoyData.tiempoRestante) {
          setTiempoRestante((prev) => {
            if (prev.texto === hoyData.tiempoRestante.texto) return prev;
            return hoyData.tiempoRestante;
          });
        }
      }

      if (socRes.ok) {
        const socData = await socRes.json();
        setRacha((prev) => (prev === socData.racha ? prev : (socData.racha || 1)));
        if (typeof socData.puntosTotales === 'number') {
          setPuntosTotales((prev) => (prev === socData.puntosTotales ? prev : socData.puntosTotales));
        }
        setFaltantesHoy((prev) => {
          const nuevos = socData.faltantesHoy || [];
          if (prev.length === nuevos.length && prev.every((f, i) => f.id === nuevos[i]?.id)) return prev;
          return nuevos;
        });
        setColgadosAyer((prev) => {
          const nuevos = socData.colgadosAyer || [];
          if (prev.length === nuevos.length && prev.every((c, i) => c.id === nuevos[i]?.id)) return prev;
          return nuevos;
        });
        setPublicidadGanadora((prev) => (prev?.id === socData.publicidadGanadora?.id ? prev : (socData.publicidadGanadora || null)));
        setReglasGrupo(socData.reglas || null);
        setDestelloGanadorAyer((prev) => (prev?.id === socData.destelloGanadorAyer?.id ? prev : (socData.destelloGanadorAyer || null)));
      }
    } catch (err) {
      console.error('Error cargando hoy:', err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();

    // Auto-recarga silenciosa periódica cada 6 segundos
    const timer = setInterval(() => {
      cargarDatos(true);
    }, 6000);

    const onFocus = () => cargarDatos(true);
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [router]);

  const handleRevelarAyer = () => {
    setDestelloAyerRevelado(true);
    dispararConfeti();
  };

  if (cargando) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-sm text-gray-400">
        Cargando Destellos... ✨
      </div>
    );
  }

  const hoyFormateado = formatFechaBonita(getFechaArgentina());
  const otrosDestellosHoy = destellosGrupo.filter((d) => d.usuario_id !== usuario?.id);
  const faltantesDelResto = faltantesHoy.filter((m) => m.id !== usuario?.id);

  // Regla: ¿Deben desenfocarse las fotos?
  // Si el usuario no subió todavía o si faltan miembros y la regla está activa
  const debenDesenfocarse = !miDestello || (faltantesHoy.length > 0 && reglasGrupo?.fotos_borrosas_hasta_subir !== false);

  return (
    <div className="flex-1 flex flex-col pb-20">
      <Header usuario={usuario} puntosTotales={puntosTotales} />

      <main className="p-4 space-y-4 max-w-lg mx-auto w-full">
        {/* Saludo y Racha - Tarjeta Superior Familia Chiaccio */}
        <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-[#FF7043] p-5 rounded-3xl border-2 border-amber-300/40 shadow-lg text-white relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider mb-2">
            <span className="bg-black/20 backdrop-blur-sm px-2.5 py-1 rounded-full text-white/95">
              {hoyFormateado}
            </span>
            <span className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full font-black text-white shadow-sm">
              <Heart className="w-3.5 h-3.5 fill-white text-white" />
              <span>{usuario?.grupo_nombre || 'Familia Chiaccio'}</span>
            </span>
          </div>

          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-xl font-black text-white tracking-tight drop-shadow-sm">
                ¡Qué hacés, {usuario?.apodo || usuario?.nombre?.split(' ')[0]}! ✨
              </h2>
              <p className="text-xs text-orange-50 mt-1 leading-relaxed">
                Compartí tu momento del día antes del cierre de las 23:59 hs.
              </p>
            </div>

            {/* Contador de Racha Consecutiva 🔥 */}
            <div className="flex flex-col items-center p-2.5 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 text-white shadow-sm shrink-0">
              <div className="flex items-center gap-1 text-base font-black">
                <Flame className="w-5 h-5 fill-amber-300 text-amber-200 animate-pulse" />
                <span>{racha}</span>
              </div>
              <span className="text-[9px] font-black uppercase tracking-tight text-orange-100">Días Racha</span>
            </div>
          </div>

          {/* Contador de tiempo al cierre */}
          <div className="mt-3.5 flex items-center gap-1.5 text-[11px] font-extrabold text-white bg-black/25 backdrop-blur-md px-3 py-1 rounded-full w-fit border border-white/10">
            <Clock className="w-3.5 h-3.5 text-amber-300" />
            <span>Cierre diario en {tiempoRestante.texto || 'pocas horas'}</span>
          </div>
        </div>

        {/* ------------------------------------------------------------------- */}
        {/* REVELADO DEL DESTELLO DE AYER (Elegido por Gemini - Color Dorado) */}
        {/* ------------------------------------------------------------------- */}
        {destelloGanadorAyer && (
          <div className="bg-gradient-to-br from-yellow-50/90 via-amber-50/70 to-orange-50/60 dark:from-amber-950/25 dark:via-yellow-950/15 dark:to-orange-950/20 p-5 rounded-3xl border-2 border-amber-300/90 dark:border-amber-700/60 shadow-soft space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md">
                  <Crown className="w-4 h-4 fill-white/20" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-amber-950 dark:text-amber-100">
                    Destello de Ayer 🏆
                  </h3>
                  <p className="text-[11px] text-amber-700/80 dark:text-amber-300/80 font-medium">Elegido por Gemini (+10 pts)</p>
                </div>
              </div>
              <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-200 dark:bg-amber-900/80 text-amber-900 dark:text-amber-100 shadow-xs">
                Ganador
              </span>
            </div>

            {!destelloAyerRevelado ? (
              <div className="p-6 rounded-2xl bg-white/70 dark:bg-[#1E1B22]/70 border-2 border-dashed border-amber-300 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-amber-400 text-white flex items-center justify-center mx-auto shadow-md animate-bounce">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-gray-800 dark:text-gray-100">
                    ¿Quién habrá ganado el destello de ayer?
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Tocá el botón para romper el sobre y revelar la foto ganadora.
                  </p>
                </div>
                <button
                  onClick={handleRevelarAyer}
                  className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-[#FF7043] text-white font-black text-xs shadow-md shadow-amber-500/30 flex items-center justify-center gap-2 mx-auto active:scale-95 transition-transform"
                >
                  <Eye className="w-4 h-4" />
                  <span>Revelar Destello del Día ✨</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3 animate-in zoom-in-95 duration-500">
                <PolaroidCard
                  destello={destelloGanadorAyer}
                  esDestelloDelDia={true}
                  onVerDetalle={(d) => setDestelloSeleccionado(d)}
                />

                {/* Publicidad patrocinada de foto ganadora si fue configurada por superadmin */}
                {publicidadGanadora && (
                  <div className="pt-1">
                    <SponsorAd publicidad={publicidadGanadora} />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* BOTÓN APURAR POR WHATSAPP: ¿Quiénes faltan hoy? (Color Verde Esmeralda) */}
        {/* ------------------------------------------------------------------- */}
        {faltantesDelResto.length > 0 && (
          <div className="bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-green-500/15 dark:from-emerald-950/40 dark:to-teal-950/30 p-4 rounded-3xl border-2 border-emerald-400/80 dark:border-emerald-700 space-y-3 shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-md">
                  <MessageCircle className="w-4 h-4 fill-white/20" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-emerald-950 dark:text-emerald-200">
                    ¿Quiénes faltan subir hoy? ({faltantesDelResto.length})
                  </h4>
                  <p className="text-[10px] text-emerald-700 dark:text-emerald-300 font-medium">
                    ¡Avisales por WhatsApp para que no pierdan la racha!
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200">
                WhatsApp 📲
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {faltantesDelResto.map((m) => (
                <div
                  key={m.id}
                  className="p-2.5 bg-white dark:bg-[#1E1B22] rounded-2xl border border-emerald-100 dark:border-emerald-900/50 flex items-center justify-between gap-2 shadow-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 font-black text-xs flex items-center justify-center shrink-0">
                      {m.apodo ? m.apodo[0].toUpperCase() : m.nombre[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate block">
                        {m.apodo || m.nombre}
                      </span>
                      {m.telefono ? (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-0.5">
                          📱 {m.telefono}
                        </span>
                      ) : (
                        <span className="text-[9px] text-gray-400">
                          (WhatsApp directo)
                        </span>
                      )}
                    </div>
                  </div>

                  <a
                    href={m.enlaceWhatsApp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-[11px] font-black flex items-center gap-1.5 shrink-0 shadow-sm transition-transform"
                  >
                    <MessageCircle className="w-3.5 h-3.5 fill-white/20" />
                    <span>Avisar 📲</span>
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* MURO DE LOS COLGADOS (Ayer se les pasó) 👻 */}
        {/* ------------------------------------------------------------------- */}
        {colgadosAyer.length > 0 && (
          <div className="bg-purple-500/10 dark:bg-purple-950/20 p-4 rounded-3xl border border-purple-200/80 dark:border-purple-900/40 space-y-2 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-purple-500 text-white flex items-center justify-center shadow-sm">
                <Ghost className="w-4 h-4 animate-bounce" />
              </div>
              <div>
                <h4 className="text-xs font-black text-purple-900 dark:text-purple-200">
                  Muro de los Colgados 👻
                </h4>
                <p className="text-[10px] text-purple-700 dark:text-purple-300">
                  Ayer se durmieron y no subieron destello:
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {colgadosAyer.map((c) => (
                <span
                  key={c.id}
                  className="px-3 py-1 rounded-full bg-white dark:bg-[#1E1B22] border border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-300 font-bold text-xs flex items-center gap-1 shadow-xs"
                >
                  <span>👻</span>
                  <span>{c.apodo || c.nombre}</span>
                  <span className="text-[10px] text-gray-400 font-normal">(-1 racha)</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* SECCIÓN: TU DESTELLO DE HOY (Color Azul Celeste / Índigo) */}
        {/* ------------------------------------------------------------------- */}
        <div className="p-4 rounded-3xl bg-gradient-to-br from-sky-50/90 via-blue-50/70 to-indigo-50/80 dark:from-sky-950/30 dark:via-blue-950/20 dark:to-indigo-950/30 border-2 border-sky-300/90 dark:border-sky-800 shadow-soft space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-sm">
                <Camera className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-sky-950 dark:text-sky-200">
                  Tu Destello de hoy
                </h3>
                <p className="text-[10px] text-sky-600 dark:text-sky-400 font-semibold">
                  {miDestello ? '¡Ya sumaste tu foto del día!' : 'Subí 1 foto para no perder la racha'}
                </p>
              </div>
            </div>
            {miDestello ? (
              <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-500 text-white shadow-sm flex items-center gap-1">
                <Check className="w-3 h-3" /> ¡Subido! +1 pt
              </span>
            ) : (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-300">
                Pendiente
              </span>
            )}
          </div>

          {!miDestello ? (
            /* Botón grande para subir si todavía no subió */
            <div className="bg-white dark:bg-[#201D24] p-5 rounded-2xl border-2 border-dashed border-sky-300/80 shadow-xs text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white flex items-center justify-center mx-auto shadow-md shadow-sky-500/20">
                <Camera className="w-7 h-7" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-gray-800 dark:text-gray-100">
                  ¿Todavía no subiste tu destello?
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 max-w-xs mx-auto">
                  Subí 1 foto o video corto de tu día para sumar puntos y competir por el Destello del Día.
                </p>
              </div>

              <button
                onClick={() => setModalUploadAbierto(true)}
                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white font-extrabold text-sm shadow-md shadow-sky-500/30 flex items-center justify-center gap-2 transition-transform active:scale-98"
              >
                <Sparkles className="w-5 h-5 fill-white/20" />
                <span>Subir mi destello de hoy 📸</span>
              </button>
            </div>
          ) : (
            /* Polaroid del destello propio con opción de reemplazarlo */
            <div className="space-y-3">
              <PolaroidCard
                destello={miDestello}
                esPropia={true}
                onVerDetalle={(d) => setDestelloSeleccionado(d)}
                rotacion={-0.5}
              />

              <div className="flex items-center justify-between gap-2 p-3 bg-white dark:bg-[#201D24] rounded-2xl border border-sky-100 dark:border-sky-900 shadow-sm">
                <div className="text-[11px] text-gray-500 dark:text-gray-400">
                  ¿Querés cambiarla? Podés hasta las <b>23:59 hs</b>.
                </div>
                <button
                  onClick={() => setModalUploadAbierto(true)}
                  className="px-3 py-1.5 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 hover:bg-sky-200 text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reemplazar</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ------------------------------------------------------------------- */}
        {/* SECCIÓN: DESTELLOS DEL GRUPO HOY (Color Rosa / Fucsia / Morado) */}
        {/* ------------------------------------------------------------------- */}
        <div className="p-4 rounded-3xl bg-gradient-to-br from-rose-50/90 via-pink-50/70 to-fuchsia-50/80 dark:from-rose-950/30 dark:via-pink-950/20 dark:to-fuchsia-950/30 border-2 border-rose-300/90 dark:border-rose-800 shadow-soft space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-sm">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-rose-950 dark:text-rose-200">
                  Destellos del grupo hoy ({destellosGrupo.length})
                </h3>
                <p className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold">
                  Fotos compartidas por la familia hoy
                </p>
              </div>
            </div>
            <span className="text-[11px] font-bold px-2.5 py-0.5 bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 rounded-full">
              {otrosDestellosHoy.length} familiares
            </span>
          </div>

          {otrosDestellosHoy.length === 0 ? (
            <div className="p-5 bg-white dark:bg-[#201D24] rounded-2xl border border-rose-100 dark:border-rose-900/60 text-center text-xs text-gray-500">
              Aún no hay fotos de otros miembros hoy. ¡Avisales al grupo que ya arrancó el día! 📲
            </div>
          ) : (
            <div className="space-y-4">
              {debenDesenfocarse && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 rounded-2xl flex items-center gap-2 text-xs text-amber-900 dark:text-amber-200 font-bold">
                  <Lock className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>
                    Fotos con desenfoque: subí tu destello y esperá a que todos suban para revelarlas.
                  </span>
                </div>
              )}

              {otrosDestellosHoy.map((d, idx) => (
                <div key={d.id} className="relative">
                  <div className={debenDesenfocarse ? 'blur-md filter pointer-events-none select-none' : ''}>
                    <PolaroidCard
                      destello={d}
                      rotacion={idx % 2 === 0 ? 0.8 : -0.8}
                      onVerDetalle={(dest) => !debenDesenfocarse && setDestelloSeleccionado(dest)}
                    />
                  </div>

                  {debenDesenfocarse && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-white/30 dark:bg-black/30 backdrop-blur-xs rounded-3xl">
                      <div className="p-2.5 rounded-full bg-white dark:bg-gray-800 shadow-md text-amber-600 mb-1">
                        <Lock className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-black text-gray-800 dark:text-gray-100 text-center drop-shadow">
                        Destello Oculto ✨
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modal de Subida */}
      <UploadModal
        isOpen={modalUploadAbierto}
        destelloExistente={Boolean(miDestello)}
        onClose={() => setModalUploadAbierto(false)}
        onUploadSuccess={cargarDatos}
      />

      {/* Lightbox para ver a pantalla completa */}
      <LightboxModal
        destello={destelloSeleccionado}
        onClose={() => setDestelloSeleccionado(null)}
      />

      <Navbar />
    </div>
  );
}
