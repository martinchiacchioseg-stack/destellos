'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Mail, ArrowRight, ShieldCheck, Heart, Sparkles, KeyRound } from 'lucide-react';
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
      setError('Por favor completá tu email y contraseña.');
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
        setError(data.error || 'Ocurrió un error al ingresar.');
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

  const handleAutocompletar = (mail: string, pass: string) => {
    setEmail(mail);
    setPassword(pass);
    setError(null);
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-6 bg-gradient-to-b from-[#FFFDF9] via-[#FAF6F0] to-[#F5EFE6] dark:from-[#18161A] dark:via-[#151318] dark:to-[#0F0D12] min-h-screen">
      {/* Encabezado e Identidad */}
      <div className="pt-6 text-center">
        <AnimatedLogo variant="full" className="mx-auto" />
        <p className="text-xs text-gray-600 dark:text-gray-300 mt-2 max-w-xs mx-auto">
          Un espacio cálido y diario para compartir recuerdos familiares, jugar y celebrar el destello del día.
        </p>
      </div>

      {/* Formulario */}
      <div className="bg-white/95 dark:bg-[#201D24]/95 p-6 sm:p-8 rounded-3xl shadow-soft border border-[var(--border-soft)] backdrop-blur-sm my-6 max-w-md mx-auto w-full">
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-1 flex items-center gap-2">
          ¡Te damos la bienvenida! <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">
          Ingresá con tu email y tu contraseña para unirte a tu grupo.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-2xl text-xs text-red-600 dark:text-red-300 font-medium leading-relaxed">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
              Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu.email@ejemplo.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-gray-50 dark:bg-[#2A2630] border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7043] dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-gray-50 dark:bg-[#2A2630] border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7043] dark:text-white"
              />
            </div>
            <p className="text-[11px] text-gray-400 dark:text-gray-400 mt-1.5 leading-tight">
              ¿Es tu primer ingreso? Usá la clave temporal asignada (por defecto <strong>000000</strong>) y te pedirá crear tu clave personal.
            </p>
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="w-full mt-3 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#FF7043] to-[#FFA726] hover:from-[#F4511E] hover:to-[#FB8C00] text-white font-bold text-sm shadow-md shadow-[#FF7043]/30 flex items-center justify-center gap-2 transition-transform active:scale-98 disabled:opacity-50 cursor-pointer"
          >
            {cargando ? (
              <span>Iniciando sesión...</span>
            ) : (
              <>
                <span>Ingresar a Destellos</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Acceso Rápido Superadmin */}
        <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-800 text-center">
          <p className="text-[11px] text-gray-400 dark:text-gray-400 mb-2 font-medium">
            Acceso Rápido Superadmin:
          </p>
          <button
            type="button"
            onClick={() => handleAutocompletar('martinchiacchio.seg@gmail.com', '000000')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 text-xs font-semibold text-[#FF7043] hover:bg-orange-100 transition-colors cursor-pointer"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Martín Chiaccio (000000)</span>
          </button>
        </div>
      </div>

      {/* Pie de pantalla */}
      <div className="text-center text-[11px] text-gray-400 dark:text-gray-500 pb-2 flex items-center justify-center gap-1">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
        <span>Sesiones seguras con cookies protegidas y cifrado SSL</span>
      </div>
    </div>
  );
}
