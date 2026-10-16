'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Navbar from '@/components/Navbar';
import {
  Crown,
  Users,
  Layers,
  PlusCircle,
  Trash2,
  Check,
  AlertCircle,
  Clock,
  KeyRound,
  Copy,
  Sparkles,
  Pause,
  Play,
  ShieldAlert,
  ChevronRight,
  LogOut,
  Tag,
  Pencil,
  X,
  ExternalLink,
} from 'lucide-react';
import { SesionUsuario, Grupo, UsuarioPublico, Publicidad, UbicacionPublicidad } from '@/lib/types';
import AnimatedLogo from '@/components/AnimatedLogo';

export default function SuperadminPage() {
  const router = useRouter();
  const [tabActivo, setTabActivo] = useState<'grupos' | 'publicidad'>('grupos');
  const [usuario, setUsuario] = useState<SesionUsuario | null>(null);
  const [metricas, setMetricas] = useState<any>(null);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [grupoSeleccionadoId, setGrupoSeleccionadoId] = useState<string>('');
  const [usuariosGrupo, setUsuariosGrupo] = useState<UsuarioPublico[]>([]);
  const [publicidades, setPublicidades] = useState<Publicidad[]>([]);
  const [cargando, setCargando] = useState(true);

  // Modales Grupo
  const [mostrarModalGrupo, setMostrarModalGrupo] = useState(false);
  const [nombreGrupo, setNombreGrupo] = useState('');
  const [emojiGrupo, setEmojiGrupo] = useState('✨');
  const [horaLimiteGrupo, setHoraLimiteGrupo] = useState('22:00');
  const [descGrupo, setDescGrupo] = useState('');

  // Modales Persona
  const [mostrarModalPersona, setMostrarModalPersona] = useState(false);
  const [personaNombre, setPersonaNombre] = useState('');
  const [personaEmail, setPersonaEmail] = useState('');
  const [personaRol, setPersonaRol] = useState<'admin' | 'miembro'>('miembro');
  const [personaApodo, setPersonaApodo] = useState('');

  // Modales Publicidad
  const [mostrarModalAd, setMostrarModalAd] = useState(false);
  const [adEditandoId, setAdEditandoId] = useState<string | null>(null);
  const [adTitulo, setAdTitulo] = useState('');
  const [adTexto, setAdTexto] = useState('');
  const [adImagenUrl, setAdImagenUrl] = useState('');
  const [adLinkUrl, setAdLinkUrl] = useState('');
  const [adUbicacion, setAdUbicacion] = useState<UbicacionPublicidad>('post_subida');
  const [subiendoImagenAd, setSubiendoImagenAd] = useState(false);

  // Password temporal generada para mostrar una sola vez
  const [passwordGeneradaInfo, setPasswordGeneradaInfo] = useState<{
    nombre: string;
    email: string;
    passwordTemporal: string;
  } | null>(null);
  const [copiado, setCopiado] = useState(false);

  const [feedback, setFeedback] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const getAuthHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('destellos_token') : null;
    const h: Record<string, string> = {};
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  };

  const cargarDatos = async () => {
    try {
      const authH = getAuthHeaders();
      const meRes = await fetch('/api/auth/me', { headers: authH });
      const meData = await meRes.json();
      if (!meData.authenticated || meData.usuario.rol !== 'superadmin') {
        router.push('/');
        return;
      }
      setUsuario(meData.usuario);

      const [metRes, grupRes, pubRes] = await Promise.all([
        fetch('/api/superadmin/metricas', { headers: authH }),
        fetch('/api/superadmin/grupos', { headers: authH }),
        fetch('/api/superadmin/publicidades', { headers: authH }),
      ]);

      if (metRes.ok) setMetricas(await metRes.json());
      if (grupRes.ok) {
        const dataGrupos = await grupRes.json();
        const lista = dataGrupos.grupos || [];
        setGrupos(lista);
        if (lista.length > 0 && !grupoSeleccionadoId) {
          setGrupoSeleccionadoId(lista[0].id);
        }
      }
      if (pubRes.ok) {
        const pData = await pubRes.json();
        setPublicidades(pData.publicidades || []);
      }
    } catch {
      setFeedback({ tipo: 'error', texto: 'Error al cargar datos del panel.' });
    } finally {
      setCargando(false);
    }
  };

  const handleAbrirNuevaPublicidad = () => {
    setAdEditandoId(null);
    setAdTitulo('');
    setAdTexto('');
    setAdImagenUrl('');
    setAdLinkUrl('');
    setAdUbicacion('post_subida');
    setMostrarModalAd(true);
  };

  const handleAbrirEditarPublicidad = (ad: Publicidad) => {
    setAdEditandoId(ad.id);
    setAdTitulo(ad.titulo);
    setAdTexto(ad.texto);
    setAdImagenUrl(ad.imagen_url || '');
    setAdLinkUrl(ad.link_url || '');
    setAdUbicacion(ad.ubicacion);
    setMostrarModalAd(true);
  };

  const handleGuardarPublicidad = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    try {
      const authH = getAuthHeaders();
      const res = await fetch('/api/superadmin/publicidades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authH },
        body: JSON.stringify({
          id: adEditandoId || undefined,
          titulo: adTitulo,
          texto: adTexto,
          imagen_url: adImagenUrl,
          link_url: adLinkUrl,
          ubicacion: adUbicacion,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ tipo: 'error', texto: data.error || 'Error al guardar publicidad.' });
      } else {
        setFeedback({ tipo: 'ok', texto: 'Publicidad guardada con éxito.' });
        setMostrarModalAd(false);
        setAdEditandoId(null);
        cargarDatos();
      }
    } catch {
      setFeedback({ tipo: 'error', texto: 'Error al guardar publicidad.' });
    }
  };

  const handleEliminarPublicidad = async (id: string) => {
    if (!confirm('¿Deseás eliminar esta publicidad permanentemente?')) return;
    try {
      const authH = getAuthHeaders();
      const res = await fetch(`/api/superadmin/publicidades?id=${id}`, {
        method: 'DELETE',
        headers: authH,
      });
      if (res.ok) {
        setPublicidades((prev) => prev.filter((p) => p.id !== id));
        setFeedback({ tipo: 'ok', texto: 'Publicidad eliminada.' });
        cargarDatos();
      }
    } catch {
      setFeedback({ tipo: 'error', texto: 'Error al eliminar publicidad.' });
    }
  };

  const handleToggleEstadoPublicidad = async (ad: Publicidad) => {
    try {
      const authH = getAuthHeaders();
      const res = await fetch('/api/superadmin/publicidades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authH },
        body: JSON.stringify({
          ...ad,
          activa: !ad.activa,
        }),
      });
      if (res.ok) {
        setPublicidades((prev) =>
          prev.map((p) => (p.id === ad.id ? { ...p, activa: !p.activa } : p))
        );
        setFeedback({
          tipo: 'ok',
          texto: `Publicidad ${!ad.activa ? 'activada' : 'pausada'}.`,
        });
      }
    } catch {
      setFeedback({ tipo: 'error', texto: 'Error al cambiar estado de la publicidad.' });
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // Cargar usuarios cuando cambia el grupo seleccionado
  useEffect(() => {
    if (!grupoSeleccionadoId) {
      setUsuariosGrupo([]);
      return;
    }
    fetch(`/api/superadmin/usuarios?grupoId=${grupoSeleccionadoId}`)
      .then((r) => r.json())
      .then((d) => setUsuariosGrupo(d.usuarios || []))
      .catch(() => {});
  }, [grupoSeleccionadoId]);

  const handleCrearGrupo = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    try {
      const res = await fetch('/api/superadmin/grupos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nombreGrupo,
          emoji_or_logo: emojiGrupo,
          hora_limite: horaLimiteGrupo,
          descripcion: descGrupo,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ tipo: 'error', texto: data.error || 'Error al crear grupo.' });
      } else {
        setFeedback({ tipo: 'ok', texto: 'Grupo creado con éxito.' });
        setNombreGrupo('');
        setDescGrupo('');
        setMostrarModalGrupo(false);
        if (data.grupo?.id) {
          setGrupoSeleccionadoId(data.grupo.id);
        }
        cargarDatos();
      }
    } catch {
      setFeedback({ tipo: 'error', texto: 'Error de conexión.' });
    }
  };

  const handleToggleEstadoGrupo = async (g: Grupo) => {
    const nuevoEstado = g.estado === 'activo' ? 'pausado' : 'activo';
    try {
      const res = await fetch('/api/superadmin/grupos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: g.id, estado: nuevoEstado }),
      });
      if (res.ok) {
        cargarDatos();
      }
    } catch {
      alert('Error al modificar estado del grupo.');
    }
  };

  const handleEliminarGrupo = async (g: Grupo) => {
    if (!confirm(`¿Eliminar permanentemente el grupo "${g.nombre}" y todos sus miembros?`)) return;
    try {
      const res = await fetch(`/api/superadmin/grupos?id=${g.id}`, { method: 'DELETE' });
      if (res.ok) {
        if (grupoSeleccionadoId === g.id) setGrupoSeleccionadoId('');
        cargarDatos();
      }
    } catch {
      alert('Error al eliminar grupo.');
    }
  };

  const handleCrearPersona = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (!grupoSeleccionadoId) {
      setFeedback({ tipo: 'error', texto: 'Debés seleccionar un grupo antes de agregar una persona.' });
      return;
    }

    try {
      const res = await fetch('/api/superadmin/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grupoId: grupoSeleccionadoId,
          nombre: personaNombre,
          apodo: personaApodo,
          email: personaEmail,
          rol: personaRol,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFeedback({ tipo: 'error', texto: data.error || 'No se pudo crear el usuario.' });
      } else {
        // Mostrar la contraseña temporal generada UNA SOLA VEZ
        setPasswordGeneradaInfo({
          nombre: personaNombre,
          email: personaEmail,
          passwordTemporal: data.passwordTemporal,
        });
        setPersonaNombre('');
        setPersonaApodo('');
        setPersonaEmail('');
        setMostrarModalPersona(false);

        // Recargar usuarios del grupo
        const uRes = await fetch(`/api/superadmin/usuarios?grupoId=${grupoSeleccionadoId}`);
        if (uRes.ok) {
          const uData = await uRes.json();
          setUsuariosGrupo(uData.usuarios || []);
        }
        cargarDatos();
      }
    } catch {
      setFeedback({ tipo: 'error', texto: 'Error al crear persona.' });
    }
  };

  const handleCopiarPassword = () => {
    if (!passwordGeneradaInfo) return;
    const texto = `Hola ${passwordGeneradaInfo.nombre}! Ya tenés tu cuenta en Destellos (by Rolφ):\n\n🔗 Web: https://destellos.ar/login\n📧 Usuario: ${passwordGeneradaInfo.email}\n🔑 Clave temporal: ${passwordGeneradaInfo.passwordTemporal}\n\nEn tu primer ingreso deberás cambiarla por tu clave personal.`;
    navigator.clipboard.writeText(texto).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    });
  };

  const handleEliminarPersona = async (p: UsuarioPublico) => {
    if (!confirm(`¿Eliminar al miembro "${p.nombre}"?`)) return;
    try {
      const res = await fetch(`/api/superadmin/usuarios?id=${p.id}`, { method: 'DELETE' });
      if (res.ok) {
        setUsuariosGrupo((prev) => prev.filter((u) => u.id !== p.id));
        cargarDatos();
      }
    } catch {
      alert('Error al eliminar usuario.');
    }
  };

  if (cargando) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-sm text-gray-400">
        Cargando Panel Superadmin...
      </div>
    );
  }

  const grupoActual = grupos.find((g) => g.id === grupoSeleccionadoId);

  return (
    <div className="flex-1 flex flex-col pb-20 min-h-screen bg-gray-50 dark:bg-[#121014]">
      {/* Header específico Superadmin */}
      <header className="bg-white dark:bg-[#1C1822] border-b border-gray-200 dark:border-gray-800 p-4 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AnimatedLogo variant="compact" />
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
              Superadmin
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/')}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#FF7043] to-[#F4511E] text-white text-xs font-black shadow-sm flex items-center gap-1.5 hover:brightness-105 active:scale-95 transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-200" />
              <span>Ir a la App (Juegos y Feed)</span>
            </button>
            <button
              onClick={async () => {
                await fetch('/api/auth/logout', { method: 'POST' });
                router.push('/login');
              }}
              className="text-xs font-bold text-gray-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer px-2 py-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Salir</span>
            </button>
          </div>
        </div>
      </header>

      <main className="p-4 max-w-4xl mx-auto w-full space-y-5">
        {feedback && (
          <div
            className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 ${
              feedback.tipo === 'ok'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {feedback.tipo === 'ok' ? <Check className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
            <span>{feedback.texto}</span>
          </div>
        )}

        {/* Métricas Principales */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-[#1C1822] p-4 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm text-center">
            <p className="text-[11px] font-black uppercase tracking-wider text-gray-400">Grupos Activos</p>
            <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{metricas?.gruposActivos || 0}</p>
          </div>
          <div className="bg-white dark:bg-[#1C1822] p-4 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm text-center">
            <p className="text-[11px] font-black uppercase tracking-wider text-gray-400">Usuarios Totales</p>
            <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{metricas?.totalUsuarios || 0}</p>
          </div>
          <div className="bg-white dark:bg-[#1C1822] p-4 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm text-center">
            <p className="text-[11px] font-black uppercase tracking-wider text-gray-400">Destellos Hoy</p>
            <p className="text-2xl font-black text-[#FF7043] mt-1">{metricas?.destellosHoy || 0}</p>
          </div>
          <div className="bg-white dark:bg-[#1C1822] p-4 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm text-center">
            <p className="text-[11px] font-black uppercase tracking-wider text-gray-400">Total Histórico</p>
            <p className="text-2xl font-black text-amber-500 mt-1">{metricas?.totalDestellos || 0}</p>
          </div>
        </div>

        {/* Pestañas de Gestión */}
        <div className="flex border-b border-gray-200 dark:border-gray-800 gap-2">
          <button
            onClick={() => setTabActivo('grupos')}
            className={`flex items-center gap-2 px-4 py-2.5 font-bold text-xs rounded-t-2xl border-b-2 transition cursor-pointer ${
              tabActivo === 'grupos'
                ? 'border-[#FF7043] text-[#FF7043] bg-orange-50/50 dark:bg-orange-950/20'
                : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Grupos y Familias ({grupos.length})</span>
          </button>
          <button
            onClick={() => setTabActivo('publicidad')}
            className={`flex items-center gap-2 px-4 py-2.5 font-bold text-xs rounded-t-2xl border-b-2 transition cursor-pointer ${
              tabActivo === 'publicidad'
                ? 'border-[#FF7043] text-[#FF7043] bg-orange-50/50 dark:bg-orange-950/20'
                : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>Publicidades y Patrocinadores ({publicidades.length})</span>
          </button>
        </div>

        {tabActivo === 'grupos' && (
          <>
            {/* Gestión de Grupos */}
            <div className="bg-white dark:bg-[#1C1822] p-5 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
                    <Layers className="w-5 h-5 text-[#FF7043]" />
                    Grupos y Familias ({grupos.length})
                  </h2>
                  <p className="text-xs text-gray-500">Espacios cerrados e independientes</p>
                </div>
                <button
                  onClick={() => setMostrarModalGrupo(true)}
                  className="py-2 px-3.5 rounded-2xl bg-[#FF7043] hover:bg-[#F4511E] text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-[#FF7043]/20 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Nuevo Grupo</span>
                </button>
              </div>

              {grupos.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">
                  No hay grupos creados todavía. ¡Creá el primero arriba!
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {grupos.map((g) => {
                    const esSeleccionado = g.id === grupoSeleccionadoId;
                    return (
                      <div
                        key={g.id}
                        onClick={() => setGrupoSeleccionadoId(g.id)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                          esSeleccionado
                            ? 'bg-orange-50/70 dark:bg-orange-950/30 border-[#FF7043] ring-2 ring-[#FF7043]/20'
                            : 'bg-gray-50 dark:bg-[#25202D] border-gray-200 dark:border-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-xl shrink-0">{g.emoji_or_logo || '✨'}</span>
                          <div className="min-w-0">
                            <p className="text-xs font-black text-gray-900 dark:text-white truncate">
                              {g.nombre}
                            </p>
                            <p className="text-[10px] text-gray-500 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-500" />
                              <span>Límite: {g.hora_limite || '22:00'} hs</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleEstadoGrupo(g);
                            }}
                            title={g.estado === 'activo' ? 'Pausar grupo' : 'Activar grupo'}
                            className="p-1.5 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500"
                          >
                            {g.estado === 'activo' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-emerald-500" />}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEliminarGrupo(g);
                            }}
                            title="Eliminar grupo"
                            className="p-1.5 rounded-xl hover:bg-rose-100 text-rose-500"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Personas dentro del Grupo Seleccionado */}
            {grupoActual && (
              <div className="bg-white dark:bg-[#1C1822] p-5 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
                      <Users className="w-5 h-5 text-indigo-500" />
                      Personas en &quot;{grupoActual.nombre}&quot; ({usuariosGrupo.length})
                    </h3>
                    <p className="text-xs text-gray-500">
                      Cada miembro accede de manera aislada únicamente a este grupo
                    </p>
                  </div>
                  <button
                    onClick={() => setMostrarModalPersona(true)}
                    className="py-2 px-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Agregar Persona</span>
                  </button>
                </div>

                {usuariosGrupo.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6">
                    Este grupo aún no tiene personas asignadas. ¡Agregá una arriba!
                  </p>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {usuariosGrupo.map((u) => (
                      <div key={u.id} className="py-2.5 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-orange-100 ring-1 ring-[#FF7043]/20 flex items-center justify-center font-bold text-xs text-[#FF7043] shrink-0">
                            {u.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={u.avatar_url} alt={u.nombre} className="w-full h-full object-cover" />
                            ) : (
                              <span>{u.nombre.charAt(0)}</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-black text-gray-900 dark:text-gray-100 truncate">
                                {u.nombre}
                              </span>
                              {u.rol === 'admin' && (
                                <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                                  Admin
                                </span>
                              )}
                              {u.debe_cambiar_password && (
                                <span className="px-1.5 py-0.5 rounded-md text-[9px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                  Clave pendiente
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-gray-400 truncate">{u.email}</p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleEliminarPersona(u)}
                          className="p-1.5 rounded-xl hover:bg-rose-100 text-rose-500"
                          title="Eliminar usuario"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Gestión de Publicidades y Patrocinadores */}
        {tabActivo === 'publicidad' && (
          <div className="bg-white dark:bg-[#1C1822] p-5 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
                  <Tag className="w-5 h-5 text-[#FF7043]" />
                  Publicidades y Patrocinadores ({publicidades.length})
                </h2>
                <p className="text-xs text-gray-500">
                  Control de anuncios, sponsors y banners en feed, subidas y juegos
                </p>
              </div>
              <button
                onClick={handleAbrirNuevaPublicidad}
                className="py-2 px-3.5 rounded-2xl bg-[#FF7043] hover:bg-[#F4511E] text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-[#FF7043]/20 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Nueva Publicidad</span>
              </button>
            </div>

            {publicidades.length === 0 ? (
              <div className="text-center py-10 space-y-2">
                <Tag className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto" />
                <p className="text-xs text-gray-400">
                  No hay publicidades ni sponsors configurados todavía.
                </p>
                <button
                  onClick={handleAbrirNuevaPublicidad}
                  className="px-3 py-1.5 rounded-xl bg-orange-100 dark:bg-orange-950/40 text-[#FF7043] font-bold text-xs cursor-pointer hover:bg-orange-200 transition"
                >
                  Crear el primer anuncio
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {publicidades.map((ad) => {
                  const ubicacionLabel: Record<string, string> = {
                    post_subida: '📸 Post Subida',
                    feed_entre_destellos: '📱 Feed Entre Fotos',
                    juegos_banner: '🎮 Banner Juegos',
                    pantalla_bloqueo: '🔒 Pantalla Bloqueo',
                    foto_ganadora: '🏆 Foto Ganadora',
                    prode: '⚽ Prode',
                    interstitial_juegos: '🎮 Interstitial Juegos',
                    interstitial_ranking: '🏅 Interstitial Ranking',
                  };

                  return (
                    <div
                      key={ad.id}
                      className={`p-4 rounded-2xl border transition flex flex-col justify-between gap-3 ${
                        ad.activa
                          ? 'bg-white dark:bg-[#25202D] border-gray-200 dark:border-gray-700'
                          : 'bg-gray-100 dark:bg-[#1A1620] border-gray-200 dark:border-gray-800 opacity-60'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase bg-orange-100 text-[#FF7043] dark:bg-orange-950/60">
                            {ubicacionLabel[ad.ubicacion] || ad.ubicacion}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${
                              ad.activa
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                            }`}
                          >
                            {ad.activa ? 'Activa' : 'Pausada'}
                          </span>
                        </div>

                        {ad.imagen_url && (
                          <div className="w-full h-28 rounded-xl overflow-hidden bg-gray-100 dark:bg-black/30 border border-gray-200 dark:border-gray-800">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={ad.imagen_url}
                              alt={ad.titulo}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}

                        <div>
                          <h4 className="text-sm font-black text-gray-900 dark:text-white">
                            {ad.titulo}
                          </h4>
                          <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 mt-0.5">
                            {ad.texto}
                          </p>
                        </div>

                        {ad.link_url && (
                          <a
                            href={ad.link_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-[#FF7043] hover:underline flex items-center gap-1 font-semibold truncate"
                          >
                            <ExternalLink className="w-3 h-3 shrink-0" />
                            <span className="truncate">{ad.link_url}</span>
                          </a>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
                        <button
                          onClick={() => handleToggleEstadoPublicidad(ad)}
                          className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition ${
                            ad.activa
                              ? 'bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                              : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          }`}
                        >
                          {ad.activa ? (
                            <>
                              <Pause className="w-3 h-3" />
                              <span>Pausar</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3 h-3" />
                              <span>Activar</span>
                            </>
                          )}
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleAbrirEditarPublicidad(ad)}
                            className="p-1.5 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 cursor-pointer"
                            title="Editar anuncio"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleEliminarPublicidad(ad.id)}
                            className="p-1.5 rounded-xl hover:bg-rose-100 text-rose-500 cursor-pointer"
                            title="Eliminar anuncio"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal Nuevo Grupo */}
      {mostrarModalGrupo && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1C1822] p-5 rounded-3xl max-w-sm w-full shadow-2xl space-y-4">
            <h3 className="text-base font-black text-gray-900 dark:text-white">Crear Nuevo Grupo</h3>
            <form onSubmit={handleCrearGrupo} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Nombre</label>
                <input
                  type="text"
                  required
                  placeholder="ej: Familia Pérez o Los Amigos del Fútbol"
                  value={nombreGrupo}
                  onChange={(e) => setNombreGrupo(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs bg-gray-50 dark:bg-[#25202D] dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Emoji / Ícono</label>
                  <input
                    type="text"
                    value={emojiGrupo}
                    onChange={(e) => setEmojiGrupo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs bg-gray-50 dark:bg-[#25202D] dark:text-white text-center"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Hora límite</label>
                  <input
                    type="time"
                    value={horaLimiteGrupo}
                    onChange={(e) => setHoraLimiteGrupo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs bg-gray-50 dark:bg-[#25202D] dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Descripción (opcional)</label>
                <input
                  type="text"
                  value={descGrupo}
                  onChange={(e) => setDescGrupo(e.target.value)}
                  placeholder="ej: Espacio cerrado de los domingos"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs bg-gray-50 dark:bg-[#25202D] dark:text-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMostrarModalGrupo(false)}
                  className="flex-1 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs font-bold text-gray-700 dark:text-gray-300 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-[#FF7043] text-white text-xs font-bold cursor-pointer"
                >
                  Crear Grupo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nueva Persona */}
      {mostrarModalPersona && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1C1822] p-5 rounded-3xl max-w-sm w-full shadow-2xl space-y-4">
            <h3 className="text-base font-black text-gray-900 dark:text-white">Agregar Persona al Grupo</h3>
            <p className="text-xs text-gray-500">
              Se generará una contraseña temporal automática y aleatoria que verás a continuación.
            </p>
            <form onSubmit={handleCrearPersona} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Nombre completo</label>
                <input
                  type="text"
                  required
                  placeholder="ej: Juan Pérez"
                  value={personaNombre}
                  onChange={(e) => setPersonaNombre(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs bg-gray-50 dark:bg-[#25202D] dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Correo electrónico</label>
                <input
                  type="email"
                  required
                  placeholder="juan@email.com"
                  value={personaEmail}
                  onChange={(e) => setPersonaEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs bg-gray-50 dark:bg-[#25202D] dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Apodo (opcional)</label>
                  <input
                    type="text"
                    placeholder="ej: Juancito"
                    value={personaApodo}
                    onChange={(e) => setPersonaApodo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs bg-gray-50 dark:bg-[#25202D] dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Rol</label>
                  <select
                    value={personaRol}
                    onChange={(e: any) => setPersonaRol(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs bg-gray-50 dark:bg-[#25202D] dark:text-white"
                  >
                    <option value="miembro">Miembro</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMostrarModalPersona(false)}
                  className="flex-1 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs font-bold text-gray-700 dark:text-gray-300 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold cursor-pointer"
                >
                  Crear Persona
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Alerta: Contraseña Temporal Generada (Visible UNA SOLA VEZ) */}
      {passwordGeneradaInfo && (
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
                Copiá esta clave ahora. Por seguridad, no volverá a mostrarse en pantalla.
              </p>
            </div>

            <div className="p-3 bg-gray-100 dark:bg-[#25202D] rounded-2xl border border-gray-200 dark:border-gray-700 text-center space-y-1">
              <p className="text-[10px] text-gray-400 font-bold uppercase">{passwordGeneradaInfo.email}</p>
              <p className="text-base font-mono font-black text-[#FF7043] tracking-widest select-all">
                {passwordGeneradaInfo.passwordTemporal}
              </p>
            </div>

            <button
              onClick={handleCopiarPassword}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Copy className="w-4 h-4" />
              <span>{copiado ? '¡Datos copiados al portapapeles!' : 'Copiar mensaje para enviar'}</span>
            </button>

            <button
              onClick={() => setPasswordGeneradaInfo(null)}
              className="w-full py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs font-bold text-gray-700 dark:text-gray-300 cursor-pointer"
            >
              Cerrar y continuar
            </button>
          </div>
        </div>
      )}
      {/* Modal Crear / Editar Publicidad */}
      {mostrarModalAd && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1C1822] p-5 rounded-3xl max-w-md w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-gray-900 dark:text-white">
                {adEditandoId ? 'Editar Publicidad / Sponsor' : 'Nueva Publicidad / Sponsor'}
              </h3>
              <button
                onClick={() => setMostrarModalAd(false)}
                className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleGuardarPublicidad} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Título o Marca
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej: Tienda Café Martínez o Vuelos low-cost"
                  value={adTitulo}
                  onChange={(e) => setAdTitulo(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs bg-gray-50 dark:bg-[#25202D] dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Texto promocional / Bajada
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="ej: ¡20% de descuento para toda la familia con el código DESTELLOS!"
                  value={adTexto}
                  onChange={(e) => setAdTexto(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs bg-gray-50 dark:bg-[#25202D] dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Ubicación en la App
                </label>
                <select
                  value={adUbicacion}
                  onChange={(e) => setAdUbicacion(e.target.value as UbicacionPublicidad)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs bg-gray-50 dark:bg-[#25202D] dark:text-white font-medium"
                >
                  <option value="post_subida">📸 Al subir el Destello (Agradecimiento)</option>
                  <option value="feed_entre_destellos">📱 En el Feed Familiar (Entre fotos)</option>
                  <option value="juegos_banner">🎮 Banner en Juegos y Desafíos</option>
                  <option value="pantalla_bloqueo">🔒 Pantalla previa a Revelación</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  URL de Imagen (Opcional)
                </label>
                <input
                  type="url"
                  placeholder="https://ejemplo.com/banner.jpg"
                  value={adImagenUrl}
                  onChange={(e) => setAdImagenUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs bg-gray-50 dark:bg-[#25202D] dark:text-white"
                />
                {adImagenUrl && (
                  <div className="mt-2 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 max-h-32 bg-gray-100 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={adImagenUrl} alt="Vista previa" className="max-h-32 object-contain" />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Enlace de destino (Link URL)
                </label>
                <input
                  type="url"
                  placeholder="https://misitio.com/promocion"
                  value={adLinkUrl}
                  onChange={(e) => setAdLinkUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs bg-gray-50 dark:bg-[#25202D] dark:text-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMostrarModalAd(false)}
                  className="flex-1 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs font-bold text-gray-700 dark:text-gray-300 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-[#FF7043] text-white text-xs font-bold cursor-pointer hover:bg-[#F4511E] transition"
                >
                  {adEditandoId ? 'Guardar Cambios' : 'Crear Publicidad'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
