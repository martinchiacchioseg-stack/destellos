'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Navbar from '@/components/Navbar';
import { Images, Camera, Heart } from 'lucide-react';
import { SesionUsuario } from '@/lib/types';

export default function GaleriaPage() {
  const [usuario, setUsuario] = useState<SesionUsuario | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) setUsuario(data.usuario);
      });
  }, []);

  return (
    <div className="flex-1 flex flex-col pb-20">
      <Header usuario={usuario} puntosTotales={16} />

      <main className="p-4 space-y-4">
        <div className="bg-white dark:bg-[#201D24] p-5 rounded-3xl border border-[var(--border-soft)] shadow-soft text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-orange-100 text-[#FF7043] flex items-center justify-center mx-auto">
            <Images className="w-6 h-6" />
          </div>
          <h2 className="text-base font-extrabold text-gray-800 dark:text-gray-100">
            Álbum de Recuerdos Polaroid
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed max-w-xs mx-auto">
            Todas las fotos y videos diarios del grupo en estilo polaroid con fecha y autor.
          </p>

          <div className="p-4 rounded-2xl bg-orange-50/60 dark:bg-orange-950/20 border border-orange-200/50 text-xs text-[#FF7043] font-bold">
            Se implementará en la ETAPA 2: Subida diaria y galería
          </div>
        </div>
      </main>

      <Navbar />
    </div>
  );
}
