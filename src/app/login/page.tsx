'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Mail, ArrowRight, ShieldCheck, Crown, Sparkles, CheckCircle2 } from 'lucide-react';
import AnimatedLogo from '@/components/AnimatedLogo';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Acceso directo con un solo clic para Martín Superadmin
  const handleAccesoDirectoSuperadmin = async () => {
    setError(null);
    setCargando(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          superadminDirecto: true,
          email: 'martinchiacchio.seg@gmail.com',
          password: 'Chiachio@1938',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Error al ingresar.');
        setCargando(false);
        return;
      }

      window.location.href = data.redirectUrl || '/superadmin';
    } catch {
      setError('Error de conexión con el servidor. Reintentá en unos segundos.');
      setCargando(false);
    }
  };

  const handleAutocompletarMartin = () => {
    setEmail('martinchiacchio.seg@gmail.com');
    setPassword('Chiachio@1938');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    const cleanPass = password.trim();

    if (!cleanEmail) {
      setError('Por favor ingresá tu correo electrónico.');
      return;
    }

    setCargando(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password: cleanPass }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Credenciales inválidas.');
        setCargando(false);
        return;
      }

      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else if (data.usuario?.rol === 'superadmin') {
        window.location.href = '/superadmin';
      } else if (data.usuario?.debe_cambiar_password) {
        window.location.href = '/cambiar-password';
      } else {
        window.location.href = '/';
      }
    } catch {
      setError('Error de conexión con el servidor. Reintentá en unos segundos.');
      setCargando(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center p-4 sm:p-6 bg-gradient-to-b from-[#FFFDF9] via-[#FAF6F0] to-[#F5EFE6] dark:from-[#18161A] dark:via-[#151318] dark:to-[#0F0D12] min-h-screen">
      <div className="w-full max-w-sm space-y-5">
        {/* Logo oficial y marca by Rolφ */}
        <AnimatedLogo variant="full" />

        {/* Tarjeta de Acceso Rápido Superadmin para Martín */}
        <div className="p-4 rounded-3xl bg-gradient-to-br from-orange-500/10 via-amber-500/15 to-orange-500/5 dark:from-orange-950/30 dark:via-amber-950/20 dark:to-orange-950/10 border-2 border-[#FF7043]/40 shadow-lg shadow-orange-500/5 text-center space-y-2.5">
          <div className="flex items-center justify-center gap-1.5 text-xs font-black text-[#FF7043] dark:text-[#FF8A65] uppercase tracking-wider">
            <Crown className="w-4 h-4 text-[#FF7043]" />
            <span>¿Sos Martín? (Dueño / Superadmin)</span>
          </div>
          <p className="text-[12px] text-gray-600 dark:text-gray-300 font-medium">
            Entrá a tu panel con un solo toque y empezá a gestionar tus grupos familiares.
          </p>
          <button
            type="button"
            onClick={handleAccesoDirectoSuperadmin}
            disabled={cargando}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#FF7043] to-[#F4511E] text-white font-black text-sm shadow-md shadow-[#FF7043]/30 hover:brightness-105 active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 text-amber-200" />
            <span>👉 Entrar directo a mi Panel Superadmin</span>
          </button>
        </div>

        {/* Formulario Estándar de Ingreso */}
        <div className="bg-white/95 dark:bg-[#201D24]/95 p-6 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 backdrop-blur-sm space-y-4">
          <div className="text-center">
            <h2 className="text-base font-extrabold text-gray-900 dark:text-gray-100">
              O ingresá con tus credenciales
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Acceso seguro a tu espacio privado
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-2xl text-xs text-red-600 dark:text-red-300 font-medium text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  Correo electrónico
                </label>
                <button
                  type="button"
                  onClick={handleAutocompletarMartin}
                  className="text-[10px] text-[#FF7043] hover:underline font-bold"
                >
                  Rellenar mis datos
                </button>
              </div>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="martinchiacchio.seg@gmail.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-gray-50 dark:bg-[#2A2630] border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7043] dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Chiachio@1938"
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-gray-50 dark:bg-[#2A2630] border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7043] dark:text-white"
                />
              </div>
              <p className="text-[10.5px] text-gray-400 mt-1">
                Contraseña inicial: <strong className="text-gray-600 dark:text-gray-300">Chiachio@1938</strong> (o podés entrar directo con el botón superior).
              </p>
            </div>

            <button
              type="submit"
              disabled={cargando}
              className="w-full mt-2 py-3 px-4 rounded-2xl bg-gray-900 hover:bg-black dark:bg-gray-100 dark:hover:bg-white text-white dark:text-gray-900 font-extrabold text-sm shadow-md flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
            >
              {cargando ? (
                <span>Verificando...</span>
              ) : (
                <>
                  <span>Ingresar a Destellos</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] text-gray-400 border-t border-gray-100 dark:border-gray-800">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Espacio cerrado y protegido con cifrado</span>
          </div>
        </div>
      </div>
    </div>
  );
}
