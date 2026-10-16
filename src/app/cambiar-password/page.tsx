'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, ShieldAlert, CheckCircle2, ArrowRight, Lock, Camera, Check, X } from 'lucide-react';
import AnimatedLogo from '@/components/AnimatedLogo';

export default function CambiarPasswordPage() {
  const router = useRouter();
  const [passwordActual, setPasswordActual] = useState('');
  const [passwordNuevo, setPasswordNuevo] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Validación de fortaleza en vivo
  const cumpleLargo = passwordNuevo.length >= 8;
  const cumpleLetra = /[a-zA-Z]/.test(passwordNuevo);
  const cumpleNumeroOSimbolo = /[\d\W_]/.test(passwordNuevo);
  const coinciden = passwordNuevo.length > 0 && passwordNuevo === passwordConfirm;

  const handleSeleccionarFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 500;
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
          setAvatarPreview(dataUrl);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!cumpleLargo) {
      setError('La nueva contraseña debe tener como mínimo 8 caracteres.');
      return;
    }
    if (!cumpleLetra || !cumpleNumeroOSimbolo) {
      setError('La contraseña debe combinar letras con al menos un número o símbolo.');
      return;
    }
    if (passwordNuevo !== passwordConfirm) {
      setError('Las contraseñas nuevas no coinciden. Por favor revisalas.');
      return;
    }
    if (passwordActual && passwordActual === passwordNuevo) {
      setError('La nueva contraseña debe ser diferente a la contraseña temporal actual.');
      return;
    }

    setCargando(true);

    try {
      const res = await fetch('/api/auth/cambiar-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          passwordActual,
          passwordNuevo,
          avatar_url: avatarPreview || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'No se pudo actualizar la contraseña.');
        setCargando(false);
        return;
      }

      setExito(true);
      setTimeout(() => {
        router.push('/');
        router.refresh();
      }, 1500);
    } catch {
      setError('Error de conexión. Intentalo de nuevo.');
      setCargando(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center p-4 sm:p-6 bg-gradient-to-b from-[#FFFDF9] via-[#FAF6F0] to-[#F5EFE6] dark:from-[#18161A] dark:via-[#151318] dark:to-[#0F0D12] min-h-screen">
      <div className="bg-white/95 dark:bg-[#201D24]/95 p-6 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 backdrop-blur-sm max-w-md w-full space-y-4">
        <div className="text-center">
          <AnimatedLogo variant="compact" className="justify-center mb-2" />
          <h1 className="text-lg font-black text-gray-800 dark:text-gray-100">
            Primer Ingreso Obligatorio
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Configurá tu contraseña personal y tu foto de perfil
          </p>
        </div>

        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-2xl flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            Por seguridad, debés definir una contraseña segura antes de poder acceder a los destellos de tu grupo.
          </span>
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-2xl text-xs text-red-600 dark:text-red-300 font-medium">
            {error}
          </div>
        )}

        {exito ? (
          <div className="py-6 text-center space-y-2">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
            <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">
              ¡Contraseña configurada con éxito!
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Ingresando a tu grupo... ✨
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Foto de perfil opcional */}
            <div className="p-3 bg-gray-50 dark:bg-[#2A2630] rounded-2xl border border-gray-200 dark:border-gray-700 text-center space-y-2">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                Tu foto de perfil (opcional) 📸
              </label>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleSeleccionarFoto}
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-16 h-16 rounded-full mx-auto ring-2 ring-[#FF7043]/30 overflow-hidden bg-orange-100 flex items-center justify-center cursor-pointer shadow-sm relative group"
              >
                {avatarPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-6 h-6 text-[#FF7043]" />
                )}
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                  <Camera className="w-4 h-4" />
                </div>
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-[11px] font-bold text-[#FF7043] hover:underline"
              >
                {avatarPreview ? 'Cambiar foto elegida' : 'Subir foto desde tu dispositivo'}
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Nueva contraseña personal (mín. 8 caracteres)
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  value={passwordNuevo}
                  onChange={(e) => setPasswordNuevo(e.target.value)}
                  placeholder="Tu clave secreta nueva"
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-gray-50 dark:bg-[#2A2630] border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7043] dark:text-white"
                />
              </div>

              {/* Indicadores de fortaleza */}
              <div className="mt-2 grid grid-cols-2 gap-1.5 text-[10.5px]">
                <div className={`flex items-center gap-1 font-semibold ${cumpleLargo ? 'text-emerald-600' : 'text-gray-400'}`}>
                  {cumpleLargo ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                  <span>Mínimo 8 caracteres</span>
                </div>
                <div className={`flex items-center gap-1 font-semibold ${cumpleLetra && cumpleNumeroOSimbolo ? 'text-emerald-600' : 'text-gray-400'}`}>
                  {cumpleLetra && cumpleNumeroOSimbolo ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                  <span>Letras y números/símbolos</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Confirmar nueva contraseña
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="Repetí la clave nueva"
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-gray-50 dark:bg-[#2A2630] border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7043] dark:text-white"
                />
              </div>
              {passwordConfirm.length > 0 && (
                <p className={`text-[11px] mt-1 font-semibold ${coinciden ? 'text-emerald-600' : 'text-red-500'}`}>
                  {coinciden ? '✓ Las contraseñas coinciden' : '✗ Las contraseñas no coinciden'}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={cargando || !cumpleLargo || !cumpleLetra || !cumpleNumeroOSimbolo || !coinciden}
              className="w-full mt-3 py-3 px-4 rounded-2xl bg-[#FF7043] hover:bg-[#F4511E] text-white font-extrabold text-sm shadow-md shadow-[#FF7043]/30 flex items-center justify-center gap-2 transition-transform active:scale-98 disabled:opacity-40 cursor-pointer"
            >
              {cargando ? (
                <span>Guardando cambios...</span>
              ) : (
                <>
                  <span>Guardar y acceder a Destellos</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
