'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Navbar from '@/components/Navbar';
import { Sparkles, Camera, Shield, Crown, Heart, CheckCircle2, ArrowRight } from 'lucide-react';
import { SesionUsuario } from '@/lib/types';
import { formatFechaBonita, getFechaArgentina } from '@/lib/date-utils';

export default function HomePage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<(SesionUsuario & { grupo_nombre?: string }) | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) {
          setUsuario(data.usuario);
        } else {
          router.push('/login');
        }
      })
      .catch(() => router.push('/login'))
      .finally(() => setCargando(false));
  }, [router]);

  if (cargando) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-sm text-gray-400">
        Cargando Destellos... ✨
      </div>
    );
  }

  const hoyFormateado = formatFechaBonita(getFechaArgentina());

  return (
    <div className="flex-1 flex flex-col pb-20">
      <Header usuario={usuario} puntosTotales={16} />

      <main className="p-4 space-y-4">
        {/* Saludo y Fecha */}
        <div className="bg-gradient-to-br from-[#FFF8EE] to-[#FFF0E0] dark:from-[#241F2B] dark:to-[#1D1923] p-5 rounded-3xl border border-[#FFE0B2] dark:border-[#382F40] shadow-soft relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-bold text-[#FF7043] uppercase tracking-wider mb-1">
            <span>{hoyFormateado}</span>
            <span className="flex items-center gap-1">
              <Heart className="w-3.5 h-3.5 fill-[#FF7043]" />
              {usuario?.grupo_nombre || 'Familia'}
            </span>
          </div>

          <h2 className="text-xl font-extrabold text-gray-800 dark:text-gray-100 tracking-tight">
            ¡Qué hacés, {usuario?.apodo || usuario?.nombre?.split(' ')[0]}! ✨
          </h2>
          <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
            Te damos la bienvenida a <b className="text-[#FF7043]">Destellos</b> (&quot;un clic familiar&quot;).
          </p>
        </div>

        {/* Resumen de Etapa 1 Completada */}
        <div className="bg-white dark:bg-[#201D24] p-5 rounded-3xl border border-[var(--border-soft)] shadow-soft space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-gray-800 dark:text-gray-100">
                Etapa 1: Base, Estética y Autenticación
              </h3>
              <p className="text-[11px] text-gray-400">
                Arquitectura modular y roles listos para Vercel
              </p>
            </div>
          </div>

          <div className="space-y-2 text-xs text-gray-600 dark:text-gray-300">
            <div className="flex items-start gap-2 p-2.5 rounded-xl bg-gray-50 dark:bg-[#2A2630]">
              <span className="text-emerald-500 font-bold">✓</span>
              <span>
                <b>Identidad Rioplatense:</b> Microtextos cálidos, paleta suave en cremas/coral y tipografía redondeada Nunito.
              </span>
            </div>
            <div className="flex items-start gap-2 p-2.5 rounded-xl bg-gray-50 dark:bg-[#2A2630]">
              <span className="text-emerald-500 font-bold">✓</span>
              <span>
                <b>Seguridad y Roles:</b> Superadmin, Administradores y Miembros con contraseñas hasheadas en bcrypt.
              </span>
            </div>
            <div className="flex items-start gap-2 p-2.5 rounded-xl bg-gray-50 dark:bg-[#2A2630]">
              <span className="text-emerald-500 font-bold">✓</span>
              <span>
                <b>Cambio obligatorio:</b> Pantalla de cambio de clave para nuevos ingresos y superadmin inicial.
              </span>
            </div>
            <div className="flex items-start gap-2 p-2.5 rounded-xl bg-gray-50 dark:bg-[#2A2630]">
              <span className="text-emerald-500 font-bold">✓</span>
              <span>
                <b>Tabla genérica de puntos:</b> Esquema de eventos listo para sumar mini-juegos de forma modular.
              </span>
            </div>
          </div>
        </div>

        {/* Acceso a Paneles de Gestión si corresponde */}
        {usuario?.rol === 'admin' && (
          <div
            onClick={() => router.push('/admin')}
            className="p-4 rounded-3xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 flex items-center justify-between cursor-pointer hover:bg-blue-100/70 transition-colors shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-500 text-white flex items-center justify-center shadow-md">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-blue-900 dark:text-blue-100">
                  Panel del Administrador
                </p>
                <p className="text-[11px] text-blue-600 dark:text-blue-300">
                  Crear miembros y resetear contraseñas
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-blue-500" />
          </div>
        )}

        {usuario?.rol === 'superadmin' && (
          <div
            onClick={() => router.push('/superadmin')}
            className="p-4 rounded-3xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/50 flex items-center justify-between cursor-pointer hover:bg-purple-100/70 transition-colors shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md">
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-purple-900 dark:text-purple-100">
                  Panel de Superadmin
                </p>
                <p className="text-[11px] text-purple-600 dark:text-purple-300">
                  Gestionar grupos, administradores y métricas
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-purple-500" />
          </div>
        )}

        {/* Anticipo de la Etapa 2 */}
        <div className="p-4 rounded-3xl border-2 border-dashed border-[#FF7043]/30 bg-orange-50/40 dark:bg-orange-950/10 text-center space-y-2">
          <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/40 text-[#FF7043] flex items-center justify-center mx-auto">
            <Camera className="w-5 h-5" />
          </div>
          <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200">
            Próxima: Etapa 2 (Subida diaria y Galería Polaroid)
          </h4>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            En el siguiente paso se implementará la subida de foto/video del día con compresión y el álbum de recuerdos en estilo polaroid.
          </p>
        </div>
      </main>

      <Navbar />
    </div>
  );
}
