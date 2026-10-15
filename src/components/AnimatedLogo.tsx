'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface AnimatedLogoProps {
  variant?: 'full' | 'compact' | 'header';
  className?: string;
}

export default function AnimatedLogo({ variant = 'full', className = '' }: AnimatedLogoProps) {
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIdx((prev) => (prev === 0 ? 1 : 0));
    }, 5000); // Cambia cada 5 segundos según el requerimiento

    return () => clearInterval(interval);
  }, []);

  if (variant === 'full') {
    return (
      <div className={`relative flex flex-col items-center justify-center ${className}`}>
        <div className="relative w-48 h-44 overflow-hidden rounded-3xl p-1 transition-all duration-700">
          {/* Logo 1: Chiacchio's */}
          <div
            className={`absolute inset-0 flex items-center justify-center transition-opacity duration-1000 ease-in-out ${
              activeIdx === 0 ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
            }`}
          >
            <Image
              src="/logos/destellos-chiacchio.jpg"
              alt="Destellos Chiacchio's"
              width={200}
              height={180}
              priority
              className="object-contain w-auto h-full rounded-2xl drop-shadow-sm"
            />
          </div>

          {/* Logo 2: un clic familiar by Rolphi */}
          <div
            className={`absolute inset-0 flex items-center justify-center transition-opacity duration-1000 ease-in-out ${
              activeIdx === 1 ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
            }`}
          >
            <Image
              src="/logos/destellos-rolf.jpg"
              alt="Destellos - un clic familiar by Rolphi"
              width={200}
              height={180}
              priority
              className="object-contain w-auto h-full rounded-2xl drop-shadow-sm"
            />
          </div>
        </div>

        {/* Indicador de cambio sutil (puntos) */}
        <div className="flex gap-1.5 mt-2">
          <span
            className={`h-1.5 rounded-full transition-all duration-500 ${
              activeIdx === 0 ? 'w-5 bg-[#FF7043]' : 'w-1.5 bg-gray-300 dark:bg-gray-700'
            }`}
          />
          <span
            className={`h-1.5 rounded-full transition-all duration-500 ${
              activeIdx === 1 ? 'w-5 bg-[#FF7043]' : 'w-1.5 bg-gray-300 dark:bg-gray-700'
            }`}
          />
        </div>
      </div>
    );
  }

  // Variante Header / Compacta para barra superior
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Icono circular de la app */}
      <div className="relative w-9 h-9 rounded-2xl overflow-hidden shrink-0 shadow-sm shadow-[#FF7043]/30 border border-[#FF7043]/20 bg-[#FF623E]">
        <Image
          src={activeIdx === 0 ? '/logos/destellos-chiacchio.jpg' : '/logos/destellos-rolf.jpg'}
          alt="Icono Destellos"
          width={40}
          height={40}
          className="w-full h-full object-cover object-top scale-150 transition-all duration-700"
        />
      </div>

      {/* Textos alternables cada 5 segundos */}
      <div className="relative h-9 flex flex-col justify-center overflow-hidden min-w-[140px]">
        {/* Opción 1: Destellos Chiacchio's */}
        <div
          className={`absolute left-0 transition-all duration-700 ${
            activeIdx === 0
              ? 'opacity-100 transform translate-y-0'
              : 'opacity-0 transform -translate-y-2 pointer-events-none'
          }`}
        >
          <h1 className="text-base font-extrabold tracking-tight text-[#FF7043] leading-none flex items-center gap-1">
            Destellos<span className="text-amber-400">✨</span>
          </h1>
          <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 tracking-wider">
            Chiacchio&apos;s
          </p>
        </div>

        {/* Opción 2: Destellos - un clic familiar by Rolphi */}
        <div
          className={`absolute left-0 transition-all duration-700 ${
            activeIdx === 1
              ? 'opacity-100 transform translate-y-0'
              : 'opacity-0 transform translate-y-2 pointer-events-none'
          }`}
        >
          <h1 className="text-base font-extrabold tracking-tight text-[#FF7043] leading-none flex items-center gap-1">
            Destellos<span className="text-amber-400">✨</span>
          </h1>
          <p className="text-[9px] font-semibold text-gray-500 dark:text-gray-400 tracking-tight">
            un clic familiar • <span className="font-bold text-[#FF7043]">by Rolφ</span>
          </p>
        </div>
      </div>
    </div>
  );
}
