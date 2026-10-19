"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Camera, Trophy, Brain, Users, LogOut, Sparkles } from "lucide-react";
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

  const items = [
    { href: "/", icono: Camera, texto: "Destellos", visible: true },
    { href: "/tarambana", icono: Sparkles, texto: "Club Tarambana", destacado: true, visible: true },
    { href: "/picado", icono: Users, texto: "El Picado", visible: modulos ? (modulos.picado_futbol ?? true) : true },
    { href: "/prode", icono: Trophy, texto: "Prode", visible: modulos ? modulos.prode_futbol : true },
    { href: "/trivia", icono: Brain, texto: "Trivia", visible: modulos ? modulos.cerebro_fuga : true },
    { href: "/ranking", icono: Trophy, texto: "Ranking", visible: true },
    { href: "/admin", icono: Users, texto: "Mi familia", visible: true },
  ].filter((item) => item.visible);

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0a0e1a]/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-2.5">
        <Link href="/" className="flex items-center gap-2.5 font-extrabold group">
          <div className="relative h-9 w-9 overflow-hidden rounded-full border-2 border-orange-400 shadow-[0_0_12px_rgba(255,119,0,0.4)]">
            <Image src="/logos/triboo-logo.jpg" alt="TRIBOO" width={36} height={36} className="h-full w-full object-cover" priority />
          </div>
          <span className="hidden sm:inline font-black text-xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-sky-400">
            TRIBOO
          </span>
        </Link>
        <nav className="ml-auto flex items-center gap-1">
          {items.map(({ href, icono: I, texto, destacado }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold transition ${
                path === href
                  ? "bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-500/20"
                  : destacado
                  ? "bg-gradient-to-r from-fuchsia-600/30 to-pink-600/30 text-fuchsia-300 border border-fuchsia-500/30 hover:border-fuchsia-400 hover:text-white"
                  : "text-suave hover:text-white"
              }`}
            >
              <I size={16} className={destacado ? "text-fuchsia-400 animate-pulse" : ""} />
              <span className="hidden sm:inline">{texto}</span>
            </Link>
          ))}
          <button onClick={salir} aria-label="Salir" className="rounded-lg p-2 text-suave hover:text-white"><LogOut size={16} /></button>
        </nav>
      </div>
    </header>
  );
}
