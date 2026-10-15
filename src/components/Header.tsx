'use client';

import { useRouter } from 'next/navigation';
import { Sparkles, Shield, Crown } from 'lucide-react';
import { SesionUsuario } from '@/lib/types';

import AnimatedLogo from '@/components/AnimatedLogo';

interface HeaderProps {
  usuario?: (SesionUsuario & { grupo_nombre?: string | null }) | null;
  puntosTotales?: number;
}

export default function Header({ usuario, puntosTotales = 0 }: HeaderProps) {
  const router = useRouter();

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

        {/* Acceso rápido a Panel si es Admin o Superadmin */}
        {usuario?.rol === 'superadmin' && (
          <button
            onClick={() => router.push('/superadmin')}
            className="flex items-center gap-1 px-2.5 py-1 bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 rounded-full text-xs font-bold border border-purple-200 dark:border-purple-800"
            title="Panel Superadmin"
          >
            <Crown className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Super</span>
          </button>
        )}

        {usuario?.rol === 'admin' && (
          <button
            onClick={() => router.push('/admin')}
            className="flex items-center gap-1 px-2.5 py-1 bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 rounded-full text-xs font-bold border border-blue-200 dark:border-blue-800"
            title="Panel de Administración"
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
