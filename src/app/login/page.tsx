"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { llamar } from "@/lib/cliente";

interface Miembro { id: string; nombre: string; apodo: string | null; foto_url: string | null }
type Vista = "codigo" | "elegir" | "clave" | "identificador" | "registro" | "recuperar" | "recuperar2";

const iniciales = (n: string) => n.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

function Avatar({ m, size = 56 }: { m: Pick<Miembro, "nombre" | "foto_url">; size?: number }) {
  return m.foto_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={m.foto_url} alt="" width={size} height={size} className="rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <span className="grid place-items-center rounded-full bg-gradient-to-br from-cyan-400/30 to-amber-300/30 font-bold" style={{ width: size, height: size }}>
      {iniciales(m.nombre)}
    </span>
  );
}

export default function Login() {
  const router = useRouter();
  const [vista, setVista] = useState<Vista>("codigo");
  const [codigo, setCodigo] = useState("");
  const [familia, setFamilia] = useState<{ nombre: string; emoji: string } | null>(null);
  const [bienvenida, setBienvenida] = useState("");
  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [elegido, setElegido] = useState<Miembro | null>(null);
  const [ident, setIdent] = useState("");
  const [clave, setClave] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [cargando, setCargando] = useState(false);

  async function accion(fn: () => Promise<void>) {
    setCargando(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Algo salió mal.");
    } finally {
      setCargando(false);
    }
  }

  const validarCodigo = (e: React.FormEvent) => {
    e.preventDefault();
    accion(async () => {
      const r = await llamar<{ grupo: { nombre: string; emoji: string }; bienvenida: string; miembros: Miembro[] }>("/api/auth/codigo", { body: { codigo } });
      setFamilia(r.grupo);
      setBienvenida(r.bienvenida);
      setMiembros(r.miembros);
      setVista("elegir");
    });
  };

  const ingresar = (e: React.FormEvent) => {
    e.preventDefault();
    accion(async () => {
      await llamar("/api/auth/login", { body: { codigo, usuarioId: elegido?.id, identificador: elegido ? undefined : ident, password: clave } });
      router.push("/");
      router.refresh();
    });
  };

  const registrar = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("codigo", codigo);
    accion(async () => {
      await llamar("/api/auth/registro", { body: fd });
      router.push("/");
      router.refresh();
    });
  };

  const pedirPin = (e: React.FormEvent) => {
    e.preventDefault();
    accion(async () => {
      const r = await llamar<{ mensaje: string }>("/api/auth/recuperar", { body: { codigo, identificador: ident } });
      setInfo(r.mensaje);
      setVista("recuperar2");
    });
  };

  const confirmarPin = (e: React.FormEvent) => {
    e.preventDefault();
    accion(async () => {
      const r = await llamar<{ mensaje: string }>("/api/auth/recuperar/confirmar", { body: { codigo, identificador: ident, pin, password: clave } });
      setInfo(r.mensaje);
      setClave("");
      setPin("");
      setVista("identificador");
    });
  };

  const volver = (v: Vista) => () => { setError(""); setVista(v); };
  const Atras = ({ a }: { a: Vista }) => (
    <button type="button" onClick={volver(a)} className="text-sm text-suave hover:text-white">← Volver</button>
  );

  return (
    <main className="relative mx-auto flex min-h-[85dvh] w-full max-w-md flex-col justify-center gap-6 px-4 py-10 overflow-hidden">
      {/* Fondo neón SINCERICIDIO */}
      <div
        className="fixed inset-0 bg-cover bg-center opacity-20 mix-blend-screen pointer-events-none z-0"
        style={{ backgroundImage: "url('/logos/sincericidio-bg.jpg')" }}
      />
      <div className="fixed top-1/4 -left-20 w-72 h-72 bg-fuchsia-600/20 rounded-full blur-[100px] pointer-events-none z-0" />
      <div className="fixed bottom-1/4 -right-20 w-72 h-72 bg-cyan-400/20 rounded-full blur-[100px] pointer-events-none z-0" />

      <div className="relative z-10 text-center">
        <div className="relative mx-auto h-24 w-24 overflow-hidden rounded-3xl border-2 border-fuchsia-400 shadow-[0_0_25px_rgba(255,0,127,0.5),0_0_40px_rgba(0,245,212,0.3)]">
          <Image src="/logos/sincericidio-logo.jpg" alt="SINCERICIDIO" width={96} height={96} className="h-full w-full object-cover" priority />
        </div>
        <h1 className="mt-4 text-3xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-fuchsia-300 to-cyan-300 drop-shadow-[0_0_12px_rgba(255,0,127,0.4)]">
          SINCERICIDIO
        </h1>
        <p className="text-sm font-semibold text-cyan-300">El Club de los Tarambanas 🎭</p>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={vista} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="relative z-10 tarjeta space-y-4 p-6 border border-fuchsia-500/20 shadow-2xl backdrop-blur-md bg-slate-950/80">
          {vista === "codigo" && (
            <form onSubmit={validarCodigo} className="space-y-4">
              <label className="block text-sm font-medium text-suave">Código de familia</label>
              <input className="input text-center text-lg uppercase tracking-widest" placeholder="CHIA-1938" value={codigo} onChange={(e) => setCodigo(e.target.value)} autoFocus required />
              <button className="btn btn-primario w-full" disabled={cargando}>{cargando ? "Buscando…" : "Entrar a mi familia"}</button>
              {info && <p className="text-sm text-emerald-300">{info}</p>}
            </form>
          )}

          {vista === "elegir" && familia && (
            <div className="space-y-4">
              <Atras a="codigo" />
              <p className="text-center text-lg font-semibold">{bienvenida}</p>
              {miembros.length > 0 && (
                <>
                  <p className="text-sm text-suave">¿Quién sos?</p>
                  <div className="grid grid-cols-3 gap-3">
                    {miembros.map((m) => (
                      <button key={m.id} onClick={() => { setElegido(m); setClave(""); setVista("clave"); }} className="btn flex-col gap-1.5 p-3">
                        <Avatar m={m} />
                        <span className="w-full truncate text-xs">{m.apodo || m.nombre.split(" ")[0]}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
              <div className="grid gap-2">
                <button className="btn btn-primario" onClick={() => { setError(""); setVista("registro"); }}>Soy nuevo en la familia</button>
                <button className="btn" onClick={() => { setElegido(null); setClave(""); setVista("identificador"); }}>Ingresar con WhatsApp o mail</button>
              </div>
            </div>
          )}

          {vista === "clave" && elegido && (
            <form onSubmit={ingresar} className="space-y-4">
              <Atras a="elegir" />
              <div className="flex flex-col items-center gap-2"><Avatar m={elegido} size={72} /><strong>{elegido.apodo || elegido.nombre}</strong></div>
              <input className="input" type="password" placeholder="Tu clave" value={clave} onChange={(e) => setClave(e.target.value)} autoFocus required autoComplete="current-password" />
              <button className="btn btn-primario w-full" disabled={cargando}>{cargando ? "Entrando…" : "Entrar"}</button>
              <button type="button" className="w-full text-sm text-suave hover:text-white" onClick={() => { setIdent(""); setVista("recuperar"); }}>Olvidé mi contraseña</button>
            </form>
          )}

          {vista === "identificador" && (
            <form onSubmit={ingresar} className="space-y-4">
              <Atras a="elegir" />
              {info && <p className="text-sm text-emerald-300">{info}</p>}
              <input className="input" placeholder="WhatsApp o mail" value={ident} onChange={(e) => setIdent(e.target.value)} required autoComplete="username" />
              <input className="input" type="password" placeholder="Clave" value={clave} onChange={(e) => setClave(e.target.value)} required autoComplete="current-password" />
              <button className="btn btn-primario w-full" disabled={cargando}>{cargando ? "Entrando…" : "Entrar"}</button>
              <button type="button" className="w-full text-sm text-suave hover:text-white" onClick={() => setVista("recuperar")}>Olvidé mi contraseña</button>
            </form>
          )}

          {vista === "registro" && (
            <form onSubmit={registrar} className="space-y-3">
              <Atras a="elegir" />
              <h2 className="text-lg font-bold">Sumate a la familia {familia?.nombre}</h2>
              <input name="nombre" className="input" placeholder="Nombre completo" required />
              <input name="apodo" className="input" placeholder="Apodo (opcional)" />
              <label className="block text-xs text-suave">Fecha de nacimiento
                <input name="nacimiento" type="date" className="input mt-1" />
              </label>
              <input name="whatsapp" className="input" inputMode="tel" placeholder="WhatsApp (ej. 54 9 11 2345 6789)" />
              <input name="email" type="email" className="input" placeholder="Email (para recuperar tu clave)" />
              <label className="block text-xs text-suave">Foto (opcional)
                <input name="foto" type="file" accept="image/*" className="input mt-1 text-sm" />
              </label>
              <input name="password" type="password" className="input" placeholder="Elegí una clave (mín. 6)" minLength={6} required autoComplete="new-password" />
              <button className="btn btn-primario w-full" disabled={cargando}>{cargando ? "Creando…" : "Unirme"}</button>
            </form>
          )}

          {vista === "recuperar" && (
            <form onSubmit={pedirPin} className="space-y-4">
              <Atras a="elegir" />
              <p className="text-sm text-suave">Te mandamos un código de 6 dígitos al mail que registraste.</p>
              <input className="input" placeholder="WhatsApp o mail" value={ident} onChange={(e) => setIdent(e.target.value)} required />
              <button className="btn btn-primario w-full" disabled={cargando}>{cargando ? "Enviando…" : "Enviar código"}</button>
            </form>
          )}

          {vista === "recuperar2" && (
            <form onSubmit={confirmarPin} className="space-y-4">
              {info && <p className="text-sm text-emerald-300">{info}</p>}
              <input className="input text-center tracking-[0.5em]" inputMode="numeric" maxLength={6} placeholder="000000" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} required />
              <input className="input" type="password" placeholder="Nueva clave (mín. 6)" minLength={6} value={clave} onChange={(e) => setClave(e.target.value)} required autoComplete="new-password" />
              <button className="btn btn-primario w-full" disabled={cargando}>{cargando ? "Guardando…" : "Cambiar clave"}</button>
            </form>
          )}

          {error && <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
        </motion.div>
      </AnimatePresence>
    </main>
  );
}
