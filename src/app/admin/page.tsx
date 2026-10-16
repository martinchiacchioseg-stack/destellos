'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Navbar from '@/components/Navbar';
import { Shield, UserPlus, KeyRound, Check, AlertCircle, Sparkles, UserCheck, UserX, MessageCircle } from 'lucide-react';
import { SesionUsuario, UsuarioPublico } from '@/lib/types';

export default function AdminPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<SesionUsuario | null>(null);
  const [miembros, setMiembros] = useState<UsuarioPublico[]>([]);
  const [cargando, setCargando] = useState(true);

  // Formulario nuevo miembro
  const [mostrarModalNuevo, setMostrarModalNuevo] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoApodo, setNuevoApodo] = useState('');
  const [nuevoEmail, setNuevoEmail] = useState('');
  const [nuevoTelefono, setNuevoTelefono] = useState('');
  const [nuevaPassTemporal, setNuevaPassTemporal] = useState('000000');
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  // Reset password
  const [modalResetId, setModalResetId] = useState<string | null>(null);
  const [resetPassTemp, setResetPassTemp] = useState('000000');

  const cargarDatos = async () => {
    try {
      const meRes = await fetch('/api/auth/me');
      const meData = await meRes.json();
      if (!meData.authenticated || (meData.usuario.rol !== 'admin' && meData.usuario.rol !== 'superadmin')) {
        router.push('/');
        return;
      }
      setUsuario(meData.usuario);

      const miembrosRes = await fetch('/api/admin/usuarios');
      const miembrosData = await miembrosRes.json();
      if (miembrosRes.ok) {
        setMiembros(miembrosData.usuarios || []);
      }
    } catch {
      console.error('Error cargando panel admin');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
    const timer = setInterval(() => {
      cargarDatos();
    }, 7000);
    return () => clearInterval(timer);
  }, [router]);

  const handleCrearMiembro = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setMensaje(null);

    try {
      const res = await fetch('/api/admin/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nuevoNombre,
          apodo: nuevoApodo,
          email: nuevoEmail,
          telefono: nuevoTelefono,
          passwordTemporal: nuevaPassTemporal,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMensaje({ tipo: 'error', texto: data.error || 'No se pudo crear el miembro.' });
        setGuardando(false);
        return;
      }

      setMensaje({ tipo: 'ok', texto: data.mensaje });
      setNuevoNombre('');
      setNuevoApodo('');
      setNuevoEmail('');
      setNuevoTelefono('');
      setMostrarModalNuevo(false);
      cargarDatos();
    } catch {
      setMensaje({ tipo: 'error', texto: 'Error de red.' });
    } finally {
      setGuardando(false);
    }
  };

  const handleResetPassword = async (usuarioId: string) => {
    setGuardando(true);
    try {
      const res = await fetch('/api/admin/usuarios/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuarioId,
          nuevaPasswordTemporal: resetPassTemp,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Error al resetear contraseña.');
      } else {
        alert(data.mensaje);
        setModalResetId(null);
        cargarDatos();
      }
    } catch {
      alert('Error de red al resetear contraseña.');
    } finally {
      setGuardando(false);
    }
  };

  const handleToggleActivo = async (usuarioId: string) => {
    try {
      const res = await fetch('/api/admin/usuarios/toggle-activo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuarioId }),
      });
      const data = await res.json();
      if (res.ok) {
        cargarDatos();
      } else {
        alert(data.error || 'Error al modificar estado.');
      }
    } catch {
      alert('Error de conexión.');
    }
  };

  const handleEnviarWhatsApp = (m: UsuarioPublico) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://destellos.ar';
    const claveDefecto = '000000';
    const texto = `¡Hola ${m.nombre}! 👋\nYa tenés tu usuario listo en Destellos ("un clic familiar"):\n\n🔗 Ingreso directo: ${origin}/login\n📧 Tu usuario: ${m.email}\n🔑 Contraseña inicial: ${claveDefecto}\n\n¡Sumate a compartir el destello del día y jugar en familia! ✨`;

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(texto).catch(() => {});
    }

    const cleanTel = (m.telefono || '').replace(/\D/g, '');
    const waUrl = cleanTel
      ? `https://wa.me/${cleanTel}?text=${encodeURIComponent(texto)}`
      : `https://wa.me/?text=${encodeURIComponent(texto)}`;
    window.open(waUrl, '_blank');
  };

  if (cargando) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-sm text-gray-400">
        Cargando panel de administración...
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col pb-20">
      <Header usuario={usuario} puntosTotales={16} />

      <main className="p-4 space-y-4">
        {/* Banner del Panel */}
        <div className="bg-gradient-to-r from-blue-500 via-indigo-500 to-[#FF7043] p-5 rounded-3xl text-white shadow-md">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5" />
            <h2 className="text-lg font-extrabold tracking-tight">Panel de Administración</h2>
          </div>
          <p className="text-xs text-blue-50 leading-relaxed">
            Gestioná los miembros de tu grupo, creá nuevos usuarios con contraseña temporal y reseteá accesos cuando lo necesiten.
          </p>
        </div>

        {mensaje && (
          <div
            className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
              mensaje.tipo === 'ok'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                : 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-300'
            }`}
          >
            {mensaje.tipo === 'ok' ? (
              <Check className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{mensaje.texto}</span>
          </div>
        )}

        {/* Botón Crear Miembro */}
        <button
          onClick={() => setMostrarModalNuevo(true)}
          className="w-full py-3.5 px-4 rounded-2xl bg-[#FF7043] hover:bg-[#F4511E] text-white font-bold text-sm shadow-soft flex items-center justify-center gap-2 transition-transform active:scale-98"
        >
          <UserPlus className="w-4 h-4" />
          <span>Agregar nuevo miembro al grupo</span>
        </button>

        {/* Modal / Formulario Nuevo Miembro */}
        {mostrarModalNuevo && (
          <div className="bg-white dark:bg-[#201D24] p-5 rounded-3xl border border-[#FF7043]/30 shadow-card space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
              <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#FF7043]" />
                Crear Miembro Familiar
              </h3>
              <button
                type="button"
                onClick={() => setMostrarModalNuevo(false)}
                className="text-xs font-bold text-gray-400 hover:text-gray-600"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleCrearMiembro} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Nombre completo
                </label>
                <input
                  type="text"
                  required
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  placeholder="Ej: Lucía Gómez"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#2A2630] dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Apodo familiar (opcional)
                </label>
                <input
                  type="text"
                  value={nuevoApodo}
                  onChange={(e) => setNuevoApodo(e.target.value)}
                  placeholder="Ej: Lu"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#2A2630] dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={nuevoEmail}
                    onChange={(e) => setNuevoEmail(e.target.value)}
                    placeholder="lucia@ejemplo.com"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#2A2630] dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                    WhatsApp (opcional)
                  </label>
                  <input
                    type="tel"
                    value={nuevoTelefono}
                    onChange={(e) => setNuevoTelefono(e.target.value)}
                    placeholder="+54 9 11 ..."
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#2A2630] dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Contraseña temporal inicial (mín. 6 caracteres)
                </label>
                <input
                  type="text"
                  required
                  minLength={6}
                  value={nuevaPassTemporal}
                  onChange={(e) => setNuevaPassTemporal(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#2A2630] dark:text-white font-mono"
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  Al ingresar por primera vez, se le exigirá cambiarla de forma obligatoria.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMostrarModalNuevo(false)}
                  className="flex-1 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="flex-1 py-2 rounded-xl bg-[#FF7043] text-white font-bold disabled:opacity-50"
                >
                  {guardando ? 'Guardando...' : 'Crear miembro'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista de Miembros */}
        <div className="bg-white dark:bg-[#201D24] p-4 rounded-3xl border border-[var(--border-soft)] shadow-soft">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-extrabold text-gray-800 dark:text-gray-100">
              Miembros del Grupo ({miembros.length})
            </h3>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Estado y accesos
            </span>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {miembros.map((m) => (
              <div key={m.id} className="py-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-orange-100 ring-2 ring-[#FF7043]/20 flex items-center justify-center font-bold text-xs text-[#FF7043]">
                    {m.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.avatar_url} alt={m.nombre} className="w-full h-full object-cover" />
                    ) : (
                      <span>{m.nombre.charAt(0)}</span>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-xs font-bold text-gray-800 dark:text-gray-200">
                        {m.nombre}
                      </p>
                      {m.apodo && (
                        <span className="text-[10px] px-1.5 py-0.2 bg-orange-100 dark:bg-orange-950/60 text-[#FF7043] rounded-md font-semibold">
                          &quot;{m.apodo}&quot;
                        </span>
                      )}
                      {m.rol === 'admin' && (
                        <span className="text-[9px] px-1.5 py-0.2 bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded font-bold">
                          Admin
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[10px] text-gray-400">{m.email}</p>
                      {m.telefono && (
                        <span className="font-mono text-[9px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded font-semibold">
                          📱 {m.telefono}
                        </span>
                      )}
                    </div>
                    {m.debe_cambiar_password && (
                      <span className="inline-block text-[9px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.2 rounded mt-0.5">
                        Pendiente cambio de contraseña
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {/* Botón WhatsApp */}
                  <button
                    onClick={() => handleEnviarWhatsApp(m)}
                    title="Enviar datos de acceso por WhatsApp"
                    className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 hover:bg-emerald-100 transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                  </button>

                  {/* Botón Reset Password */}
                  <button
                    onClick={() => {
                      setModalResetId(m.id);
                      setResetPassTemp('cambio2026');
                    }}
                    title="Resetear contraseña temporal"
                    className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-amber-100 text-gray-600 dark:text-gray-300 hover:text-amber-700 transition-colors"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                  </button>

                  {/* Toggle Activo/Inactivo */}
                  <button
                    onClick={() => handleToggleActivo(m.id)}
                    title={m.activo ? 'Desactivar usuario' : 'Activar usuario'}
                    className={`p-2 rounded-xl transition-colors ${
                      m.activo
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 hover:bg-emerald-100'
                        : 'bg-red-50 dark:bg-red-950/40 text-red-600 hover:bg-red-100'
                    }`}
                  >
                    {m.activo ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal de Reset Password */}
        {modalResetId && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#201D24] p-5 rounded-3xl max-w-xs w-full shadow-2xl space-y-3">
              <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100 flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-amber-500" />
                Resetear Contraseña
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Escribí una nueva contraseña temporal para este miembro. Deberá cambiarla al ingresar:
              </p>
              <input
                type="text"
                value={resetPassTemp}
                onChange={(e) => setResetPassTemp(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#2A2630] dark:text-white font-mono text-xs"
              />
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setModalResetId(null)}
                  className="flex-1 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleResetPassword(modalResetId)}
                  disabled={guardando}
                  className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs"
                >
                  Confirmar reset
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <Navbar />
    </div>
  );
}
