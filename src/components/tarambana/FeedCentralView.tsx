'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Camera, Music, Brain, Edit3, MessageSquare, Heart, Sparkles, Crown, Send, RefreshCw } from 'lucide-react';
import { llamar } from '@/lib/cliente';

interface Autor {
  id: string;
  nombre: string;
  apodo: string | null;
  foto_url: string | null;
}

interface Comentario {
  id: string;
  texto: string;
  creado_en: string;
  autor: Autor | null;
}

interface DestelloFeed {
  id: string;
  fecha: string;
  autor: Autor | null;
  foto_url: string | null;
  descripcion: string | null;
  ganador: boolean;
  reacciones: Record<string, number>;
  mi_reaccion: string | null;
  comentarios: Comentario[];
  titulo_arlequin?: string | null;
  devolucion_arlequin?: string | null;
}

interface HomeData {
  grupo: { nombre: string; emoji: string; hora_limite?: string };
  muro?: DestelloFeed[];
  hoy?: string;
  totalMiembros?: number;
  yo?: Autor & { esAdmin: boolean; esSuper: boolean };
}

const EMOJIS = ['❤️', '😂', '😍', '👏', '🔥', '🥹'];
const nom = (p: Autor | null) => p?.apodo || p?.nombre || 'Familiar';

export default function FeedCentralView({ onAbrirJuego }: { onAbrirJuego?: (seccion: string) => void }) {
  const [data, setData] = useState<HomeData | null>(null);
  const [cargando, setCargando] = useState(true);
  const [comentandoId, setComentandoId] = useState<string | null>(null);
  const [textoComentario, setTextoComentario] = useState('');
  const [enviandoComentario, setEnviandoComentario] = useState(false);

  const cargarFeed = useCallback(async () => {
    try {
      const res = await fetch('/api/home');
      const d = await res.json();
      setData(d);
    } catch (e) {
      console.warn('Error al cargar feed:', e);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarFeed();
  }, [cargarFeed]);

  const reaccionar = async (destelloId: string, emoji: string) => {
    try {
      await llamar(`/api/destellos/${destelloId}/interaccion`, {
        body: { tipo: 'reaccion', emoji },
      });
      cargarFeed();
    } catch (e) {
      console.warn('Error al reaccionar:', e);
    }
  };

  const enviarComentario = async (destelloId: string) => {
    if (!textoComentario.trim()) return;
    setEnviandoComentario(true);
    try {
      await llamar(`/api/destellos/${destelloId}/interaccion`, {
        body: { tipo: 'comentario', texto: textoComentario.trim() },
      });
      setTextoComentario('');
      setComentandoId(null);
      cargarFeed();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al comentar');
    } finally {
      setEnviandoComentario(false);
    }
  };

  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-cyan-300">
        <RefreshCw size={30} className="animate-spin mb-3 text-cyan-400" />
        <p className="font-bold text-sm">Cargando el muro familiar en tiempo real…</p>
      </div>
    );
  }

  const muro = data?.muro || [];

  return (
    <div className="space-y-6 pb-24 text-white">
      {/* 1. HUB DE ACCESO RÁPIDO A TODOS LOS JUEGOS Y AL FEED */}
      <div className="rounded-3xl border-2 border-fuchsia-500/40 bg-gradient-to-r from-slate-950 via-purple-950/40 to-slate-950 p-4 shadow-[0_0_30px_rgba(255,0,127,0.2)]">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎭</span>
            <span className="text-xs font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-cyan-300">
              ACCESO DIRECTO A JUEGOS Y FEED
            </span>
          </div>
          <span className="text-[11px] font-bold text-slate-400">Todo en un clic</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* FLASH / FOTO OCULTA */}
          <button
            onClick={() => onAbrirJuego?.('flash')}
            className="flex items-center gap-2.5 p-3 rounded-2xl bg-amber-950/50 hover:bg-amber-900/60 border border-amber-400/40 text-left transition group active:scale-95"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-400/20 text-amber-300 grid place-items-center shrink-0 group-hover:scale-110 transition">
              <Camera size={18} />
            </div>
            <div>
              <p className="text-xs font-black text-amber-300">Foto Oculta</p>
              <p className="text-[10px] text-slate-400">Adiviná el autor</p>
            </div>
          </button>

          {/* TARAMBANA / TARAREOS */}
          <button
            onClick={() => onAbrirJuego?.('tarambana')}
            className="flex items-center gap-2.5 p-3 rounded-2xl bg-fuchsia-950/50 hover:bg-fuchsia-900/60 border border-fuchsia-400/40 text-left transition group active:scale-95"
          >
            <div className="w-9 h-9 rounded-xl bg-fuchsia-400/20 text-fuchsia-300 grid place-items-center shrink-0 group-hover:scale-110 transition">
              <Music size={18} />
            </div>
            <div>
              <p className="text-xs font-black text-fuchsia-300">Tarambana</p>
              <p className="text-[10px] text-slate-400">Ronda de tarareos</p>
            </div>
          </button>

          {/* CEREBRO / TRIVIA */}
          <button
            onClick={() => onAbrirJuego?.('cerebro')}
            className="flex items-center gap-2.5 p-3 rounded-2xl bg-orange-950/50 hover:bg-orange-900/60 border border-orange-400/40 text-left transition group active:scale-95"
          >
            <div className="w-9 h-9 rounded-xl bg-orange-400/20 text-orange-300 grid place-items-center shrink-0 group-hover:scale-110 transition">
              <Brain size={18} />
            </div>
            <div>
              <p className="text-xs font-black text-orange-300">Cerebro</p>
              <p className="text-[10px] text-slate-400">Trivia con IA</p>
            </div>
          </button>

          {/* TRAZO / PIZARRA */}
          <button
            onClick={() => onAbrirJuego?.('trazo')}
            className="flex items-center gap-2.5 p-3 rounded-2xl bg-lime-950/50 hover:bg-lime-900/60 border border-lime-400/40 text-left transition group active:scale-95"
          >
            <div className="w-9 h-9 rounded-xl bg-lime-400/20 text-lime-300 grid place-items-center shrink-0 group-hover:scale-110 transition">
              <Edit3 size={18} />
            </div>
            <div>
              <p className="text-xs font-black text-lime-300">Trazo</p>
              <p className="text-[10px] text-slate-400">Pizarra por turnos</p>
            </div>
          </button>
        </div>
      </div>

      {/* 2. MURO CENTRAL DE FOTOS REALES */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">📸</span>
            <h3 className="text-sm font-black uppercase tracking-wider text-amber-300">
              Muro Familiar en Vivo ({muro.length} destellos)
            </h3>
          </div>
          <Link href="/" className="text-xs text-cyan-300 hover:underline font-bold">
            Ver pantalla principal ➔
          </Link>
        </div>

        {muro.length === 0 && (
          <div className="tarjeta p-12 text-center space-y-3">
            <p className="text-4xl">📷</p>
            <p className="font-bold text-white">Todavía no hay fotos en el muro hoy.</p>
            <p className="text-xs text-suave">¡Subí tu foto del día para que Arlequín la estampe en el muro!</p>
            <Link href="/" className="btn btn-primario text-xs font-black px-5 py-2.5 mx-auto inline-block">
              Subir Foto Ahora 🌟
            </Link>
          </div>
        )}

        {muro.map((d) => (
          <article
            key={d.id}
            className={`rounded-3xl border-2 bg-slate-900/90 overflow-hidden shadow-2xl space-y-3 ${
              d.ganador ? 'border-amber-400 shadow-[0_0_35px_rgba(251,191,36,0.3)]' : 'border-white/10'
            }`}
          >
            {/* Cabecera del Destello */}
            <div className="flex items-center gap-3 p-4 border-b border-white/10">
              {d.autor?.foto_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={d.autor.foto_url} alt="" className="h-10 w-10 rounded-full object-cover border border-white/20" />
              ) : (
                <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-cyan-400/30 to-fuchsia-500/30 font-black text-white text-sm border border-white/10">
                  {nom(d.autor)[0]?.toUpperCase()}
                </span>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-black text-sm text-white truncate flex items-center gap-1.5">
                  <span>{nom(d.autor)}</span>
                  {d.ganador && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-black text-amber-300 border border-amber-400/40">
                      <Crown size={11} className="text-amber-400" /> GANADOR DEL DÍA
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-slate-400">{d.fecha}</p>
              </div>
            </div>

            {/* Foto del Destello */}
            {d.foto_url && (
              <div className="relative aspect-[4/3] bg-black/60 overflow-hidden flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={d.foto_url} alt="" className="w-full h-full object-cover" />
                {d.titulo_arlequin && (
                  <div className="absolute bottom-3 inset-x-3 rounded-2xl bg-black/85 backdrop-blur-md p-3 border border-amber-400/40 shadow-xl">
                    <p className="text-xs font-black text-amber-300 uppercase tracking-wide">
                      🎭 Título por Arlequín:
                    </p>
                    <p className="text-sm font-bold text-white">"{d.titulo_arlequin}"</p>
                  </div>
                )}
              </div>
            )}

            {/* Descripción y Reacciones */}
            <div className="p-4 space-y-3">
              {d.descripcion && (
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed italic">
                  "{d.descripcion}"
                </p>
              )}

              {/* Botones de Emojis */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {EMOJIS.map((emoji) => {
                  const count = d.reacciones?.[emoji] || 0;
                  const seleccionado = d.mi_reaccion === emoji;

                  return (
                    <button
                      key={emoji}
                      onClick={() => reaccionar(d.id, emoji)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 border ${
                        seleccionado
                          ? 'bg-fuchsia-600 border-fuchsia-400 text-white scale-105'
                          : 'bg-white/5 border-white/10 hover:bg-white/15 text-slate-300'
                      }`}
                    >
                      <span>{emoji}</span>
                      {count > 0 && <span className="text-[11px]">{count}</span>}
                    </button>
                  );
                })}
              </div>

              {/* Comentarios */}
              <div className="pt-2 border-t border-white/10 space-y-2 text-xs">
                {d.comentarios?.map((c) => (
                  <div key={c.id} className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                    <span className="font-bold text-cyan-300">{nom(c.autor)}: </span>
                    <span className="text-slate-200">{c.texto}</span>
                  </div>
                ))}

                {comentandoId === d.id ? (
                  <div className="flex gap-2 pt-1">
                    <input
                      className="input text-xs flex-1"
                      placeholder="Escribí un comentario para la familia…"
                      value={textoComentario}
                      onChange={(e) => setTextoComentario(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && enviarComentario(d.id)}
                      autoFocus
                    />
                    <button
                      disabled={enviandoComentario || !textoComentario.trim()}
                      onClick={() => enviarComentario(d.id)}
                      className="btn btn-primario px-3 py-1.5 text-xs font-bold"
                    >
                      {enviandoComentario ? '…' : <Send size={14} />}
                    </button>
                    <button
                      onClick={() => { setComentandoId(null); setTextoComentario(''); }}
                      className="btn px-2 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setComentandoId(d.id)}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1 pt-1"
                  >
                    <MessageSquare size={13} />
                    <span>Agregar comentario…</span>
                  </button>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
