"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Camera, Trophy, Brain, Shield, LogOut, Sparkles } from "lucide-react";
import { llamar } from "@/lib/cliente";

interface Yo { tipo: string; nombre?: string; esAdmin?: boolean; esSuper?: boolean; familia?: string; emoji?: string }

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

  const items = [
    { href: "/", icono: Camera, texto: "Destellos" },
    { href: "/tarambana", icono: Sparkles, texto: "Club Tarambana", destacado: true },
    { href: "/trivia", icono: Brain, texto: "Trivia" },
    { href: "/ranking", icono: Trophy, texto: "Ranking" },
    ...(yo?.esAdmin ? [{ href: "/admin", icono: Shield, texto: "Mi familia" }] : []),
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#070b16]/80 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-2.5">
        <Link href="/" className="flex items-center gap-2 font-extrabold">
          <Image src="/logos/rolf.jpg" alt="" width={30} height={30} className="rounded-md" />
          <span className="hidden sm:inline">{yo?.emoji} {yo?.familia ?? "Destellos"}</span>
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
