'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Mail, ArrowRight, ShieldCheck, Heart } from 'lucide-react';
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
    setCargando(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Ocurrió un error al ingresar.');
        setCargando(false);
        return;
      }

      if (data.usuario?.debe_cambiar_password) {
        router.push('/cambiar-password');
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
      {/* Encabezado e Identidad con Logotipos Alternables cada 5 segundos */}
      <div className="pt-4 text-center">
        <AnimatedLogo variant="full" className="mx-auto" />

        <p className="text-xs text-gray-600 dark:text-gray-300 mt-2 max-w-xs mx-auto">
          Un espacio cálido y diario para compartir recuerdos familiares, jugar y celebrar el destello del día.
        </p>
      </div>

      {/* Formulario */}
      <div className="bg-white/95 dark:bg-[#201D24]/95 p-6 rounded-3xl shadow-soft border border-[var(--border-soft)] backdrop-blur-sm my-6">
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-1 flex items-center gap-2">
          ¡Hola de nuevo! <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Ingresá con tu email y contraseña.
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
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="w-full mt-2 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#FF7043] to-[#FFA726] hover:from-[#F4511E] hover:to-[#FB8C00] text-white font-bold text-sm shadow-md shadow-[#FF7043]/30 flex items-center justify-center gap-2 transition-transform active:scale-98 disabled:opacity-50"
          >
            {cargando ? (
              <span>Ingresando a Destellos...</span>
            ) : (
              <>
                <span>Entrar a mi grupo</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Pie de pantalla */}
      <div className="text-center text-[11px] text-gray-400 dark:text-gray-500 pb-2 flex items-center justify-center gap-1">
        <ShieldCheck className="w-3.5 h-3.5" />
        <span>Sesiones seguras con cookies httpOnly y cifrado</span>
      </div>
    </div>
  );
}
