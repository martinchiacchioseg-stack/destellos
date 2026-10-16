'use client';

import { Publicidad } from '@/lib/types';
import { ExternalLink, Tag } from 'lucide-react';

interface SponsorAdProps {
  publicidad?: Publicidad | null;
  className?: string;
  formato?: 'banner' | 'tarjeta';
}

export default function SponsorAd({
  publicidad,
  className = '',
  formato = 'banner',
}: SponsorAdProps) {
  if (!publicidad || !publicidad.activa) return null;

  if (formato === 'tarjeta') {
    return (
      <div className={`p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-[#26201D] dark:to-[#1E1918] rounded-3xl border border-orange-200/60 dark:border-orange-900/40 shadow-sm ${className}`}>
        <div className="flex items-center justify-between text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-2">
          <span className="flex items-center gap-1">
            <Tag className="w-3 h-3" /> Espacio Auspiciado
          </span>
        </div>

        {publicidad.imagen_url && (
          <div className="relative rounded-2xl overflow-hidden aspect-video w-full mb-3 shadow-sm bg-stone-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={publicidad.imagen_url}
              alt={publicidad.titulo}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <h4 className="text-xs font-bold text-gray-800 dark:text-gray-100">
          {publicidad.titulo}
        </h4>
        <p className="text-[11px] text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
          {publicidad.texto}
        </p>

        {publicidad.link_url && (
          <a
            href={publicidad.link_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-[#FF7043] hover:underline"
          >
            <span>Conocé más</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    );
  }

  // Formato Banner compacto
  return (
    <div className={`p-3 bg-white/95 dark:bg-[#201D24]/95 rounded-2xl border border-orange-200/60 dark:border-orange-900/40 shadow-soft flex items-center justify-between gap-3 ${className}`}>
      {publicidad.imagen_url && (
        <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 shadow-sm bg-stone-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={publicidad.imagen_url}
            alt={publicidad.titulo}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
          <Tag className="w-2.5 h-2.5" /> Auspicio
        </div>
        <h4 className="text-xs font-bold text-gray-800 dark:text-gray-100 truncate">
          {publicidad.titulo}
        </h4>
        <p className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-1">
          {publicidad.texto}
        </p>
      </div>

      {publicidad.link_url && (
        <a
          href={publicidad.link_url}
          target="_blank"
          rel="noopener noreferrer"
          className="px-2.5 py-1.5 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-[#FF7043] font-bold text-[10px] shrink-0 hover:bg-orange-200 transition-colors"
        >
          Ver
        </a>
      )}
    </div>
  );
}
