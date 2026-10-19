"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Camera, Trophy, Brain, Users, LogOut, Sparkles, Eye, Crown } from "lucide-react";
import { llamar } from "@/lib/cliente";
import type { ModulosActivos } from "@/lib/types";

interface Yo {
  tipo: string;
  nombre?: string;
  esAdmin?: boolean;
  esSuper?: boolean;
  familia?: string;
  emoji?: string;
  modulos_activos?: ModulosActivos;
}

import { MarquesinaArlequin } from "./MarquesinaArlequin";

export function Navegacion() {
  const path = usePathname();
  const router = useRouter();
  const [yo, setYo] = useState<Yo | null>(null);

  useEffect(() => {
    llamar<{ sesion: Yo | null }>("/api/yo")
      .then((r) => (r.sesion ? setYo(r.sesion) : router.replace("/login")))
      .catch(() => router.replace("/login"));
  }, [router]);

  async function salir() {
    await llamar("/api/auth/logout", { method: "POST", body: {} });
    router.replace("/login");
    router.refresh();
  }

  const modulos = yo?.modulos_activos;

  // Un solo inicio unificado: TRIBOO con el muro de fotos y anfitrión Arlequín
  const items = [
    { href: "/", icono: Sparkles, texto: "TRIBOO", destacado: true, visible: true },
    { href: "/impostor", icono: Eye, texto: "El Impostor", visible: modulos ? (modulos.el_impostor ?? true) : true },
    { href: "/picado", icono: Users, texto: "El Picado", visible: modulos ? (modulos.picado_futbol ?? true) : true },
    { href: "/prode", icono: Trophy, texto: "El Prode", visible: modulos ? modulos.prode_futbol : true },
    { href: "/trivia", icono: Brain, texto: "Trivia", visible: modulos ? modulos.cerebro_fuga : true },
    { href: "/ranking", icono: Trophy, texto: "Ranking", visible: true },
    { href: "/admin", icono: Users, texto: yo?.familia ? `Tribu ${yo.familia}` : "Mi Tribu", visible: true },
  ].filter((item) => item.visible);

  return (
    <header className="sticky top-0 z-30 border-b border-orange-500/20 bg-[#0a0e1a]/95 backdrop-blur-md shadow-lg shadow-black/50">
      {/* Barra principal de navegación */}
      <div className="mx-auto flex max-w-4xl items-center gap-3 px-3 sm:px-4 py-2">
        <Link href="/" className="flex items-center gap-2.5 font-extrabold group shrink-0">
          <div className="relative h-9 w-9 overflow-hidden rounded-full border-2 border-orange-400 shadow-[0_0_14px_rgba(255,119,0,0.5)] group-hover:scale-105 transition-transform">
            <Image src="/logos/triboo-logo.jpg" alt="TRIBOO" width={36} height={36} className="h-full w-full object-cover" priority />
          </div>
          <span className="font-black text-xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-sky-400">
            TRIBOO
          </span>
        </Link>
        <nav className="ml-auto flex items-center gap-1 overflow-x-auto py-1">
          {items.map(({ href, icono: I, texto, destacado }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-1.5 rounded-xl px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-black transition whitespace-nowrap ${
                path === href
                  ? "bg-gradient-to-r from-orange-500 to-amber-500 text-black shadow-md shadow-orange-500/30 scale-105"
                  : destacado
                  ? "bg-gradient-to-r from-orange-500/20 to-amber-500/20 text-orange-300 border border-orange-500/30 hover:border-orange-400 hover:text-white"
                  : "text-slate-300 hover:text-white hover:bg-white/5"
              }`}
            >
              <I size={15} className={destacado ? "text-amber-400 animate-pulse" : ""} />
              <span>{texto}</span>
            </Link>
          ))}
          {yo?.esSuper && (
            <Link
              href="/superadmin"
              className="flex items-center gap-1 rounded-xl bg-purple-500/20 border border-purple-400/40 px-2.5 py-1.5 text-xs font-black text-purple-200 hover:bg-purple-500/30 transition shrink-0 shadow-sm ml-1"
              title="Panel de Superadministrador"
            >
              <Crown size={14} className="text-amber-300" />
              <span className="hidden sm:inline">Superadmin</span>
            </Link>
          )}
          <button
            onClick={salir}
            aria-label="Salir"
            className="rounded-xl p-2 text-slate-400 hover:text-white hover:bg-white/10 transition ml-1 shrink-0"
            title="Cerrar sesión"
          >
            <LogOut size={16} />
          </button>
        </nav>
      </div>

      {/* Marquesina LED gruesa de Arlequín en TODAS las páginas */}
      <div className="w-full border-t border-orange-500/20 bg-[#04060a] px-2 py-1 sm:px-4">
        <div className="mx-auto max-w-4xl">
          <MarquesinaArlequin />
        </div>
      </div>
    </header>
  );
}
