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
  Wrench,
  FileText,
  Download,
  Calendar,
  Tv,
} from 'lucide-react';
import {
  SesionUsuario,
  Grupo,
  UsuarioPublico,
  Publicidad,
  UbicacionPublicidad,
  InformeDiagnostico,
  MensajePizarra,
  ColorLedPizarra,
  PrioridadMensajePizarra,
} from '@/lib/types';
import AnimatedLogo from '@/components/AnimatedLogo';
import { jsPDF } from 'jspdf';

export default function SuperadminPage() {
  const router = useRouter();
  const [tabActivo, setTabActivo] = useState<
    'grupos' | 'licencias' | 'pizarra' | 'diagnostico' | 'publicidad'
  >('grupos');
  const [usuario, setUsuario] = useState<SesionUsuario | null>(null);
  const [metricas, setMetricas] = useState<any>(null);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [grupoSeleccionadoId, setGrupoSeleccionadoId] = useState<string>('');
  const [usuariosGrupo, setUsuariosGrupo] = useState<UsuarioPublico[]>([]);
  const [publicidades, setPublicidades] = useState<Publicidad[]>([]);
  const [cargando, setCargando] = useState(true);

  // Estados de Pizarra LED
  const [boardMensajes, setBoardMensajes] = useState<MensajePizarra[]>([]);
  const [boardTexto, setBoardTexto] = useState('');
  const [boardColor, setBoardColor] = useState<ColorLedPizarra>('ambar');
  const [boardGrupoId, setBoardGrupoId] = useState('all');
  const [boardPrioridad, setBoardPrioridad] = useState<PrioridadMensajePizarra>('normal');
  const [boardVencimiento, setBoardVencimiento] = useState('');
  const [boardProgramado, setBoardProgramado] = useState('');
  const [boardEditandoId, setBoardEditandoId] = useState<string | null>(null);
  const [mostrarModalBoard, setMostrarModalBoard] = useState(false);

  // Estados de Diagnóstico y Mantenimiento
  const [ejecutandoDiagnostico, setEjecutandoDiagnostico] = useState(false);
  const [informeDiagnostico, setInformeDiagnostico] = useState<InformeDiagnostico | null>(null);

  // Modales Grupo
  const [mostrarModalGrupo, setMostrarModalGrupo] = useState(false);
  const [nombreGrupo, setNombreGrupo] = useState('');
  const [emojiGrupo, setEmojiGrupo] = useState('✨');
  const [horaLimiteGrupo, setHoraLimiteGrupo] = useState('22:00');
  const [descGrupo, setDescGrupo] = useState('');
  const [tipoAdminGrupo, setTipoAdminGrupo] = useState<'martin' | 'otro'>('martin');
  const [otroAdminNombre, setOtroAdminNombre] = useState('');
  const [otroAdminEmail, setOtroAdminEmail] = useState('');
  const [codigoFamiliaSugerido, setCodigoFamiliaSugerido] = useState('');

  // Modales Persona
  const [mostrarModalPersona, setMostrarModalPersona] = useState(false);
  const [personaNombre, setPersonaNombre] = useState('');
  const [personaEmail, setPersonaEmail] = useState('');
  const [personaRol, setPersonaRol] = useState<'admin' | 'miembro'>('miembro');
  const [personaApodo, setPersonaApodo] = useState('');

  // Estados para Edición de Grupo
  const [mostrarModalEditarGrupo, setMostrarModalEditarGrupo] = useState(false);
  const [editGrupoId, setEditGrupoId] = useState('');
  const [editNombreGrupo, setEditNombreGrupo] = useState('');
  const [editEmojiGrupo, setEditEmojiGrupo] = useState('✨');
  const [editHoraLimiteGrupo, setEditHoraLimiteGrupo] = useState('22:00');
  const [editDescGrupo, setEditDescGrupo] = useState('');
  const [editCodigoFamilia, setEditCodigoFamilia] = useState('');
  const [editAdminNombre, setEditAdminNombre] = useState('');
  const [editAdminEmail, setEditAdminEmail] = useState('');

  // Estados para Edición de Persona / Integrante
  const [mostrarModalEditarPersona, setMostrarModalEditarPersona] = useState(false);
  const [editPersonaId, setEditPersonaId] = useState('');
  const [editPersonaNombre, setEditPersonaNombre] = useState('');
  const [editPersonaApodo, setEditPersonaApodo] = useState('');
  const [editPersonaEmail, setEditPersonaEmail] = useState('');
  const [editPersonaTelefono, setEditPersonaTelefono] = useState('');
  const [editPersonaRol, setEditPersonaRol] = useState<'admin' | 'miembro'>('miembro');
  const [editPersonaFechaNacimiento, setEditPersonaFechaNacimiento] = useState('');
  const [editPersonaPassword, setEditPersonaPassword] = useState('');

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

      const [metRes, grupRes, pubRes, boardRes] = await Promise.all([
        fetch('/api/superadmin/metricas', { headers: authH }),
        fetch('/api/superadmin/grupos', { headers: authH }),
        fetch('/api/superadmin/publicidades', { headers: authH }),
        fetch('/api/superadmin/board', { headers: authH }),
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
      if (boardRes && boardRes.ok) {
        const bData = await boardRes.json();
        setBoardMensajes(bData.mensajes || []);
      }
    } catch {
      setFeedback({ tipo: 'error', texto: 'Error al cargar datos del panel.' });
    } finally {
      setCargando(false);
    }
  };

  // Handlers de Pizarra LED
  const handleAbrirNuevoBoardMensaje = () => {
    setBoardEditandoId(null);
    setBoardTexto('');
    setBoardColor('ambar');
    setBoardGrupoId('all');
    setBoardPrioridad('normal');
    setBoardVencimiento('');
    setBoardProgramado('');
    setMostrarModalBoard(true);
  };

  const handleAbrirEditarBoardMensaje = (m: MensajePizarra) => {
    setBoardEditandoId(m.id);
    setBoardTexto(m.text);
    setBoardColor(m.color);
    setBoardGrupoId(m.group_id);
    setBoardPrioridad(m.priority);
    setBoardVencimiento(m.expires_at || '');
    setBoardProgramado(m.scheduled_at || '');
    setMostrarModalBoard(true);
  };

  const handleGuardarBoardMensaje = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (!boardTexto.trim()) {
      setFeedback({ tipo: 'error', texto: 'El texto del mensaje no puede estar vacío.' });
      return;
    }
    try {
      const authH = getAuthHeaders();
      const method = boardEditandoId ? 'PUT' : 'POST';
      const body = {
        id: boardEditandoId || undefined,
        text: boardTexto.trim(),
        color: boardColor,
        group_id: boardGrupoId,
        priority: boardPrioridad,
        scheduled_at: boardProgramado || undefined,
        expires_at: boardVencimiento || undefined,
      };

      const res = await fetch('/api/superadmin/board', {
        method,
        headers: { 'Content-Type': 'application/json', ...authH },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json();
        setFeedback({ tipo: 'error', texto: errData.error || 'Error al guardar mensaje.' });
      } else {
        setMostrarModalBoard(false);
        setFeedback({ tipo: 'ok', texto: '¡Mensaje guardado para el Cartel LED con éxito!' });
        cargarDatos();
      }
    } catch {
      setFeedback({ tipo: 'error', texto: 'Error al conectar con el servidor.' });
    }
  };

  const handleToggleEstadoBoardMensaje = async (m: MensajePizarra) => {
    try {
      const nuevoEstado = m.status === 'activo' ? 'pausado' : 'activo';
      const authH = getAuthHeaders();
      const res = await fetch('/api/superadmin/board', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authH },
        body: JSON.stringify({ id: m.id, status: nuevoEstado }),
      });
      if (res.ok) {
        cargarDatos();
      }
    } catch {
      alert('Error al modificar estado del mensaje.');
    }
  };

  const handleEliminarBoardMensaje = async (id: string) => {
    if (!confirm('¿Eliminar este mensaje de la Pizarra LED?')) return;
    try {
      const authH = getAuthHeaders();
      const res = await fetch(`/api/superadmin/board?id=${id}`, {
        method: 'DELETE',
        headers: authH,
      });
      if (res.ok) {
        setBoardMensajes((prev) => prev.filter((m) => m.id !== id));
        setFeedback({ tipo: 'ok', texto: 'Mensaje eliminado del Cartel LED.' });
      }
    } catch {
      alert('Error al eliminar mensaje.');
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
    fetch(`/api/superadmin/usuarios?grupoId=${grupoSeleccionadoId}`, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((d) => setUsuariosGrupo(d.usuarios || []))
      .catch(() => {});
  }, [grupoSeleccionadoId]);

  const handleCrearGrupo = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    try {
      const authH = getAuthHeaders();
      const res = await fetch('/api/superadmin/grupos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authH },
        body: JSON.stringify({
          nombre: nombreGrupo,
          emoji_or_logo: emojiGrupo,
          hora_limite: horaLimiteGrupo,
          descripcion: descGrupo,
          admin_id: tipoAdminGrupo === 'martin' ? 'usr-superadmin-001' : undefined,
          admin_nombre: tipoAdminGrupo === 'martin' ? 'Martín Chiacchio' : otroAdminNombre.trim(),
          admin_email: tipoAdminGrupo === 'martin' ? 'martinchiacchio.seg@gmail.com' : otroAdminEmail.trim(),
          codigo_familia: codigoFamiliaSugerido.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ tipo: 'error', texto: data.error || 'Error al crear grupo.' });
      } else {
        const codigoGen = data.grupo?.codigo_familia || data.grupo?.codigo_invitacion;
        setFeedback({ tipo: 'ok', texto: `¡Familia "${data.grupo?.nombre}" creada! Código para entregar: ${codigoGen}` });
        setNombreGrupo('');
        setDescGrupo('');
        setCodigoFamiliaSugerido('');
        setOtroAdminNombre('');
        setOtroAdminEmail('');
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

  const handleAbrirEditarGrupo = (g: Grupo) => {
    setEditGrupoId(g.id);
    setEditNombreGrupo(g.nombre || '');
    setEditEmojiGrupo(g.emoji_or_logo || '✨');
    setEditHoraLimiteGrupo(g.hora_limite || '22:00');
    setEditDescGrupo(g.descripcion || '');
    setEditCodigoFamilia(g.codigo_familia || g.codigo_invitacion || '');
    setEditAdminNombre(g.admin_nombre || '');
    setEditAdminEmail(g.admin_email || '');
    setMostrarModalEditarGrupo(true);
  };

  const handleGuardarEditarGrupo = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    try {
      const authH = getAuthHeaders();
      const res = await fetch('/api/superadmin/grupos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authH },
        body: JSON.stringify({
          id: editGrupoId,
          nombre: editNombreGrupo.trim(),
          emoji_or_logo: editEmojiGrupo.trim(),
          hora_limite: editHoraLimiteGrupo.trim(),
          descripcion: editDescGrupo.trim(),
          codigo_familia: editCodigoFamilia.trim().toUpperCase(),
          admin_nombre: editAdminNombre.trim(),
          admin_email: editAdminEmail.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ tipo: 'error', texto: data.error || 'Error al actualizar grupo.' });
      } else {
        setFeedback({ tipo: 'ok', texto: `¡Familia "${editNombreGrupo}" modificada con éxito!` });
        setMostrarModalEditarGrupo(false);
        cargarDatos();
      }
    } catch {
      setFeedback({ tipo: 'error', texto: 'Error al conectar con el servidor.' });
    }
  };

  const handleToggleEstadoGrupo = async (g: Grupo) => {
    const nuevoEstado = g.estado === 'activo' ? 'pausado' : 'activo';
    try {
      const authH = getAuthHeaders();
      const res = await fetch('/api/superadmin/grupos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authH },
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
      const authH = getAuthHeaders();
      const res = await fetch(`/api/superadmin/grupos?id=${g.id}`, {
        method: 'DELETE',
        headers: authH,
      });
      if (res.ok) {
        if (grupoSeleccionadoId === g.id) setGrupoSeleccionadoId('');
        setFeedback({ tipo: 'ok', texto: `Familia "${g.nombre}" eliminada correctamente.` });
        cargarDatos();
      }
    } catch {
      alert('Error al eliminar grupo.');
    }
  };

  // Gestión de Licencias Familiares
  const handleRenovarLicencia = async (g: Grupo, diasSuma: number) => {
    try {
      const authH = getAuthHeaders();
      const hoy = new Date();
      const baseFecha = g.fecha_vencimiento && new Date(g.fecha_vencimiento) > hoy
        ? new Date(g.fecha_vencimiento)
        : hoy;
      baseFecha.setDate(baseFecha.getDate() + diasSuma);
      const nuevaFecha = baseFecha.toISOString().split('T')[0];

      const res = await fetch('/api/superadmin/grupos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authH },
        body: JSON.stringify({
          id: g.id,
          fecha_vencimiento: nuevaFecha,
          licencia_activa: true,
        }),
      });

      if (res.ok) {
        setFeedback({ tipo: 'ok', texto: `Licencia de "${g.nombre}" renovada hasta el ${nuevaFecha}.` });
        cargarDatos();
      }
    } catch {
      setFeedback({ tipo: 'error', texto: 'Error al renovar licencia.' });
    }
  };

  const handleToggleLicencia = async (g: Grupo) => {
    try {
      const authH = getAuthHeaders();
      const nuevoEstado = !g.licencia_activa;
      const res = await fetch('/api/superadmin/grupos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authH },
        body: JSON.stringify({
          id: g.id,
          licencia_activa: nuevoEstado,
        }),
      });
      if (res.ok) {
        setFeedback({
          tipo: 'ok',
          texto: `Licencia de "${g.nombre}" ${nuevoEstado ? 'reactivada' : 'suspendida'}.`,
        });
        cargarDatos();
      }
    } catch {
      setFeedback({ tipo: 'error', texto: 'Error al modificar licencia.' });
    }
  };

  // Mantenimiento y Diagnóstico Automatizado
  const handleEjecutarDiagnostico = async () => {
    setEjecutandoDiagnostico(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/superadmin/diagnostico', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ tipo: 'error', texto: data.error || 'Fallo al ejecutar diagnóstico.' });
      } else {
        setInformeDiagnostico(data.informe);
        setFeedback({ tipo: 'ok', texto: '¡Diagnóstico y auto-reparaciones completados con éxito!' });
        cargarDatos();
      }
    } catch {
      setFeedback({ tipo: 'error', texto: 'Error al conectar con el motor de diagnóstico.' });
    } finally {
      setEjecutandoDiagnostico(false);
    }
  };

  const handleDescargarDiagnosticoPDF = (informe: InformeDiagnostico) => {
    const doc = new jsPDF();

    // Banner de Encabezado
    doc.setFillColor(255, 112, 67); // #FF7043
    doc.rect(0, 0, 210, 26, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('DESTELLOS - INFORME OFICIAL DE MANTENIMIENTO Y DIAGNÓSTICO', 14, 12);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fecha: ${new Date(informe.fecha).toLocaleString('es-AR')} | Plataforma: ${informe.version_app} by Rolφ`, 14, 20);

    // Resumen Ejecutivo
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumen Ejecutivo del Sistema', 14, 34);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const resumenLines = doc.splitTextToSize(informe.resumen_ejecutivo, 182);
    doc.text(resumenLines, 14, 40);

    // Resumen métricas
    const boxY = 40 + resumenLines.length * 4.5 + 4;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, boxY, 182, 14, 2, 2, 'F');
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(50, 50, 50);
    doc.text(
      `Módulos: ${informe.total_modulos}   |   OK: ${informe.modulos_ok}   |   Reparados: ${informe.modulos_reparados}   |   Advertencias: ${informe.modulos_advertencia}   |   Errores: ${informe.modulos_error}`,
      20,
      boxY + 9
    );

    // Detalle por módulo
    let y = boxY + 22;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text('Detalle por Flujo y Módulo Verificado', 14, y);
    y += 7;

    informe.items.forEach((item, index) => {
      if (y > 265) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'bold');
      if (item.estado === 'ok') doc.setTextColor(16, 185, 129);
      else if (item.estado === 'reparado') doc.setTextColor(37, 99, 235);
      else if (item.estado === 'advertencia') doc.setTextColor(217, 119, 6);
      else doc.setTextColor(220, 38, 38);

      doc.text(`[${item.estado.toUpperCase()}] ${index + 1}. ${item.nombre}`, 14, y);
      y += 4.5;

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      const desc = doc.splitTextToSize(item.descripcion, 180);
      doc.text(desc, 18, y);
      y += desc.length * 4;

      if (item.autoReparado && item.accionReparada) {
        doc.setTextColor(30, 64, 175);
        doc.setFont('helvetica', 'italic');
        const rep = doc.splitTextToSize(`Auto-reparación ejecutada: ${item.accionReparada}`, 180);
        doc.text(rep, 18, y);
        y += rep.length * 4;
      }

      if (item.detalles) {
        doc.setTextColor(110, 110, 110);
        doc.setFont('helvetica', 'normal');
        const det = doc.splitTextToSize(`Detalles técnicos: ${item.detalles}`, 180);
        doc.text(det, 18, y);
        y += det.length * 4;
      }

      y += 3;
    });

    doc.save(`Diagnostico_Destellos_${informe.fecha.split('T')[0]}.pdf`);
  };

  const handleCrearPersona = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (!grupoSeleccionadoId) {
      setFeedback({ tipo: 'error', texto: 'Debés seleccionar un grupo antes de agregar una persona.' });
      return;
    }

    try {
      const authH = getAuthHeaders();
      const res = await fetch('/api/superadmin/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authH },
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
        const uRes = await fetch(`/api/superadmin/usuarios?grupoId=${grupoSeleccionadoId}`, { headers: authH });
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

  const handleAbrirEditarPersona = (u: any) => {
    setEditPersonaId(u.id);
    setEditPersonaNombre(u.nombre || '');
    setEditPersonaApodo(u.apodo || '');
    setEditPersonaEmail(u.email || '');
    setEditPersonaTelefono(u.whatsapp || u.telefono || '');
    setEditPersonaRol(u.rol || 'miembro');
    setEditPersonaFechaNacimiento(u.fecha_nacimiento || '');
    setEditPersonaPassword('');
    setMostrarModalEditarPersona(true);
  };

  const handleGuardarEditarPersona = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    try {
      const authH = getAuthHeaders();
      const res = await fetch('/api/superadmin/usuarios', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authH },
        body: JSON.stringify({
          id: editPersonaId,
          nombre: editPersonaNombre.trim(),
          apodo: editPersonaApodo.trim(),
          email: editPersonaEmail.trim(),
          telefono: editPersonaTelefono.trim(),
          whatsapp: editPersonaTelefono.trim(),
          rol: editPersonaRol,
          fecha_nacimiento: editPersonaFechaNacimiento.trim(),
          password: editPersonaPassword.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFeedback({ tipo: 'error', texto: data.error || 'Error al actualizar usuario.' });
      } else {
        setFeedback({ tipo: 'ok', texto: `¡Integrante "${editPersonaNombre}" actualizado con éxito!` });
        setMostrarModalEditarPersona(false);
        if (grupoSeleccionadoId) {
          const uRes = await fetch(`/api/superadmin/usuarios?grupoId=${grupoSeleccionadoId}`, { headers: authH });
          if (uRes.ok) {
            const uData = await uRes.json();
            setUsuariosGrupo(uData.usuarios || []);
          }
        }
        cargarDatos();
      }
    } catch {
      setFeedback({ tipo: 'error', texto: 'Error al actualizar usuario.' });
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
      const authH = getAuthHeaders();
      const res = await fetch(`/api/superadmin/usuarios?id=${p.id}`, {
        method: 'DELETE',
        headers: authH,
      });
      if (res.ok) {
        setUsuariosGrupo((prev) => prev.filter((u) => u.id !== p.id));
        setFeedback({ tipo: 'ok', texto: `Miembro "${p.nombre}" eliminado.` });
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
        <div className="flex border-b border-gray-200 dark:border-gray-800 gap-1.5 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setTabActivo('grupos')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 font-bold text-xs rounded-t-2xl border-b-2 transition cursor-pointer shrink-0 ${
              tabActivo === 'grupos'
                ? 'border-[#FF7043] text-[#FF7043] bg-orange-50/50 dark:bg-orange-950/20'
                : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Familias ({grupos.length})</span>
          </button>
          <button
            onClick={() => setTabActivo('licencias')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 font-bold text-xs rounded-t-2xl border-b-2 transition cursor-pointer shrink-0 ${
              tabActivo === 'licencias'
                ? 'border-[#FF7043] text-[#FF7043] bg-orange-50/50 dark:bg-orange-950/20'
                : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Licencias Familiares</span>
          </button>
          <button
            onClick={() => setTabActivo('pizarra')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 font-bold text-xs rounded-t-2xl border-b-2 transition cursor-pointer shrink-0 ${
              tabActivo === 'pizarra'
                ? 'border-[#FF7043] text-[#FF7043] bg-orange-50/50 dark:bg-orange-950/20'
                : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Tv className="w-4 h-4" />
            <span>Pizarra LED ({boardMensajes.length})</span>
          </button>
          <button
            onClick={() => setTabActivo('diagnostico')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 font-bold text-xs rounded-t-2xl border-b-2 transition cursor-pointer shrink-0 ${
              tabActivo === 'diagnostico'
                ? 'border-[#FF7043] text-[#FF7043] bg-orange-50/50 dark:bg-orange-950/20'
                : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>Diagnóstico & Mantenimiento</span>
          </button>
          <button
            onClick={() => setTabActivo('publicidad')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 font-bold text-xs rounded-t-2xl border-b-2 transition cursor-pointer shrink-0 ${
              tabActivo === 'publicidad'
                ? 'border-[#FF7043] text-[#FF7043] bg-orange-50/50 dark:bg-orange-950/20'
                : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>Publicidad ({publicidades.length})</span>
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
                          <div className="min-w-0 space-y-0.5">
                            <p className="text-xs font-black text-gray-900 dark:text-white truncate">
                              {g.nombre}
                            </p>
                            <div className="flex items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded-lg bg-orange-100 dark:bg-orange-950/60 text-[#FF7043] font-mono font-bold text-[10px] select-all">
                                🔑 {g.codigo_familia || g.codigo_invitacion || 'CHIA-1938'}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const cod = g.codigo_familia || g.codigo_invitacion || '';
                                  navigator.clipboard.writeText(cod);
                                  setFeedback({ tipo: 'ok', texto: `¡Código ${cod} copiado para enviar por WhatsApp!` });
                                }}
                                className="p-1 rounded-md hover:bg-orange-200 text-[#FF7043] cursor-pointer"
                                title="Copiar código de familia para WhatsApp"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                            <p className="text-[10px] text-gray-400">
                              Admin: <strong className="text-gray-600 dark:text-gray-300">{g.admin_nombre || 'Martín Chiacchio'}</strong>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAbrirEditarGrupo(g);
                            }}
                            title="Modificar familia"
                            className="p-1.5 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 hover:text-[#FF7043] transition cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleEstadoGrupo(g);
                            }}
                            title={g.estado === 'activo' ? 'Pausar grupo' : 'Activar grupo'}
                            className="p-1.5 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 transition cursor-pointer"
                          >
                            {g.estado === 'activo' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-emerald-500" />}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEliminarGrupo(g);
                            }}
                            title="Eliminar grupo"
                            className="p-1.5 rounded-xl hover:bg-rose-100 text-rose-500 transition cursor-pointer"
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

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleAbrirEditarPersona(u)}
                            className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-indigo-600 transition cursor-pointer"
                            title="Modificar integrante"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleEliminarPersona(u)}
                            className="p-1.5 rounded-xl hover:bg-rose-100 text-rose-500 transition cursor-pointer"
                            title="Eliminar usuario"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* =========================================================================
            PESTAÑA LICENCIAS FAMILIARES (Vencimientos, Renovación y Suspensión)
           ========================================================================= */}
        {tabActivo === 'licencias' && (
          <div className="bg-white dark:bg-[#1C1822] p-5 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#FF7043]" />
                  Gestión de Licencias Familiares
                </h2>
                <p className="text-xs text-gray-500">
                  Control de vigencia, vencimientos y bloqueos de acceso por familia
                </p>
              </div>
            </div>

            {/* Listado de Grupos y sus Licencias */}
            <div className="space-y-3">
              {grupos.map((g) => {
                const hoy = new Date().toISOString().split('T')[0];
                const estaVencida = Boolean(g.fecha_vencimiento && g.fecha_vencimiento < hoy);
                const diasRestantes = g.fecha_vencimiento
                  ? Math.ceil((new Date(g.fecha_vencimiento).getTime() - Date.now()) / (1000 * 3600 * 24))
                  : null;
                const porVencer = diasRestantes !== null && diasRestantes >= 0 && diasRestantes <= 7;
                const estaSuspendida = g.licencia_activa === false;

                return (
                  <div
                    key={g.id}
                    className="p-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#25202D] flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-lg">{g.emoji_or_logo || '✨'}</span>
                        <h3 className="text-sm font-black text-gray-900 dark:text-white">{g.nombre}</h3>
                        {estaSuspendida ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                            Suspendida
                          </span>
                        ) : estaVencida ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                            Vencida ({g.fecha_vencimiento})
                          </span>
                        ) : porVencer ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                            Vence en {diasRestantes} días ({g.fecha_vencimiento})
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            Activa hasta {g.fecha_vencimiento || 'Sin límite'}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        Admin: <strong className="text-gray-700 dark:text-gray-300">{g.admin_nombre || 'Martín Chiacchio'}</strong> ({g.admin_email || 'martinchiacchio.seg@gmail.com'}) · Código: <span className="font-mono font-bold text-[#FF7043]">{g.codigo_familia || 'CHIA-1938'}</span>
                      </p>
                    </div>

                    {/* Acciones de Renovación y Suspensión */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        onClick={() => handleRenovarLicencia(g, 30)}
                        className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-[#FF7043] text-gray-700 dark:text-gray-200 text-xs font-bold cursor-pointer transition shadow-2xs"
                      >
                        +30 días
                      </button>
                      <button
                        onClick={() => handleRenovarLicencia(g, 90)}
                        className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-[#FF7043] text-gray-700 dark:text-gray-200 text-xs font-bold cursor-pointer transition shadow-2xs"
                      >
                        +90 días
                      </button>
                      <button
                        onClick={() => handleRenovarLicencia(g, 365)}
                        className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-[#FF7043] text-gray-700 dark:text-gray-200 text-xs font-bold cursor-pointer transition shadow-2xs"
                      >
                        +1 año
                      </button>
                      <button
                        onClick={() => handleToggleLicencia(g)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                          estaSuspendida
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900'
                        }`}
                      >
                        {estaSuspendida ? 'Reactivar' : 'Suspender'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* =========================================================================
            PESTAÑA PIZARRA GENERAL (Cartel LED Vintage - Arlequín & Superadmin)
           ========================================================================= */}
        {tabActivo === 'pizarra' && (
          <div className="bg-white dark:bg-[#1C1822] p-5 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
                  <Tv className="w-5 h-5 text-[#FF7043]" />
                  Pizarra General — Cartel LED Vintage ({boardMensajes.length})
                </h2>
                <p className="text-xs text-gray-500">
                  Marquesina luminosa superior visible para todas las familias o grupos seleccionados
                </p>
              </div>
              <button
                onClick={handleAbrirNuevoBoardMensaje}
                className="py-2 px-3.5 rounded-2xl bg-[#FF7043] hover:bg-[#F4511E] text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-[#FF7043]/20 cursor-pointer transition"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Nuevo Mensaje LED</span>
              </button>
            </div>

            {boardMensajes.length === 0 ? (
              <div className="text-center py-10 space-y-2">
                <Tv className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto" />
                <p className="text-xs text-gray-400">
                  No hay mensajes configurados en el Cartel LED todavía.
                </p>
                <button
                  onClick={handleAbrirNuevoBoardMensaje}
                  className="px-3 py-1.5 rounded-xl bg-orange-100 dark:bg-orange-950/40 text-[#FF7043] font-bold text-xs cursor-pointer hover:bg-orange-200 transition"
                >
                  Crear el primer mensaje LED
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {boardMensajes.map((m) => {
                  const grupoNombre =
                    m.group_id === 'all'
                      ? 'Todas las familias (Público general)'
                      : grupos.find((g) => g.id === m.group_id)?.nombre || m.group_id;

                  const colorStyles: Record<string, { text: string; glow: string; bg: string; border: string }> = {
                    rojo: {
                      text: '#FF3333',
                      glow: '0 0 6px rgba(255,51,51,0.8)',
                      bg: 'bg-red-500/10 text-red-500 border-red-500/30',
                      border: 'border-red-900/40',
                    },
                    verde: {
                      text: '#00FF66',
                      glow: '0 0 6px rgba(0,255,102,0.8)',
                      bg: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
                      border: 'border-emerald-900/40',
                    },
                    ambar: {
                      text: '#FFB300',
                      glow: '0 0 6px rgba(255,179,0,0.8)',
                      bg: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
                      border: 'border-amber-900/40',
                    },
                    celeste: {
                      text: '#00E5FF',
                      glow: '0 0 6px rgba(0,229,255,0.8)',
                      bg: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/30',
                      border: 'border-cyan-900/40',
                    },
                    magenta: {
                      text: '#FF007F',
                      glow: '0 0 6px rgba(255,0,127,0.8)',
                      bg: 'bg-pink-500/10 text-pink-500 border-pink-500/30',
                      border: 'border-pink-900/40',
                    },
                  };

                  const currentStyle = colorStyles[m.color] || colorStyles.ambar;

                  return (
                    <div
                      key={m.id}
                      className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#18141F] space-y-3"
                    >
                      {/* Simulación Cartel LED Vintage */}
                      <div className="bg-[#050505] p-3 rounded-xl border border-gray-800 shadow-inner overflow-hidden relative">
                        <div
                          className="font-mono uppercase tracking-wider text-xs md:text-sm select-none break-words"
                          style={{
                            color: currentStyle.text,
                            textShadow: currentStyle.glow,
                          }}
                        >
                          {m.text}
                        </div>
                      </div>

                      {/* Metadatos y Acciones */}
                      <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase ${currentStyle.bg}`}
                          >
                            ● LED {m.color}
                          </span>

                          <span className="px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-[10px] font-semibold">
                            {m.author === 'arlequin' ? '🎭 Arlequín' : '👑 Superadmin'}
                          </span>

                          <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 text-[10px] font-semibold">
                            Tipo: {m.type}
                          </span>

                          <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 text-[10px] font-semibold">
                            Destino: {grupoNombre}
                          </span>

                          {m.priority === 'destacada' && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 text-[10px] font-black">
                              ⭐ Destacado
                            </span>
                          )}

                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              m.status === 'activo'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400'
                                : m.status === 'pausado'
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/50 dark:text-yellow-400'
                                : 'bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                            }`}
                          >
                            {m.status.toUpperCase()}
                          </span>
                        </div>

                        {/* Botones de acción */}
                        <div className="flex items-center gap-1.5 ml-auto">
                          <button
                            onClick={() => handleToggleEstadoBoardMensaje(m)}
                            className={`p-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition flex items-center gap-1 ${
                              m.status === 'activo'
                                ? 'border-yellow-200 text-yellow-700 hover:bg-yellow-50 dark:border-yellow-800 dark:text-yellow-400'
                                : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400'
                            }`}
                            title={m.status === 'activo' ? 'Pausar mensaje' : 'Activar mensaje'}
                          >
                            {m.status === 'activo' ? (
                              <>
                                <Pause className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Pausar</span>
                              </>
                            ) : (
                              <>
                                <Play className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Activar</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => handleAbrirEditarBoardMensaje(m)}
                            className="p-1.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition flex items-center gap-1"
                            title="Editar mensaje"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Editar</span>
                          </button>

                          <button
                            onClick={() => handleEliminarBoardMensaje(m.id)}
                            className="p-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 cursor-pointer transition flex items-center gap-1"
                            title="Eliminar mensaje"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Eliminar</span>
                          </button>
                        </div>
                      </div>

                      {/* Detalles de programación / expiración */}
                      {(m.scheduled_at || m.expires_at) && (
                        <div className="text-[10px] text-gray-400 flex items-center gap-3 pt-1 border-t border-gray-100 dark:border-gray-800">
                          {m.scheduled_at && (
                            <span>Programado: {new Date(m.scheduled_at).toLocaleString('es-AR')}</span>
                          )}
                          {m.expires_at && (
                            <span>Vence: {new Date(m.expires_at).toLocaleString('es-AR')}</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            PESTAÑA DIAGNÓSTICO Y MANTENIMIENTO (13 Flujos, Auto-reparación y PDF)
           ========================================================================= */}
        {tabActivo === 'diagnostico' && (
          <div className="space-y-4">
            {/* Tarjeta de Control del Diagnóstico */}
            <div className="bg-gradient-to-br from-indigo-700 via-purple-700 to-violet-800 p-5 rounded-3xl text-white shadow-lg space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl shadow-inner">
                  🛠️
                </div>
                <div>
                  <h2 className="text-base font-black">Centro de Diagnóstico y Mantenimiento</h2>
                  <p className="text-xs text-purple-100">
                    Inspección integral de los 13 módulos del sistema con auto-reparación y reporte en PDF
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap pt-1">
                <button
                  onClick={handleEjecutarDiagnostico}
                  disabled={ejecutandoDiagnostico}
                  className="px-4 py-2.5 rounded-2xl bg-white text-purple-900 font-extrabold text-xs shadow-md hover:bg-purple-50 active:scale-95 transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  <Wrench className={`w-4 h-4 ${ejecutandoDiagnostico ? 'animate-spin' : ''}`} />
                  <span>{ejecutandoDiagnostico ? 'Ejecutando Pruebas y Auto-reparación...' : 'Ejecutar Diagnóstico y Mantenimiento'}</span>
                </button>

                {informeDiagnostico && (
                  <button
                    onClick={() => handleDescargarDiagnosticoPDF(informeDiagnostico)}
                    className="px-4 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs shadow-md active:scale-95 transition cursor-pointer flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Descargar Informe PDF</span>
                  </button>
                )}
              </div>
            </div>

            {/* Resultado del Informe */}
            {informeDiagnostico && (
              <div className="space-y-4 animate-in fade-in duration-300">
                {/* Métricas del Diagnóstico */}
                <div className="bg-white dark:bg-[#1C1822] p-5 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
                    <div>
                      <h3 className="text-sm font-black text-gray-900 dark:text-white">
                        Resultado de la Verificación
                      </h3>
                      <p className="text-xs text-gray-500">
                        {new Date(informeDiagnostico.fecha).toLocaleString('es-AR')} · {informeDiagnostico.version_app}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDescargarDiagnosticoPDF(informeDiagnostico)}
                      className="text-xs text-[#FF7043] font-bold underline flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>PDF</span>
                    </button>
                  </div>

                  {/* Resumen Ejecutivo */}
                  <div className="p-3.5 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/40 text-xs font-semibold text-purple-900 dark:text-purple-200">
                    💡 {informeDiagnostico.resumen_ejecutivo}
                  </div>

                  {/* Indicadores numéricos */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-center">
                      <p className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400">Correctos</p>
                      <p className="text-xl font-black text-emerald-700 dark:text-emerald-300 mt-0.5">{informeDiagnostico.modulos_ok}</p>
                    </div>
                    <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 text-center">
                      <p className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400">Auto-Reparados</p>
                      <p className="text-xl font-black text-blue-700 dark:text-blue-300 mt-0.5">{informeDiagnostico.modulos_reparados}</p>
                    </div>
                    <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-center">
                      <p className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400">Advertencias</p>
                      <p className="text-xl font-black text-amber-700 dark:text-amber-300 mt-0.5">{informeDiagnostico.modulos_advertencia}</p>
                    </div>
                    <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-center">
                      <p className="text-[10px] font-black uppercase text-rose-600 dark:text-rose-400">Errores</p>
                      <p className="text-xl font-black text-rose-700 dark:text-rose-300 mt-0.5">{informeDiagnostico.modulos_error}</p>
                    </div>
                  </div>
                </div>

                {/* Lista de Módulos Verificados */}
                <div className="space-y-2.5">
                  {informeDiagnostico.items.map((item, idx) => {
                    const badgeStyles: Record<string, string> = {
                      ok: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
                      reparado: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300',
                      advertencia: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
                      error: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300',
                    };

                    return (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl bg-white dark:bg-[#1C1822] border border-gray-200 dark:border-gray-800 shadow-2xs space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-gray-400">#{idx + 1}</span>
                            <h4 className="text-xs font-black text-gray-900 dark:text-white">{item.nombre}</h4>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${badgeStyles[item.estado] || ''}`}>
                            {item.estado}
                          </span>
                        </div>

                        <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                          {item.descripcion}
                        </p>

                        {item.autoReparado && item.accionReparada && (
                          <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/40 text-[11px] text-blue-900 dark:text-blue-200 font-medium">
                            🔧 <strong>Auto-reparación:</strong> {item.accionReparada}
                          </div>
                        )}

                        {item.detalles && (
                          <p className="text-[11px] text-gray-400 dark:text-gray-500">
                            Detalles: {item.detalles}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
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
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Nombre de la Familia o Grupo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej: Chiachio o Los Pérez"
                  value={nombreGrupo}
                  onChange={(e) => {
                    setNombreGrupo(e.target.value);
                    if (!codigoFamiliaSugerido) {
                      const clean = e.target.value
                        .toUpperCase()
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '')
                        .replace(/[^A-Z]/g, '')
                        .slice(0, 4);
                      if (clean) setCodigoFamiliaSugerido(`${clean}-${Math.floor(1000 + Math.random() * 9000)}`);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs bg-gray-50 dark:bg-[#25202D] dark:text-white"
                />
              </div>

              {/* Selector de Administrador del Grupo */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Administrador del Grupo
                </label>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 p-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs cursor-pointer bg-gray-50 dark:bg-[#25202D]">
                    <input
                      type="radio"
                      name="tipoAdmin"
                      checked={tipoAdminGrupo === 'martin'}
                      onChange={() => setTipoAdminGrupo('martin')}
                    />
                    <span className="font-bold text-gray-800 dark:text-gray-200">
                      Yo mismo (Martín Chiacchio — Superadmin)
                    </span>
                  </label>
                  <label className="flex items-center gap-2 p-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs cursor-pointer bg-gray-50 dark:bg-[#25202D]">
                    <input
                      type="radio"
                      name="tipoAdmin"
                      checked={tipoAdminGrupo === 'otro'}
                      onChange={() => setTipoAdminGrupo('otro')}
                    />
                    <span className="font-bold text-gray-800 dark:text-gray-200">
                      Nombrar a otro familiar como Admin
                    </span>
                  </label>
                </div>

                {tipoAdminGrupo === 'otro' && (
                  <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Nombre del Admin</label>
                      <input
                        type="text"
                        required={tipoAdminGrupo === 'otro'}
                        placeholder="ej: Dolores Chiachio"
                        value={otroAdminNombre}
                        onChange={(e) => setOtroAdminNombre(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs bg-white dark:bg-[#1C1822] dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Email del Admin</label>
                      <input
                        type="email"
                        required={tipoAdminGrupo === 'otro'}
                        placeholder="dolores@email.com"
                        value={otroAdminEmail}
                        onChange={(e) => setOtroAdminEmail(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs bg-white dark:bg-[#1C1822] dark:text-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Código de Familia sugerido */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Código de Familia para entregar
                </label>
                <input
                  type="text"
                  placeholder="ej: CHIA-1938 (se genera automático)"
                  value={codigoFamiliaSugerido}
                  onChange={(e) => setCodigoFamiliaSugerido(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-mono font-bold tracking-wider text-[#FF7043] bg-orange-50/50 dark:bg-orange-950/20 uppercase"
                />
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Este código es el que compartirás por WhatsApp a los familiares para que ingresen.
                </p>
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

      {/* Modal Modificar Grupo / Familia */}
      {mostrarModalEditarGrupo && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1C1822] p-5 rounded-3xl max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
                <Pencil className="w-4 h-4 text-[#FF7043]" />
                Modificar Familia
              </h3>
              <button
                type="button"
                onClick={() => setMostrarModalEditarGrupo(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleGuardarEditarGrupo} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Nombre de la Familia o Grupo *
                </label>
                <input
                  type="text"
                  required
                  value={editNombreGrupo}
                  onChange={(e) => setEditNombreGrupo(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs bg-gray-50 dark:bg-[#25202D] dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Código de Familia para Ingreso *
                </label>
                <input
                  type="text"
                  required
                  value={editCodigoFamilia}
                  onChange={(e) => setEditCodigoFamilia(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-mono font-bold tracking-wider uppercase bg-gray-50 dark:bg-[#25202D] dark:text-white"
                />
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Este es el código que los integrantes ingresan para sumarse
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Emoji</label>
                  <input
                    type="text"
                    value={editEmojiGrupo}
                    onChange={(e) => setEditEmojiGrupo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs bg-gray-50 dark:bg-[#25202D] dark:text-white text-center"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Hora límite</label>
                  <input
                    type="time"
                    value={editHoraLimiteGrupo}
                    onChange={(e) => setEditHoraLimiteGrupo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs bg-gray-50 dark:bg-[#25202D] dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Admin Nombre</label>
                  <input
                    type="text"
                    value={editAdminNombre}
                    onChange={(e) => setEditAdminNombre(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs bg-gray-50 dark:bg-[#25202D] dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Admin Email</label>
                  <input
                    type="email"
                    value={editAdminEmail}
                    onChange={(e) => setEditAdminEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs bg-gray-50 dark:bg-[#25202D] dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Descripción</label>
                <input
                  type="text"
                  value={editDescGrupo}
                  onChange={(e) => setEditDescGrupo(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs bg-gray-50 dark:bg-[#25202D] dark:text-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMostrarModalEditarGrupo(false)}
                  className="flex-1 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs font-bold text-gray-700 dark:text-gray-300 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-[#FF7043] hover:bg-[#F4511E] text-white text-xs font-bold cursor-pointer transition"
                >
                  Guardar Cambios
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

      {/* Modal Modificar Persona / Integrante */}
      {mostrarModalEditarPersona && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1C1822] p-5 rounded-3xl max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
                <Pencil className="w-4 h-4 text-indigo-500" />
                Modificar Integrante
              </h3>
              <button
                type="button"
                onClick={() => setMostrarModalEditarPersona(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleGuardarEditarPersona} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Nombre completo *</label>
                <input
                  type="text"
                  required
                  value={editPersonaNombre}
                  onChange={(e) => setEditPersonaNombre(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs bg-gray-50 dark:bg-[#25202D] dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Apodo</label>
                  <input
                    type="text"
                    value={editPersonaApodo}
                    onChange={(e) => setEditPersonaApodo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs bg-gray-50 dark:bg-[#25202D] dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Rol</label>
                  <select
                    value={editPersonaRol}
                    onChange={(e: any) => setEditPersonaRol(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs bg-gray-50 dark:bg-[#25202D] dark:text-white"
                  >
                    <option value="miembro">Miembro</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={editPersonaEmail}
                  onChange={(e) => setEditPersonaEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs bg-gray-50 dark:bg-[#25202D] dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">WhatsApp / Teléfono</label>
                  <input
                    type="tel"
                    value={editPersonaTelefono}
                    onChange={(e) => setEditPersonaTelefono(e.target.value)}
                    placeholder="ej: +54911..."
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs bg-gray-50 dark:bg-[#25202D] dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Nacimiento</label>
                  <input
                    type="date"
                    value={editPersonaFechaNacimiento}
                    onChange={(e) => setEditPersonaFechaNacimiento(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs bg-gray-50 dark:bg-[#25202D] dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Nueva Contraseña (opcional)
                </label>
                <input
                  type="password"
                  value={editPersonaPassword}
                  onChange={(e) => setEditPersonaPassword(e.target.value)}
                  placeholder="Dejar vacío para conservar la actual"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs bg-gray-50 dark:bg-[#25202D] dark:text-white"
                />
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Ingresá una clave si deseás cambiar o restablecer el acceso del integrante
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMostrarModalEditarPersona(false)}
                  className="flex-1 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs font-bold text-gray-700 dark:text-gray-300 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer transition"
                >
                  Guardar Cambios
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

      {/* Modal Crear / Editar Mensaje Pizarra LED */}
      {mostrarModalBoard && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#1C1822] p-5 rounded-3xl max-w-lg w-full shadow-2xl space-y-4 my-8 border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
                <Tv className="w-5 h-5 text-[#FF7043]" />
                {boardEditandoId ? 'Editar Mensaje LED' : 'Nuevo Mensaje para el Cartel LED'}
              </h3>
              <button
                type="button"
                onClick={() => setMostrarModalBoard(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGuardarBoardMensaje} className="space-y-3.5">
              {/* Mensaje de texto (máx. 120 caracteres) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    Texto del Mensaje LED *
                  </label>
                  <span
                    className={`text-[10px] font-bold ${
                      boardTexto.length > 110
                        ? 'text-rose-500'
                        : boardTexto.length > 90
                        ? 'text-amber-500'
                        : 'text-gray-400'
                    }`}
                  >
                    {120 - boardTexto.length} car. restantes ({boardTexto.length}/120)
                  </span>
                </div>
                <textarea
                  required
                  maxLength={120}
                  rows={2}
                  placeholder="Escribí un mensaje lúdico, aviso familiar o felicitación (máx. 120 car.)..."
                  value={boardTexto}
                  onChange={(e) => setBoardTexto(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs bg-gray-50 dark:bg-[#25202D] dark:text-white resize-none"
                />
              </div>

              {/* Selector de Color LED */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  Color del Diodo LED
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {(
                    [
                      { id: 'rojo', label: 'Rojo', hex: '#FF3333', bg: 'bg-red-500' },
                      { id: 'verde', label: 'Verde', hex: '#00FF66', bg: 'bg-emerald-500' },
                      { id: 'ambar', label: 'Ámbar', hex: '#FFB300', bg: 'bg-amber-500' },
                      { id: 'celeste', label: 'Celeste', hex: '#00E5FF', bg: 'bg-cyan-500' },
                      { id: 'magenta', label: 'Magenta', hex: '#FF007F', bg: 'bg-pink-500' },
                    ] as const
                  ).map((col) => {
                    const esActivo = boardColor === col.id;
                    return (
                      <button
                        key={col.id}
                        type="button"
                        onClick={() => setBoardColor(col.id)}
                        className={`p-2 rounded-xl border text-center transition flex flex-col items-center gap-1 cursor-pointer ${
                          esActivo
                            ? 'border-gray-900 dark:border-white ring-2 ring-[#FF7043] bg-orange-50/40 dark:bg-orange-950/20'
                            : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                      >
                        <span
                          className={`w-4 h-4 rounded-full ${col.bg} shadow-sm inline-block`}
                          style={{
                            boxShadow: esActivo ? `0 0 8px ${col.hex}` : undefined,
                          }}
                        />
                        <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300">
                          {col.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Vista previa LED en tiempo real */}
              <div>
                <label className="block text-[11px] font-bold text-gray-500 mb-1">
                  Vista Previa en Cartel LED
                </label>
                <div className="bg-[#050505] p-3 rounded-xl border border-gray-800 overflow-hidden text-center">
                  <span
                    className="font-mono text-xs md:text-sm uppercase tracking-wider select-none inline-block break-words"
                    style={{
                      color:
                        boardColor === 'rojo'
                          ? '#FF3333'
                          : boardColor === 'verde'
                          ? '#00FF66'
                          : boardColor === 'celeste'
                          ? '#00E5FF'
                          : boardColor === 'magenta'
                          ? '#FF007F'
                          : '#FFB300',
                      textShadow:
                        boardColor === 'rojo'
                          ? '0 0 6px rgba(255,51,51,0.85)'
                          : boardColor === 'verde'
                          ? '0 0 6px rgba(0,255,102,0.85)'
                          : boardColor === 'celeste'
                          ? '0 0 6px rgba(0,229,255,0.85)'
                          : boardColor === 'magenta'
                          ? '0 0 6px rgba(255,0,127,0.85)'
                          : '0 0 6px rgba(255,179,0,0.85)',
                    }}
                  >
                    {boardTexto.trim() || 'VISTA PREVIA DEL CARTEL LED'}
                  </span>
                </div>
              </div>

              {/* Destino y Prioridad */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Destino (Audiencia)
                  </label>
                  <select
                    value={boardGrupoId}
                    onChange={(e) => setBoardGrupoId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs bg-gray-50 dark:bg-[#25202D] dark:text-white"
                  >
                    <option value="all">🌐 Todas las Familias (Global)</option>
                    {grupos.map((g) => (
                      <option key={g.id} value={g.id}>
                        👨‍👩‍👧‍👦 {g.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Prioridad de Emisión
                  </label>
                  <select
                    value={boardPrioridad}
                    onChange={(e) => setBoardPrioridad(e.target.value as PrioridadMensajePizarra)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs bg-gray-50 dark:bg-[#25202D] dark:text-white"
                  >
                    <option value="normal">Normal (Rotación estándar)</option>
                    <option value="destacada">⭐ Destacada (Mayor visibilidad)</option>
                  </select>
                </div>
              </div>

              {/* Programación y Vencimiento */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Programar inicio (Opcional)
                  </label>
                  <input
                    type="datetime-local"
                    value={boardProgramado}
                    onChange={(e) => setBoardProgramado(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs bg-gray-50 dark:bg-[#25202D] dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Vencimiento automático (Opcional)
                  </label>
                  <input
                    type="datetime-local"
                    value={boardVencimiento}
                    onChange={(e) => setBoardVencimiento(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs bg-gray-50 dark:bg-[#25202D] dark:text-white"
                  />
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMostrarModalBoard(false)}
                  className="flex-1 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs font-bold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-200 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-[#FF7043] text-white text-xs font-bold cursor-pointer hover:bg-[#F4511E] transition flex items-center justify-center gap-1.5"
                >
                  <Tv className="w-4 h-4" />
                  <span>{boardEditandoId ? 'Guardar Cambios' : 'Transmitir al Cartel LED'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
