'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Navbar from '@/components/Navbar';
import PolaroidCard from '@/components/PolaroidCard';
import LightboxModal from '@/components/LightboxModal';
import UploadModal from '@/components/UploadModal';
import { Sparkles, Camera, RefreshCw, Clock, Users, Heart } from 'lucide-react';
import { Destello, SesionUsuario } from '@/lib/types';
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

      const hoyRes = await fetch('/api/destellos/hoy');
      if (hoyRes.ok) {
        const hoyData = await hoyRes.json();
        setMiDestello(hoyData.miDestello);
        setDestellosGrupo(hoyData.destellosGrupo || []);
        if (hoyData.tiempoRestante) {
          setTiempoRestante(hoyData.tiempoRestante);
        }
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

  if (cargando) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-sm text-gray-400">
        Cargando Destellos... ✨
      </div>
    );
  }

  const hoyFormateado = formatFechaBonita(getFechaArgentina());
  const otrosDestellosHoy = destellosGrupo.filter((d) => d.usuario_id !== usuario?.id);

  return (
    <div className="flex-1 flex flex-col pb-20">
      <Header usuario={usuario} puntosTotales={16} />

      <main className="p-4 space-y-4">
        {/* Saludo y Fecha */}
        <div className="bg-gradient-to-br from-[#FFF8EE] to-[#FFF0E0] dark:from-[#241F2B] dark:to-[#1D1923] p-5 rounded-3xl border border-[#FFE0B2] dark:border-[#382F40] shadow-soft relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-bold text-[#FF7043] uppercase tracking-wider mb-1">
            <span>{hoyFormateado}</span>
            <span className="flex items-center gap-1">
              <Heart className="w-3.5 h-3.5 fill-[#FF7043]" />
              {usuario?.grupo_nombre || 'Familia'}
            </span>
          </div>

          <h2 className="text-xl font-extrabold text-gray-800 dark:text-gray-100 tracking-tight">
            ¡Qué hacés, {usuario?.apodo || usuario?.nombre?.split(' ')[0]}! ✨
          </h2>
          <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
            Compartí tu momento del día antes del cierre de las 23:59 hs.
          </p>

          {/* Contador de tiempo al cierre */}
          <div className="mt-3 flex items-center gap-1.5 text-[11px] font-bold text-amber-800 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-950/40 px-3 py-1 rounded-full w-fit">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Cierre diario en {tiempoRestante.texto || 'pocas horas'}</span>
          </div>
        </div>

        {/* Sección: Tu Destello de Hoy */}
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

        {/* Sección: Destellos del grupo hoy */}
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
              {otrosDestellosHoy.map((d, idx) => (
                <PolaroidCard
                  key={d.id}
                  destello={d}
                  rotacion={idx % 2 === 0 ? 0.8 : -0.8}
                  onVerDetalle={(dest) => setDestelloSeleccionado(dest)}
                />
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
