'use client';

import { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  Bot,
  HelpCircle,
  Trophy,
  Gamepad2,
  Camera,
  RefreshCw,
} from 'lucide-react';
import { MensajeChatArlequin } from '@/lib/types';

interface ArlequinChatModalProps {
  abierto: boolean;
  onCerrar: () => void;
  usuarioNombre?: string;
}

const PREGUNTAS_RAPIDAS = [
  '¿Cómo sumo puntos en la app?',
  '¿A qué hora se revelan las fotos?',
  '¿Cómo se juega a la Trivia?',
  '¿De qué se trata la Ruleta Rusa?',
];

export default function ArlequinChatModal({
  abierto,
  onCerrar,
  usuarioNombre = 'amigo',
}: ArlequinChatModalProps) {
  const [mensajes, setMensajes] = useState<MensajeChatArlequin[]>([
    {
      id: 'bienvenida',
      remitente: 'arlequin',
      texto: `¡Hola ${usuarioNombre}! 🎭 Soy Arlequín, tu anfitrión en Destellos. ¿En qué te puedo dar una mano hoy? Preguntame sobre las fotos, los juegos o cómo liderar el ranking familiar ✨`,
      timestamp: '2026-01-01T00:00:00.000Z',
    },
  ]);
  const [inputTexto, setInputTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const finChatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (abierto) {
      finChatRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [mensajes, abierto]);

  if (!abierto) return null;

  const handleEnviarMensaje = async (textoPersonalizado?: string) => {
    const texto = (textoPersonalizado || inputTexto).trim();
    if (!texto || enviando) return;

    const nuevoMsgUsuario: MensajeChatArlequin = {
      id: 'user-' + Date.now(),
      remitente: 'usuario',
      texto,
      timestamp: new Date().toISOString(),
    };

    setMensajes((prev) => [...prev, nuevoMsgUsuario]);
    if (!textoPersonalizado) setInputTexto('');
    setEnviando(true);

    try {
      const res = await fetch('/api/arlequin/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mensaje: texto,
          historial: mensajes.slice(-6),
        }),
      });

      const data = await res.json();
      if (res.ok && data.mensaje) {
        setMensajes((prev) => [...prev, data.mensaje]);
      } else {
        setMensajes((prev) => [
          ...prev,
          {
            id: 'err-' + Date.now(),
            remitente: 'arlequin',
            texto:
              '¡Uy, se me cayeron los malabares! 🎭 Hubo un microcorte, pero preguntame de nuevo y le metemos pata.',
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    } catch {
      setMensajes((prev) => [
        ...prev,
        {
          id: 'err-' + Date.now(),
          remitente: 'arlequin',
          texto: 'Parece que no tengo buena señal acá en el escenario. ¿Probamos en un toque?',
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#1C1822] w-full max-w-md h-[90vh] sm:h-[600px] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col border border-gray-200 dark:border-gray-800 overflow-hidden">
        {/* Cabecera del Chat */}
        <div className="px-4 py-3.5 bg-gradient-to-r from-orange-500 via-[#FF7043] to-amber-500 text-white flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl shadow-inner">
              🎭
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-black tracking-tight">Arlequín</h3>
                <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
              </div>
              <p className="text-[11px] text-white/90">Anfitrión & Asesor de Destellos</p>
            </div>
          </div>
          <button
            onClick={onCerrar}
            className="p-1.5 rounded-full hover:bg-white/20 text-white transition cursor-pointer"
            aria-label="Cerrar chat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Zona de Mensajes */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FAF8F5] dark:bg-[#151219]">
          {mensajes.map((m) => {
            const esArlequin = m.remitente === 'arlequin';
            return (
              <div
                key={m.id}
                className={`flex gap-2.5 ${esArlequin ? 'justify-start' : 'justify-end'}`}
              >
                {esArlequin && (
                  <div className="w-7 h-7 rounded-full bg-orange-100 dark:bg-orange-950/60 flex items-center justify-center text-base shrink-0 self-end shadow-xs">
                    🎭
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-xs ${
                    esArlequin
                      ? 'bg-white dark:bg-[#231F2B] text-gray-800 dark:text-gray-100 border border-gray-100 dark:border-gray-800 rounded-bl-xs'
                      : 'bg-gradient-to-r from-[#FF7043] to-[#F4511E] text-white rounded-br-xs'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.texto}</p>
                </div>
              </div>
            );
          })}

          {enviando && (
            <div className="flex gap-2.5 justify-start">
              <div className="w-7 h-7 rounded-full bg-orange-100 dark:bg-orange-950/60 flex items-center justify-center text-base shrink-0 self-end">
                🎭
              </div>
              <div className="bg-white dark:bg-[#231F2B] border border-gray-100 dark:border-gray-800 rounded-2xl px-4 py-3 rounded-bl-xs shadow-xs flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-[#FF7043] rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 bg-[#FF7043] rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 bg-[#FF7043] rounded-full animate-bounce" />
              </div>
            </div>
          )}

          <div ref={finChatRef} />
        </div>

        {/* Sugerencias Rápidas */}
        <div className="px-3 py-2 bg-white dark:bg-[#1C1822] border-t border-gray-100 dark:border-gray-800 overflow-x-auto flex gap-1.5 no-scrollbar">
          {PREGUNTAS_RAPIDAS.map((pregunta, idx) => (
            <button
              key={idx}
              onClick={() => handleEnviarMensaje(pregunta)}
              disabled={enviando}
              className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/40 dark:hover:bg-orange-900/50 text-[#FF7043] dark:text-orange-300 whitespace-nowrap transition cursor-pointer border border-orange-200/50 dark:border-orange-800/40 shrink-0"
            >
              {pregunta}
            </button>
          ))}
        </div>

        {/* Input y Botón Enviar */}
        <div className="p-3 bg-white dark:bg-[#1C1822] border-t border-gray-200 dark:border-gray-800">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleEnviarMensaje();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Escribile a Arlequín..."
              value={inputTexto}
              onChange={(e) => setInputTexto(e.target.value)}
              disabled={enviando}
              className="flex-1 px-3.5 py-2.5 rounded-2xl bg-gray-50 dark:bg-[#25202D] border border-gray-200 dark:border-gray-700 text-xs dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF7043]"
            />
            <button
              type="submit"
              disabled={!inputTexto.trim() || enviando}
              className="p-2.5 rounded-2xl bg-[#FF7043] hover:bg-[#F4511E] active:scale-95 text-white transition disabled:opacity-40 cursor-pointer shadow-md shadow-[#FF7043]/20"
              aria-label="Enviar mensaje"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
