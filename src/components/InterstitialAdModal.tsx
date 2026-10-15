'use client';

import { useState, useEffect } from 'react';
import { Tag, ExternalLink, X, ArrowRight } from 'lucide-react';
import { Publicidad, UbicacionPublicidad } from '@/lib/types';

interface InterstitialAdModalProps {
  ubicacion?: UbicacionPublicidad;
  publicidadDirecta?: Publicidad | null;
  isOpen?: boolean;
  onClose: () => void;
  duracionSegundos?: number;
}

export default function InterstitialAdModal({
  ubicacion,
  publicidadDirecta,
  isOpen = true,
  onClose,
  duracionSegundos = 5,
}: InterstitialAdModalProps) {
  const [ad, setAd] = useState<Publicidad | null>(publicidadDirecta || null);
  const [cargando, setCargando] = useState(!publicidadDirecta && Boolean(ubicacion));
  const [segundosRestantes, setSegundosRestantes] = useState(duracionSegundos);
  const [puedeCerrar, setPuedeCerrar] = useState(false);

  // Buscar publicidad si se pasa ubicación
  useEffect(() => {
    if (publicidadDirecta) {
      setAd(publicidadDirecta);
      setCargando(false);
      return;
    }

    if (!ubicacion) return;

    let cancelado = false;
    setCargando(true);
    fetch(`/api/publicidades?ubicacion=${ubicacion}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelado) return;
        if (data.ok && data.publicidad) {
          setAd(data.publicidad);
        } else {
          setAd(null);
          // Si no hay anuncio para esta ubicación, cerramos de inmediato sin trabar la pantalla
          onClose();
        }
      })
      .catch(() => {
        if (!cancelado) onClose();
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [ubicacion, publicidadDirecta, onClose]);

  // Cuenta regresiva de 5 segundos
  useEffect(() => {
    if (!ad || !isOpen) return;

    if (segundosRestantes > 0) {
      const timer = setTimeout(() => {
        setSegundosRestantes((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setPuedeCerrar(true);
    }
  }, [ad, isOpen, segundosRestantes]);

  if (!isOpen || cargando || !ad) return null;

  const porcentajeProgreso = ((duracionSegundos - segundosRestantes) / duracionSegundos) * 100;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-[#1E1B22] w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-[var(--border-soft)] relative overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Barra superior de progreso */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gray-100 dark:bg-gray-800">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-[#FF7043] transition-all duration-1000 ease-linear"
            style={{ width: `${porcentajeProgreso}%` }}
          />
        </div>

        {/* Encabezado */}
        <div className="flex items-center justify-between pt-1 pb-3">
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-black uppercase tracking-wider">
            <Tag className="w-3 h-3 text-amber-600" />
            <span>Espacio Auspiciado</span>
          </div>

          <div className="text-[11px] font-bold text-gray-400">
            {!puedeCerrar ? (
              <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full text-gray-600 dark:text-gray-300">
                Continuar en {segundosRestantes}s
              </span>
            ) : (
              <button
                onClick={onClose}
                className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-100 transition-colors"
                title="Cerrar anuncio"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Imagen publicitaria si existe */}
        {ad.imagen_url && (
          <div className="relative rounded-2xl overflow-hidden aspect-video w-full my-2 bg-stone-100 dark:bg-stone-900 border border-gray-100 dark:border-gray-800 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ad.imagen_url}
              alt={ad.titulo}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Contenido del anuncio */}
        <div className="space-y-1.5 my-2">
          <h3 className="text-sm font-black text-gray-800 dark:text-gray-100">
            {ad.titulo}
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
            {ad.texto}
          </p>
        </div>

        {/* Enlace opcional del sponsor */}
        {ad.link_url && (
          <div className="pt-1">
            <a
              href={ad.link_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#FF7043] hover:underline"
            >
              <span>Visitar sitio web</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {/* Botón inferior al terminar la cuenta regresiva */}
        <div className="mt-4 pt-2">
          {puedeCerrar ? (
            <button
              onClick={onClose}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#FF7043] to-[#FFA726] hover:from-[#F4511E] hover:to-[#FB8C00] text-white font-bold text-xs shadow-md shadow-[#FF7043]/30 flex items-center justify-center gap-2 transition-transform active:scale-98 animate-in fade-in"
            >
              <span>Continuar</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <div className="py-2.5 px-4 rounded-2xl bg-gray-100 dark:bg-gray-800 text-center text-xs font-semibold text-gray-400">
              Anuncio publicitario ({segundosRestantes}s)...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
