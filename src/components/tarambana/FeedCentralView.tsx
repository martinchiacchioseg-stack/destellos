'use client';

import React, { useState } from 'react';

interface FeedPost {
  id: string;
  autor: string;
  avatar: string;
  tiempo: string;
  juego: 'flash' | 'tarambana' | 'cerebro' | 'trazo' | 'general';
  titulo: string;
  contenido: string;
  multimediaUrl?: string;
  puntajeGanado?: number;
  reacciones: { [emoji: string]: number };
  misReacciones: string[];
  comentariosCount: number;
}

const POSTS_INICIALES: FeedPost[] = [
  {
    id: 'post-1',
    autor: 'Arlequín 🎭',
    avatar: '🎭',
    tiempo: 'Hoy',
    juego: 'flash',
    titulo: 'Veredicto y Desafío Diario',
    contenido: '¡Atención familia CHIACCHIOS! La regla número uno es subir su foto del día. Una vez que Martin, Yasmin, Claudio, Nicolás y Loli cumplan, coronamos la mejor foto y se sortea el Tarareo Ardilla y Trazo Loco.',
    puntajeGanado: 100,
    reacciones: { '👑': 5, '👏': 5, '🔥': 5 },
    misReacciones: ['👑'],
    comentariosCount: 2,
  },
  {
    id: 'post-2',
    autor: 'Martin (papa)',
    avatar: '🎸',
    tiempo: 'Hoy',
    juego: 'tarambana',
    titulo: '¡Listo para el Tarareo de Rock Argentino!',
    contenido: 'Avisen cuando Arlequín tire el tema con drama en el sorteo. ¡El Sincericidio no perdona!',
    puntajeGanado: 25,
    reacciones: { '🤣': 4, '🔥': 4, '🐿️': 4 },
    misReacciones: ['🔥'],
    comentariosCount: 1,
  },
];

const ETIQUETAS_JUEGO = {
  flash: { nombre: 'Flash Grupal', color: 'bg-yellow-400 text-black', borde: 'border-yellow-400/40' },
  tarambana: { nombre: 'Los Tarambana', color: 'bg-fuchsia-600 text-white', borde: 'border-fuchsia-500/40' },
  cerebro: { nombre: 'Cerebro en Fuga', color: 'bg-blue-600 text-white', borde: 'border-blue-500/40' },
  trazo: { nombre: 'Trazo Loco', color: 'bg-lime-400 text-black', borde: 'border-lime-400/40' },
  general: { nombre: 'Muro Club', color: 'bg-cyan-500 text-black', borde: 'border-cyan-500/40' },
};

export default function FeedCentralView({ onAbrirJuego }: { onAbrirJuego?: (seccion: string) => void }) {
  const [posts, setPosts] = useState<FeedPost[]>(POSTS_INICIALES);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [filtro, setFiltro] = useState<string>('todos');

  const reaccionar = (postId: string, emoji: string) => {
    setPosts(prev =>
      prev.map(p => {
        if (p.id !== postId) return p;
        const yaReacciono = p.misReacciones.includes(emoji);
        const nuevoCount = (p.reacciones[emoji] || 0) + (yaReacciono ? -1 : 1);
        const nuevasReacciones = { ...p.reacciones, [emoji]: Math.max(0, nuevoCount) };
        const nuevasMis = yaReacciono
          ? p.misReacciones.filter(e => e !== emoji)
          : [...p.misReacciones, emoji];
        return {
          ...p,
          reacciones: nuevasReacciones,
          misReacciones: nuevasMis,
        };
      })
    );
  };

  const publicarMensaje = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoMensaje.trim()) return;

    const postNuevo: FeedPost = {
      id: `post-${Date.now()}`,
      autor: 'Vos (Tarambana)',
      avatar: '👑',
      tiempo: 'Recién',
      juego: 'general',
      titulo: 'Mensaje para el Club',
      contenido: nuevoMensaje.trim(),
      reacciones: { '🔥': 1 },
      misReacciones: ['🔥'],
      comentariosCount: 0,
    };

    setPosts([postNuevo, ...posts]);
    setNuevoMensaje('');
  };

  const postsFiltrados = filtro === 'todos' 
    ? posts 
    : posts.filter(p => p.juego === filtro);

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-8">
      {/* Banner de bienvenida interactivo con estética SINCERICIDIO */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-950 p-6 border-2 border-fuchsia-500/40 shadow-[0_0_25px_rgba(255,0,127,0.2)]">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-25 mix-blend-screen pointer-events-none"
          style={{ backgroundImage: "url('/logos/sincericidio-bg.jpg')" }}
        />
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-40 h-40 bg-fuchsia-500/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-40 h-40 bg-cyan-400/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border-2 border-fuchsia-400 bg-slate-900 shadow-[0_0_15px_rgba(255,0,127,0.6)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logos/sincericidio-logo.jpg" alt="Logo" className="h-full w-full object-cover" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-cyan-400/20 text-cyan-300 border border-cyan-400/30">
                  COMUNIDAD ACTIVA
                </span>
                <span className="text-xs text-white/50">Muro en vivo</span>
              </div>
              <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-fuchsia-300 to-cyan-300 drop-shadow-[0_0_10px_rgba(255,0,127,0.5)] tracking-wide">
                SINCERICIDIO
              </h2>
              <p className="text-xs text-slate-300 font-medium">
                El Club de los Tarambanas: anécdotas, fotos, tarareos y trazos de toda la banda.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-bold text-emerald-400">Familia Chiacchios (5)</span>
          </div>
        </div>

        {/* Acceso rápido a juegos */}
        {onAbrirJuego && (
          <div className="mt-5 pt-4 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              onClick={() => onAbrirJuego('flash')}
              className="px-3 py-2 rounded-xl bg-yellow-400/10 hover:bg-yellow-400/20 border border-yellow-400/30 text-yellow-300 text-xs font-bold flex items-center justify-center gap-1.5 transition"
            >
              <span>📸</span> Flash Grupal
            </button>
            <button
              onClick={() => onAbrirJuego('tarambana')}
              className="px-3 py-2 rounded-xl bg-fuchsia-500/10 hover:bg-fuchsia-500/20 border border-fuchsia-500/30 text-fuchsia-300 text-xs font-bold flex items-center justify-center gap-1.5 transition"
            >
              <span>🎤</span> Tarambanas
            </button>
            <button
              onClick={() => onAbrirJuego('cerebro')}
              className="px-3 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-bold flex items-center justify-center gap-1.5 transition"
            >
              <span>🧠</span> Cerebro Fuga
            </button>
            <button
              onClick={() => onAbrirJuego('trazo')}
              className="px-3 py-2 rounded-xl bg-lime-400/10 hover:bg-lime-400/20 border border-lime-400/30 text-lime-300 text-xs font-bold flex items-center justify-center gap-1.5 transition"
            >
              <span>✏️</span> Trazo Loco
            </button>
          </div>
        )}
      </div>

      {/* Caja de publicación rápida */}
      <form onSubmit={publicarMensaje} className="bg-slate-900/80 backdrop-blur rounded-2xl border border-white/10 p-4 shadow-lg">
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-fuchsia-600 to-cyan-400 flex items-center justify-center text-xl shrink-0 shadow">
            👑
          </div>
          <div className="flex-1 space-y-3">
            <textarea
              value={nuevoMensaje}
              onChange={(e) => setNuevoMensaje(e.target.value)}
              placeholder="¿Qué travesura o desafío querés compartir con el Club hoy?"
              rows={2}
              className="w-full bg-slate-950/60 border border-white/10 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 resize-none"
            />
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500">
                Público para todos los miembros del Club
              </span>
              <button
                type="submit"
                disabled={!nuevoMensaje.trim()}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 text-black font-extrabold text-xs transition shadow"
              >
                Publicar en el Club 🚀
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Filtros de feed */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">Filtrar:</span>
        {[
          { id: 'todos', label: 'Todos' },
          { id: 'tarambana', label: '🎤 Tarareos' },
          { id: 'flash', label: '📸 Flash Grupal' },
          { id: 'trazo', label: '✏️ Trazo Loco' },
          { id: 'cerebro', label: '🧠 Trivia' },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFiltro(f.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition ${
              filtro === f.id
                ? 'bg-white text-black shadow-md'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista de publicaciones */}
      <div className="space-y-4">
        {postsFiltrados.map((p) => {
          const badge = ETIQUETAS_JUEGO[p.juego];
          return (
            <article
              key={p.id}
              className={`bg-slate-900/90 rounded-2xl border ${badge.borde} p-5 shadow-xl transition hover:border-opacity-80`}
            >
              {/* Header del post */}
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-lg shadow">
                    {p.avatar}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{p.autor}</span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${badge.color}`}>
                        {badge.nombre}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">{p.tiempo}</span>
                  </div>
                </div>

                {p.puntajeGanado && (
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-black">
                    <span>+{p.puntajeGanado}</span>
                    <span>pts</span>
                  </div>
                )}
              </div>

              {/* Contenido */}
              <div className="space-y-2 mb-4">
                <h3 className="text-base font-bold text-slate-100">{p.titulo}</h3>
                <p className="text-sm text-slate-300 leading-relaxed">{p.contenido}</p>
              </div>

              {/* Barra de Reacciones y Comentarios */}
              <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {['🔥', '🤣', '👏', '👑', '🤯'].map((emoji) => {
                    const count = p.reacciones[emoji] || 0;
                    const activa = p.misReacciones.includes(emoji);
                    return (
                      <button
                        key={emoji}
                        onClick={() => reaccionar(p.id, emoji)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                          activa
                            ? 'bg-fuchsia-500/30 border border-fuchsia-400/60 text-white scale-105'
                            : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-white/5'
                        }`}
                      >
                        <span>{emoji}</span>
                        {count > 0 && <span className="text-[11px] font-semibold">{count}</span>}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-1 text-xs text-slate-400 hover:text-white cursor-pointer transition">
                  <span>💬</span>
                  <span>{p.comentariosCount}</span>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
