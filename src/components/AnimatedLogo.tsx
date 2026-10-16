'use client';

import { Sparkles } from 'lucide-react';

interface AnimatedLogoProps {
  variant?: 'full' | 'compact' | 'header';
  className?: string;
}

export default function AnimatedLogo({ variant = 'full', className = '' }: AnimatedLogoProps) {
  if (variant === 'header') {
    return (
      <div className={`flex items-center gap-2 select-none ${className}`}>
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#FF7043] to-[#FFA726] flex items-center justify-center text-white shadow-md shadow-[#FF7043]/30">
          <Sparkles className="w-4 h-4 fill-white" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-baseline gap-1.5 leading-none">
            <span className="font-black text-base tracking-tight bg-gradient-to-r from-[#FF7043] to-[#F4511E] bg-clip-text text-transparent">
              Destellos
            </span>
            <span className="text-[10px] font-semibold text-gray-400">
              by <strong className="text-gray-700 dark:text-gray-200">Rolφ</strong>
            </span>
          </div>
          <span className="text-[9.5px] font-medium text-gray-500 dark:text-gray-400 tracking-wide mt-0.5">
            un clic familiar
          </span>
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-1.5 select-none ${className}`}>
        <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#FF7043] to-[#FFA726] flex items-center justify-center text-white shadow-sm">
          <Sparkles className="w-3.5 h-3.5 fill-white" />
        </div>
        <span className="font-extrabold text-sm tracking-tight text-gray-900 dark:text-white">
          Destellos <span className="text-[10px] font-normal text-gray-400">by Rolφ</span>
        </span>
      </div>
    );
  }

  // Variant "full" para pantallas de Login y Bienvenida
  return (
    <div className={`flex flex-col items-center justify-center text-center select-none ${className}`}>
      {/* Icono central iluminado */}
      <div className="relative mb-3 group">
        <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-[#FF7043] via-[#FFA726] to-[#FF8A65] opacity-75 blur-md group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-pulse" />
        <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-tr from-[#FF7043] to-[#FFA726] flex items-center justify-center text-white shadow-xl">
          <Sparkles className="w-10 h-10 fill-white drop-shadow-md" />
        </div>
      </div>

      {/* Nombre Principal */}
      <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-[#FF7043] via-[#F4511E] to-[#E64A19] bg-clip-text text-transparent">
        Destellos
      </h1>

      {/* Bajada */}
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400 mt-1">
        un clic familiar
      </p>

      {/* Sello de Autor Oficial: by Rolφ */}
      <div className="mt-2.5 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-orange-50 dark:bg-orange-950/40 border border-orange-200/60 dark:border-orange-800/40 text-[11px] font-bold text-[#FF7043]">
        <span>by</span>
        <span className="font-black text-gray-800 dark:text-gray-100 tracking-wide">Rolφ</span>
      </div>
    </div>
  );
}
