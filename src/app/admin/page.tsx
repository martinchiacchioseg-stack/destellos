"use client";

import { useCallback, useEffect, useState } from "react";
import { llamar } from "@/lib/cliente";
import { Navegacion } from "@/components/Navegacion";
import {
  Users,
  UserPlus,
  KeyRound,
  MessageCircle,
  Share2,
  Copy,
  Check,
  Trash2,
  Edit3,
  Shield,
  Sparkles,
  Bell,
  Phone,
  Mail,
  Calendar,
  ExternalLink,
  X,
} from "lucide-react";

interface Integrante {
  id: string;
  nombre: string;
  apodo: string | null;
  foto_url: string | null;
  rol: string;
  whatsapp: string | null;
  email: string | null;
  nacimiento: string | null;
  bloqueado?: boolean;
}

interface AdminData {
  grupo: {
    nombre: string;
    emoji: string;
    codigo: string;
    hora_limite: string;
    vence_en: string;
  };
  esAdmin: boolean;
  yoId: string;
  integrantes: Integrante[];
  notificaciones: { id: string; texto: string; leida: boolean; creado_en: string }[];
}

export default function PanelFamilia() {
  const [d, setD] = useState<AdminData | null>(null);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const [copiadoLink, setCopiadoLink] = useState(false);
  const [copiadoInvitacion, setCopiadoInvitacion] = useState<string | null>(null);
  const [agregando, setAgregando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const cargar = useCallback(() => {
    llamar<AdminData>("/api/admin")
      .then(setD)
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const origin = typeof window !== "undefined" ? window.location.origin : "https://destellos.vercel.app";
  const linkInvitacion = d ? `${origin}/login?codigo=${d.grupo.codigo}` : "";

  const copiarEnlace = () => {
    if (!linkInvitacion) return;
    navigator.clipboard.writeText(linkInvitacion);
    setCopiadoLink(true);
    setTimeout(() => setCopiadoLink(false), 2500);
  };

  const compartirWhatsAppFamilia = () => {
    if (!d) return;
    const texto = `¡Hola a todos! 👋 Les comparto el link para entrar a nuestro espacio de la familia ${d.grupo.nombre} en Destellos 📸🎭:\n\n👉 ${linkInvitacion}\n\nCódigo de familia: *${d.grupo.codigo}*\n¡Entren para compartir la foto del día y ver los destellos de hoy! ✨`;
    const url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
    window.open(url, "_blank");
  };

  const enviarInvitacionPersonalizada = (u: Integrante) => {
    if (!d) return;
    const nombre = u.apodo || u.nombre;
    const texto = `¡Hola ${nombre}! 👋 Te invito a unirte a nuestro espacio familiar ${d.grupo.nombre} en Destellos 📸🎭.\n\nPara ingresar:\n1. Entrá a este enlace: ${linkInvitacion}\n2. Tu usuario: *${u.nombre}*\n3. Clave inicial: *123456* (al entrar por primera vez creás tu propia clave privada)\n\n¡Te esperamos para compartir la foto del día! ✨`;

    navigator.clipboard.writeText(texto);
    setCopiadoInvitacion(u.id);
    setTimeout(() => setCopiadoInvitacion(null), 3000);

    if (u.whatsapp) {
      const cleanWsp = u.whatsapp.replace(/\D/g, "");
      const url = `https://wa.me/${cleanWsp}?text=${encodeURIComponent(texto)}`;
      window.open(url, "_blank");
    }
  };

  const mandarMensajeWhatsApp = (u: Integrante) => {
    if (!u.whatsapp || !d) return;
    const cleanWsp = u.whatsapp.replace(/\D/g, "");
    const texto = `¡Hola ${u.apodo || u.nombre}! Te escribo desde nuestro espacio familiar ${d.grupo.nombre} en Destellos 📸`;
    const url = `https://wa.me/${cleanWsp}?text=${encodeURIComponent(texto)}`;
    window.open(url, "_blank");
  };

  async function leerNotificaciones() {
    await llamar("/api/admin", { body: { accion: "leer_todas" } });
    cargar();
  }

  const [invitacionReciente, setInvitacionReciente] = useState<{ nombre: string; clave: string; wspUrl: string } | null>(null);

  async function agregarIntegrante(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const g = (n: string) => (form.elements.namedItem(n) as HTMLInputElement).value;
    setError("");
    setExito("");
    setInvitacionReciente(null);

    const ws = g("whatsapp").trim();
    if (!ws || ws.replace(/\D/g, "").length < 8) {
      setError("El número de WhatsApp es obligatorio para enviarle su clave.");
      return;
    }

    try {
      const res = await llamar<{
        ok: boolean;
        usuario: Integrante;
        clave_temporal: string;
        wsp_url: string;
        texto_invitacion: string;
      }>("/api/admin", {
        body: {
          accion: "agregar_integrante",
          nombre: g("nombre"),
          apellido: g("apellido") || null,
          apodo: g("apodo") || null,
          email: g("email") || null,
          whatsapp: ws,
          rol: g("rol") || "miembro",
        },
      });

      setInvitacionReciente({
        nombre: g("nombre"),
        clave: res.clave_temporal,
        wspUrl: res.wsp_url,
      });

      setExito(`✔ Participante "${g("nombre")}" agregado con clave temporal: ${res.clave_temporal}`);
      form.reset();
      setAgregando(false);
      cargar();
    } catch (er) {
      setError(er instanceof Error ? er.message : "Error al agregar participante");
    }
  }

  async function modificarIntegrante(e: React.FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault();
    const form = e.currentTarget;
    const g = (n: string) => (form.elements.namedItem(n) as HTMLInputElement).value;
    setError("");
    setExito("");
    try {
      await llamar("/api/admin", {
        body: {
          accion: "modificar_integrante",
          id,
          nombre: g("nombre"),
          apodo: g("apodo") || null,
          email: g("email") || null,
          whatsapp: g("whatsapp") || null,
          nacimiento: g("nacimiento") || null,
          rol: g("rol"),
        },
      });
      setExito(`✔ Datos de ${g("nombre")} actualizados.`);
      setEditandoId(null);
      cargar();
    } catch (er) {
      setError(er instanceof Error ? er.message : "Error al modificar integrante");
    }
  }

  async function resetearClave(u: Integrante) {
    if (!confirm(`¿Restablecer la clave de ${u.nombre} a "123456"? Al ingresar se le pedirá cambiarla por seguridad.`)) return;
    setError("");
    setExito("");
    try {
      await llamar("/api/admin", {
        body: {
          accion: "resetear_clave",
          id: u.id,
          password: "123456",
        },
      });
      setExito(`✔ Clave de ${u.nombre} restablecida a "123456". Ya podés enviarle la invitación para que ingrese.`);
      cargar();
    } catch (er) {
      setError(er instanceof Error ? er.message : "Error al resetear la clave");
    }
  }

  async function darDeBaja(u: Integrante) {
    if (!confirm(`¿Dar de baja a ${u.nombre}? Se eliminará su perfil y sus fotos de la familia.`)) return;
    setError("");
    setExito("");
    try {
      await llamar("/api/admin", {
        body: {
          accion: "dar_de_baja",
          id: u.id,
        },
      });
      setExito(`✔ Se dio de baja a ${u.nombre}.`);
      cargar();
    } catch (er) {
      setError(er instanceof Error ? er.message : "Error al dar de baja");
    }
  }

  const sinLeer = d?.notificaciones.filter((n) => !n.leida).length ?? 0;

  return (
    <>
      <Navegacion />
      <main className="mx-auto max-w-2xl space-y-4 px-4 py-6">
        {error && <p className="rounded-xl bg-red-500/10 p-3 text-sm text-red-300 font-semibold">{error}</p>}
        {exito && <p className="rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-300 font-semibold">{exito}</p>}

        {d && (
          <>
            {/* CABECERA DE LA FAMILIA */}
            <section className="tarjeta space-y-2 p-5 border-cyan-500/30 bg-gradient-to-br from-slate-900/90 to-slate-950/90">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h1 className="text-2xl font-black text-white flex items-center gap-2">
                  <span>{d.grupo.emoji || "✨"}</span> Familia {d.grupo.nombre}
                </h1>
                <span className="rounded-full bg-cyan-500/20 px-3 py-0.5 text-xs font-bold text-cyan-300 border border-cyan-400/30">
                  Código: {d.grupo.codigo}
                </span>
              </div>
              <p className="text-xs text-suave">
                Cierre diario de fotos: <strong className="text-slate-200">{d.grupo.hora_limite} hs</strong> · Licencia activa hasta: <strong className="text-slate-200">{d.grupo.vence_en}</strong>
              </p>
            </section>

            {/* TARJETA DE INVITACIÓN DIRECTA */}
            <section className="tarjeta space-y-3 p-5 border-fuchsia-500/30 bg-fuchsia-950/20">
              <div className="flex items-center gap-2">
                <Share2 size={20} className="text-fuchsia-400" />
                <h2 className="text-base font-extrabold text-white">Link de invitación a la familia</h2>
              </div>
              <p className="text-xs text-slate-300">
                Compartí este enlace con tus familiares para que entren directo con el código cargado:
              </p>
              <div className="flex items-center gap-2 rounded-xl bg-black/40 p-2 border border-white/10">
                <input
                  type="text"
                  readOnly
                  value={linkInvitacion}
                  className="w-full bg-transparent text-xs font-mono text-cyan-300 select-all outline-none"
                />
                <button
                  type="button"
                  onClick={copiarEnlace}
                  className="btn btn-primario px-3 py-1 text-xs font-bold whitespace-nowrap flex items-center gap-1"
                >
                  {copiadoLink ? <><Check size={14} /> ¡Copiado!</> : <><Copy size={14} /> Copiar</>}
                </button>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={compartirWhatsAppFamilia}
                  className="btn bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-950"
                >
                  <MessageCircle size={15} /> Compartir por WhatsApp
                </button>
              </div>
            </section>

            {/* SECCIÓN INTEGRANTES */}
            <section className="tarjeta space-y-4 p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Users size={18} className="text-cyan-400" /> Integrantes ({d.integrantes.length})
                </h2>
                {d.esAdmin && (
                  <button
                    type="button"
                    onClick={() => setAgregando((v) => !v)}
                    className="btn btn-primario px-3 py-1.5 text-xs font-bold flex items-center gap-1"
                  >
                    {agregando ? <><X size={14} /> Cancelar</> : <><UserPlus size={14} /> + Cargar integrante</>}
                  </button>
                )}
              </div>

              {/* AVISO DE CLAVE TEMPORAL GENERADA Y BOTÓN DIRECTO DE WHATSAPP */}
              {invitacionReciente && (
                <div className="rounded-2xl border-2 border-emerald-500/50 bg-emerald-950/40 p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-emerald-300">
                      🎉 ¡Participante agregado con éxito! Clave temporal: <strong className="text-white bg-black/60 px-2 py-0.5 rounded font-mono text-sm">{invitacionReciente.clave}</strong>
                    </p>
                    <button
                      type="button"
                      onClick={() => setInvitacionReciente(null)}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      Cerrar ×
                    </button>
                  </div>
                  <p className="text-xs text-slate-300">
                    Enviále su clave de primer acceso por WhatsApp ahora mismo con 1 solo toque:
                  </p>
                  <a
                    href={invitacionReciente.wspUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs py-2.5 px-4 flex items-center justify-center gap-2 shadow-lg w-full sm:w-auto"
                  >
                    <MessageCircle size={16} />
                    <span>📲 ENVIAR CLAVE Y ACCESO POR WHATSAPP</span>
                  </a>
                </div>
              )}

              {/* FORMULARIO AGREGAR INTEGRANTE */}
              {agregando && d.esAdmin && (
                <form onSubmit={agregarIntegrante} className="rounded-xl border border-orange-500/30 bg-slate-900/90 p-4 space-y-3">
                  <p className="font-bold text-sm text-orange-200">Nuevo participante de la Tribu</p>
                  <div className="grid gap-2 sm:grid-cols-2 text-sm">
                    <input name="nombre" className="input" placeholder="Nombre (ej: Martín)" required />
                    <input name="apellido" className="input" placeholder="Apellido (ej: Chiacchio)" />
                    <input name="whatsapp" className="input sm:col-span-2 border-orange-400/50" placeholder="WhatsApp OBLIGATORIO (ej: 5491123456789)" required />
                    <input name="email" type="email" className="input" placeholder="Email (opcional)" />
                    <input name="apodo" className="input" placeholder="Apodo o sobrenombre (opcional)" />
                    <select name="rol" className="input sm:col-span-2" defaultValue="miembro">
                      <option value="miembro">Participante / Miembro de la Tribu</option>
                      <option value="admin">Administrador de la Tribu</option>
                    </select>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    * El sistema generará automáticamente una clave de acceso temporal única para el primer ingreso.
                  </p>
                  <div className="flex gap-2">
                    <button className="btn btn-primario text-xs font-bold">Guardar y generar clave de WhatsApp</button>
                    <button type="button" className="btn text-xs" onClick={() => setAgregando(false)}>Cancelar</button>
                  </div>
                </form>
              )}

              {/* LISTA DE INTEGRANTES */}
              <div className="space-y-3 divide-y divide-white/10">
                {d.integrantes.map((u) => {
                  const esYo = u.id === d.yoId;
                  const esEditando = editandoId === u.id;

                  return (
                    <div key={u.id} className="pt-3 first:pt-0 space-y-2">
                      <div className="flex items-start gap-3">
                        {u.foto_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={u.foto_url} alt="" className="h-12 w-12 rounded-full object-cover border border-white/20 shadow-md" />
                        ) : (
                          <span className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-cyan-400/30 to-fuchsia-500/30 font-black text-white text-base shadow-md border border-white/10">
                            {u.nombre[0].toUpperCase()}
                          </span>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-extrabold text-white text-base truncate">{u.nombre}</span>
                            {u.apodo && <span className="text-xs text-suave">({u.apodo})</span>}
                            {u.rol === "admin" && (
                              <span className="rounded bg-cyan-400/20 px-2 py-0.5 text-[11px] font-bold text-cyan-200 border border-cyan-400/30">
                                admin
                              </span>
                            )}
                            {esYo && (
                              <span className="rounded bg-fuchsia-400/20 px-2 py-0.5 text-[11px] font-bold text-fuchsia-200 border border-fuchsia-400/30">
                                Vos
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-suave space-y-0.5 mt-0.5">
                            {u.whatsapp && (
                              <p className="flex items-center gap-1 text-slate-300">
                                <Phone size={12} className="text-emerald-400" /> +{u.whatsapp}
                              </p>
                            )}
                            {u.email && (
                              <p className="flex items-center gap-1 text-slate-400">
                                <Mail size={12} /> {u.email}
                              </p>
                            )}
                            {u.nacimiento && (
                              <p className="flex items-center gap-1 text-slate-400">
                                <Calendar size={12} /> Cumpleaños: {u.nacimiento}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* FORMULARIO DE EDICIÓN DEL INTEGRANTE */}
                      {esEditando ? (
                        <form onSubmit={(e) => modificarIntegrante(e, u.id)} className="rounded-xl bg-white/5 p-3 space-y-2 text-sm mt-2">
                          <p className="text-xs font-bold text-cyan-300">Modificar datos de {u.nombre}:</p>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <input name="nombre" className="input" defaultValue={u.nombre} required placeholder="Nombre" />
                            <input name="apodo" className="input" defaultValue={u.apodo ?? ""} placeholder="Apodo" />
                            <input name="email" type="email" className="input" defaultValue={u.email ?? ""} placeholder="Email" />
                            <input name="whatsapp" className="input" defaultValue={u.whatsapp ?? ""} placeholder="WhatsApp (ej: 54911...)" />
                            <input name="nacimiento" type="date" className="input" defaultValue={u.nacimiento ?? ""} />
                            <select name="rol" className="input" defaultValue={u.rol}>
                              <option value="miembro">miembro</option>
                              <option value="admin">admin</option>
                            </select>
                          </div>
                          <div className="flex gap-2 pt-1">
                            <button className="btn btn-primario text-xs font-bold">Guardar cambios</button>
                            <button type="button" className="btn text-xs" onClick={() => setEditandoId(null)}>Cancelar</button>
                          </div>
                        </form>
                      ) : (
                        /* BOTONES DE ACCIÓN PARA EL INTEGRANTE */
                        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
                          {/* MANDAR MENSAJE */}
                          {u.whatsapp ? (
                            <button
                              type="button"
                              onClick={() => mandarMensajeWhatsApp(u)}
                              className="btn bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 font-semibold flex items-center gap-1"
                            >
                              <MessageCircle size={13} /> Mandar mensaje
                            </button>
                          ) : u.email ? (
                            <a
                              href={`mailto:${u.email}`}
                              className="btn bg-white/10 hover:bg-white/20 text-slate-200 px-2.5 py-1 font-semibold flex items-center gap-1"
                            >
                              <Mail size={13} /> Mandar mail
                            </a>
                          ) : null}

                          {/* ENVIAR INVITACIÓN CON CLAVE */}
                          <button
                            type="button"
                            onClick={() => enviarInvitacionPersonalizada(u)}
                            className="btn bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-200 border border-cyan-500/30 px-2.5 py-1 font-semibold flex items-center gap-1"
                            title="Enviar o copiar invitación con link y clave inicial"
                          >
                            <Share2 size={13} />
                            {copiadoInvitacion === u.id ? "¡Invitación copiada! ✔" : "Enviar invitación"}
                          </button>

                          {/* ACCIONES DE ADMINISTRADOR */}
                          {d.esAdmin && (
                            <>
                              <button
                                type="button"
                                onClick={() => setEditandoId(u.id)}
                                className="btn px-2.5 py-1 font-semibold text-slate-300 hover:text-white flex items-center gap-1"
                              >
                                <Edit3 size={13} /> Modificar
                              </button>

                              <button
                                type="button"
                                onClick={() => resetearClave(u)}
                                className="btn px-2.5 py-1 font-semibold text-amber-300 hover:text-amber-200 flex items-center gap-1"
                                title="Restablecer clave a 123456"
                              >
                                <KeyRound size={13} /> Resetear clave
                              </button>

                              {!esYo && (
                                <button
                                  type="button"
                                  onClick={() => darDeBaja(u)}
                                  className="btn btn-peligro ml-auto px-2 py-1 text-[11px] font-semibold flex items-center gap-1"
                                  title="Dar de baja de la familia"
                                >
                                  <Trash2 size={12} /> Dar de baja
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* SECCIÓN AVISOS */}
            <section className="tarjeta space-y-2 p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-bold flex items-center gap-2">
                  <Bell size={18} className="text-amber-400" /> Avisos{" "}
                  {sinLeer > 0 && <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">{sinLeer}</span>}
                </h2>
                {sinLeer > 0 && (
                  <button className="btn px-3 py-1 text-xs font-semibold" onClick={leerNotificaciones}>
                    Marcar leídos
                  </button>
                )}
              </div>
              {d.notificaciones.length === 0 && <p className="text-xs text-suave">Sin novedades por ahora.</p>}
              {d.notificaciones.map((n) => (
                <p key={n.id} className={`text-xs ${n.leida ? "text-suave" : "font-semibold text-white"}`}>
                  {n.texto} <span className="text-[11px] text-suave">· {new Date(n.creado_en).toLocaleString("es-AR")}</span>
                </p>
              ))}
            </section>
          </>
        )}
      </main>
    </>
  );
}
