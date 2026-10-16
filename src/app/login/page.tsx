'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  KeyRound,
  Users,
  Camera,
  Calendar,
  Phone,
  Mail,
  Lock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  HelpCircle,
  X,
  ShieldCheck,
  Eye,
  EyeOff,
} from 'lucide-react';
import AnimatedLogo from '@/components/AnimatedLogo';

export default function LoginPage() {
  const router = useRouter();

  // Estados del flujo principal
  const [modo, setModo] = useState<'nuevo' | 'existente'>('nuevo');
  const [codigoFamilia, setCodigoFamilia] = useState('');
  const [grupoValidado, setGrupoValidado] = useState<{
    id: string;
    nombre: string;
    emoji_or_logo: string;
    hora_limite: string;
    descripcion: string;
    admin_nombre: string;
  } | null>(null);

  // Formulario nuevo integrante
  const [nombre, setNombre] = useState('');
  const [apodo, setApodo] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);

  // Formulario integrante existente
  const [identificadorLogin, setIdentificadorLogin] = useState('');
  const [passwordLogin, setPasswordLogin] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);

  // Estados de carga y feedback
  const [verificandoCodigo, setVerificandoCodigo] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  // Modal Acceso Oculto Superadmin (3 clics en Rolφ)
  const [mostrarModalSuperadmin, setMostrarModalSuperadmin] = useState(false);
  const [claveSuperadmin, setClaveSuperadmin] = useState('');
  const [cargandoSuperadmin, setCargandoSuperadmin] = useState(false);
  const [errorSuperadmin, setErrorSuperadmin] = useState<string | null>(null);

  // Modal Recuperar Contraseña
  const [mostrarModalRecuperar, setMostrarModalRecuperar] = useState(false);
  const [pasoRecuperar, setPasoRecuperar] = useState<'solicitar' | 'verificar'>('solicitar');
  const [emailRecuperar, setEmailRecuperar] = useState('');
  const [codigoRecuperar, setCodigoRecuperar] = useState('');
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [cargandoRecuperar, setCargandoRecuperar] = useState(false);
  const [mensajeRecuperar, setMensajeRecuperar] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  // 1. Validar Código de Familia en el backend
  const handleValidarCodigo = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!codigoFamilia.trim()) {
      setError('Por favor ingresá el código de tu familia.');
      return;
    }

    setError(null);
    setVerificandoCodigo(true);
    try {
      const res = await fetch('/api/auth/validar-codigo-familia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo: codigoFamilia.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Código no válido.');
        setGrupoValidado(null);
      } else {
        setGrupoValidado(data.grupo);
        setError(null);
      }
    } catch {
      setError('Error al conectar con el servidor. Revisá tu conexión.');
    } finally {
      setVerificandoCodigo(false);
    }
  };

  // Subida opcional de foto de perfil
  const handleSeleccionarFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('La foto no debe superar los 5 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setFotoPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // 2. Registro de Nuevo Integrante por Código de Familia
  const handleRegistrarNuevoMiembro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grupoValidado) {
      setError('Primero verificá el código de familia.');
      return;
    }
    if (!nombre.trim()) {
      setError('Ingresá tu nombre completo.');
      return;
    }
    if (!password.trim() || password.length < 6) {
      setError('Elegí una contraseña de al menos 6 caracteres.');
      return;
    }

    setError(null);
    setCargando(true);
    try {
      const res = await fetch('/api/auth/registro-familia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigoFamilia: codigoFamilia.trim(),
          nombre: nombre.trim(),
          apodo: apodo.trim() || undefined,
          fechaNacimiento: fechaNacimiento || undefined,
          whatsapp: whatsapp.trim() || undefined,
          email: email.trim() || undefined,
          fotoUrl: fotoPreview || undefined,
          password: password.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Error al completar el registro.');
        setCargando(false);
        return;
      }

      if (data.token) {
        try {
          localStorage.setItem('destellos_token', data.token);
          document.cookie = `destellos_session=${data.token}; path=/; max-age=2592000; SameSite=Lax`;
        } catch {}
      }

      setExito(`¡Bienvenido/a a la familia ${grupoValidado.nombre}! Entrando...`);
      setTimeout(() => {
        window.location.href = data.redirectUrl || '/';
      }, 1000);
    } catch {
      setError('Error de comunicación con el servidor. Intentá nuevamente.');
      setCargando(false);
    }
  };

  // 3. Login de Miembro ya Registrado
  const handleLoginExistente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identificadorLogin.trim() || !passwordLogin.trim()) {
      setError('Completá tu correo o WhatsApp y tu contraseña.');
      return;
    }

    setError(null);
    setCargando(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: identificadorLogin.trim(),
          password: passwordLogin.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Credenciales no válidas.');
        setCargando(false);
        return;
      }

      if (data.token) {
        try {
          localStorage.setItem('destellos_token', data.token);
          document.cookie = `destellos_session=${data.token}; path=/; max-age=2592000; SameSite=Lax`;
        } catch {}
      }

      window.location.href = data.redirectUrl || '/';
    } catch {
      setError('Error al conectar con el servidor.');
      setCargando(false);
    }
  };

  // 4. Acceso Oculto de Superadmin (validación estricta en servidor con rate-limit)
  const handleAccesoSuperadmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claveSuperadmin.trim()) return;

    setErrorSuperadmin(null);
    setCargandoSuperadmin(true);
    try {
      const res = await fetch('/api/auth/superadmin-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: claveSuperadmin.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorSuperadmin(data.error || 'Clave de acceso incorrecta.');
        setCargandoSuperadmin(false);
        return;
      }

      if (data.token) {
        try {
          localStorage.setItem('destellos_token', data.token);
          document.cookie = `destellos_session=${data.token}; path=/; max-age=604800; SameSite=Lax`;
        } catch {}
      }

      window.location.href = data.redirectUrl || '/superadmin';
    } catch {
      setErrorSuperadmin('Error al verificar acceso.');
      setCargandoSuperadmin(false);
    }
  };

  // 5. Recuperación de Contraseña
  const handleSolicitarCodigoRecuperar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailRecuperar.trim()) return;
    setCargandoRecuperar(true);
    setMensajeRecuperar(null);
    try {
      const res = await fetch('/api/auth/recuperar-password/solicitar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailRecuperar.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMensajeRecuperar({ tipo: 'error', texto: data.error || 'Error al solicitar código.' });
      } else {
        setMensajeRecuperar({ tipo: 'ok', texto: data.mensaje });
        setPasoRecuperar('verificar');
      }
    } catch {
      setMensajeRecuperar({ tipo: 'error', texto: 'Error al enviar código.' });
    } finally {
      setCargandoRecuperar(false);
    }
  };

  const handleVerificarCodigoRecuperar = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargandoRecuperar(true);
    setMensajeRecuperar(null);
    try {
      const res = await fetch('/api/auth/recuperar-password/verificar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailRecuperar.trim(),
          codigo: codigoRecuperar.trim(),
          nuevaPassword: nuevaPassword.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMensajeRecuperar({ tipo: 'error', texto: data.error || 'Error al restablecer clave.' });
      } else {
        setMensajeRecuperar({ tipo: 'ok', texto: data.mensaje });
        setTimeout(() => {
          setMostrarModalRecuperar(false);
          setModo('existente');
          setIdentificadorLogin(emailRecuperar);
        }, 1800);
      }
    } catch {
      setMensajeRecuperar({ tipo: 'error', texto: 'Error al verificar código.' });
    } finally {
      setCargandoRecuperar(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center p-4 sm:p-6 bg-gradient-to-b from-[#FFFDF9] via-[#FAF6F0] to-[#F5EFE6] dark:from-[#18161A] dark:via-[#151318] dark:to-[#0F0D12] min-h-screen">
      <div className="w-full max-w-sm space-y-4">
        {/* Logo oficial y marca by Rolφ (Con detector de 3 toques para superadmin oculto) */}
        <AnimatedLogo
          variant="full"
          onRolfTripleClick={() => {
            setErrorSuperadmin(null);
            setClaveSuperadmin('');
            setMostrarModalSuperadmin(true);
          }}
        />

        {/* Pestañas: Sumarme a mi Familia vs Ya tengo cuenta */}
        <div className="flex bg-gray-100 dark:bg-[#201D24] p-1 rounded-2xl border border-gray-200 dark:border-gray-800">
          <button
            type="button"
            onClick={() => {
              setModo('nuevo');
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-black rounded-xl transition cursor-pointer ${
              modo === 'nuevo'
                ? 'bg-white dark:bg-[#2C2733] text-[#FF7043] shadow-sm'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Sumarme por Código
          </button>
          <button
            type="button"
            onClick={() => {
              setModo('existente');
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-black rounded-xl transition cursor-pointer ${
              modo === 'existente'
                ? 'bg-white dark:bg-[#2C2733] text-[#FF7043] shadow-sm'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Ya tengo cuenta
          </button>
        </div>

        {/* Alertas globales de error o éxito */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-2xl text-xs text-red-600 dark:text-red-300 font-medium text-center flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {exito && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-2xl text-xs text-emerald-700 dark:text-emerald-300 font-bold text-center flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
            <span>{exito}</span>
          </div>
        )}

        {/* =========================================================================
            MODO 1: SUMARSE POR CÓDIGO DE FAMILIA (Formato Oficial y Principal)
           ========================================================================= */}
        {modo === 'nuevo' && (
          <div className="bg-white/95 dark:bg-[#201D24]/95 p-6 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 backdrop-blur-sm space-y-4">
            {/* Paso 1: Ingreso de Código de Familia */}
            {!grupoValidado ? (
              <form onSubmit={handleValidarCodigo} className="space-y-4">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-950/50 text-[#FF7043] flex items-center justify-center mx-auto mb-2 shadow-inner">
                    <KeyRound className="w-6 h-6" />
                  </div>
                  <h2 className="text-base font-extrabold text-gray-900 dark:text-gray-100">
                    Ingresá el Código de tu Familia
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Pedile el código al administrador de tu grupo para sumarte
                  </p>
                </div>

                <div>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="ej: CHIA-1938"
                    value={codigoFamilia}
                    onChange={(e) => setCodigoFamilia(e.target.value.toUpperCase())}
                    className="w-full text-center tracking-widest font-mono text-lg font-black py-3 rounded-2xl bg-gray-50 dark:bg-[#2A2630] border-2 border-dashed border-[#FF7043]/50 focus:border-[#FF7043] focus:outline-none dark:text-white uppercase placeholder:font-sans placeholder:tracking-normal placeholder:text-sm placeholder:font-normal"
                  />
                </div>

                <button
                  type="submit"
                  disabled={verificandoCodigo}
                  className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#FF7043] to-[#F4511E] hover:brightness-105 active:scale-98 text-white font-extrabold text-sm shadow-md shadow-[#FF7043]/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition"
                >
                  {verificandoCodigo ? (
                    <span>Buscando familia...</span>
                  ) : (
                    <>
                      <span>Validar Código</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* Paso 2: Mensaje de Bienvenida + Formulario de Datos del Integrante */
              <form onSubmit={handleRegistrarNuevoMiembro} className="space-y-3.5">
                {/* Banner de Bienvenida Cálido */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-orange-950/40 dark:to-amber-950/20 border border-orange-200/80 dark:border-orange-900/50 text-center space-y-1">
                  <span className="text-2xl">{grupoValidado.emoji_or_logo || '✨'}</span>
                  <h3 className="text-sm font-black text-gray-900 dark:text-white">
                    ¡Bienvenido a la familia {grupoValidado.nombre}!
                  </h3>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Completá tus datos para sumarte al espacio familiar.
                  </p>
                  <button
                    type="button"
                    onClick={() => setGrupoValidado(null)}
                    className="text-[10px] text-[#FF7043] underline font-bold mt-1"
                  >
                    Cambiar código
                  </button>
                </div>

                {/* Foto opcional */}
                <div className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-[#25202D] rounded-2xl border border-gray-100 dark:border-gray-800">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-orange-100 dark:bg-orange-950 flex items-center justify-center text-[#FF7043] font-bold text-lg shrink-0">
                    {fotoPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={fotoPreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="text-[11px] font-bold text-gray-700 dark:text-gray-200 block">
                      Foto de perfil (opcional)
                    </label>
                    <p className="text-[10px] text-gray-400">Podés cargarla ahora o después desde tu perfil</p>
                    <label className="text-[11px] text-[#FF7043] font-bold cursor-pointer hover:underline inline-block mt-0.5">
                      Subir foto
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleSeleccionarFoto}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Nombre completo */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Nombre completo *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ej: Juan Chiachio"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-[#2A2630] border border-gray-200 dark:border-gray-700 text-xs focus:ring-2 focus:ring-[#FF7043] dark:text-white"
                  />
                </div>

                {/* Apodo y Fecha de Nacimiento en 2 columnas */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Apodo
                    </label>
                    <input
                      type="text"
                      placeholder="ej: Juancito"
                      value={apodo}
                      onChange={(e) => setApodo(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-[#2A2630] border border-gray-200 dark:border-gray-700 text-xs dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Nacimiento
                    </label>
                    <input
                      type="date"
                      value={fechaNacimiento}
                      onChange={(e) => setFechaNacimiento(e.target.value)}
                      className="w-full px-2 py-2 rounded-xl bg-gray-50 dark:bg-[#2A2630] border border-gray-200 dark:border-gray-700 text-xs dark:text-white"
                    />
                  </div>
                </div>

                {/* WhatsApp */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Número de WhatsApp
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
                    <input
                      type="tel"
                      placeholder="+54 9 11 1234-5678"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-gray-50 dark:bg-[#2A2630] border border-gray-200 dark:border-gray-700 text-xs dark:text-white"
                    />
                  </div>
                </div>

                {/* Correo electrónico */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Correo electrónico (para recuperar tu clave)
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      placeholder="juan@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-gray-50 dark:bg-[#2A2630] border border-gray-200 dark:border-gray-700 text-xs dark:text-white"
                    />
                  </div>
                </div>

                {/* Contraseña para volver a ingresar */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Elegí tu Contraseña *
                  </label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
                    <input
                      type={mostrarPassword ? 'text' : 'password'}
                      required
                      placeholder="Mínimo 6 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-9 py-2 rounded-xl bg-gray-50 dark:bg-[#2A2630] border border-gray-200 dark:border-gray-700 text-xs dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarPassword(!mostrarPassword)}
                      className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
                    >
                      {mostrarPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={cargando}
                  className="w-full mt-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-[#FF7043] to-[#F4511E] hover:brightness-105 active:scale-98 text-white font-black text-sm shadow-md shadow-[#FF7043]/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition"
                >
                  {cargando ? (
                    <span>Registrando en la familia...</span>
                  ) : (
                    <>
                      <span>¡Unirme a la familia y empezar!</span>
                      <Sparkles className="w-4 h-4 text-amber-200" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {/* =========================================================================
            MODO 2: INGRESO DE INTEGRANTE YA REGISTRADO
           ========================================================================= */}
        {modo === 'existente' && (
          <div className="bg-white/95 dark:bg-[#201D24]/95 p-6 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 backdrop-blur-sm space-y-4">
            <div className="text-center">
              <h2 className="text-base font-extrabold text-gray-900 dark:text-gray-100">
                Ingresá a tu cuenta familiar
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Con tu correo o WhatsApp registrado
              </p>
            </div>

            <form onSubmit={handleLoginExistente} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Correo o WhatsApp
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={identificadorLogin}
                    onChange={(e) => setIdentificadorLogin(e.target.value)}
                    placeholder="juan@email.com o teléfono"
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-gray-50 dark:bg-[#2A2630] border border-gray-200 dark:border-gray-700 text-xs focus:ring-2 focus:ring-[#FF7043] dark:text-white"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    Contraseña
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setEmailRecuperar(identificadorLogin.includes('@') ? identificadorLogin : '');
                      setMensajeRecuperar(null);
                      setPasoRecuperar('solicitar');
                      setMostrarModalRecuperar(true);
                    }}
                    className="text-[11px] text-[#FF7043] hover:underline font-bold"
                  >
                    Recuperar mi contraseña
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                  <input
                    type={mostrarPassword ? 'text' : 'password'}
                    required
                    value={passwordLogin}
                    onChange={(e) => setPasswordLogin(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-gray-50 dark:bg-[#2A2630] border border-gray-200 dark:border-gray-700 text-xs focus:ring-2 focus:ring-[#FF7043] dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarPassword(!mostrarPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  >
                    {mostrarPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={cargando}
                className="w-full py-3 px-4 rounded-2xl bg-gray-900 hover:bg-black dark:bg-gray-100 dark:hover:bg-white text-white dark:text-gray-900 font-extrabold text-sm shadow-md flex items-center justify-center gap-2 transition active:scale-98 disabled:opacity-50 cursor-pointer"
              >
                {cargando ? (
                  <span>Verificando...</span>
                ) : (
                  <>
                    <span>Entrar a Destellos</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Link permanente de Recuperar Contraseña debajo */}
        <div className="text-center pt-1">
          <button
            type="button"
            onClick={() => {
              setMensajeRecuperar(null);
              setPasoRecuperar('solicitar');
              setMostrarModalRecuperar(true);
            }}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-[#FF7043] dark:hover:text-[#FF7043] font-bold cursor-pointer transition"
          >
            ¿Olvidaste tu clave? <span className="underline">Recuperar mi contraseña</span>
          </button>
        </div>

        <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] text-gray-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Espacio privado y protegido con cifrado</span>
        </div>
      </div>

      {/* =========================================================================
          MODAL OCULTO DE SUPERADMIN (Se abre al hacer 3 clics en Rolφ)
          Seguridad: Valida solo en servidor y tiene rate-limit de 5 intentos
         ========================================================================= */}
      {mostrarModalSuperadmin && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1C1822] p-5 rounded-3xl max-w-xs w-full shadow-2xl border border-gray-200 dark:border-gray-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-orange-100 dark:bg-orange-950 text-[#FF7043] flex items-center justify-center">
                  <Lock className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-black uppercase tracking-wider text-gray-800 dark:text-white">
                  Acceso Especial
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setMostrarModalSuperadmin(false)}
                className="p-1 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorSuperadmin && (
              <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 rounded-xl text-[11px] text-rose-600 dark:text-rose-300 font-bold text-center">
                {errorSuperadmin}
              </div>
            )}

            <form onSubmit={handleAccesoSuperadmin} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1">
                  Clave de Acceso
                </label>
                <input
                  type="password"
                  autoFocus
                  required
                  placeholder="••••••••••••"
                  value={claveSuperadmin}
                  onChange={(e) => setClaveSuperadmin(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-[#25202D] border border-gray-200 dark:border-gray-700 text-xs dark:text-white focus:ring-2 focus:ring-[#FF7043]"
                />
              </div>

              <button
                type="submit"
                disabled={cargandoSuperadmin}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#FF7043] to-[#F4511E] text-white text-xs font-black shadow-md cursor-pointer disabled:opacity-50"
              >
                {cargandoSuperadmin ? 'Verificando...' : 'Acceder al Panel'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL RECUPERAR CONTRASEÑA (Por código de verificación por mail)
         ========================================================================= */}
      {mostrarModalRecuperar && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1C1822] p-5 rounded-3xl max-w-sm w-full shadow-2xl border border-gray-200 dark:border-gray-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-gray-900 dark:text-white">
                Recuperar Contraseña
              </h3>
              <button
                type="button"
                onClick={() => setMostrarModalRecuperar(false)}
                className="p-1 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {mensajeRecuperar && (
              <div
                className={`p-3 rounded-2xl text-xs font-bold text-center ${
                  mensajeRecuperar.tipo === 'ok'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {mensajeRecuperar.texto}
              </div>
            )}

            {pasoRecuperar === 'solicitar' ? (
              <form onSubmit={handleSolicitarCodigoRecuperar} className="space-y-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Ingresá tu correo electrónico para recibir un código de verificación de 6 dígitos.
                </p>
                <div>
                  <input
                    type="email"
                    required
                    placeholder="tu-correo@email.com"
                    value={emailRecuperar}
                    onChange={(e) => setEmailRecuperar(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-[#25202D] border border-gray-200 dark:border-gray-700 text-xs dark:text-white"
                  />
                </div>
                <button
                  type="submit"
                  disabled={cargandoRecuperar}
                  className="w-full py-2.5 rounded-xl bg-[#FF7043] text-white text-xs font-black cursor-pointer hover:bg-[#F4511E] transition disabled:opacity-50"
                >
                  {cargandoRecuperar ? 'Enviando código...' : 'Enviar Código al Correo'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerificarCodigoRecuperar} className="space-y-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Revisá tu casilla ({emailRecuperar}) e ingresá el código recibido:
                </p>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1">
                    Código de 6 dígitos
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="123456"
                    value={codigoRecuperar}
                    onChange={(e) => setCodigoRecuperar(e.target.value)}
                    className="w-full text-center font-mono text-base tracking-widest font-black py-2 rounded-xl bg-gray-50 dark:bg-[#25202D] border border-gray-200 dark:border-gray-700 text-xs dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1">
                    Nueva Contraseña
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Mínimo 8 caracteres (letras y números)"
                    value={nuevaPassword}
                    onChange={(e) => setNuevaPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-[#25202D] border border-gray-200 dark:border-gray-700 text-xs dark:text-white"
                  />
                </div>
                <button
                  type="submit"
                  disabled={cargandoRecuperar}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black cursor-pointer transition disabled:opacity-50"
                >
                  {cargandoRecuperar ? 'Restableciendo...' : 'Restablecer mi Contraseña'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
