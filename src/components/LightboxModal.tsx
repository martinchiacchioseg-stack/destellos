'use client';

import { X, Crown, Heart, Sparkles, Calendar, Clock } from 'lucide-react';
import { Destello } from '@/lib/types';
import { formatFechaBonita } from '@/lib/date-utils';

interface LightboxModalProps {
  destello: Destello | null;
  onClose: () => void;
}

export default function LightboxModal({ destello, onClose }: LightboxModalProps) {
  if (!destello) return null;

  const fechaFormateada = formatFechaBonita(destello.fecha);
  const horaSubida = new Date(destello.creado_en).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 overflow-y-auto"
      onClick={onClose}
    >
      {/* Botón de cierre superior */}
      <div className="flex items-center justify-between z-10 w-full max-w-lg mx-auto">
        <div className="flex items-center gap-2 text-white">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-orange-100 flex items-center justify-center text-xs font-bold text-[#FF7043]">
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
          <div>
            <p className="text-xs font-bold leading-tight">
              {destello.usuario?.nombre}
              {destello.usuario?.apodo && (
                <span className="text-orange-300 ml-1">({destello.usuario.apodo})</span>
              )}
            </p>
            <p className="text-[10px] text-gray-400 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> {fechaFormateada} • <Clock className="w-3 h-3" /> {horaSubida} hs
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-2 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Contenido Media Centrado */}
      <div
        className="my-auto py-4 flex items-center justify-center max-w-lg mx-auto w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative rounded-2xl overflow-hidden max-h-[70vh] shadow-2xl bg-black flex items-center justify-center w-full">
          {destello.tipo_media === 'video' ? (
            <video
              src={destello.media_url}
              controls
              autoPlay
              playsInline
              className="max-h-[70vh] w-auto max-w-full rounded-2xl"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={destello.media_url}
              alt={destello.pie_de_foto || 'Destello familiar'}
              className="max-h-[70vh] w-auto max-w-full object-contain rounded-2xl"
            />
          )}

          {/* Insignia de ganador si corresponde */}
          {destello.es_destello_del_dia && (
            <div className="absolute top-3 left-3 bg-gradient-to-r from-amber-400 to-yellow-300 text-amber-950 px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 shadow-lg">
              <Crown className="w-4 h-4 fill-amber-500" />
              <span>ELEGIDO DESTELLO DEL DÍA</span>
            </div>
          )}

          {destello.es_favorito_comunidad && !destello.es_destello_del_dia && (
            <div className="absolute top-3 left-3 bg-rose-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-lg">
              <Heart className="w-4 h-4 fill-white" />
              <span>Favorito del Grupo</span>
            </div>
          )}
        </div>
      </div>

      {/* Pie de foto y detalles */}
      <div
        className="w-full max-w-lg mx-auto bg-stone-900/90 border border-stone-800 p-4 rounded-2xl text-white z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {destello.pie_de_foto ? (
          <p className="text-xs sm:text-sm text-gray-200 italic leading-relaxed">
            &ldquo;{destello.pie_de_foto}&rdquo;
          </p>
        ) : (
          <p className="text-xs text-gray-500 italic">Sin pie de foto</p>
        )}

        {destello.cumple_reto && (
          <div className="mt-2 flex items-center gap-1 text-[11px] text-amber-300 font-bold bg-amber-950/60 px-2.5 py-1 rounded-lg border border-amber-800/40 w-fit">
            <Sparkles className="w-3.5 h-3.5 fill-amber-400" />
            <span>{destello.reto_verificacion_detalle || 'Reto del día cumplido (+2 puntos)'}</span>
          </div>
        )}
      </div>
    </div>
  );
}
