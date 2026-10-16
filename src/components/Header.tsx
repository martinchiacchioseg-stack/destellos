'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Shield, Bell } from 'lucide-react';
import { SesionUsuario } from '@/lib/types';
import AnimatedLogo from '@/components/AnimatedLogo';

interface HeaderProps {
  usuario?: (SesionUsuario & { grupo_nombre?: string | null }) | null;
  puntosTotales?: number;
}

export default function Header({ usuario, puntosTotales = 0 }: HeaderProps) {
  const router = useRouter();
  const [noLeidas, setNoLeidas] = useState(0);

  useEffect(() => {
    if (usuario?.rol === 'admin' || usuario?.rol === 'superadmin') {
      fetch('/api/admin/notificaciones')
        .then((r) => r.json())
        .then((d) => setNoLeidas(d.noLeidas || 0))
        .catch(() => {});
    }
  }, [usuario?.rol]);

  return (
    <header className="sticky top-0 z-30 bg-[var(--bg-page)]/90 backdrop-blur-md px-4 py-3 border-b border-[var(--border-soft)] flex items-center justify-between">
      <div className="cursor-pointer" onClick={() => router.push('/')}>
        <AnimatedLogo variant="header" />
      </div>

      <div className="flex items-center gap-2">
        {/* Puntos acumulados */}
        <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-full text-amber-700 dark:text-amber-300 text-xs font-bold shadow-sm">
          <Sparkles className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
          <span>{puntosTotales} pts</span>
        </div>

        {/* Campanita de avisos para el Administrador del Grupo */}
        {(usuario?.rol === 'admin' || usuario?.rol === 'superadmin') && (
          <button
            onClick={() => router.push(usuario.rol === 'superadmin' ? '/superadmin' : '/admin')}
            className="relative p-2 rounded-full hover:bg-orange-100 dark:hover:bg-orange-950/40 text-gray-600 dark:text-gray-300 transition cursor-pointer"
            title="Avisos de nuevos integrantes"
          >
            <Bell className="w-4 h-4" />
            {noLeidas > 0 && (
              <span className="absolute top-0 right-0 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center ring-2 ring-white dark:ring-[#121014]">
                {noLeidas}
              </span>
            )}
          </button>
        )}

        {(usuario?.rol === 'admin' || usuario?.rol === 'superadmin') && (
          <button
            onClick={() => router.push(usuario.rol === 'superadmin' ? '/superadmin' : '/admin')}
            className="flex items-center gap-1 px-2.5 py-1 bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 rounded-full text-xs font-bold border border-purple-200 dark:border-purple-800 shadow-sm"
            title={usuario.rol === 'superadmin' ? 'Panel' : 'Panel de Administración'}
          >
            <Shield className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Admin</span>
          </button>
        )}

        {/* Avatar de perfil */}
        <button
          onClick={() => router.push('/perfil')}
          className="w-9 h-9 rounded-full ring-2 ring-[#FF7043]/30 overflow-hidden bg-orange-100 flex items-center justify-center text-sm font-bold text-[#FF7043] transition-transform active:scale-95"
          title="Mi Perfil"
        >
          {usuario?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={usuario.avatar_url} alt={usuario.nombre} className="w-full h-full object-cover" />
          ) : (
            <span>{usuario?.nombre?.charAt(0) || 'U'}</span>
          )}
        </button>
      </div>
    </header>
  );
}
