"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { KeyRound, LogIn, ArrowLeft, RefreshCw, Check, Sparkles } from "lucide-react";
import { llamar } from "@/lib/cliente";

interface PerfilRecordado {
  id: string;
  nombre: string;
  apodo: string | null;
  foto_path: string | null;
  email?: string | null;
  whatsapp?: string | null;
  tribuNombre?: string;
  tribuEmoji?: string;
}

const LS_PERFILES = "triboo_perfiles_recordados";
const LS_ULTIMO_ID = "triboo_ultimo_usuario_id";

export default function LoginPage() {
  const router = useRouter();

  // Estados de vista
  const [vista, setVista] = useState<"login_directo" | "perfiles" | "cambiar_clave">("login_directo");
  const [perfiles, setPerfiles] = useState<PerfilRecordado[]>([]);
  const [perfilSeleccionado, setPerfilSeleccionado] = useState<PerfilRecordado | null>(null);

  // Campos de formulario
  const [identificador, setIdentificador] = useState("");
  const [clave, setClave] = useState("");
  const [recordarme, setRecordarme] = useState(true);

  // Cambio forzoso de clave
  const [nuevaClave, setNuevaClave] = useState("");
  const [confirmarClave, setConfirmarClave] = useState("");

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  // Cargar perfiles recordados al montar
  useEffect(() => {
    try {
      const guardados = localStorage.getItem(LS_PERFILES);
      if (guardados) {
        const parsed: PerfilRecordado[] = JSON.parse(guardados);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPerfiles(parsed);
          setVista("perfiles"); // Si hay perfiles guardados, mostrar acceso rápido con fotos
        }
      }
    } catch {
      // Fallback
    }
  }, []);

  // Manejo de Login directo
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setCargando(true);

    try {
      const res = await llamar<{
        ok: boolean;
        esSuperadmin?: boolean;
        redirect?: string;
        debeCambiarClave: boolean;
        perfilCompleto: boolean;
        usuario?: { id: string; nombre: string; apodo: string | null; foto_path: string | null; rol: string };
        tribu?: { id: string; nombre: string; emoji: string };
      }>("/api/auth/login", {
        body: {
          usuarioId: perfilSeleccionado?.id,
          identificador: perfilSeleccionado ? undefined : identificador.trim(),
          password: clave,
        },
      });

      if (res.redirect || res.esSuperadmin) {
        router.push(res.redirect || "/superadmin");
        router.refresh();
        return;
      }

      if (recordarme && res.usuario) {
        // Guardar perfil en la lista de recordados del dispositivo
        const nuevoPerfil: PerfilRecordado = {
          id: res.usuario.id,
          nombre: res.usuario.nombre,
          apodo: res.usuario.apodo,
          foto_path: res.usuario.foto_path,
          tribuNombre: res.tribu?.nombre,
          tribuEmoji: res.tribu?.emoji,
        };

        const filtrados = perfiles.filter((p) => p.id !== nuevoPerfil.id);
        const actualizados = [nuevoPerfil, ...filtrados];
        setPerfiles(actualizados);
        try {
          localStorage.setItem(LS_PERFILES, JSON.stringify(actualizados));
          localStorage.setItem(LS_ULTIMO_ID, nuevoPerfil.id);
        } catch {}
      }

      if (res.debeCambiarClave) {
        setClave("");
        setVista("cambiar_clave");
        return;
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión.");
    } finally {
      setCargando(false);
    }
  };

  // Guardar nueva contraseña obligatoria
  const handleCambiarClave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nuevaClave.length < 4) {
      setError("La nueva clave debe tener al menos 4 caracteres.");
      return;
    }
    if (nuevaClave !== confirmarClave) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setCargando(true);
    setError("");

    try {
      await llamar("/api/auth/primer-ingreso", {
        body: { nuevaPassword: nuevaClave },
      });
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar la clave.");
    } finally {
      setCargando(false);
    }
  };

  // Olvidar perfil guardado
  const eliminarPerfil = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const rest = perfiles.filter((p) => p.id !== id);
    setPerfiles(rest);
    try {
      localStorage.setItem(LS_PERFILES, JSON.stringify(rest));
    } catch {}
    if (rest.length === 0) {
      setVista("login_directo");
    }
  };

  return (
    <main className="relative mx-auto flex min-h-[90dvh] w-full max-w-md flex-col justify-center gap-6 px-4 py-8 overflow-hidden">
      {/* Fondo inmersivo TRIBOO */}
      <div
        className="fixed inset-0 bg-cover bg-center opacity-25 mix-blend-screen pointer-events-none z-0"
        style={{ backgroundImage: "url('/logos/triboo-banner.jpg')" }}
      />
      <div className="fixed top-1/4 -left-20 w-72 h-72 bg-orange-600/20 rounded-full blur-[100px] pointer-events-none z-0" />
      <div className="fixed bottom-1/4 -right-20 w-72 h-72 bg-sky-400/20 rounded-full blur-[100px] pointer-events-none z-0" />

      {/* Header Central TRIBOO con Logo Redondo */}
      <div className="relative z-10 text-center">
        <div className="relative mx-auto h-24 w-24 overflow-hidden rounded-full border-2 border-orange-400 shadow-[0_0_25px_rgba(255,119,0,0.5),0_0_40px_rgba(0,166,255,0.3)]">
          <Image src="/logos/triboo-logo.jpg" alt="TRIBOO" width={96} height={96} className="h-full w-full object-cover" priority />
        </div>
        <h1 className="mt-3.5 text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-sky-400 drop-shadow-[0_0_12px_rgba(255,119,0,0.4)]">
          TRIBOO
        </h1>
        <p className="text-xs font-semibold text-sky-300 tracking-wide mt-0.5">
          Jugá. Compartí. Tribu.
        </p>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={vista}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="relative z-10 tarjeta space-y-4 p-6 border border-white/10 shadow-2xl backdrop-blur-md bg-slate-950/85"
        >
          {/* VISTA 1: ACCESO RÁPIDO CON PERFILES RECORDADOS (TOCANDO LA FOTO) */}
          {vista === "perfiles" && !perfilSeleccionado && (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <h2 className="text-sm font-black uppercase tracking-wider text-white">¿Quién ingresa hoy?</h2>
                <p className="text-xs text-slate-400">Tocá tu foto de perfil para acceder rápidamente:</p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                {perfiles.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      setPerfilSeleccionado(p);
                      setClave("");
                      setError("");
                    }}
                    className="relative flex flex-col items-center gap-2 p-3.5 rounded-2xl bg-slate-900/90 border border-white/10 hover:border-orange-400/60 hover:scale-105 active:scale-95 transition shadow-lg cursor-pointer group"
                  >
                    <button
                      type="button"
                      onClick={(e) => eliminarPerfil(p.id, e)}
                      title="Olvidar en este dispositivo"
                      className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/60 text-slate-400 hover:text-rose-400 text-[10px] grid place-items-center opacity-0 group-hover:opacity-100 transition"
                    >
                      ×
                    </button>
                    <div className="relative h-14 w-14 overflow-hidden rounded-full border-2 border-orange-400/50 group-hover:border-orange-400 shadow-md">
                      {p.foto_path ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={`/api/destellos/foto?path=${p.foto_path}`} alt={p.nombre} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full bg-gradient-to-br from-orange-500/40 to-sky-500/40 flex items-center justify-center font-black text-white text-base">
                          {p.nombre.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="text-center w-full">
                      <p className="truncate text-xs font-black text-white group-hover:text-orange-300">
                        {p.apodo || p.nombre}
                      </p>
                      {p.tribuNombre && (
                        <p className="truncate text-[10px] text-slate-400">
                          {p.tribuEmoji} {p.tribuNombre}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  setPerfilSeleccionado(null);
                  setVista("login_directo");
                  setError("");
                }}
                className="btn w-full text-xs text-slate-300 hover:text-white bg-white/5 py-2.5 mt-2"
              >
                Ingresar con otra cuenta (Email o WhatsApp)
              </button>
            </div>
          )}

          {/* VISTA 1.B: CLAVE PARA EL PERFIL SELECCIONADO AL TOCAR SU FOTO */}
          {vista === "perfiles" && perfilSeleccionado && (
            <form onSubmit={handleLogin} className="space-y-4">
              <button
                type="button"
                onClick={() => setPerfilSeleccionado(null)}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition"
              >
                <ArrowLeft size={14} /> Elegir otro usuario
              </button>

              <div className="flex flex-col items-center gap-2 py-2 text-center">
                <div className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-orange-400 shadow-lg">
                  {perfilSeleccionado.foto_path ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/destellos/foto?path=${perfilSeleccionado.foto_path}`}
                      alt={perfilSeleccionado.nombre}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-orange-500/40 to-sky-500/40 flex items-center justify-center font-black text-white text-lg">
                      {perfilSeleccionado.nombre.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <strong className="text-base text-white font-extrabold">
                  ¡Hola, {perfilSeleccionado.apodo || perfilSeleccionado.nombre}!
                </strong>
                <p className="text-xs text-slate-400">Ingresá tu clave de acceso:</p>
              </div>

              <input
                type="password"
                value={clave}
                onChange={(e) => setClave(e.target.value)}
                placeholder="Tu clave secreta"
                required
                autoFocus
                autoComplete="current-password"
                className="input text-center text-lg font-bold tracking-wider"
              />

              <button
                type="submit"
                disabled={cargando}
                className="btn btn-primario w-full font-black text-sm py-3"
              >
                {cargando ? "Ingresando a TRIBOO…" : "INGRESAR A LA TRIBU 🚀"}
              </button>
            </form>
          )}

          {/* VISTA 2: LOGIN DIRECTO POR EMAIL O WHATSAPP (SIN CÓDIGO DE FAMILIA) */}
          {vista === "login_directo" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="text-center space-y-1">
                <h2 className="text-base font-black text-white">Ingresá a tu Tribu</h2>
                <p className="text-xs text-slate-400">
                  Con tu WhatsApp o email y tu clave de acceso.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    WhatsApp o Email:
                  </label>
                  <input
                    type="text"
                    value={identificador}
                    onChange={(e) => setIdentificador(e.target.value)}
                    placeholder="Ej: 54911... o tu@email.com"
                    required
                    autoFocus
                    autoComplete="username"
                    className="input text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Contraseña:
                  </label>
                  <input
                    type="password"
                    value={clave}
                    onChange={(e) => setClave(e.target.value)}
                    placeholder="Tu clave secreta"
                    required
                    autoComplete="current-password"
                    className="input text-sm"
                  />
                </div>
              </div>

              {/* Tildar Recordar perfil en este dispositivo */}
              <label className="flex items-center gap-2 cursor-pointer pt-1 select-none">
                <input
                  type="checkbox"
                  checked={recordarme}
                  onChange={(e) => setRecordarme(e.target.checked)}
                  className="rounded border-white/20 bg-slate-800 text-orange-500 focus:ring-orange-400"
                />
                <span className="text-xs text-slate-300 font-medium">
                  Recordarme en este dispositivo (ingresar con mi foto)
                </span>
              </label>

              <button
                type="submit"
                disabled={cargando}
                className="btn btn-primario w-full font-black text-sm py-3 shadow-[0_0_20px_rgba(255,119,0,0.3)]"
              >
                {cargando ? "Verificando acceso…" : "INGRESAR AHORA 🌟"}
              </button>

              {perfiles.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setVista("perfiles");
                    setError("");
                  }}
                  className="btn w-full text-xs text-sky-300 bg-sky-950/30 border border-sky-500/20 py-2"
                >
                  Ver fotos recordadas en este dispositivo ➔
                </button>
              )}
            </form>
          )}

          {/* VISTA 3: CAMBIO OBLIGATORIO DE CLAVE EN EL PRIMER INGRESO */}
          {vista === "cambiar_clave" && (
            <form onSubmit={handleCambiarClave} className="space-y-4">
              <div className="flex flex-col items-center gap-2 py-2 text-center">
                <div className="grid place-items-center w-14 h-14 rounded-full bg-orange-500/20 text-orange-400 border border-orange-400/30">
                  <KeyRound size={28} />
                </div>
                <strong className="text-base text-white font-extrabold">
                  ¡Primer ingreso! Creá tu nueva contraseña
                </strong>
                <p className="text-xs text-slate-300">
                  Ingresaste con una clave temporal. Por seguridad de tu cuenta, definí tu contraseña propia definitiva:
                </p>
              </div>

              <div className="space-y-2.5">
                <input
                  type="password"
                  placeholder="Nueva contraseña (mín. 4 caracteres)"
                  value={nuevaClave}
                  onChange={(e) => setNuevaClave(e.target.value)}
                  minLength={4}
                  required
                  autoFocus
                  autoComplete="new-password"
                  className="input text-center text-sm font-semibold"
                />
                <input
                  type="password"
                  placeholder="Confirmá tu nueva contraseña"
                  value={confirmarClave}
                  onChange={(e) => setConfirmarClave(e.target.value)}
                  minLength={4}
                  required
                  autoComplete="new-password"
                  className="input text-center text-sm font-semibold"
                />
              </div>

              <button
                type="submit"
                disabled={cargando}
                className="btn btn-primario w-full font-black text-sm py-3"
              >
                {cargando ? "Guardando nueva clave…" : "ACTIVAR MI CUENTA Y CONTINUAR ✔"}
              </button>
            </form>
          )}

          {error && (
            <p className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-300 font-bold text-center">
              {error}
            </p>
          )}
        </motion.div>
      </AnimatePresence>
    </main>
  );
}
