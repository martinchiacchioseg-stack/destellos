"use client";

import { useCallback, useEffect, useState } from "react";
import { llamar } from "@/lib/cliente";
import { Navegacion } from "@/components/Navegacion";

interface Admin {
  grupo: { nombre: string; codigo: string; hora_limite: string; vence_en: string };
  integrantes: { id: string; nombre: string; apodo: string | null; foto_url: string | null; rol: string; whatsapp: string | null; email: string | null; nacimiento: string | null }[];
  notificaciones: { id: string; texto: string; leida: boolean; creado_en: string }[];
}

export default function PanelFamilia() {
  const [d, setD] = useState<Admin | null>(null);
  const [error, setError] = useState("");

  const cargar = useCallback(() => llamar<Admin>("/api/admin").then(setD).catch((e) => setError(e.message)), []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { cargar(); }, [cargar]);

  async function leer() {
    await llamar("/api/admin", { body: { accion: "leer_todas" } });
    cargar();
  }
  const sinLeer = d?.notificaciones.filter((n) => !n.leida).length ?? 0;

  return (
    <>
      <Navegacion />
      <main className="mx-auto max-w-2xl space-y-4 px-4 py-6">
        {error && <p className="rounded-lg bg-red-500/10 p-3 text-red-300">{error}</p>}
        {d && (
          <>
            <section className="tarjeta space-y-1 p-5">
              <h1 className="text-xl font-extrabold">Familia {d.grupo.nombre}</h1>
              <p className="text-sm text-suave">Código de ingreso: <strong className="select-all tracking-widest text-white">{d.grupo.codigo}</strong></p>
              <p className="text-sm text-suave">Cierre diario: {d.grupo.hora_limite} hs · Licencia hasta {d.grupo.vence_en}</p>
            </section>

            <section className="tarjeta space-y-2 p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-bold">🔔 Avisos {sinLeer > 0 && <span className="ml-1 rounded-full bg-red-500 px-2 py-0.5 text-xs">{sinLeer}</span>}</h2>
                {sinLeer > 0 && <button className="btn px-3 py-1 text-sm" onClick={leer}>Marcar leídos</button>}
              </div>
              {d.notificaciones.length === 0 && <p className="text-sm text-suave">Sin novedades por ahora.</p>}
              {d.notificaciones.map((n) => (
                <p key={n.id} className={`text-sm ${n.leida ? "text-suave" : "font-semibold"}`}>{n.texto} <span className="text-xs text-suave">· {new Date(n.creado_en).toLocaleString("es-AR")}</span></p>
              ))}
            </section>

            <section className="tarjeta space-y-2 p-5">
              <h2 className="font-bold">Integrantes ({d.integrantes.length})</h2>
              {d.integrantes.map((u) => (
                <div key={u.id} className="flex items-center gap-3 border-t border-white/10 pt-2 text-sm">
                  {u.foto_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={u.foto_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-white/10 font-bold">{u.nombre[0]}</span>
                  )}
                  <div className="flex-1">
                    <p className="font-semibold">{u.nombre} {u.apodo && <span className="text-suave">({u.apodo})</span>} {u.rol === "admin" && <span className="rounded bg-cyan-300/20 px-1.5 text-xs text-cyan-200">admin</span>}</p>
                    <p className="text-xs text-suave">{u.whatsapp ? `+${u.whatsapp}` : "sin WhatsApp"}{u.nacimiento ? ` · 🎂 ${u.nacimiento}` : ""}</p>
                  </div>
                  {u.whatsapp && <a className="btn px-3 py-1 text-xs" href={`https://wa.me/${u.whatsapp}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
                </div>
              ))}
            </section>
          </>
        )}
      </main>
    </>
  );
}
