"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Calendar,
  MapPin,
  Clock,
  DollarSign,
  Share2,
  CheckCircle,
  XCircle,
  Camera,
  Trophy,
  AlertTriangle,
  Send,
  Sparkles,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { Navegacion } from "@/components/Navegacion";
import type { Picado, JugadorPicado, FotoPostPartido, VotoMVP } from "@/lib/types";
import {
  generarWspConvocatoria,
  generarWspAlerta24hs,
  generarWspPostPartidoArlequin,
} from "@/lib/whatsappPicado";

export default function PicadoPage() {
  const [picado, setPicado] = useState<Picado | null>(null);
  const [usuarioActual, setUsuarioActual] = useState<{ id: string; nombre: string; esAdmin: boolean } | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

  // Acciones de formulario
  const [nombreManual, setNombreManual] = useState("");
  const [motivoBaja, setMotivoBaja] = useState("");
  const [mostrarBajaModal, setMostrarBajaModal] = useState(false);
  const [enviandoAccion, setEnviandoAccion] = useState(false);

  // Subida de foto post-partido
  const [fotoArchivo, setFotoArchivo] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);

  // Votación express
  const [votoMvp, setVotoMvp] = useState("");
  const [votoRusty, setVotoRusty] = useState("");
  const [votando, setVotando] = useState(false);
  const [votoGuardado, setVotoGuardado] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const res = await fetch("/api/picado");
      const d = await res.json();
      if (d.picado) {
        setPicado(d.picado);
        if (d.usuarioActual) setUsuarioActual(d.usuarioActual);
      } else {
        setError(d.error || "No se pudo cargar el picado.");
      }
    } catch (e) {
      setError("Error de conexión al cargar el picado.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Manejo de confirmación o baja
  const handleAccionJugador = async (accion: "juego" | "me_bajo") => {
    if (!picado) return;
    setEnviandoAccion(true);
    setAviso("");
    try {
      const res = await fetch(`/api/picado/${picado.id}/jugador`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion,
          name: usuarioActual?.nombre || nombreManual.trim() || undefined,
          reason_declined: accion === "me_bajo" ? motivoBaja.trim() : undefined,
        }),
      });
      const data = await res.json();
      if (data.picado) {
        setPicado(data.picado);
        setMostrarBajaModal(false);
        setMotivoBaja("");
        setAviso(accion === "juego" ? "¡Confirmado en la lista! ⚽" : "Te bajaste de la lista. Se promovió al primer suplente.");
      } else {
        alert(data.error || "Error al procesar acción.");
      }
    } catch {
      alert("Error de conexión.");
    } finally {
      setEnviandoAccion(false);
    }
  };

  // Marcar / desmarcar pago de un jugador
  const togglePago = async (targetUserId: string) => {
    if (!picado) return;
    try {
      const res = await fetch(`/api/picado/${picado.id}/jugador`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "marcar_pago",
          target_user_id: targetUserId,
        }),
      });
      const data = await res.json();
      if (data.picado) setPicado(data.picado);
    } catch (e) {
      console.warn("Error al marcar pago:", e);
    }
  };

  // Subir foto obligatoria post-partido
  const handleSubirFoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!picado || !fotoArchivo) return;
    setSubiendoFoto(true);
    setAviso("");
    try {
      const fd = new FormData();
      fd.append("foto", fotoArchivo);
      if (usuarioActual?.nombre) fd.append("uploader_name", usuarioActual.nombre);

      const res = await fetch(`/api/picado/${picado.id}/foto`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (data.picado) {
        setPicado(data.picado);
        setFotoArchivo(null);
        setFotoPreview(null);
        setAviso("¡Foto subida con éxito! Arlequín coronó el tercer tiempo 🎭");
      } else {
        alert(data.error || "Error al subir la foto.");
      }
    } catch {
      alert("Error de conexión al subir la foto.");
    } finally {
      setSubiendoFoto(false);
    }
  };

  // Votación express
  const handleVotar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!picado || !votoMvp || !votoRusty) {
      alert("Por favor elegí la figura y el rústico del partido.");
      return;
    }
    setVotando(true);
    try {
      const res = await fetch(`/api/picado/${picado.id}/voto`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voted_mvp_id: votoMvp,
          voted_rusty_id: votoRusty,
        }),
      });
      const data = await res.json();
      if (data.picado) {
        setPicado(data.picado);
        setVotoGuardado(true);
        setAviso("¡Tu voto ha sido registrado! 🏆");
      }
    } catch {
      alert("Error al enviar el voto.");
    } finally {
      setVotando(false);
    }
  };

  if (cargando) {
    return (
      <>
        <Navegacion />
        <main className="mx-auto max-w-2xl px-4 py-20 text-center text-cyan-300">
          <RefreshCw className="animate-spin mx-auto mb-3 text-cyan-400" size={32} />
          <p className="font-bold text-sm">Armando la cancha y la convocatoria…</p>
        </main>
      </>
    );
  }

  if (error || !picado) {
    return (
      <>
        <Navegacion />
        <main className="mx-auto max-w-2xl px-4 py-12 text-center text-rose-300">
          <AlertTriangle className="mx-auto mb-2 text-rose-400" size={36} />
          <p className="font-bold">{error || "No hay picado disponible."}</p>
        </main>
      </>
    );
  }

  const confirmados = (picado.jugadores || []).filter((j) => j.status === "confirmed");
  const titulares = confirmados.filter((j) => !j.is_substitute);
  const suplentes = confirmados.filter((j) => j.is_substitute);
  const bajados = (picado.jugadores || []).filter((j) => j.status === "declined");

  const miRegistro = confirmados.find((j) => j.user_id === usuarioActual?.id);
  const estoyConfirmado = !!miRegistro;

  // Datos para links de WhatsApp
  const wspData = {
    titulo: picado.titulo,
    diaHora: new Date(picado.fecha_hora).toLocaleString("es-AR", {
      weekday: "long",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }),
    lugar: picado.lugar || "Cancha a definir",
    lugarLink: picado.lugar_link || undefined,
    aliasPago: picado.info_pago || undefined,
    confirmadosCount: confirmados.length,
    limite: picado.limite_jugadores,
    urlPicado: typeof window !== "undefined" ? window.location.href : "https://destellos.vercel.app/picado",
  };

  return (
    <>
      <Navegacion />
      <main className="mx-auto max-w-3xl space-y-5 px-4 py-6 text-white pb-24">
        {/* ENCABEZADO PRINCIPAL DE LA CONVOCATORIA */}
        <section className="relative overflow-hidden rounded-3xl border-2 border-emerald-500/50 bg-gradient-to-br from-slate-950 via-emerald-950/40 to-slate-950 p-6 shadow-[0_0_35px_rgba(16,185,129,0.25)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-400 text-black uppercase tracking-wider">
                  EL PICADO DE LA SEMANA
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                  picado.estado === "lista_completa"
                    ? "bg-amber-400/20 text-amber-300 border border-amber-400/30"
                    : picado.estado === "finalizado"
                    ? "bg-purple-400/20 text-purple-300 border border-purple-400/30"
                    : "bg-emerald-400/20 text-emerald-300 border border-emerald-400/30"
                }`}>
                  {picado.estado === "convocatoria_abierta" && "🟢 Convocatoria Abierta"}
                  {picado.estado === "lista_completa" && "🟡 Lista Completa (Hay Suplentes)"}
                  {picado.estado === "en_juego" && "⚽ En Juego"}
                  {picado.estado === "esperando_foto" && "📸 Esperando Foto Tercer Tiempo"}
                  {picado.estado === "finalizado" && "🏁 Partido Finalizado"}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white">{picado.titulo}</h1>
              <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-300">
                <span className="flex items-center gap-1 text-emerald-300 font-semibold">
                  <Calendar size={14} />
                  {wspData.diaHora}
                </span>
                <span className="flex items-center gap-1 text-slate-300">
                  <MapPin size={14} className="text-rose-400" />
                  {picado.lugar || "Cancha a confirmar"}
                </span>
                {picado.lugar_link && (
                  <a
                    href={picado.lugar_link}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-cyan-300 hover:underline font-bold"
                  >
                    <span>Ver mapa</span>
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>

            {/* Contador de Cupo Titular */}
            <div className="text-center sm:text-right bg-black/40 p-3.5 rounded-2xl border border-white/10 shrink-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Cupo Titulares</p>
              <p className="text-2xl font-black text-emerald-400">
                {titulares.length} <span className="text-base text-slate-400 font-normal">/ {picado.limite_jugadores}</span>
              </p>
              {suplentes.length > 0 && (
                <p className="text-[11px] text-amber-300 font-semibold">+{suplentes.length} suplentes en espera</p>
              )}
            </div>
          </div>

          {/* Información de Pago / Alias */}
          {picado.info_pago && (
            <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-500/20">
              <div className="flex items-center gap-2">
                <DollarSign size={16} className="text-emerald-400" />
                <span className="text-slate-300">Alias de Cobranza:</span>
                <strong className="select-all font-mono text-emerald-300 bg-black/50 px-2 py-0.5 rounded">
                  {picado.info_pago}
                </strong>
              </div>
              <span className="text-[11px] text-slate-400">Tocá el alias para copiar y transferir</span>
            </div>
          )}
        </section>

        {/* BOTONERA DE ACCIÓN PERSONAL DEL JUGADOR */}
        <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 space-y-3 shadow-lg">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <span>👟</span> Tu Participación
          </h2>

          {!usuarioActual && (
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Tu nombre o apodo para la lista:</label>
              <input
                type="text"
                value={nombreManual}
                onChange={(e) => setNombreManual(e.target.value)}
                placeholder="Ej: Nico, Tincho, Rodri..."
                className="input text-sm"
              />
            </div>
          )}

          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => handleAccionJugador("juego")}
              disabled={enviandoAccion}
              className={`flex-1 min-w-[140px] py-3.5 px-4 rounded-2xl font-black text-sm tracking-wide transition flex items-center justify-center gap-2 shadow-lg active:scale-95 ${
                estoyConfirmado
                  ? "bg-emerald-500 text-black shadow-emerald-500/30"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white"
              }`}
            >
              <CheckCircle size={18} />
              <span>{estoyConfirmado ? "¡ESTOY ANOTADO! ⚽" : "👍 ¡JUEGO!"}</span>
            </button>

            <button
              onClick={() => setMostrarBajaModal(true)}
              disabled={enviandoAccion}
              className="py-3.5 px-4 rounded-2xl bg-rose-950/60 hover:bg-rose-900/80 border border-rose-400/40 text-rose-300 font-bold text-sm tracking-wide transition flex items-center gap-1.5 active:scale-95"
            >
              <XCircle size={18} />
              <span>👎 Me bajo</span>
            </button>
          </div>

          {aviso && <p className="text-xs font-bold text-amber-300 text-center animate-fade-in">{aviso}</p>}
        </section>

        {/* MODAL / PANEL DE BAJA CON MOTIVO BREVE (MAX 50 CARACTERES) */}
        <AnimatePresence>
          {mostrarBajaModal && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="rounded-2xl border border-rose-500/40 bg-rose-950/30 p-4 space-y-2.5"
            >
              <p className="text-xs font-bold text-rose-300">
                ¿Te bajás del partido? Dejá un motivo breve (hasta 50 caracteres) para el grupo:
              </p>
              <input
                type="text"
                maxLength={50}
                value={motivoBaja}
                onChange={(e) => setMotivoBaja(e.target.value)}
                placeholder="Ej: Se me complicó con el laburo / Contracturado"
                className="input text-xs"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleAccionJugador("me_bajo")}
                  disabled={enviandoAccion}
                  className="btn btn-peligro text-xs font-black py-2 px-4"
                >
                  Confirmar baja (promover suplente)
                </button>
                <button
                  onClick={() => setMostrarBajaModal(false)}
                  className="btn text-xs py-2 px-3 bg-white/10"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* MOTOR DE DISPARO POR WHATSAPP A COSTO $0 (P2P NUDGES) */}
        <section className="rounded-3xl border border-emerald-500/30 bg-emerald-950/20 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
              <span>📲</span> Disparador WhatsApp P2P (Costo $0)
            </h3>
            <span className="text-[11px] text-slate-400">Sin APIs ni costos</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Tocá cualquier botón para abrir WhatsApp con el mensaje prearmado listo para enviar al grupo:
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            <a
              href={generarWspConvocatoria(wspData)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-200 text-xs font-bold transition text-center"
            >
              <Share2 size={14} />
              <span>Lanzar Convocatoria</span>
            </a>
            <a
              href={generarWspAlerta24hs(wspData)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 text-xs font-bold transition text-center"
            >
              <Clock size={14} />
              <span>Alerta 24hs (Bajas)</span>
            </a>
            <a
              href={generarWspPostPartidoArlequin(wspData)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/40 text-purple-200 text-xs font-bold transition text-center"
            >
              <Camera size={14} />
              <span>Aviso Foto Arlequín</span>
            </a>
          </div>
        </section>

        {/* LISTA DE LOS 10 TITULARES */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <span>🟢</span> Titulares Confirmados ({titulares.length}/{picado.limite_jugadores})
            </h3>
            <span className="text-xs text-slate-400">Tocá 💸 para alternar pagado</span>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {Array.from({ length: picado.limite_jugadores }).map((_, index) => {
              const jugador = titulares[index];
              return (
                <div
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-2xl border transition ${
                    jugador
                      ? "border-emerald-500/40 bg-slate-900/90 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                      : "border-dashed border-white/10 bg-white/5 opacity-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="grid h-7 w-7 place-items-center rounded-xl bg-emerald-400/20 text-emerald-300 text-xs font-black">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-xs font-black text-white">
                        {jugador ? jugador.name : "Casillero Libre"}
                      </p>
                      {jugador && (
                        <p className="text-[10px] text-slate-400">
                          {new Date(jugador.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} hs
                        </p>
                      )}
                    </div>
                  </div>

                  {jugador && (
                    <button
                      onClick={() => togglePago(jugador.user_id)}
                      className={`text-[11px] font-bold px-2 py-1 rounded-lg border transition ${
                        jugador.paid
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/40"
                          : "bg-slate-800 text-slate-400 border-white/10 hover:text-white"
                      }`}
                    >
                      {jugador.paid ? "💸 Pagado ✔" : "⏳ Pendiente"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* LISTA DE SUPLENTES (ORDENADA POR TIMESTAMP) */}
        {suplentes.length > 0 && (
          <section className="space-y-3 pt-2">
            <h3 className="text-sm font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <span>🟡</span> Lista de Suplentes ({suplentes.length})
            </h3>
            <p className="text-xs text-slate-400">
              Si algún titular se baja, el primer suplente de la lista sube automáticamente a titular:
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {suplentes.map((sup, idx) => (
                <div
                  key={sup.user_id}
                  className="flex items-center justify-between p-3 rounded-2xl border border-amber-400/40 bg-amber-950/20"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid h-7 w-7 place-items-center rounded-xl bg-amber-400/20 text-amber-300 text-xs font-black">
                      S{idx + 1}
                    </span>
                    <div>
                      <p className="text-xs font-black text-white">{sup.name}</p>
                      <p className="text-[10px] text-amber-200/80">En lista de espera</p>
                    </div>
                  </div>
                  <button
                    onClick={() => togglePago(sup.user_id)}
                    className={`text-[11px] font-bold px-2 py-1 rounded-lg border ${
                      sup.paid ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/40" : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {sup.paid ? "💸 Pagado" : "Pendiente"}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* JUGADORES QUE SE BAJARON */}
        {bajados.length > 0 && (
          <details className="text-xs text-slate-400 border-t border-white/10 pt-3">
            <summary className="cursor-pointer font-bold hover:text-white">
              Bajas registradas ({bajados.length})
            </summary>
            <div className="mt-2 space-y-1.5">
              {bajados.map((b) => (
                <div key={b.user_id} className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                  <span className="text-slate-300 font-semibold">{b.name}</span>
                  <span className="text-rose-400 italic text-[11px]">"{b.reason_declined || "Se bajó"}"</span>
                </div>
              ))}
            </div>
          </details>
        )}

        {/* RITUAL OBLIGATORIO: FOTO POST-PARTIDO DEL TERCER TIEMPO */}
        <section className="rounded-3xl border-2 border-fuchsia-500/40 bg-slate-950 p-6 space-y-4 shadow-[0_0_35px_rgba(255,0,127,0.2)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">📸</span>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-cyan-300">
                  FOTO POST-PARTIDO & TERCER TIEMPO
                </h3>
                <p className="text-xs text-slate-300">
                  Cualquiera de los jugadores confirmados puede subir la foto del equipo
                </p>
              </div>
            </div>
          </div>

          {picado.foto_post_partido ? (
            /* TARJETA DE CIERRE DE ARLEQUÍN CON LA FOTO DEL PARTIDO */
            <div className="space-y-4 rounded-2xl border border-fuchsia-500/30 bg-slate-900/90 p-4">
              <div className="relative overflow-hidden rounded-2xl border border-white/20 max-h-80">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={picado.foto_post_partido.photo_url.startsWith("http") ? picado.foto_post_partido.photo_url : `/api/destellos/foto?path=${picado.foto_post_partido.photo_url}`}
                  alt="Tercer Tiempo"
                  className="w-full h-full object-cover max-h-80 mx-auto"
                />
                <span className="absolute bottom-2 right-2 px-2.5 py-1 rounded-lg bg-black/80 text-[10px] font-bold text-cyan-300">
                  Subida por {picado.foto_post_partido.uploader_name || "un jugador"}
                </span>
              </div>

              {/* Veredicto de Arlequín */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-fuchsia-950/60 to-purple-950/60 border border-fuchsia-400/40 space-y-1.5">
                <p className="text-xs font-black uppercase tracking-wider text-fuchsia-300 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-pink-400" />
                  <span>VEREDICTO DE ARLEQUÍN</span>
                </p>
                <h4 className="text-base font-black text-white italic">
                  "{picado.foto_post_partido.ai_title || "¡Pura magia y piernas cansadas!"}"
                </h4>
                <p className="text-xs text-slate-200 leading-relaxed">
                  {picado.foto_post_partido.ai_verdict}
                </p>
              </div>

              {/* VOTACIÓN EXPRESS: FIGURA Y RÚSTICO */}
              <div className="border-t border-white/10 pt-4 space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                  <Trophy size={14} className="text-amber-400" />
                  <span>Votación Express: Figura y Rústico (30 seg)</span>
                </h4>

                {votoGuardado ? (
                  <p className="text-xs text-emerald-300 font-bold bg-emerald-950/40 p-3 rounded-xl border border-emerald-400/30 text-center">
                    ¡Tu voto ya fue computado en el ranking de la Tribu! 🌟
                  </p>
                ) : (
                  <form onSubmit={handleVotar} className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-[11px] text-amber-300 font-bold">👑 Figura de la Cancha (MVP):</label>
                      <select
                        value={votoMvp}
                        onChange={(e) => setVotoMvp(e.target.value)}
                        required
                        className="input text-xs"
                      >
                        <option value="">Seleccionar figura...</option>
                        {confirmados.map((j) => (
                          <option key={j.user_id} value={j.user_id}>
                            {j.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-cyan-300 font-bold">🪵 El Rústico / Pecho Frío:</label>
                      <select
                        value={votoRusty}
                        onChange={(e) => setVotoRusty(e.target.value)}
                        required
                        className="input text-xs"
                      >
                        <option value="">Seleccionar rústico...</option>
                        {confirmados.map((j) => (
                          <option key={j.user_id} value={j.user_id}>
                            {j.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={votando}
                      className="btn btn-primario sm:col-span-2 text-xs font-black py-2.5"
                    >
                      {votando ? "Computando votos..." : "ENVIAR MI VOTO EXPRESS 🗳️"}
                    </button>
                  </form>
                )}
              </div>
            </div>
          ) : (
            /* Formulario para que CUALQUIERA suba la foto */
            <form onSubmit={handleSubirFoto} className="space-y-3">
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-fuchsia-400/50 hover:border-fuchsia-300 rounded-2xl p-6 bg-slate-900/60 cursor-pointer transition">
                {fotoPreview ? (
                  <div className="relative w-full max-h-56 overflow-hidden rounded-xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={fotoPreview} alt="Previa" className="w-full h-full object-cover max-h-56 mx-auto" />
                    <span className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded text-xs text-pink-300">
                      Cambiar foto ↺
                    </span>
                  </div>
                ) : (
                  <div className="text-center space-y-2">
                    <Camera size={36} className="mx-auto text-pink-400 animate-bounce" />
                    <p className="text-xs font-black text-white uppercase tracking-wider">
                      Sacar o elegir la foto del equipo 📷
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Vestuario, cancha o pizzas. El primero en subirla destraba a Arlequín.
                    </p>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setFotoArchivo(f);
                      setFotoPreview(URL.createObjectURL(f));
                    }
                  }}
                />
              </label>

              <button
                type="submit"
                disabled={subiendoFoto || !fotoArchivo}
                className="btn btn-primario w-full font-black text-xs py-3 shadow-[0_0_20px_rgba(255,0,127,0.3)]"
              >
                {subiendoFoto ? "Arlequín está evaluando la foto..." : "¡SUBIR FOTO DEL TERCER TIEMPO! 🍕📸"}
              </button>
            </form>
          )}
        </section>
      </main>
    </>
  );
}
