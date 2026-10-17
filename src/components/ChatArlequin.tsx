"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Send, X } from "lucide-react";
import { llamar } from "@/lib/cliente";

interface Msg { de: "yo" | "arlequin"; texto: string }

/** Chat flotante de Arlequín (con el alma de Rolφ detrás). */
export function ChatArlequin() {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState("");
  const [cargando, setCargando] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([{ de: "arlequin", texto: "¡Hola! Soy Arlequín 🎭 Preguntame lo que quieras sobre las fotos, los puntos o la trivia." }]);
  const fin = useRef<HTMLDivElement>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const t = texto.trim();
    if (!t || cargando) return;
    setTexto("");
    setMsgs((m) => [...m, { de: "yo", texto: t }]);
    setCargando(true);
    try {
      const r = await llamar<{ respuesta: string }>("/api/arlequin/chat", { body: { mensaje: t } });
      setMsgs((m) => [...m, { de: "arlequin", texto: r.respuesta }]);
    } catch (err) {
      setMsgs((m) => [...m, { de: "arlequin", texto: err instanceof Error ? err.message : "Se me trabó el antifaz 🎭" }]);
    } finally {
      setCargando(false);
      setTimeout(() => fin.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }

  return (
    <>
      <button onClick={() => setAbierto((v) => !v)} aria-label="Hablar con Arlequín" className="fixed bottom-5 right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-cyan-300 to-sky-500 text-[#04202a] shadow-lg shadow-cyan-500/30">
        {abierto ? <X /> : <MessageCircle />}
      </button>
      <AnimatePresence>
        {abierto && (
          <motion.div initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16 }} className="tarjeta fixed bottom-24 right-4 z-40 flex h-[26rem] w-[min(22rem,calc(100vw-2rem))] flex-col bg-[#0b1226] p-3">
            <p className="px-1 pb-2 text-sm font-semibold">🎭 Arlequín</p>
            <div className="flex-1 space-y-2 overflow-y-auto pr-1">
              {msgs.map((m, i) => (
                <div key={i} className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${m.de === "yo" ? "ml-auto bg-cyan-400/20" : "bg-white/10"}`}>{m.texto}</div>
              ))}
              {cargando && <div className="w-fit rounded-2xl bg-white/10 px-3 py-2 text-sm text-suave">…</div>}
              <div ref={fin} />
            </div>
            <form onSubmit={enviar} className="mt-2 flex gap-2">
              <input className="input" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escribí tu duda…" maxLength={500} />
              <button className="btn btn-primario px-3" aria-label="Enviar"><Send size={16} /></button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
