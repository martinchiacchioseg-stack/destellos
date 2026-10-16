'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import AnimatedLogo from '@/components/AnimatedLogo';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim();
    const cleanPass = password.trim();

    if (!cleanEmail || !cleanPass) {
      setError('Por favor completá tu correo y contraseña.');
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

      if (data.usuario?.debe_cambiar_password) {
        router.push('/cambiar-password');
      } else if (data.usuario?.rol === 'superadmin' && !data.usuario?.grupo_id) {
        router.push('/superadmin');
      } else {
        router.push('/');
      }
      router.refresh();
    } catch {
      setError('Error de conexión con el servidor. Reintentá en unos segundos.');
      setCargando(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center p-4 sm:p-6 bg-gradient-to-b from-[#FFFDF9] via-[#FAF6F0] to-[#F5EFE6] dark:from-[#18161A] dark:via-[#151318] dark:to-[#0F0D12] min-h-screen">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo oficial y marca by Rolφ */}
        <AnimatedLogo variant="full" />

        {/* Formulario Seguro de Ingreso */}
        <div className="bg-white/95 dark:bg-[#201D24]/95 p-6 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 backdrop-blur-sm space-y-4">
          <div className="text-center">
            <h2 className="text-lg font-extrabold text-gray-900 dark:text-gray-100">
              Ingresar a tu grupo
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Acceso exclusivo y privado
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-2xl text-xs text-red-600 dark:text-red-300 font-medium text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
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
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tu clave secreta"
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-gray-50 dark:bg-[#2A2630] border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7043] dark:text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={cargando}
              className="w-full mt-2 py-3 px-4 rounded-2xl bg-[#FF7043] hover:bg-[#F4511E] text-white font-extrabold text-sm shadow-md shadow-[#FF7043]/30 flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
            >
              {cargando ? (
                <span>Ingresando...</span>
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
