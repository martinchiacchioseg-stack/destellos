'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Navbar from '@/components/Navbar';
import { Shield, PlusCircle, Trash2, KeyRound, Copy, Check, Users, Bell, X } from 'lucide-react';
import { SesionUsuario, UsuarioPublico, NotificacionAdmin } from '@/lib/types';

export default function AdminPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<SesionUsuario | null>(null);
  const [miembros, setMiembros] = useState<UsuarioPublico[]>([]);
  const [cargando, setCargando] = useState(true);

  // Avisos al Administrador (Campanita)
  const [notificaciones, setNotificaciones] = useState<NotificacionAdmin[]>([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const [mostrarModalNotifs, setMostrarModalNotifs] = useState(false);
  const [grupoCodigo, setGrupoCodigo] = useState<string>('CHIA-1938');

  // Formulario nuevo miembro
  const [mostrarModalNuevo, setMostrarModalNuevo] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoApodo, setNuevoApodo] = useState('');
  const [nuevoEmail, setNuevoEmail] = useState('');
  const [nuevoTelefono, setNuevoTelefono] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  // Password temporal generada mostrada una sola vez
  const [passwordInfo, setPasswordInfo] = useState<{
    nombre: string;
    email: string;
    passwordTemporal: string;
  } | null>(null);
  const [copiado, setCopiado] = useState(false);

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

      // Cargar avisos / notificaciones de nuevos integrantes
      const notifRes = await fetch('/api/admin/notificaciones');
      if (notifRes.ok) {
        const notifData = await notifRes.json();
        setNotificaciones(notifData.notificaciones || []);
        setNoLeidas(notifData.noLeidas || 0);
      }
    } catch {
      console.error('Error cargando panel admin');
    } finally {
      setCargando(false);
    }
  };

  const handleMarcarLeidas = async () => {
    try {
      await fetch('/api/admin/notificaciones', { method: 'POST' });
      setNoLeidas(0);
    } catch {}
  };

  useEffect(() => {
    cargarDatos();
  }, []);

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
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMensaje({ tipo: 'error', texto: data.error || 'No se pudo crear el miembro.' });
        setGuardando(false);
        return;
      }

      setPasswordInfo({
        nombre: nuevoNombre,
        email: nuevoEmail,
        passwordTemporal: data.passwordTemporal,
      });

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

  const handleCopiarClave = () => {
    if (!passwordInfo) return;
    const texto = `Hola ${passwordInfo.nombre}! Ya tenés tu cuenta en Destellos (by Rolφ):\n\n🔗 Web: https://destellos.ar/login\n📧 Usuario: ${passwordInfo.email}\n🔑 Clave temporal: ${passwordInfo.passwordTemporal}\n\nEn tu primer ingreso deberás cambiarla por tu clave personal.`;
    navigator.clipboard.writeText(texto).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    });
  };

  if (cargando) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-sm text-gray-400">
        Cargando administración...
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col pb-24 max-w-md mx-auto w-full min-h-screen bg-gray-50 dark:bg-[#121014]">
      <Header usuario={usuario} puntosTotales={10} />

      <main className="p-4 space-y-4">
        {/* Banner del Panel con Campanita */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-[#FF7043] p-5 rounded-3xl text-white shadow-md flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-5 h-5" />
              <h2 className="text-lg font-black tracking-tight">Panel del Administrador</h2>
            </div>
            <p className="text-xs text-blue-100">
              Espacio de tu familia y avisos de nuevos integrantes
            </p>
          </div>

          {/* Campanita con contador de no leídos */}
          <button
            onClick={() => {
              setMostrarModalNotifs(true);
              handleMarcarLeidas();
            }}
            className="relative p-2.5 rounded-2xl bg-white/20 hover:bg-white/30 text-white transition cursor-pointer shrink-0"
            title="Avisos y nuevos integrantes"
          >
            <Bell className="w-5 h-5" />
            {noLeidas > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-rose-500 text-white font-black text-[10px] ring-2 ring-white animate-bounce">
                {noLeidas}
              </span>
            )}
          </button>
        </div>

        {/* Tarjeta del Código de Familia para invitar */}
        <div className="p-4 rounded-3xl bg-white dark:bg-[#1C1822] border border-orange-200/80 dark:border-orange-950 shadow-sm flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase text-gray-400">Código de tu Familia</p>
            <p className="text-lg font-mono font-black text-[#FF7043] tracking-widest select-all">
              {grupoCodigo || 'CHIA-1938'}
            </p>
            <p className="text-[11px] text-gray-500">Compartí este código a tus familiares para que ingresen</p>
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(grupoCodigo || 'CHIA-1938');
              setMensaje({ tipo: 'ok', texto: '¡Código de familia copiado para enviar por WhatsApp!' });
            }}
            className="py-2 px-3 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#FF7043] font-bold text-xs flex items-center gap-1.5 cursor-pointer hover:bg-orange-100 transition shrink-0"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copiar</span>
          </button>
        </div>

        {mensaje && (
          <div
            className={`p-3.5 rounded-2xl text-xs font-bold ${
              mensaje.tipo === 'ok'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {mensaje.texto}
          </div>
        )}

        {/* Lista de Miembros */}
        <div className="bg-white dark:bg-[#1C1822] p-5 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-1.5">
              <Users className="w-4 h-4 text-indigo-500" />
              Miembros ({miembros.length})
            </h3>
            <button
              onClick={() => setMostrarModalNuevo(true)}
              className="py-2 px-3.5 rounded-2xl bg-[#FF7043] hover:bg-[#F4511E] text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Agregar Miembro</span>
            </button>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {miembros.map((m) => (
              <div key={m.id} className="py-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-orange-100 ring-1 ring-[#FF7043]/20 flex items-center justify-center font-bold text-xs text-[#FF7043] shrink-0">
                    {m.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.avatar_url} alt={m.nombre} className="w-full h-full object-cover" />
                    ) : (
                      <span>{m.nombre.charAt(0)}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-gray-900 dark:text-gray-100 truncate">
                      {m.nombre} {m.apodo ? `("${m.apodo}")` : ''}
                    </p>
                    <p className="text-[10px] text-gray-400 truncate">{m.email}</p>
                  </div>
                </div>

                {m.debe_cambiar_password && (
                  <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full shrink-0">
                    Clave pendiente
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>

      <Navbar />

      {/* Modal Agregar Miembro */}
      {mostrarModalNuevo && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1C1822] p-5 rounded-3xl max-w-sm w-full shadow-2xl space-y-4">
            <h3 className="text-base font-black text-gray-900 dark:text-white">Agregar Miembro</h3>
            <form onSubmit={handleCrearMiembro} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Nombre</label>
                <input
                  type="text"
                  required
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  placeholder="ej: María Gómez"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#25202D] text-xs dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Correo electrónico</label>
                <input
                  type="email"
                  required
                  value={nuevoEmail}
                  onChange={(e) => setNuevoEmail(e.target.value)}
                  placeholder="maria@email.com"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#25202D] text-xs dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Apodo (opcional)</label>
                <input
                  type="text"
                  value={nuevoApodo}
                  onChange={(e) => setNuevoApodo(e.target.value)}
                  placeholder="ej: Mari"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#25202D] text-xs dark:text-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMostrarModalNuevo(false)}
                  className="flex-1 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs font-bold text-gray-700 dark:text-gray-300 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="flex-1 py-2 rounded-xl bg-[#FF7043] text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {guardando ? 'Creando...' : 'Crear Miembro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Contraseña Generada (Visible una sola vez) */}
      {passwordInfo && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1C1822] p-6 rounded-3xl max-w-sm w-full shadow-2xl border-2 border-amber-400 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center mx-auto">
              <KeyRound className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-black text-gray-900 dark:text-white">
                Contraseña Temporal Generada
              </h3>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                Copiá esta clave ahora para pasársela al miembro.
              </p>
            </div>

            <div className="p-3 bg-gray-100 dark:bg-[#25202D] rounded-2xl border border-gray-200 dark:border-gray-700 text-center space-y-1">
              <p className="text-[10px] text-gray-400 font-bold uppercase">{passwordInfo.email}</p>
              <p className="text-base font-mono font-black text-[#FF7043] tracking-widest select-all">
                {passwordInfo.passwordTemporal}
              </p>
            </div>

            <button
              onClick={handleCopiarClave}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Copy className="w-4 h-4" />
              <span>{copiado ? '¡Copiado!' : 'Copiar datos para enviar'}</span>
            </button>

            <button
              onClick={() => setPasswordInfo(null)}
              className="w-full py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs font-bold text-gray-700 dark:text-gray-300 cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Modal Campanita: Avisos de Nuevos Integrantes */}
      {mostrarModalNotifs && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1C1822] p-5 rounded-3xl max-w-sm w-full shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-[#FF7043]" />
                <h3 className="text-base font-black text-gray-900 dark:text-white">
                  Avisos al Administrador
                </h3>
              </div>
              <button
                onClick={() => setMostrarModalNotifs(false)}
                className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {notificaciones.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">
                No hay avisos recientes todavía.
              </p>
            ) : (
              <div className="space-y-2.5">
                {notificaciones.map((n) => (
                  <div
                    key={n.id}
                    className="p-3 rounded-2xl bg-gray-50 dark:bg-[#25202D] border border-gray-100 dark:border-gray-800 space-y-2"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-orange-100 text-[#FF7043] font-bold flex items-center justify-center shrink-0">
                        {n.nuevo_usuario_avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={n.nuevo_usuario_avatar} alt={n.nuevo_usuario_nombre || ''} className="w-full h-full object-cover" />
                        ) : (
                          <span>{n.nuevo_usuario_nombre?.charAt(0) || '✨'}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-black text-gray-900 dark:text-white">
                          {n.titulo}
                        </h4>
                        <p className="text-[10px] text-gray-400">
                          {new Date(n.creado_en).toLocaleDateString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed bg-white dark:bg-[#1C1822] p-2.5 rounded-xl border border-gray-100 dark:border-gray-800">
                      {n.mensaje}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
