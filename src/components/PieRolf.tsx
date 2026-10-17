"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { llamar } from "@/lib/cliente";

/**
 * Pie intocable "by Rolφ". Tres clics rápidos sobre la leyenda abren el acceso reservado.
 * No hay ningún texto ni enlace visible que lo delate.
 */
export function PieRolf() {
  const router = useRouter();
  const clics = useRef<number[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [email, setEmail] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  function tocar() {
    const ahora = Date.now();
    clics.current = [...clics.current.filter((t) => ahora - t < 1200), ahora];
    if (clics.current.length >= 3) {
      clics.current = [];
      setAbierto(true);
    }
  }

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError("");
    try {
      await llamar("/api/auth/superadmin", { body: { email, password: clave } });
      setAbierto(false);
      setClave("");
      router.push("/superadmin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo ingresar.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <>
      <footer className="px-4 pb-6 pt-10 text-center">
        <button
          type="button"
          onClick={tocar}
          className="mx-auto inline-flex select-none items-center gap-2 rounded-full px-3 py-1.5 text-sm text-suave transition hover:text-white"
          aria-label="by Rolφ"
        >
          <Image src="/logos/rolf.jpg" alt="" width={28} height={28} className="rounded-md" />
          <span>
            by <strong className="font-semibold text-white">Rolφ</strong>
          </span>
        </button>
      </footer>

      {abierto && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onClick={() => setAbierto(false)}>
          <form onSubmit={entrar} onClick={(e) => e.stopPropagation()} className="tarjeta w-full max-w-sm space-y-3 bg-[#0b1226] p-6">
            <div className="flex items-center gap-3">
              <Image src="/logos/rolf.jpg" alt="" width={40} height={40} className="rounded-lg" />
              <h2 className="text-lg font-bold">Acceso</h2>
            </div>
            <input className="input" type="email" autoComplete="username" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input className="input" type="password" autoComplete="current-password" placeholder="Clave" value={clave} onChange={(e) => setClave(e.target.value)} required />
            {error && <p className="text-sm text-red-300">{error}</p>}
            <button className="btn btn-primario w-full" disabled={cargando}>
              {cargando ? "Verificando…" : "Entrar"}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
