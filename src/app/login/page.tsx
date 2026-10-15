'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Mail, ArrowRight, ShieldCheck, Heart, Sparkles, KeyRound } from 'lucide-react';
import AnimatedLogo from '@/components/AnimatedLogo';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('martinchiacchio.seg@gmail.com');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAccesoLibre = async () => {
    setError(null);
    setCargando(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accesoLibre: true }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Ocurrió un error al ingresar.');
        setCargando(false);
        return;
      }

      router.push('/superadmin');
      router.refresh();
    } catch {
      setError('Error de conexión. Por favor reintentá.');
      setCargando(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCargando(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim() || 'martinchiacchio.seg@gmail.com',
          password: password.trim() || '000000',
          accesoLibre: !email.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Ocurrió un error al ingresar.');
        setCargando(false);
        return;
      }

      if (data.usuario?.rol === 'superadmin' && !data.usuario?.grupo_id) {
        router.push('/superadmin');
      } else {
        router.push('/');
      }
      router.refresh();
    } catch {
      setError('Error de conexión. Por favor reintentá.');
      setCargando(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-6 bg-gradient-to-b from-[#FFFDF9] via-[#FAF6F0] to-[#F5EFE6] dark:from-[#18161A] dark:via-[#151318] dark:to-[#0F0D12]">
      {/* Encabezado e Identidad */}
      <div className="pt-4 text-center">
        <AnimatedLogo variant="full" className="mx-auto" />

        <p className="text-xs text-gray-600 dark:text-gray-300 mt-2 max-w-xs mx-auto">
          Un espacio cálido y diario para compartir recuerdos familiares, jugar y celebrar el destello del día.
        </p>
      </div>

      {/* Formulario y Acceso Libre */}
      <div className="bg-white/95 dark:bg-[#201D24]/95 p-6 rounded-3xl shadow-soft border border-[var(--border-soft)] backdrop-blur-sm my-6 max-w-md mx-auto w-full">
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-1 flex items-center gap-2">
          ¡Hola Martín! <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Acceso libre habilitado sin restricciones ni contraseñas obligatorias.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-2xl text-xs text-red-600 dark:text-red-300 font-medium leading-relaxed">
            {error}
          </div>
        )}

        {/* BOTÓN PRINCIPAL: ACCESO DIRECTO EN 1 CLIC */}
        <button
          type="button"
          disabled={cargando}
          onClick={handleAccesoLibre}
          className="w-full mb-5 py-4 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
        >
          <Sparkles className="w-5 h-5 text-amber-300 animate-spin" style={{ animationDuration: '3s' }} />
          <span>🚀 ENTRAR LIBRE (Superadmin)</span>
        </button>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white dark:bg-[#201D24] px-2 text-gray-400 font-medium">o ingresá manualmente</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
              Email (opcional)
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="martinchiacchio.seg@gmail.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-gray-50 dark:bg-[#2A2630] border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7043] dark:text-white"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                Contraseña
              </label>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                (Acceso libre sin clave)
              </span>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Dejá vacío o poné lo que quieras"
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-gray-50 dark:bg-[#2A2630] border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7043] dark:text-white"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="w-full mt-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-[#FF7043] to-[#FFA726] hover:from-[#F4511E] hover:to-[#FB8C00] text-white font-bold text-sm shadow-md shadow-[#FF7043]/30 flex items-center justify-center gap-2 transition-transform active:scale-98 disabled:opacity-50"
          >
            {cargando ? (
              <span>Entrando...</span>
            ) : (
              <>
                <span>Ingresar ahora</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Pie de pantalla */}
      <div className="text-center text-[11px] text-gray-400 dark:text-gray-500 pb-2 flex items-center justify-center gap-1">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
        <span>Acceso libre habilitado para administración y desarrollo</span>
      </div>
    </div>
  );
}
