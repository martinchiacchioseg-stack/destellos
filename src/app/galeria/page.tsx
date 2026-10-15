'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Navbar from '@/components/Navbar';
import PolaroidCard from '@/components/PolaroidCard';
import LightboxModal from '@/components/LightboxModal';
import { Images, Film, Camera, Users, Sparkles, Filter } from 'lucide-react';
import { Destello, SesionUsuario, UsuarioPublico } from '@/lib/types';

export default function GaleriaPage() {
  const [usuario, setUsuario] = useState<SesionUsuario | null>(null);
  const [destellos, setDestellos] = useState<Destello[]>([]);
  const [miembros, setMiembros] = useState<UsuarioPublico[]>([]);
  const [esAdmin, setEsAdmin] = useState(false);
  const [cargando, setCargando] = useState(true);

  // Filtros
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'foto' | 'video'>('todos');
  const [filtroUsuarioId, setFiltroUsuarioId] = useState<string>('todos');

  // Modal Lightbox
  const [destelloSeleccionado, setDestelloSeleccionado] = useState<Destello | null>(null);

  const cargarGaleria = async () => {
    try {
      const meRes = await fetch('/api/auth/me');
      const meData = await meRes.json();
      if (meData.authenticated) {
        setUsuario(meData.usuario);
      }

      const params = new URLSearchParams();
      if (filtroTipo !== 'todos') params.append('tipo_media', filtroTipo);
      if (filtroUsuarioId !== 'todos') params.append('usuario_id', filtroUsuarioId);

      const res = await fetch(`/api/destellos/galeria?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setDestellos(data.destellos || []);
        setMiembros(data.miembros || []);
        setEsAdmin(Boolean(data.esAdmin));
      }
    } catch (err) {
      console.error('Error cargando galería:', err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarGaleria();
  }, [filtroTipo, filtroUsuarioId]);

  const handleModerarExito = (destelloId: string) => {
    setDestellos((prev) => prev.filter((d) => d.id !== destelloId));
  };

  return (
    <div className="flex-1 flex flex-col pb-20">
      <Header usuario={usuario} puntosTotales={16} />

      <main className="p-4 space-y-4">
        {/* Cabecera del Álbum */}
        <div className="bg-gradient-to-br from-[#FFF8EE] to-[#FFF0E0] dark:from-[#241F2B] dark:to-[#1D1923] p-5 rounded-3xl border border-[#FFE0B2] dark:border-[#382F40] shadow-soft">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#FF7043] to-[#FFA726] text-white flex items-center justify-center shadow-sm">
              <Images className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-extrabold text-gray-800 dark:text-gray-100 tracking-tight">
              Álbum Polaroid Familiar
            </h2>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-300">
            Los recuerdos y destellos diarios de tu grupo, guardados para siempre.
          </p>

          <div className="mt-3 flex items-center gap-2 text-[11px] font-bold text-gray-500 dark:text-gray-400">
            <span className="px-2.5 py-0.5 rounded-full bg-white dark:bg-[#201D24] border border-gray-200 dark:border-gray-700">
              {destellos.length} destellos guardados
            </span>
          </div>
        </div>

        {/* Barra de Filtros */}
        <div className="bg-white dark:bg-[#201D24] p-3.5 rounded-3xl border border-[var(--border-soft)] shadow-sm space-y-3">
          {/* Tipo de Media: Todos / Fotos / Videos */}
          <div className="flex items-center gap-1.5 p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl">
            <button
              onClick={() => setFiltroTipo('todos')}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filtroTipo === 'todos'
                  ? 'bg-white dark:bg-[#2A2630] text-[#FF7043] shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFiltroTipo('foto')}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                filtroTipo === 'foto'
                  ? 'bg-white dark:bg-[#2A2630] text-[#FF7043] shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Fotos</span>
            </button>
            <button
              onClick={() => setFiltroTipo('video')}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                filtroTipo === 'video'
                  ? 'bg-white dark:bg-[#2A2630] text-[#FF7043] shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Videos</span>
            </button>
          </div>

          {/* Filtro por Miembro Familiar (Scroll horizontal) */}
          {miembros.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Users className="w-3 h-3" /> Filtrar por familiar:
              </p>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                <button
                  onClick={() => setFiltroUsuarioId('todos')}
                  className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                    filtroUsuarioId === 'todos'
                      ? 'bg-[#FF7043] text-white shadow-sm'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  Todos
                </button>
                {miembros.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setFiltroUsuarioId(m.id)}
                    className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-colors ${
                      filtroUsuarioId === m.id
                        ? 'bg-[#FF7043] text-white shadow-sm'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    <span>{m.apodo || m.nombre.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Lista de Polaroids */}
        {cargando ? (
          <div className="p-8 text-center text-xs text-gray-400">
            Cargando recuerdos del álbum... 📸
          </div>
        ) : destellos.length === 0 ? (
          <div className="bg-white dark:bg-[#201D24] p-8 rounded-3xl border border-[var(--border-soft)] text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-orange-100 text-[#FF7043] flex items-center justify-center mx-auto">
              <Camera className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">
              No hay destellos para este filtro
            </h3>
            <p className="text-xs text-gray-400">
              Probá seleccionando otro filtro o subí una foto hoy para inaugurar este espacio.
            </p>
          </div>
        ) : (
          <div className="space-y-6 pt-2">
            {destellos.map((d, index) => {
              // Rotación leve alterna estilo polaroids sobre corcho
              const rot = index % 3 === 0 ? -1 : index % 3 === 1 ? 1 : 0.4;
              return (
                <PolaroidCard
                  key={d.id}
                  destello={d}
                  esPropia={d.usuario_id === usuario?.id}
                  esAdmin={esAdmin}
                  rotacion={rot}
                  onVerDetalle={(dest) => setDestelloSeleccionado(dest)}
                  onModerar={handleModerarExito}
                />
              );
            })}
          </div>
        )}
      </main>

      {/* Lightbox para ver en grande */}
      <LightboxModal
        destello={destelloSeleccionado}
        onClose={() => setDestelloSeleccionado(null)}
      />

      <Navbar />
    </div>
  );
}
