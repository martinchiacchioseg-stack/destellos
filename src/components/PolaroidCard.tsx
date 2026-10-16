'use client';

import { useState } from 'react';
import { Crown, Play, Trash2, Heart, Sparkles } from 'lucide-react';
import { Destello } from '@/lib/types';
import { formatFechaBonita } from '@/lib/date-utils';

interface PolaroidCardProps {
  destello: Destello;
  esPropia?: boolean;
  esAdmin?: boolean;
  esDestelloDelDia?: boolean;
  onVerDetalle?: (destello: Destello) => void;
  onModerar?: (destelloId: string) => void;
  rotacion?: number; // ángulo sutil de inclinación estilo álbum
}

export default function PolaroidCard({
  destello,
  esPropia = false,
  esAdmin = false,
  esDestelloDelDia = false,
  onVerDetalle,
  onModerar,
  rotacion = 0,
}: PolaroidCardProps) {
  const [cargandoMod, setCargandoMod] = useState(false);

  const handleModerar = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const motivo = prompt('¿Por qué motivo deseás moderar u ocultar esta publicación?');
    if (!motivo) return;

    setCargandoMod(true);
    try {
      const res = await fetch('/api/destellos/moderar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destelloId: destello.id, motivo }),
      });
      if (res.ok) {
        onModerar?.(destello.id);
      } else {
        const data = await res.json();
        alert(data.error || 'Error al moderar publicación');
      }
    } catch {
      alert('Error de red al moderar.');
    } finally {
      setCargandoMod(false);
    }
  };

  const fechaFormateada = formatFechaBonita(destello.fecha);

  return (
    <div
      onClick={() => onVerDetalle?.(destello)}
      style={{ transform: `rotate(${rotacion}deg)` }}
      className="polaroid-frame relative cursor-pointer group hover:scale-[1.02] hover:shadow-glow transition-all duration-300 max-w-sm mx-auto w-full"
    >
      {/* Cinta washi tape decorativa en la parte superior */}
      <div className="washi-tape" />

      {/* Corona si fue el Destello del Día */}
      {(esDestelloDelDia || destello.es_destello_del_dia) && (
        <div className="absolute -top-3 -right-2 z-20 bg-gradient-to-tr from-amber-400 to-yellow-300 text-amber-950 px-2.5 py-1 rounded-full text-[11px] font-black flex items-center gap-1 shadow-md animate-bounce">
          <Crown className="w-3.5 h-3.5 fill-amber-500" />
          <span>¡DESTELLO DEL DÍA!</span>
        </div>
      )}

      {/* Favorito de la comunidad */}
      {destello.es_favorito_comunidad && !destello.es_destello_del_dia && (
        <div className="absolute -top-3 -right-2 z-20 bg-rose-500 text-white px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-md">
          <Heart className="w-3 h-3 fill-white" />
          <span>Elegido por el grupo</span>
        </div>
      )}

      {/* Contenedor de la foto o video */}
      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-stone-100 dark:bg-stone-900 border border-stone-200/50 dark:border-stone-800">
        {destello.tipo_media === 'video' ? (
          <div className="w-full h-full relative flex items-center justify-center bg-black">
            <video
              src={destello.media_url}
              className="w-full h-full object-cover"
              preload="metadata"
              playsInline
              muted
            />
            <div className="absolute inset-0 bg-black/25 flex items-center justify-center group-hover:bg-black/10 transition-colors">
              <div className="w-12 h-12 rounded-full bg-white/90 text-[#FF7043] flex items-center justify-center shadow-lg">
                <Play className="w-6 h-6 ml-1 fill-[#FF7043]" />
              </div>
            </div>
            <span className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-md font-bold">
              Video 30s
            </span>
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={destello.thumbnail_url || destello.media_url}
            alt={destello.pie_de_foto || 'Destello familiar'}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        )}

        {/* Badge "Tuya" si pertenece al usuario actual */}
        {esPropia && (
          <span className="absolute top-2 left-2 bg-[#FF7043] text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-sm">
            Tu destello de hoy
          </span>
        )}

        {/* Botón de moderación para Administradores */}
        {esAdmin && onModerar && (
          <button
            onClick={handleModerar}
            disabled={cargandoMod}
            title="Moderar / Borrar contenido"
            className="absolute top-2 right-2 p-1.5 rounded-full bg-red-600/80 hover:bg-red-600 text-white text-xs backdrop-blur-sm transition-all shadow-md z-30"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Pie de foto estilo Polaroid (caligrafía cálida y autor) */}
      <div className="mt-3 px-1">
        <div className="flex items-center justify-between gap-2">
          {/* Autor */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-full overflow-hidden bg-orange-100 ring-1 ring-[#FF7043]/30 shrink-0 flex items-center justify-center text-[10px] font-bold text-[#FF7043]">
              {destello.usuario?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={destello.usuario.avatar_url}
                  alt={destello.usuario.nombre}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{destello.usuario?.nombre?.charAt(0) || 'F'}</span>
              )}
            </div>
            <p className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">
              {destello.usuario?.apodo || destello.usuario?.nombre || 'Familiar'}
            </p>
          </div>

          {/* Fecha */}
          <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 shrink-0">
            {fechaFormateada}
          </span>
        </div>

        {/* Pie de foto descriptivo */}
        {destello.pie_de_foto && (
          <p className="text-xs text-gray-600 dark:text-gray-300 mt-1.5 line-clamp-2 italic leading-relaxed">
            &ldquo;{destello.pie_de_foto}&rdquo;
          </p>
        )}

        {/* Reto cumplido */}
        {destello.cumple_reto && (
          <div className="mt-2 flex items-center gap-1 text-[10px] text-amber-700 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-lg border border-amber-200/50 dark:border-amber-900/30 w-fit">
            <Sparkles className="w-3 h-3 fill-amber-400" />
            <span>Reto cumplido (+2 pts)</span>
          </div>
        )}

        {/* Diploma de Honor Diario */}
        {destello.titulo_diploma && (
          <div className="mt-2.5 p-2 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 rounded-xl border border-amber-300 dark:border-amber-800/60 text-center shadow-xs">
            <div className="text-[10px] font-black tracking-wide uppercase text-amber-800 dark:text-amber-300 flex items-center justify-center gap-1">
              <Crown className="w-3 h-3 fill-amber-500 text-amber-600" />
              <span>{destello.titulo_diploma}</span>
            </div>
            {destello.motivo_jurado && (
              <p className="text-[10px] text-amber-900/80 dark:text-amber-200/80 italic mt-0.5 leading-tight">
                &ldquo;{destello.motivo_jurado}&rdquo;
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
