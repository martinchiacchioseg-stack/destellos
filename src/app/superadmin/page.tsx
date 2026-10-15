'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Navbar from '@/components/Navbar';
import { Crown, Users, Layers, Shield, PlusCircle, Trash2, Check, AlertCircle } from 'lucide-react';
import { SesionUsuario } from '@/lib/types';

export default function SuperadminPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<SesionUsuario | null>(null);
  const [metricas, setMetricas] = useState<any>(null);
  const [grupos, setGrupos] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);

  // Modal nuevo grupo
  const [mostrarModalGrupo, setMostrarModalGrupo] = useState(false);
  const [nombreGrupo, setNombreGrupo] = useState('');
  const [descGrupo, setDescGrupo] = useState('');

  // Modal nuevo admin
  const [mostrarModalAdmin, setMostrarModalAdmin] = useState(false);
  const [adminNombre, setAdminNombre] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminGrupoId, setAdminGrupoId] = useState('');
  const [adminPassTemp, setAdminPassTemp] = useState('admin2026');

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

      const [metRes, grupRes, admRes] = await Promise.all([
        fetch('/api/superadmin/metricas'),
        fetch('/api/superadmin/grupos'),
        fetch('/api/superadmin/admins'),
      ]);

      if (metRes.ok) setMetricas(await metRes.json());
      if (grupRes.ok) {
        const gData = await grupRes.json();
        setGrupos(gData.grupos || []);
        if (gData.grupos?.length > 0 && !adminGrupoId) {
          setAdminGrupoId(gData.grupos[0].id);
        }
      }
      if (admRes.ok) {
        const aData = await admRes.json();
        setAdmins(aData.admins || []);
      }
    } catch {
      console.error('Error cargando superadmin');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarTodo();
  }, [router]);

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

  const handleEliminarAdmin = async (id: string) => {
    if (!confirm('¿Seguro que deseás dar de baja este Administrador?')) return;
    try {
      const res = await fetch(`/api/superadmin/admins?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        cargarTodo();
      } else {
        alert(data.error);
      }
    } catch {
      alert('Error al eliminar');
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

      <main className="p-4 space-y-4">
        {/* Banner */}
        <div className="bg-gradient-to-r from-purple-700 via-indigo-600 to-[#FF7043] p-5 rounded-3xl text-white shadow-card">
          <div className="flex items-center gap-2 mb-1">
            <Crown className="w-5 h-5 text-amber-300" />
            <h2 className="text-lg font-extrabold tracking-tight">Panel de Superadmin</h2>
          </div>
          <p className="text-xs text-purple-100">
            Control maestro de Destellos: creá y gestioná grupos, asigná administradores y supervisá las métricas del sistema.
          </p>
        </div>

        {feedback && (
          <div
            className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
              feedback.tipo === 'ok'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                : 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-300'
            }`}
          >
            {feedback.tipo === 'ok' ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{feedback.texto}</span>
          </div>
        )}

        {/* Métricas Globales */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-white dark:bg-[#201D24] p-3.5 rounded-2xl border border-[var(--border-soft)] shadow-sm">
            <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-1">
              <Layers className="w-4 h-4" />
              <span className="text-xs font-bold">Grupos Activos</span>
            </div>
            <p className="text-2xl font-black text-gray-800 dark:text-gray-100">
              {metricas?.totalGrupos || 0}
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

        {/* Sección: Grupos */}
        <div className="bg-white dark:bg-[#201D24] p-4 rounded-3xl border border-[var(--border-soft)] shadow-soft space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-gray-800 dark:text-gray-100 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-purple-600" />
              Grupos ({grupos.length})
            </h3>
            <button
              onClick={() => setMostrarModalGrupo(true)}
              className="text-xs font-bold text-[#FF7043] flex items-center gap-1 hover:underline"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Nuevo Grupo
            </button>
          </div>

          {mostrarModalGrupo && (
            <form onSubmit={handleCrearGrupo} className="p-3 bg-gray-50 dark:bg-[#2A2630] rounded-2xl space-y-2 text-xs">
              <input
                type="text"
                required
                placeholder="Nombre del grupo (ej: Familia García)"
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

          <div className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
            {grupos.map((g) => (
              <div key={g.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-800 dark:text-gray-200">{g.nombre}</p>
                  <p className="text-[10px] text-gray-400 font-mono">Código: {g.codigo_invitacion}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] px-2 py-0.5 bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 rounded-full font-bold">
                    {g.total_miembros || 0} miembros
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sección: Administradores */}
        <div className="bg-white dark:bg-[#201D24] p-4 rounded-3xl border border-[var(--border-soft)] shadow-soft space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-gray-800 dark:text-gray-100 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-blue-600" />
              Administradores de Grupo ({admins.length})
            </h3>
            <button
              onClick={() => setMostrarModalAdmin(true)}
              className="text-xs font-bold text-[#FF7043] flex items-center gap-1 hover:underline"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Crear Admin
            </button>
          </div>

          {mostrarModalAdmin && (
            <form onSubmit={handleCrearAdmin} className="p-3 bg-gray-50 dark:bg-[#2A2630] rounded-2xl space-y-2 text-xs">
              <input
                type="text"
                required
                placeholder="Nombre del Administrador"
                value={adminNombre}
                onChange={(e) => setAdminNombre(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#201D24] dark:text-white"
              />
              <input
                type="email"
                required
                placeholder="Email del Administrador"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#201D24] dark:text-white"
              />
              <select
                value={adminGrupoId}
                onChange={(e) => setAdminGrupoId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#201D24] dark:text-white"
              >
                {grupos.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nombre}
                  </option>
                ))}
              </select>
              <input
                type="text"
                required
                minLength={6}
                placeholder="Contraseña temporal"
                value={adminPassTemp}
                onChange={(e) => setAdminPassTemp(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#201D24] dark:text-white font-mono"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMostrarModalAdmin(false)}
                  className="flex-1 py-1.5 rounded-xl bg-gray-200 dark:bg-gray-700 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-1.5 rounded-xl bg-blue-600 text-white font-bold"
                >
                  Crear Admin
                </button>
              </div>
            </form>
          )}

          <div className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
            {admins.map((a) => (
              <div key={a.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-800 dark:text-gray-200">{a.nombre}</p>
                  <p className="text-[10px] text-gray-400">{a.email}</p>
                </div>
                <button
                  onClick={() => handleEliminarAdmin(a.id)}
                  title="Dar de baja administrador"
                  className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Navbar />
    </div>
  );
}
