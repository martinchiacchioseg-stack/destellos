'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Navbar from '@/components/Navbar';
import {
  Crown,
  Users,
  Layers,
  Shield,
  PlusCircle,
  Trash2,
  Check,
  AlertCircle,
  Tag,
  Sliders,
  ExternalLink,
  Lock,
  Pencil,
  MessageCircle,
  Copy,
  Upload,
  Image as ImageIcon,
  X,
} from 'lucide-react';
import { SesionUsuario, Publicidad, ReglasGrupo, UbicacionPublicidad } from '@/lib/types';

type TabSuperadmin = 'metricas' | 'usuarios' | 'publicidad' | 'reglas';

export default function SuperadminPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<SesionUsuario | null>(null);
  const [tabActivo, setTabActivo] = useState<TabSuperadmin>('metricas');
  const [metricas, setMetricas] = useState<any>(null);
  const [grupos, setGrupos] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [publicidades, setPublicidades] = useState<Publicidad[]>([]);
  const [cargando, setCargando] = useState(true);

  // Selector de grupo para usuarios y reglas (persiste entre recargas)
  const [grupoSeleccionadoId, setGrupoSeleccionadoId] = useState<string>('');
  const [usuariosGrupo, setUsuariosGrupo] = useState<any[]>([]);
  const [reglasGrupo, setReglasGrupo] = useState<ReglasGrupo | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const guardado = localStorage.getItem('destellos_superadmin_grupo_id');
      if (guardado) {
        setGrupoSeleccionadoId(guardado);
        setAdminGrupoId(guardado);
      }
    }
  }, []);

  // Modal nuevo grupo
  const [mostrarModalGrupo, setMostrarModalGrupo] = useState(false);
  const [nombreGrupo, setNombreGrupo] = useState('');
  const [descGrupo, setDescGrupo] = useState('');

  // Modales de Edición de Grupo
  const [grupoEditando, setGrupoEditando] = useState<any | null>(null);
  const [editNombreGrupo, setEditNombreGrupo] = useState('');
  const [editDescGrupo, setEditDescGrupo] = useState('');

  // Modal nuevo admin
  const [mostrarModalAdmin, setMostrarModalAdmin] = useState(false);
  const [adminNombre, setAdminNombre] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminGrupoId, setAdminGrupoId] = useState('');
  const [adminPassTemp, setAdminPassTemp] = useState('admin2026');

  // Modal nuevo usuario por familia
  const [mostrarModalUsuario, setMostrarModalUsuario] = useState(false);
  const [nuevoUsuarioNombre, setNuevoUsuarioNombre] = useState('');
  const [nuevoUsuarioApodo, setNuevoUsuarioApodo] = useState('');
  const [nuevoUsuarioEmail, setNuevoUsuarioEmail] = useState('');
  const [nuevoUsuarioPassTemp, setNuevoUsuarioPassTemp] = useState('familia2026');
  const [nuevoUsuarioRol, setNuevoUsuarioRol] = useState<'miembro' | 'admin'>('miembro');
  const [nuevoUsuarioTelefono, setNuevoUsuarioTelefono] = useState('');

  // Modales de Edición de Usuario
  const [usuarioEditando, setUsuarioEditando] = useState<any | null>(null);
  const [editUsuarioNombre, setEditUsuarioNombre] = useState('');
  const [editUsuarioApodo, setEditUsuarioApodo] = useState('');
  const [editUsuarioEmail, setEditUsuarioEmail] = useState('');
  const [editUsuarioTelefono, setEditUsuarioTelefono] = useState('');
  const [editUsuarioRol, setEditUsuarioRol] = useState<'miembro' | 'admin'>('miembro');
  const [editUsuarioPass, setEditUsuarioPass] = useState('');

  // Modal publicidad (creación y edición)
  const [mostrarModalAd, setMostrarModalAd] = useState(false);
  const [adEditandoId, setAdEditandoId] = useState<string | null>(null);
  const [adTitulo, setAdTitulo] = useState('');
  const [adTexto, setAdTexto] = useState('');
  const [adImagenUrl, setAdImagenUrl] = useState('');
  const [adLinkUrl, setAdLinkUrl] = useState('');
  const [adUbicacion, setAdUbicacion] = useState<UbicacionPublicidad>('post_subida');
  const [subiendoImagenAd, setSubiendoImagenAd] = useState(false);

  const [feedback, setFeedback] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const cargarTodo = async () => {
    try {
      const meRes = await fetch('/api/auth/me');
      const meData = await meRes.json();
      if (!meData.authenticated || meData.usuario.rol !== 'superadmin') {
        router.push('/');
        return;
      }
      setUsuario(meData.usuario);

      const [metRes, grupRes, admRes, pubRes] = await Promise.all([
        fetch('/api/superadmin/metricas'),
        fetch('/api/superadmin/grupos'),
        fetch('/api/superadmin/admins'),
        fetch('/api/superadmin/publicidades'),
      ]);

      if (metRes.ok) setMetricas(await metRes.json());
      if (grupRes.ok) {
        const gData = await grupRes.json();
        const listaGrupos = gData.grupos || [];
        setGrupos(listaGrupos);
        if (listaGrupos.length > 0) {
          setGrupoSeleccionadoId((prevId) => {
            if (prevId && listaGrupos.some((g: any) => g.id === prevId)) {
              return prevId;
            }
            const guardado = typeof window !== 'undefined' ? localStorage.getItem('destellos_superadmin_grupo_id') : null;
            const existe = listaGrupos.some((g: any) => g.id === guardado);
            const finalId = existe && guardado ? guardado : listaGrupos[0].id;
            if (typeof window !== 'undefined') {
              localStorage.setItem('destellos_superadmin_grupo_id', finalId);
            }
            return finalId;
          });
          setAdminGrupoId((prev) => prev || listaGrupos[0].id);
        }
      }
      if (admRes.ok) {
        const aData = await admRes.json();
        setAdmins(aData.admins || []);
      }
      if (pubRes.ok) {
        const pData = await pubRes.json();
        setPublicidades(pData.publicidades || []);
      }
    } catch {
      console.error('Error cargando superadmin');
    } finally {
      setCargando(false);
    }
  };

  const isEditingOrModalOpen = Boolean(
    mostrarModalGrupo ||
    mostrarModalAdmin ||
    mostrarModalUsuario ||
    mostrarModalAd ||
    usuarioEditando ||
    grupoEditando ||
    subiendoImagenAd
  );
  const isEditingRef = useRef(isEditingOrModalOpen);
  isEditingRef.current = isEditingOrModalOpen;

  const grupoSeleccionadoIdRef = useRef(grupoSeleccionadoId);
  grupoSeleccionadoIdRef.current = grupoSeleccionadoId;

  useEffect(() => {
    cargarTodo();
    // Auto-recarga periódica silenciosa cada 8 segundos para reflejar altas y cambios
    const interval = setInterval(() => {
      if (isEditingRef.current) return;
      cargarTodo();
      const currentGId = grupoSeleccionadoIdRef.current;
      if (currentGId) {
        fetch(`/api/superadmin/usuarios?grupoId=${currentGId}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.usuarios && !isEditingRef.current) setUsuariosGrupo(data.usuarios);
          })
          .catch(() => {});
      }
    }, 8000);
    return () => clearInterval(interval);
  }, [router]);

  // Cargar usuarios y reglas del grupo seleccionado al cambiar
  useEffect(() => {
    if (!grupoSeleccionadoId) return;

    fetch(`/api/superadmin/usuarios?grupoId=${grupoSeleccionadoId}`)
      .then((res) => res.json())
      .then((data) => setUsuariosGrupo(data.usuarios || []));

    fetch(`/api/superadmin/reglas?grupoId=${grupoSeleccionadoId}`)
      .then((res) => res.json())
      .then((data) => setReglasGrupo(data.reglas || null));
  }, [grupoSeleccionadoId]);

  // Crear Grupo
  const handleCrearGrupo = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    try {
      const res = await fetch('/api/superadmin/grupos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nombreGrupo, descripcion: descGrupo }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ tipo: 'error', texto: data.error });
      } else {
        setFeedback({ tipo: 'ok', texto: data.mensaje });
        setNombreGrupo('');
        setDescGrupo('');
        setMostrarModalGrupo(false);
        cargarTodo();
      }
    } catch {
      setFeedback({ tipo: 'error', texto: 'Error de conexión.' });
    }
  };

  // Abrir y Guardar Edición de Grupo
  const handleAbrirEditarGrupo = (g: any) => {
    setGrupoEditando(g);
    setEditNombreGrupo(g.nombre || '');
    setEditDescGrupo(g.descripcion || '');
  };

  const handleGuardarEditarGrupo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grupoEditando) return;
    try {
      const res = await fetch('/api/superadmin/grupos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: grupoEditando.id,
          nombre: editNombreGrupo,
          descripcion: editDescGrupo,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ tipo: 'error', texto: data.error });
      } else {
        setFeedback({ tipo: 'ok', texto: 'Familia / Grupo actualizado con éxito.' });
        setGrupoEditando(null);
        cargarTodo();
      }
    } catch {
      setFeedback({ tipo: 'error', texto: 'Error al actualizar grupo.' });
    }
  };

  // Eliminar Grupo
  const handleEliminarGrupo = async (id: string, nombre: string) => {
    if (!confirm(`¿Estás seguro de eliminar permanentemente la familia "${nombre}" y todos sus miembros? Esta acción no se puede deshacer.`)) return;
    try {
      const res = await fetch(`/api/superadmin/grupos?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ tipo: 'error', texto: data.error });
      } else {
        setFeedback({ tipo: 'ok', texto: 'Familia eliminada correctamente.' });
        cargarTodo();
      }
    } catch {
      setFeedback({ tipo: 'error', texto: 'Error al eliminar grupo.' });
    }
  };

  // Crear Admin
  const handleCrearAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    try {
      const res = await fetch('/api/superadmin/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: adminNombre,
          email: adminEmail,
          grupoId: adminGrupoId,
          passwordTemporal: adminPassTemp,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ tipo: 'error', texto: data.error });
      } else {
        setFeedback({ tipo: 'ok', texto: data.mensaje });
        setAdminNombre('');
        setAdminEmail('');
        setMostrarModalAdmin(false);
        cargarTodo();
      }
    } catch {
      setFeedback({ tipo: 'error', texto: 'Error de conexión.' });
    }
  };

  const handleCambiarGrupoSeleccionado = (id: string) => {
    setGrupoSeleccionadoId(id);
    setAdminGrupoId(id);
    if (typeof window !== 'undefined') {
      localStorage.setItem('destellos_superadmin_grupo_id', id);
    }
  };

  // Crear Usuario por Familia
  const handleCrearUsuarioFamilia = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    try {
      const targetGrupoId = grupoSeleccionadoId || (grupos[0]?.id || '');
      if (!targetGrupoId) {
        setFeedback({ tipo: 'error', texto: 'Debés seleccionar una familia antes de dar de alta un usuario.' });
        return;
      }
      const res = await fetch('/api/superadmin/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grupoId: targetGrupoId,
          nombre: nuevoUsuarioNombre,
          apodo: nuevoUsuarioApodo,
          email: nuevoUsuarioEmail,
          telefono: nuevoUsuarioTelefono,
          passwordTemporal: nuevoUsuarioPassTemp,
          rol: nuevoUsuarioRol,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ tipo: 'error', texto: data.error });
      } else {
        setFeedback({ tipo: 'ok', texto: data.mensaje });
        setNuevoUsuarioNombre('');
        setNuevoUsuarioApodo('');
        setNuevoUsuarioEmail('');
        setNuevoUsuarioTelefono('');
        setMostrarModalUsuario(false);
        // Recargar usuarios del grupo
        const uRes = await fetch(`/api/superadmin/usuarios?grupoId=${targetGrupoId}`);
        if (uRes.ok) {
          const uData = await uRes.json();
          setUsuariosGrupo(uData.usuarios || []);
        }
        cargarTodo();
      }
    } catch {
      setFeedback({ tipo: 'error', texto: 'Error al crear usuario.' });
    }
  };

  // Abrir y Guardar Edición de Usuario
  const handleAbrirEditarUsuario = (u: any) => {
    setUsuarioEditando(u);
    setEditUsuarioNombre(u.nombre || '');
    setEditUsuarioApodo(u.apodo || '');
    setEditUsuarioEmail(u.email || '');
    setEditUsuarioTelefono(u.telefono || '');
    setEditUsuarioRol(u.rol || 'miembro');
    setEditUsuarioPass('');
  };

  const handleGuardarEditarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuarioEditando) return;
    try {
      const res = await fetch('/api/superadmin/usuarios', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: usuarioEditando.id,
          nombre: editUsuarioNombre,
          apodo: editUsuarioApodo,
          email: editUsuarioEmail,
          telefono: editUsuarioTelefono,
          rol: editUsuarioRol,
          passwordTemporal: editUsuarioPass ? editUsuarioPass : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ tipo: 'error', texto: data.error });
      } else {
        setFeedback({ tipo: 'ok', texto: 'Usuario actualizado con éxito.' });
        setUsuarioEditando(null);
        const uRes = await fetch(`/api/superadmin/usuarios?grupoId=${grupoSeleccionadoId}`);
        if (uRes.ok) {
          const uData = await uRes.json();
          setUsuariosGrupo(uData.usuarios || []);
        }
      }
    } catch {
      setFeedback({ tipo: 'error', texto: 'Error al editar usuario.' });
    }
  };

  // Eliminar Usuario
  const handleEliminarUsuario = async (id: string, nombre: string) => {
    if (!confirm(`¿Estás seguro de eliminar permanentemente al usuario "${nombre}"? Esta acción no se puede deshacer.`)) return;
    try {
      const res = await fetch(`/api/superadmin/usuarios?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ tipo: 'error', texto: data.error });
      } else {
        setFeedback({ tipo: 'ok', texto: 'Usuario eliminado correctamente.' });
        const uRes = await fetch(`/api/superadmin/usuarios?grupoId=${grupoSeleccionadoId}`);
        if (uRes.ok) {
          const uData = await uRes.json();
          setUsuariosGrupo(uData.usuarios || []);
        }
      }
    } catch {
      setFeedback({ tipo: 'error', texto: 'Error al eliminar usuario.' });
    }
  };

  // Enviar invitación por WhatsApp
  const handleEnviarWhatsApp = (u: any) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://destellos.ar';
    const claveDefecto = u.rol === 'admin' ? 'admin2026' : 'familia2026';
    const texto = `¡Hola ${u.nombre}! 👋\nYa tenés tu usuario listo en Destellos ("un clic familiar"):\n\n🔗 Ingreso directo: ${origin}/login\n📧 Tu usuario: ${u.email}\n🔑 Contraseña inicial: ${claveDefecto}\n\n¡Sumate a compartir el destello del día y jugar en familia! ✨`;

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(texto).catch(() => {});
    }

    const cleanTel = (u.telefono || '').replace(/\D/g, '');
    const waUrl = cleanTel
      ? `https://wa.me/${cleanTel}?text=${encodeURIComponent(texto)}`
      : `https://wa.me/?text=${encodeURIComponent(texto)}`;
    window.open(waUrl, '_blank');
    setFeedback({
      tipo: 'ok',
      texto: `📲 Enlace de WhatsApp preparado para ${u.nombre}${cleanTel ? ` (${u.telefono})` : ''}. ¡También se copió el mensaje al portapapeles!`,
    });
  };

  // Abrir modal nueva publicidad
  const handleAbrirNuevaPublicidad = () => {
    setAdEditandoId(null);
    setAdTitulo('');
    setAdTexto('');
    setAdImagenUrl('');
    setAdLinkUrl('');
    setAdUbicacion('post_subida');
    setMostrarModalAd(true);
  };

  // Abrir modal editar publicidad
  const handleAbrirEditarPublicidad = (ad: Publicidad) => {
    setAdEditandoId(ad.id);
    setAdTitulo(ad.titulo);
    setAdTexto(ad.texto);
    setAdImagenUrl(ad.imagen_url || '');
    setAdLinkUrl(ad.link_url || '');
    setAdUbicacion(ad.ubicacion);
    setMostrarModalAd(true);
  };

  // Procesar archivo local de imagen para la publicidad
  const handleSeleccionarImagenAd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSubiendoImagenAd(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setAdImagenUrl(dataUrl);
        }
        setSubiendoImagenAd(false);
      };
      img.onerror = () => setSubiendoImagenAd(false);
      img.src = event.target?.result as string;
    };
    reader.onerror = () => setSubiendoImagenAd(false);
    reader.readAsDataURL(file);
  };

  // Guardar Publicidad (Creación o Edición)
  const handleGuardarPublicidad = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    try {
      const res = await fetch('/api/superadmin/publicidades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        setFeedback({ tipo: 'error', texto: data.error });
      } else {
        setFeedback({ tipo: 'ok', texto: data.mensaje || 'Publicidad guardada con éxito.' });
        setAdTitulo('');
        setAdTexto('');
        setAdImagenUrl('');
        setAdLinkUrl('');
        setAdEditandoId(null);
        setMostrarModalAd(false);
        const pRes = await fetch('/api/superadmin/publicidades');
        if (pRes.ok) {
          const pData = await pRes.json();
          setPublicidades(pData.publicidades || []);
        }
      }
    } catch {
      setFeedback({ tipo: 'error', texto: 'Error al guardar publicidad.' });
    }
  };

  // Eliminar Publicidad
  const handleEliminarPublicidad = async (id: string) => {
    if (!confirm('¿Deseás eliminar esta publicidad permanentemente?')) return;
    try {
      const res = await fetch(`/api/superadmin/publicidades?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ tipo: 'error', texto: data.error || 'Error al eliminar publicidad.' });
      } else {
        setFeedback({ tipo: 'ok', texto: 'Publicidad eliminada con éxito.' });
        setPublicidades((prev) => prev.filter((p) => p.id !== id));
        const pRes = await fetch('/api/superadmin/publicidades');
        if (pRes.ok) {
          const pData = await pRes.json();
          setPublicidades(pData.publicidades || []);
        }
      }
    } catch {
      setFeedback({ tipo: 'error', texto: 'Error al eliminar publicidad.' });
    }
  };

  // Actualizar Reglas de Grupo
  const handleActualizarReglas = async (nuevasReglas: Partial<ReglasGrupo>) => {
    try {
      const res = await fetch('/api/superadmin/reglas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grupoId: grupoSeleccionadoId,
          ...reglasGrupo,
          ...nuevasReglas,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setReglasGrupo(data.reglas);
        setFeedback({ tipo: 'ok', texto: 'Reglas de grupo guardadas.' });
      }
    } catch {
      setFeedback({ tipo: 'error', texto: 'Error al actualizar reglas.' });
    }
  };

  if (cargando) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-sm text-gray-400">
        Cargando Panel Superadmin...
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col pb-20">
      <Header usuario={usuario} puntosTotales={16} />

      <main className="p-4 space-y-4 max-w-lg mx-auto w-full">
        {/* Banner */}
        <div className="bg-gradient-to-r from-purple-700 via-indigo-600 to-[#FF7043] p-5 rounded-3xl text-white shadow-card">
          <div className="flex items-center gap-2 mb-1">
            <Crown className="w-5 h-5 text-amber-300" />
            <h2 className="text-lg font-extrabold tracking-tight">Panel de Superadmin</h2>
          </div>
          <p className="text-xs text-purple-100">
            Control multi-familia: creá grupos, usuarios, configurá publicidades en cada sección y ajustá las reglas del juego.
          </p>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
              feedback.tipo === 'ok'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                : 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-300'
            }`}
          >
            {feedback.tipo === 'ok' ? (
              <Check className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{feedback.texto}</span>
          </div>
        )}

        {/* Selector de Pestañas Superadmin */}
        <div className="flex p-1 bg-gray-100 dark:bg-gray-800/60 rounded-2xl gap-1">
          {[
            { id: 'metricas', label: 'Grupos', icon: Layers },
            { id: 'usuarios', label: 'Usuarios', icon: Users },
            { id: 'publicidad', label: 'Publicidades', icon: Tag },
            { id: 'reglas', label: 'Reglas', icon: Sliders },
          ].map((tab) => {
            const Icon = tab.icon;
            const activo = tabActivo === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setTabActivo(tab.id as TabSuperadmin)}
                className={`flex-1 py-2 px-1 rounded-xl text-xs font-black flex items-center justify-center gap-1 transition-all ${
                  activo
                    ? 'bg-white dark:bg-[#201D24] text-purple-700 dark:text-purple-300 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ------------------------------------------------------------- */}
        {/* 1. GRUPOS & MÉTRICAS */}
        {/* ------------------------------------------------------------- */}
        {tabActivo === 'metricas' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-white dark:bg-[#201D24] p-3.5 rounded-2xl border border-[var(--border-soft)] shadow-sm">
                <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-1">
                  <Layers className="w-4 h-4" />
                  <span className="text-xs font-bold">Grupos Activos</span>
                </div>
                <p className="text-2xl font-black text-gray-800 dark:text-gray-100">
                  {metricas?.totalGrupos || grupos.length || 0}
                </p>
              </div>

              <div className="bg-white dark:bg-[#201D24] p-3.5 rounded-2xl border border-[var(--border-soft)] shadow-sm">
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
                  <Users className="w-4 h-4" />
                  <span className="text-xs font-bold">Usuarios Totales</span>
                </div>
                <p className="text-2xl font-black text-gray-800 dark:text-gray-100">
                  {metricas?.totalUsuarios || 0}
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-[#201D24] p-4 rounded-3xl border border-[var(--border-soft)] shadow-soft space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-gray-800 dark:text-gray-100 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-purple-600" />
                  Familias / Grupos ({grupos.length})
                </h3>
                <button
                  onClick={() => setMostrarModalGrupo(true)}
                  className="text-xs font-bold text-[#FF7043] flex items-center gap-1 hover:underline"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Nueva Familia
                </button>
              </div>

              {mostrarModalGrupo && (
                <form
                  onSubmit={handleCrearGrupo}
                  className="p-3 bg-gray-50 dark:bg-[#2A2630] rounded-2xl space-y-2 text-xs"
                >
                  <input
                    type="text"
                    required
                    placeholder="Nombre del grupo (ej: Familia Chiaccio)"
                    value={nombreGrupo}
                    onChange={(e) => setNombreGrupo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#201D24] dark:text-white"
                  />
                  <input
                    type="text"
                    placeholder="Descripción breve (opcional)"
                    value={descGrupo}
                    onChange={(e) => setDescGrupo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#201D24] dark:text-white"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setMostrarModalGrupo(false)}
                      className="flex-1 py-1.5 rounded-xl bg-gray-200 dark:bg-gray-700 font-bold"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-1.5 rounded-xl bg-purple-600 text-white font-bold"
                    >
                      Guardar Grupo
                    </button>
                  </div>
                </form>
              )}

              {/* Formulario de Edición de Familia */}
              {grupoEditando && (
                <form
                  onSubmit={handleGuardarEditarGrupo}
                  className="p-3.5 bg-purple-50/70 dark:bg-purple-950/30 rounded-2xl space-y-2 text-xs border border-purple-200 dark:border-purple-800"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                      <Pencil className="w-3.5 h-3.5 text-purple-600" />
                      Editar Familia: {grupoEditando.nombre}
                    </h4>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Nombre del grupo"
                    value={editNombreGrupo}
                    onChange={(e) => setEditNombreGrupo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#201D24] dark:text-white"
                  />
                  <input
                    type="text"
                    placeholder="Descripción (opcional)"
                    value={editDescGrupo}
                    onChange={(e) => setEditDescGrupo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#201D24] dark:text-white"
                  />
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setGrupoEditando(null)}
                      className="flex-1 py-1.5 rounded-xl bg-gray-200 dark:bg-gray-700 font-bold"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-1.5 rounded-xl bg-purple-600 text-white font-bold"
                    >
                      Guardar Cambios
                    </button>
                  </div>
                </form>
              )}

              <div className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
                {grupos.map((g) => (
                  <div key={g.id} className="py-2.5 flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-800 dark:text-gray-200 truncate">{g.nombre}</p>
                      {g.descripcion && (
                        <p className="text-[10px] text-gray-500 truncate">{g.descripcion}</p>
                      )}
                      <p className="text-[10px] text-gray-400 font-mono">Código: {g.codigo_invitacion}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] px-2 py-0.5 bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 rounded-full font-bold">
                        {g.total_miembros || 0} miembros
                      </span>
                      <button
                        onClick={() => handleAbrirEditarGrupo(g)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40"
                        title="Editar familia"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleEliminarGrupo(g.id, g.nombre)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                        title="Eliminar familia"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* 2. USUARIOS POR FAMILIA */}
        {/* ------------------------------------------------------------- */}
        {tabActivo === 'usuarios' && (
          <div className="bg-white dark:bg-[#201D24] p-4 rounded-3xl border border-[var(--border-soft)] shadow-soft space-y-4">
            <div className="space-y-1">
              <label className="text-[11px] font-black uppercase text-gray-400">
                Seleccionar Familia / Grupo:
              </label>
              <select
                value={grupoSeleccionadoId}
                onChange={(e) => handleCambiarGrupoSeleccionado(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-[#1E1B22] text-xs font-bold"
              >
                {grupos.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nombre} ({g.total_miembros || 0} miembros)
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between pt-1">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-500">
                Miembros de la familia ({usuariosGrupo.length})
              </h3>
              <button
                onClick={() => setMostrarModalUsuario(true)}
                className="text-xs font-bold text-[#FF7043] flex items-center gap-1 hover:underline"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Dar de alta usuario
              </button>
            </div>

            {mostrarModalUsuario && (
              <form
                onSubmit={handleCrearUsuarioFamilia}
                className="p-3.5 bg-gray-50 dark:bg-[#2A2630] rounded-2xl space-y-2 text-xs border border-gray-200 dark:border-gray-700"
              >
                <h4 className="font-black text-gray-800 dark:text-gray-100">Nuevo Usuario</h4>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Nombre completo"
                    value={nuevoUsuarioNombre}
                    onChange={(e) => setNuevoUsuarioNombre(e.target.value)}
                    className="p-2 rounded-xl border border-gray-200 bg-white dark:bg-[#201D24]"
                  />
                  <input
                    type="text"
                    placeholder="Apodo (opcional)"
                    value={nuevoUsuarioApodo}
                    onChange={(e) => setNuevoUsuarioApodo(e.target.value)}
                    className="p-2 rounded-xl border border-gray-200 bg-white dark:bg-[#201D24]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="email"
                    required
                    placeholder="Email del usuario"
                    value={nuevoUsuarioEmail}
                    onChange={(e) => setNuevoUsuarioEmail(e.target.value)}
                    className="w-full p-2 rounded-xl border border-gray-200 bg-white dark:bg-[#201D24]"
                  />
                  <input
                    type="tel"
                    placeholder="WhatsApp (ej: +54 9 11 1234-5678)"
                    value={nuevoUsuarioTelefono}
                    onChange={(e) => setNuevoUsuarioTelefono(e.target.value)}
                    className="w-full p-2 rounded-xl border border-gray-200 bg-white dark:bg-[#201D24]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    minLength={6}
                    placeholder="Contraseña temporal"
                    value={nuevoUsuarioPassTemp}
                    onChange={(e) => setNuevoUsuarioPassTemp(e.target.value)}
                    className="p-2 rounded-xl border border-gray-200 bg-white dark:bg-[#201D24] font-mono text-[11px]"
                  />
                  <select
                    value={nuevoUsuarioRol}
                    onChange={(e) => setNuevoUsuarioRol(e.target.value as any)}
                    className="p-2 rounded-xl border border-gray-200 bg-white dark:bg-[#201D24]"
                  >
                    <option value="miembro">Rol: Miembro</option>
                    <option value="admin">Rol: Administrador</option>
                  </select>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setMostrarModalUsuario(false)}
                    className="flex-1 py-1.5 rounded-xl bg-gray-200 font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-1.5 rounded-xl bg-[#FF7043] text-white font-bold"
                  >
                    Guardar Usuario
                  </button>
                </div>
              </form>
            )}

            {/* Formulario de Edición de Usuario */}
            {usuarioEditando && (
              <form
                onSubmit={handleGuardarEditarUsuario}
                className="p-3.5 bg-blue-50/70 dark:bg-blue-950/30 rounded-2xl space-y-2.5 text-xs border border-blue-200 dark:border-blue-800"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                    <Pencil className="w-3.5 h-3.5 text-blue-600" />
                    Editar Usuario: {usuarioEditando.nombre}
                  </h4>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Nombre completo"
                    value={editUsuarioNombre}
                    onChange={(e) => setEditUsuarioNombre(e.target.value)}
                    className="p-2 rounded-xl border border-gray-200 bg-white dark:bg-[#201D24] dark:text-white"
                  />
                  <input
                    type="text"
                    placeholder="Apodo (opcional)"
                    value={editUsuarioApodo}
                    onChange={(e) => setEditUsuarioApodo(e.target.value)}
                    className="p-2 rounded-xl border border-gray-200 bg-white dark:bg-[#201D24] dark:text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="email"
                    required
                    placeholder="Email del usuario"
                    value={editUsuarioEmail}
                    onChange={(e) => setEditUsuarioEmail(e.target.value)}
                    className="w-full p-2 rounded-xl border border-gray-200 bg-white dark:bg-[#201D24] dark:text-white"
                  />
                  <input
                    type="tel"
                    placeholder="WhatsApp (ej: +54 9 11 1234-5678)"
                    value={editUsuarioTelefono}
                    onChange={(e) => setEditUsuarioTelefono(e.target.value)}
                    className="w-full p-2 rounded-xl border border-gray-200 bg-white dark:bg-[#201D24] dark:text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Nueva clave (dejar vacío si no cambia)"
                    value={editUsuarioPass}
                    onChange={(e) => setEditUsuarioPass(e.target.value)}
                    className="p-2 rounded-xl border border-gray-200 bg-white dark:bg-[#201D24] font-mono text-[11px] dark:text-white"
                  />
                  <select
                    value={editUsuarioRol}
                    onChange={(e) => setEditUsuarioRol(e.target.value as any)}
                    className="p-2 rounded-xl border border-gray-200 bg-white dark:bg-[#201D24] dark:text-white"
                  >
                    <option value="miembro">Rol: Miembro</option>
                    <option value="admin">Rol: Administrador</option>
                  </select>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setUsuarioEditando(null)}
                    className="flex-1 py-1.5 rounded-xl bg-gray-200 dark:bg-gray-700 font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-1.5 rounded-xl bg-blue-600 text-white font-bold"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </form>
            )}

            <div className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
              {usuariosGrupo.map((u) => (
                <div key={u.id} className="py-2.5 flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-bold text-gray-800 dark:text-gray-200 truncate">
                        {u.nombre} {u.apodo ? `(${u.apodo})` : ''}
                      </p>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase tracking-wider ${
                          u.rol === 'superadmin'
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                            : u.rol === 'admin'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                            : 'bg-orange-100 text-[#FF7043] dark:bg-orange-950/50 dark:text-orange-300'
                        }`}
                      >
                        {u.rol}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                      <p className="text-[10px] text-gray-400 truncate">{u.email}</p>
                      {u.telefono ? (
                        <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded font-semibold flex items-center gap-1">
                          📱 {u.telefono}
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.2 rounded">
                          Sin WhatsApp
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {/* Botón WhatsApp */}
                    <button
                      onClick={() => handleEnviarWhatsApp(u)}
                      className="px-2 py-1 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 rounded-xl text-[11px] font-bold border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 flex items-center gap-1 transition-colors"
                      title="Enviar invitación e ingreso por WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span className="hidden sm:inline">WhatsApp</span>
                    </button>

                    {/* Botón Editar */}
                    <button
                      onClick={() => handleAbrirEditarUsuario(u)}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                      title="Editar usuario"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>

                    {/* Botón Eliminar (no para superadmin) */}
                    {u.rol !== 'superadmin' && (
                      <button
                        onClick={() => handleEliminarUsuario(u.id, u.nombre)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                        title="Eliminar usuario"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* 3. PUBLICIDADES & PATROCINADORES */}
        {/* ------------------------------------------------------------- */}
        {tabActivo === 'publicidad' && (
          <div className="bg-white dark:bg-[#201D24] p-4 rounded-3xl border border-[var(--border-soft)] shadow-soft space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-gray-800 dark:text-gray-100 flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-amber-600" />
                  Publicidades & Sponsors
                </h3>
                <p className="text-[11px] text-gray-400">
                  Ubicá anuncios patrocinados en la app (5s post-subida, foto ganadora o prode)
                </p>
              </div>
              <button
                onClick={handleAbrirNuevaPublicidad}
                className="text-xs font-bold text-[#FF7043] flex items-center gap-1 hover:underline shrink-0"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Nuevo Anuncio
              </button>
            </div>

            {mostrarModalAd && (
              <form
                onSubmit={handleGuardarPublicidad}
                className="p-3.5 bg-gray-50 dark:bg-[#2A2630] rounded-2xl space-y-3 text-xs border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-gray-800 dark:text-gray-100 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-amber-600" />
                    {adEditandoId ? 'Editar Anuncio' : 'Nuevo Anuncio Publicitario'}
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      setMostrarModalAd(false);
                      setAdEditandoId(null);
                    }}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-500">Ubicación del anuncio:</label>
                  <select
                    value={adUbicacion}
                    onChange={(e) => setAdUbicacion(e.target.value as any)}
                    className="w-full p-2 rounded-xl border border-gray-200 bg-white dark:bg-[#201D24] mt-0.5"
                  >
                    <optgroup label="⏱️ Intersticiales de Menú (5 segundos)">
                      <option value="interstitial_juegos">Menú: Al ingresar a Juegos 🎮</option>
                      <option value="interstitial_ranking">Menú: Al ingresar a Ranking 🥇</option>
                      <option value="post_subida">Subida: 5s antes de confirmar foto diaria 📸</option>
                    </optgroup>
                    <optgroup label="🏁 Fin de Desafíos y Mini-Juegos">
                      <option value="fin_desafio_ruleta">Al finalizar / girar Ruleta Rusa 🎯</option>
                      <option value="fin_desafio_prode">Al guardar pronósticos del Prode ⚽</option>
                      <option value="fin_desafio_reto_diario">Al completar Reto Diario ✨</option>
                      <option value="fin_desafio_voto_cruzado">Al emitir voto en Votación Cruzada 🗳️</option>
                      <option value="fin_desafio_adivina">Al responder ¿Quién es quién? 👶</option>
                      <option value="fin_desafio_foto_pasado">Al adivinar Foto del Pasado 🕰️</option>
                    </optgroup>
                    <optgroup label="📌 Banners Fijos en Pantallas">
                      <option value="foto_ganadora">Debajo del Destello de Ayer en Inicio 🏆</option>
                      <option value="prode">Banner en sección Prode del Finde ⚽</option>
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-500 mb-0.5 block">Título del auspiciante:</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Pastelería Dulce Abuela"
                    value={adTitulo}
                    onChange={(e) => setAdTitulo(e.target.value)}
                    className="w-full p-2 rounded-xl border border-gray-200 bg-white dark:bg-[#201D24]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-500 mb-0.5 block">Texto / Copete promocional:</label>
                  <textarea
                    required
                    rows={2}
                    placeholder="Texto de la promo o mensaje para la familia..."
                    value={adTexto}
                    onChange={(e) => setAdTexto(e.target.value)}
                    className="w-full p-2 rounded-xl border border-gray-200 bg-white dark:bg-[#201D24]"
                  />
                </div>

                {/* Subida de archivo de imagen local */}
                <div>
                  <label className="text-[10px] font-bold text-gray-500 mb-1 block">
                    Imagen del anuncio (archivo de tu dispositivo):
                  </label>
                  {adImagenUrl ? (
                    <div className="relative rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 p-2 flex items-center justify-between gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={adImagenUrl}
                        alt="Vista previa"
                        className="w-16 h-16 object-cover rounded-xl shrink-0 border border-gray-200 dark:border-gray-700"
                      />
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-[11px] font-bold text-gray-700 dark:text-gray-200 truncate">
                          Imagen cargada localmente
                        </p>
                        <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold">
                          ✓ Optimizada y lista para mostrar
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAdImagenUrl('')}
                        className="p-1.5 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 hover:bg-red-200 transition-colors shrink-0"
                        title="Quitar imagen"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-[#FF7043] rounded-2xl cursor-pointer bg-white dark:bg-[#201D24] transition-colors text-center group">
                      <Upload className="w-6 h-6 text-[#FF7043] mb-1 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-200">
                        {subiendoImagenAd ? 'Cargando y optimizando imagen...' : 'Elegir imagen de tu computadora o celular'}
                      </span>
                      <span className="text-[10px] text-gray-400 mt-0.5">
                        JPG, PNG, WEBP (se sube directo sin necesidad de URL externa)
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={subiendoImagenAd}
                        className="hidden"
                        onChange={handleSeleccionarImagenAd}
                      />
                    </label>
                  )}
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-500 mb-0.5 block">Enlace web de destino (opcional):</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={adLinkUrl}
                    onChange={(e) => setAdLinkUrl(e.target.value)}
                    className="w-full p-2 rounded-xl border border-gray-200 bg-white dark:bg-[#201D24]"
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setMostrarModalAd(false);
                      setAdEditandoId(null);
                    }}
                    className="flex-1 py-1.5 rounded-xl bg-gray-200 dark:bg-gray-700 font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={subiendoImagenAd}
                    className="flex-1 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold transition-colors"
                  >
                    {adEditandoId ? 'Guardar Cambios' : 'Publicar Anuncio'}
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-3">
              {publicidades.length === 0 ? (
                <div className="p-6 bg-gray-50/70 dark:bg-gray-900/30 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 text-center space-y-1">
                  <p className="text-xs font-bold text-gray-600 dark:text-gray-300">
                    No hay publicidades activas
                  </p>
                  <p className="text-[10px] text-gray-400">
                    Hacé clic en "+ Nuevo Anuncio" para cargar tu primera publicidad con imagen local y texto.
                  </p>
                </div>
              ) : (
                publicidades.map((ad) => (
                  <div
                    key={ad.id}
                    className="p-3 bg-gray-50/80 dark:bg-gray-900/40 rounded-2xl border border-gray-200/80 dark:border-gray-800 flex items-start justify-between gap-3"
                  >
                    {ad.imagen_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={ad.imagen_url}
                        alt={ad.titulo}
                        className="w-16 h-16 rounded-xl object-cover shrink-0 border border-gray-200 dark:border-gray-700"
                      />
                    )}
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                          {ad.ubicacion}
                        </span>
                        <h4 className="text-xs font-black text-gray-800 dark:text-gray-100 truncate">
                          {ad.titulo}
                        </h4>
                      </div>
                      <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-snug line-clamp-2">
                        {ad.texto}
                      </p>
                      {ad.link_url && (
                        <a
                          href={ad.link_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] font-bold text-[#FF7043] flex items-center gap-0.5 hover:underline truncate"
                        >
                          <span>{ad.link_url}</span>
                          <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                        </a>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleAbrirEditarPublicidad(ad)}
                        className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg"
                        title="Editar publicidad"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleEliminarPublicidad(ad.id)}
                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg"
                        title="Eliminar publicidad"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* 4. REGLAS POR FAMILIA */}
        {/* ------------------------------------------------------------- */}
        {tabActivo === 'reglas' && (
          <div className="bg-white dark:bg-[#201D24] p-4 rounded-3xl border border-[var(--border-soft)] shadow-soft space-y-4">
            <div className="space-y-1">
              <label className="text-[11px] font-black uppercase text-gray-400">
                Seleccionar Familia / Grupo:
              </label>
              <select
                value={grupoSeleccionadoId}
                onChange={(e) => handleCambiarGrupoSeleccionado(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-[#1E1B22] text-xs font-bold"
              >
                {grupos.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nombre} ({g.total_miembros || 0} miembros)
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3 pt-2">
              {/* Fotos borrosas */}
              <div className="p-3 bg-gray-50 dark:bg-gray-900/40 rounded-2xl flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black text-gray-800 dark:text-gray-100">
                    Fotos borrosas hasta subir
                  </h4>
                  <p className="text-[10px] text-gray-400">
                    Oculta con desenfoque las fotos del grupo hasta que el usuario suba la suya
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={reglasGrupo?.fotos_borrosas_hasta_subir !== false}
                  onChange={(e) =>
                    handleActualizarReglas({ fotos_borrosas_hasta_subir: e.target.checked })
                  }
                  className="w-5 h-5 accent-[#FF7043]"
                />
              </div>

              {/* Ruleta nivel máximo */}
              <div className="p-3 bg-gray-50 dark:bg-gray-900/40 rounded-2xl space-y-1.5">
                <div>
                  <h4 className="text-xs font-black text-gray-800 dark:text-gray-100">
                    Nivel máximo en Ruleta Rusa
                  </h4>
                  <p className="text-[10px] text-gray-400">
                    Límite permitido para las preguntas generadas o enviadas
                  </p>
                </div>
                <select
                  value={reglasGrupo?.nivel_ruleta_maximo || 'picante'}
                  onChange={(e) =>
                    handleActualizarReglas({ nivel_ruleta_maximo: e.target.value as any })
                  }
                  className="w-full p-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#201D24]"
                >
                  <option value="suave">Suave (familiar y tierno) 🌿</option>
                  <option value="picante">Picante (preguntas comprometedoras) 🌶️</option>
                  <option value="extra_picante">Extra Picante (sin filtros pero moderado) 🔥</option>
                </select>
              </div>

              {/* Prode marcador exacto */}
              <div className="p-3 bg-gray-50 dark:bg-gray-900/40 rounded-2xl flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black text-gray-800 dark:text-gray-100">
                    Prode: Bonificación por marcador exacto
                  </h4>
                  <p className="text-[10px] text-gray-400">
                    Otorga +1 punto extra si además acierta los goles exactos
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={reglasGrupo?.prode_marcador_exacto_bonus !== false}
                  onChange={(e) =>
                    handleActualizarReglas({ prode_marcador_exacto_bonus: e.target.checked })
                  }
                  className="w-5 h-5 accent-[#FF7043]"
                />
              </div>
            </div>
          </div>
        )}
      </main>

      <Navbar />
    </div>
  );
}
