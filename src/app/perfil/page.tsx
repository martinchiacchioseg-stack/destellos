'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Navbar from '@/components/Navbar';
import { LogOut, Moon, Sun, Shield, Crown, Sparkles, KeyRound, Users, Camera, RefreshCw, CheckCircle2 } from 'lucide-react';
import { SesionUsuario } from '@/lib/types';

export default function PerfilPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<(SesionUsuario & { grupo_nombre?: string }) | null>(null);
  const [isDark, setIsDark] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    // Cargar sesión actual
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) {
          setUsuario(data.usuario);
        } else {
          router.push('/login');
        }
      })
      .finally(() => setCargando(false));

    // Revisar tema
    const theme = localStorage.getItem('destellos_theme');
    setIsDark(theme === 'dark' || document.documentElement.classList.contains('dark'));
  }, [router]);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('destellos_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('destellos_theme', 'light');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  // Subir y cambiar foto de perfil
  const handleCambiarFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSubiendoFoto(true);
    setFeedback(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const MAX = 600;
        let w = img.width;
        let h = img.height;
        if (w > h && w > MAX) {
          h = Math.round((h * MAX) / w);
          w = MAX;
        } else if (h > MAX) {
          w = Math.round((w * MAX) / h);
          h = MAX;
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          try {
            const res = await fetch('/api/auth/perfil', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ avatar_url: dataUrl }),
            });
            const data = await res.json();
            if (res.ok && data.usuario) {
              setUsuario((prev) => prev ? { ...prev, avatar_url: data.usuario.avatar_url } : null);
              setFeedback('¡Foto de perfil actualizada correctamente! ✨');
              setTimeout(() => setFeedback(null), 3500);
            }
          } catch (err) {
            console.error('Error al subir foto:', err);
          }
        }
        setSubiendoFoto(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  if (cargando) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-sm text-gray-400">
        Cargando perfil...
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col pb-20">
      <Header usuario={usuario} puntosTotales={16} />

      <main className="p-4 space-y-4">
        {/* Input oculto para cambiar foto */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleCambiarFoto}
        />

        {/* Tarjeta de Usuario */}
        <div className="bg-white dark:bg-[#201D24] p-6 rounded-3xl shadow-soft border border-[var(--border-soft)] text-center relative overflow-hidden">
          {/* Avatar con botón de cámara */}
          <div className="relative w-24 h-24 mx-auto mb-3">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-24 h-24 rounded-full ring-4 ring-[#FF7043]/30 overflow-hidden bg-orange-100 shadow-md cursor-pointer group relative"
              title="Hacé clic para cambiar tu foto de perfil"
            >
              {usuario?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={usuario.avatar_url} alt={usuario.nombre} className="w-full h-full object-cover group-hover:opacity-80 transition-opacity" />
              ) : (
                <span className="text-3xl font-bold text-[#FF7043] flex items-center justify-center h-full">
                  {usuario?.nombre?.charAt(0)}
                </span>
              )}

              {/* Overlay oscuro al pasar el cursor o subiendo */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                {subiendoFoto ? (
                  <RefreshCw className="w-6 h-6 animate-spin" />
                ) : (
                  <Camera className="w-6 h-6" />
                )}
              </div>
            </div>

            {/* Botón flotante para cambiar foto */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={subiendoFoto}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#FF7043] text-white shadow-md flex items-center justify-center hover:bg-[#F4511E] transition-all active:scale-95 border-2 border-white dark:border-[#201D24]"
              title="Cambiar foto de perfil"
            >
              {subiendoFoto ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            </button>
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={subiendoFoto}
            className="text-xs font-bold text-[#FF7043] hover:underline inline-flex items-center gap-1 mb-2"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>{subiendoFoto ? 'Actualizando foto...' : 'Cambiar foto de perfil'}</span>
          </button>

          {feedback && (
            <div className="mb-3 p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-center gap-1.5 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4" />
              <span>{feedback}</span>
            </div>
          )}

          <h2 className="text-xl font-extrabold text-gray-800 dark:text-gray-100">
            {usuario?.nombre}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {usuario?.email}
          </p>

          <div className="flex items-center justify-center gap-2 mt-3">
            {usuario?.rol === 'superadmin' && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 rounded-full text-xs font-bold border border-purple-200 dark:border-purple-800">
                <Crown className="w-3.5 h-3.5" />
                Superadmin del Sistema
              </span>
            )}
            {usuario?.rol === 'admin' && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 rounded-full text-xs font-bold border border-blue-200 dark:border-blue-800">
                <Shield className="w-3.5 h-3.5" />
                Administrador/a de Grupo
              </span>
            )}
            {usuario?.rol === 'miembro' && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-bold border border-emerald-200 dark:border-emerald-800">
                <Sparkles className="w-3.5 h-3.5" />
                Miembro Familiar
              </span>
            )}
          </div>

          {usuario?.grupo_nombre && (
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <Users className="w-4 h-4 text-[#FF7043]" />
              <span>Grupo: <b className="text-gray-700 dark:text-gray-200">{usuario.grupo_nombre}</b></span>
            </div>
          )}
        </div>

        {/* Acceso a Paneles de Gestión según Rol */}
        {usuario?.rol === 'superadmin' && (
          <button
            onClick={() => router.push('/superadmin')}
            className="w-full p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/50 flex items-center justify-between text-purple-700 dark:text-purple-300 font-bold text-sm shadow-sm hover:bg-purple-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Crown className="w-5 h-5 text-purple-600" />
              <span>Abrir Panel de Superadmin</span>
            </div>
            <span className="text-xs bg-purple-200 dark:bg-purple-900 px-2 py-0.5 rounded-full">Gestión Global</span>
          </button>
        )}

        {usuario?.rol === 'admin' && (
          <button
            onClick={() => router.push('/admin')}
            className="w-full p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 flex items-center justify-between text-blue-700 dark:text-blue-300 font-bold text-sm shadow-sm hover:bg-blue-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-blue-600" />
              <span>Abrir Panel del Administrador</span>
            </div>
            <span className="text-xs bg-blue-200 dark:bg-blue-900 px-2 py-0.5 rounded-full">Gestión de Miembros</span>
          </button>
        )}

        {/* Opciones y Configuración */}
        <div className="bg-white dark:bg-[#201D24] rounded-3xl p-2 border border-[var(--border-soft)] shadow-soft divide-y divide-gray-100 dark:divide-gray-800">
          {/* Alternar Modo Oscuro / Claro */}
          <div className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isDark ? (
                <Moon className="w-5 h-5 text-indigo-400" />
              ) : (
                <Sun className="w-5 h-5 text-amber-500" />
              )}
              <div>
                <p className="text-sm font-bold text-gray-800 dark:text-gray-100">
                  Modo Oscuro
                </p>
                <p className="text-[11px] text-gray-400">
                  {isDark ? 'Tema noche activo' : 'Tema claro y cálido'}
                </p>
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className={`w-12 h-7 rounded-full p-1 transition-colors ${
                isDark ? 'bg-[#FF7043]' : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  isDark ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Cambiar Contraseña */}
          <button
            onClick={() => router.push('/cambiar-password')}
            className="w-full p-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-[#2A2630] transition-colors rounded-xl text-left"
          >
            <div className="flex items-center gap-3">
              <KeyRound className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm font-bold text-gray-800 dark:text-gray-100">
                  Cambiar contraseña
                </p>
                <p className="text-[11px] text-gray-400">
                  Actualizar tu clave personal
                </p>
              </div>
            </div>
          </button>

          {/* Cerrar Sesión */}
          <button
            onClick={handleLogout}
            className="w-full p-3 flex items-center justify-between hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 dark:text-red-400 transition-colors rounded-xl text-left font-bold"
          >
            <div className="flex items-center gap-3">
              <LogOut className="w-5 h-5 text-red-500" />
              <span className="text-sm">Cerrar sesión</span>
            </div>
          </button>
        </div>

        {/* Resumen de la Etapa */}
        <div className="text-center p-4 bg-orange-50/60 dark:bg-orange-950/20 rounded-2xl border border-orange-200/60 dark:border-orange-900/30">
          <p className="text-xs font-bold text-[#FF7043] flex items-center justify-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            Destellos v0.1 • Etapa 1
          </p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
            Base, estética cálida rioplatense, roles y autenticación con contraseñas temporales y sesiones seguras.
          </p>
        </div>
      </main>

      <Navbar />
    </div>
  );
}
