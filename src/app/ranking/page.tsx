"use client";

import { useEffect, useState } from "react";
import { llamar } from "@/lib/cliente";
import { Navegacion } from "@/components/Navegacion";

interface Fila { id: string; nombre: string; apodo: string | null; foto_url: string | null; total: number; semana: number }

export default function Ranking() {
  const [filas, setFilas] = useState<Fila[] | null>(null);
  const [error, setError] = useState("");
  const [modo, setModo] = useState<"total" | "semana">("total");

  useEffect(() => {
    llamar<{ ranking: Fila[] }>("/api/ranking").then((r) => setFilas(r.ranking)).catch((e) => setError(e.message));
  }, []);

  const lista = [...(filas ?? [])].sort((a, b) => b[modo] - a[modo]);
  const medalla = ["🥇", "🥈", "🥉"];

  return (
    <>
      <Navegacion />
      <main className="mx-auto max-w-xl space-y-4 px-4 py-6">
        <h1 className="text-center text-2xl font-extrabold">🏆 Ranking familiar</h1>
        <div className="mx-auto flex w-fit gap-1 rounded-xl bg-white/5 p-1">
          {(["total", "semana"] as const).map((m) => (
            <button key={m} onClick={() => setModo(m)} className={`rounded-lg px-4 py-1.5 text-sm ${modo === m ? "bg-white/15" : "text-suave"}`}>{m === "total" ? "Total" : "Últimos 7 días"}</button>
          ))}
        </div>
        {error && <p className="text-red-300">{error}</p>}
        <ol className="space-y-2">
          {lista.map((u, i) => (
            <li key={u.id} className="tarjeta flex items-center gap-3 p-3">
              <span className="w-8 text-center text-xl">{medalla[i] ?? i + 1}</span>
              {u.foto_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={u.foto_url} alt="" className="h-10 w-10 rounded-full object-cover" />
              ) : (
                <span className="grid h-10 w-10 place-items-center rounded-full bg-white/10 font-bold">{(u.apodo || u.nombre)[0]}</span>
              )}
              <span className="flex-1 font-semibold">{u.apodo || u.nombre}</span>
              <span className="text-lg font-bold text-cyan-200">{u[modo]}</span>
            </li>
          ))}
        </ol>
        <p className="text-center text-xs text-suave">+1 por subir tu foto · +5 si ganás la Foto del Día · +1/+3/+5 en la Trivia</p>
      </main>
    </>
  );
}
