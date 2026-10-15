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

  // Modales
  const [modalUploadAbierto, setModalUploadAbierto] = useState(false);
  const [destelloSeleccionado, setDestelloSeleccionado] = useState<Destello | null>(null);

  const cargarDatos = async () => {
    try {
      const meRes = await fetch('/api/auth/me');
      const meData = await meRes.json();
      if (!meData.authenticated) {
        router.push('/login');
        return;
      }
      setUsuario(meData.usuario);

      const [hoyRes, socRes] = await Promise.all([
        fetch('/api/destellos/hoy'),
        fetch('/api/destellos/social'),
      ]);

      if (hoyRes.ok) {
        const hoyData = await hoyRes.json();
        setMiDestello(hoyData.miDestello);
        setDestellosGrupo(hoyData.destellosGrupo || []);
        if (hoyData.tiempoRestante) {
          setTiempoRestante(hoyData.tiempoRestante);
        }
      }

      if (socRes.ok) {
        const socData = await socRes.json();
        setRacha(socData.racha || 1);
        setFaltantesHoy(socData.faltantesHoy || []);
        setColgadosAyer(socData.colgadosAyer || []);
        setPublicidadGanadora(socData.publicidadGanadora || null);
        setReglasGrupo(socData.reglas || null);
        setDestelloGanadorAyer(socData.destelloGanadorAyer || null);
      }
    } catch (err) {
      console.error('Error cargando hoy:', err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
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

  // Regla: ¿Deben desenfocarse las fotos?
  // Si el usuario no subió todavía o si faltan miembros y la regla está activa
  const debenDesenfocarse = !miDestello || (faltantesHoy.length > 0 && reglasGrupo?.fotos_borrosas_hasta_subir !== false);

  return (
    <div className="flex-1 flex flex-col pb-20">
      <Header usuario={usuario} puntosTotales={16} />

      <main className="p-4 space-y-4 max-w-lg mx-auto w-full">
        {/* Saludo y Racha */}
        <div className="bg-gradient-to-br from-[#FFF8EE] to-[#FFF0E0] dark:from-[#241F2B] dark:to-[#1D1923] p-5 rounded-3xl border border-[#FFE0B2] dark:border-[#382F40] shadow-soft relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-bold text-[#FF7043] uppercase tracking-wider mb-1">
            <span>{hoyFormateado}</span>
            <span className="flex items-center gap-1">
              <Heart className="w-3.5 h-3.5 fill-[#FF7043]" />
              {usuario?.grupo_nombre || 'Familia'}
            </span>
          </div>

          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-gray-800 dark:text-gray-100 tracking-tight">
                ¡Qué hacés, {usuario?.apodo || usuario?.nombre?.split(' ')[0]}! ✨
              </h2>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
                Compartí tu momento del día antes del cierre de las 23:59 hs.
              </p>
            </div>

            {/* Contador de Racha Consecutiva 🔥 */}
            <div className="flex flex-col items-center p-2 rounded-2xl bg-orange-500/10 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 text-orange-600 dark:text-orange-400 shadow-sm">
              <div className="flex items-center gap-1 text-base font-black">
                <Flame className="w-5 h-5 fill-orange-500 animate-pulse" />
                <span>{racha}</span>
              </div>
              <span className="text-[9px] font-black uppercase tracking-tight">Días Racha</span>
            </div>
          </div>

          {/* Contador de tiempo al cierre */}
          <div className="mt-3 flex items-center gap-1.5 text-[11px] font-bold text-amber-800 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-950/40 px-3 py-1 rounded-full w-fit">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Cierre diario en {tiempoRestante.texto || 'pocas horas'}</span>
          </div>
        </div>

        {/* ------------------------------------------------------------------- */}
        {/* REVELADO DEL DESTELLO DE AYER (Elegido por Gemini) */}
        {/* ------------------------------------------------------------------- */}
        {destelloGanadorAyer && (
          <div className="bg-white dark:bg-[#201D24] p-5 rounded-3xl border border-[var(--border-soft)] shadow-soft space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-800 dark:text-gray-100">
                    Destello de Ayer 🏆
                  </h3>
                  <p className="text-[11px] text-gray-400">Elegido por Gemini (+10 pts)</p>
                </div>
              </div>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                Ganador
              </span>
            </div>

            {!destelloAyerRevelado ? (
              <div className="p-6 rounded-2xl bg-gradient-to-tr from-amber-500/10 via-orange-500/10 to-yellow-500/10 border-2 border-dashed border-amber-300 text-center space-y-3">
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
        {/* BOTÓN APURAR POR WHATSAPP: ¿Quiénes faltan hoy? */}
        {/* ------------------------------------------------------------------- */}
        {faltantesHoy.length > 0 && (
          <div className="bg-emerald-500/10 dark:bg-emerald-950/20 p-4 rounded-3xl border border-emerald-200/80 dark:border-emerald-900/40 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center shadow-sm">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-emerald-900 dark:text-emerald-200">
                    ¿Quiénes faltan subir hoy? ({faltantesHoy.length})
                  </h4>
                  <p className="text-[10px] text-emerald-700 dark:text-emerald-300">
                    ¡Avisales por WhatsApp para que no pierdan la racha!
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {faltantesHoy.map((m) => (
                <div
                  key={m.id}
                  className="p-2.5 bg-white dark:bg-[#1E1B22] rounded-xl border border-emerald-100 dark:border-emerald-900/40 flex items-center justify-between gap-2 shadow-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 font-black text-xs flex items-center justify-center shrink-0">
                      {m.apodo ? m.apodo[0].toUpperCase() : m.nombre[0].toUpperCase()}
                    </div>
                    <span className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">
                      {m.apodo || m.nombre}
                    </span>
                  </div>

                  <a
                    href={m.enlaceWhatsApp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black flex items-center gap-1 shrink-0 shadow-sm transition-colors"
                  >
                    <MessageCircle className="w-3 h-3 fill-white/20" />
                    <span>Apurar 📲</span>
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
        {/* SECCIÓN: TU DESTELLO DE HOY */}
        {/* ------------------------------------------------------------------- */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-extrabold text-gray-800 dark:text-gray-100 flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-[#FF7043]" />
              Tu Destello de hoy
            </h3>
            {miDestello && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                ¡Subido! +1 pt
              </span>
            )}
          </div>

          {!miDestello ? (
            /* Botón grande para subir si todavía no subió */
            <div className="bg-white dark:bg-[#201D24] p-6 rounded-3xl border-2 border-dashed border-[#FF7043]/40 shadow-soft text-center space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#FF7043] to-[#FFA726] text-white flex items-center justify-center mx-auto shadow-md shadow-[#FF7043]/30">
                <Camera className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-base font-extrabold text-gray-800 dark:text-gray-100">
                  ¿Todavía no subiste tu destello?
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 max-w-xs mx-auto">
                  Subí 1 foto o video corto de tu día para sumar puntos y competir por el Destello del Día.
                </p>
              </div>

              <button
                onClick={() => setModalUploadAbierto(true)}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-[#FF7043] to-[#FFA726] hover:from-[#F4511E] hover:to-[#FB8C00] text-white font-extrabold text-sm shadow-md shadow-[#FF7043]/30 flex items-center justify-center gap-2 transition-transform active:scale-98"
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

              <div className="flex items-center justify-between gap-2 p-3 bg-white dark:bg-[#201D24] rounded-2xl border border-[var(--border-soft)] shadow-sm">
                <div className="text-[11px] text-gray-500 dark:text-gray-400">
                  ¿Querés cambiarla? Podés hasta las <b>23:59 hs</b>.
                </div>
                <button
                  onClick={() => setModalUploadAbierto(true)}
                  className="px-3 py-1.5 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-[#FF7043] hover:bg-orange-200 text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reemplazar</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ------------------------------------------------------------------- */}
        {/* SECCIÓN: DESTELLOS DEL GRUPO HOY (Con Blur si aplica) */}
        {/* ------------------------------------------------------------------- */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-extrabold text-gray-800 dark:text-gray-100 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-purple-600" />
              Destellos del grupo hoy ({destellosGrupo.length})
            </h3>
            <span className="text-[11px] text-gray-400 font-semibold">
              {otrosDestellosHoy.length} de familiares
            </span>
          </div>

          {otrosDestellosHoy.length === 0 ? (
            <div className="p-5 bg-white dark:bg-[#201D24] rounded-3xl border border-[var(--border-soft)] text-center text-xs text-gray-400">
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
