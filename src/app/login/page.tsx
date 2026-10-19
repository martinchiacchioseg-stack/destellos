'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, ArrowLeft, Users, KeyRound, Sparkles, RefreshCw } from 'lucide-react';
import { llamar } from '@/lib/cliente';

interface Miembro {
  id: string;
  nombre: string;
  apodo: string | null;
  foto_url: string | null;
}

type Vista = 'codigo' | 'elegir' | 'clave' | 'identificador' | 'registro' | 'recuperar' | 'recuperar2' | 'cambiar_clave';

const LS_CODIGO = 'destellos_codigo_familia';
const LS_USUARIO = 'destellos_usuario_recordado';

const iniciales = (n: string) =>
  n
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

function Avatar({ m, size = 56 }: { m: Pick<Miembro, 'nombre' | 'foto_url'>; size?: number }) {
  return m.foto_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={m.foto_url}
      alt=""
      width={size}
      height={size}
      className="rounded-full object-cover shadow-md"
      style={{ width: size, height: size }}
    />
  ) : (
    <span
      className="grid place-items-center rounded-full bg-gradient-to-br from-cyan-400/30 to-fuchsia-500/30 font-black text-white shadow-md border border-white/10"
      style={{ width: size, height: size, fontSize: size > 60 ? '1.5rem' : '0.85rem' }}
    >
      {iniciales(m.nombre)}
    </span>
  );
}

export default function Login() {
  const router = useRouter();
  const [vista, setVista] = useState<Vista>('codigo');
  const [codigo, setCodigo] = useState('');
  const [familia, setFamilia] = useState<{ nombre: string; emoji: string } | null>(null);
  const [bienvenida, setBienvenida] = useState('');
  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [elegido, setElegido] = useState<Miembro | null>(null);
  const [ident, setIdent] = useState('');
  const [clave, setClave] = useState('');
  const [nuevaClave, setNuevaClave] = useState('');
  const [confirmarNuevaClave, setConfirmarNuevaClave] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [cargando, setCargando] = useState(false);
  const [iniciandoAutoLogin, setIniciandoAutoLogin] = useState(true);

  // Auto-cargar familia y usuario recordado de localStorage
  useEffect(() => {
    try {
      const codigoGuardado = localStorage.getItem(LS_CODIGO);
      const usuarioGuardadoRaw = localStorage.getItem(LS_USUARIO);
      const usuarioGuardado = usuarioGuardadoRaw ? JSON.parse(usuarioGuardadoRaw) : null;

      if (codigoGuardado) {
        setCodigo(codigoGuardado);
        // Validar código automáticamente sin pedirlo de nuevo
        llamar<{ grupo: { nombre: string; emoji: string }; bienvenida: string; miembros: Miembro[] }>(
          '/api/auth/codigo',
          { body: { codigo: codigoGuardado } }
        )
          .then((r) => {
            setFamilia(r.grupo);
            setBienvenida(r.bienvenida);
            setMiembros(r.miembros);

            if (usuarioGuardado && r.miembros.some((m) => m.id === usuarioGuardado.id)) {
              // Va directo a ingresar contraseña de su usuario
              const miembroActual = r.miembros.find((m) => m.id === usuarioGuardado.id) || usuarioGuardado;
              setElegido(miembroActual);
              setVista('clave');
            } else {
              // Va directo a elegir integrante de la familia
              setVista('elegir');
            }
          })
          .catch(() => {
            // Si el código ya no es válido, se pide nuevamente
            localStorage.removeItem(LS_CODIGO);
            setVista('codigo');
          })
          .finally(() => {
            setIniciandoAutoLogin(false);
          });
        return;
      }
    } catch {
      // Fallback normal
    }
    setIniciandoAutoLogin(false);
  }, []);

  async function accion(fn: () => Promise<void>) {
    setCargando(true);
    setError('');
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Algo salió mal.');
    } finally {
      setCargando(false);
    }
  }

  const validarCodigo = (e: React.FormEvent) => {
    e.preventDefault();
    accion(async () => {
      const r = await llamar<{ grupo: { nombre: string; emoji: string }; bienvenida: string; miembros: Miembro[] }>(
        '/api/auth/codigo',
        { body: { codigo } }
      );
      setFamilia(r.grupo);
      setBienvenida(r.bienvenida);
      setMiembros(r.miembros);
      // Recordar código para nunca más pedirlo
      try {
        localStorage.setItem(LS_CODIGO, codigo.trim().toUpperCase());
      } catch {}
      setVista('elegir');
    });
  };

  const ingresar = (e: React.FormEvent) => {
    e.preventDefault();
    accion(async () => {
      const res = await llamar<{ ok?: boolean; debeCambiarClave?: boolean }>('/api/auth/login', {
        body: { codigo, usuarioId: elegido?.id, identificador: elegido ? undefined : ident, password: clave },
      });

      // Guardar usuario en localStorage para recordar la próxima vez
      if (elegido) {
        try {
          localStorage.setItem(LS_USUARIO, JSON.stringify(elegido));
          localStorage.setItem(LS_CODIGO, codigo.trim().toUpperCase());
        } catch {}
      }

      if (res.debeCambiarClave) {
        setClave('');
        setNuevaClave('');
        setConfirmarNuevaClave('');
        setVista('cambiar_clave');
        return;
      }

      router.push('/');
      router.refresh();
    });
  };

  const guardarNuevaClave = (e: React.FormEvent) => {
    e.preventDefault();
    if (nuevaClave.length < 4) {
      setError('La clave debe tener al menos 4 caracteres.');
      return;
    }
    if (nuevaClave === '123456') {
      setError('Por seguridad, elegí una clave diferente a "123456".');
      return;
    }
    if (nuevaClave !== confirmarNuevaClave) {
      setError('Las contraseñas no coinciden. Verificalas.');
      return;
    }
    accion(async () => {
      await llamar('/api/auth/cambiar-clave', { body: { password: nuevaClave } });
      router.push('/');
      router.refresh();
    });
  };

  const registrar = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set('codigo', codigo);
    accion(async () => {
      await llamar('/api/auth/registro', { body: fd });
      // Guardar código recordado
      try {
        localStorage.setItem(LS_CODIGO, codigo.trim().toUpperCase());
      } catch {}
      router.push('/');
      router.refresh();
    });
  };

  const olvidarFamilia = () => {
    try {
      localStorage.removeItem(LS_CODIGO);
      localStorage.removeItem(LS_USUARIO);
    } catch {}
    setCodigo('');
    setFamilia(null);
    setMiembros([]);
    setElegido(null);
    setClave('');
    setError('');
    setVista('codigo');
  };

  const pedirPin = (e: React.FormEvent) => {
    e.preventDefault();
    accion(async () => {
      const r = await llamar<{ mensaje: string }>('/api/auth/recuperar', { body: { codigo, identificador: ident } });
      setInfo(r.mensaje);
      setVista('recuperar2');
    });
  };

  const confirmarPin = (e: React.FormEvent) => {
    e.preventDefault();
    accion(async () => {
      const r = await llamar<{ mensaje: string }>('/api/auth/recuperar/confirmar', {
        body: { codigo, identificador: ident, pin, password: clave },
      });
      setInfo(r.mensaje);
      setClave('');
      setPin('');
      setVista('identificador');
    });
  };

  const volver = (v: Vista) => () => {
    setError('');
    setVista(v);
  };

  const Atras = ({ a }: { a: Vista }) => (
    <button type="button" onClick={volver(a)} className="flex items-center gap-1 text-sm text-suave hover:text-white transition">
      <ArrowLeft size={16} /> Volver
    </button>
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

      {/* Cabecera Principal */}
      <div className="relative z-10 text-center">
        <div className="relative mx-auto h-24 w-24 overflow-hidden rounded-3xl border-2 border-fuchsia-400 shadow-[0_0_25px_rgba(255,0,127,0.5),0_0_40px_rgba(0,245,212,0.3)]">
          <Image src="/logos/sincericidio-logo.jpg" alt="SINCERICIDIO" width={96} height={96} className="h-full w-full object-cover" priority />
        </div>
        <h1 className="mt-4 text-3xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-fuchsia-300 to-cyan-300 drop-shadow-[0_0_12px_rgba(255,0,127,0.4)]">
          SINCERICIDIO
        </h1>
        <p className="text-sm font-semibold text-cyan-300">
          {familia ? `Familia ${familia.nombre} 🎭` : 'Un clic familiar • Destellos diarios'}
        </p>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={vista + (iniciandoAutoLogin ? '-loading' : '')}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="relative z-10 tarjeta space-y-4 p-6 border border-fuchsia-500/20 shadow-2xl backdrop-blur-md bg-slate-950/80"
        >
          {iniciandoAutoLogin ? (
            <div className="py-8 text-center text-slate-300 flex flex-col items-center gap-3">
              <RefreshCw className="animate-spin text-cyan-400" size={24} />
              <p className="text-sm font-bold">Ingresando a tu familia recordada…</p>
            </div>
          ) : (
            <>
              {/* VISTA 1: INGRESO DE CÓDIGO (Solo si nunca ingresó en este dispositivo) */}
              {vista === 'codigo' && (
                <form onSubmit={validarCodigo} className="space-y-4">
                  <div className="text-center space-y-1">
                    <label className="block text-sm font-bold text-white">Número o Código de tu Familia</label>
                    <p className="text-xs text-slate-400">
                      Ingresalo una sola vez. La próxima ingresarás directo con tu usuario y clave.
                    </p>
                  </div>
                  <input
                    className="input text-center text-xl font-black uppercase tracking-widest text-cyan-300 border-cyan-400/40 focus:ring-cyan-400"
                    placeholder="Ej. 7130 o CHIA-1938"
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value)}
                    autoFocus
                    required
                  />
                  <button className="btn btn-primario w-full font-black text-sm" disabled={cargando}>
                    {cargando ? 'Buscando familia…' : 'Continuar 🚀'}
                  </button>
                  {info && <p className="text-sm text-emerald-300 text-center font-bold">{info}</p>}
                </form>
              )}

              {/* VISTA 2: ELEGIR MIEMBRO DE LA FAMILIA */}
              {vista === 'elegir' && familia && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="text-xs font-black text-cyan-300 uppercase">
                      {familia.emoji} FAMILIA {familia.nombre}
                    </span>
                    <button
                      type="button"
                      onClick={olvidarFamilia}
                      className="text-[11px] text-slate-400 hover:text-rose-400 transition"
                      title="Cambiar de familia o número"
                    >
                      Cambiar código ↺
                    </button>
                  </div>

                  <p className="text-center text-sm font-bold text-white">¿Quién sos hoy?</p>

                  {miembros.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {miembros.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => {
                            setElegido(m);
                            setClave('');
                            setVista('clave');
                          }}
                          className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-slate-900/90 border border-white/10 hover:border-cyan-400/60 hover:scale-105 active:scale-95 transition shadow-lg group"
                        >
                          <Avatar m={m} size={54} />
                          <span className="w-full truncate text-xs font-bold text-slate-200 group-hover:text-cyan-300 text-center">
                            {m.apodo || m.nombre.split(' ')[0]}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="grid gap-2 pt-2 border-t border-white/5">
                    <button
                      className="btn btn-primario text-xs font-bold"
                      onClick={() => {
                        setError('');
                        setVista('registro');
                      }}
                    >
                      Soy nuevo en la familia ✍️
                    </button>
                    <button
                      className="btn text-xs text-slate-400 hover:text-white"
                      onClick={() => {
                        setElegido(null);
                        setClave('');
                        setVista('identificador');
                      }}
                    >
                      Ingresar con WhatsApp o mail
                    </button>
                  </div>
                </div>
              )}

              {/* VISTA 3: INGRESO DIRECTO CON USUARIO Y CONTRASEÑA */}
              {vista === 'clave' && elegido && (
                <form onSubmit={ingresar} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        setError('');
                        setVista('elegir');
                      }}
                      className="text-xs text-slate-400 hover:text-cyan-300 flex items-center gap-1 transition"
                    >
                      <Users size={14} /> Elegir otro familiar
                    </button>
                    <button
                      type="button"
                      onClick={olvidarFamilia}
                      className="text-[11px] text-slate-500 hover:text-rose-400 transition"
                    >
                      Cambiar familia ↺
                    </button>
                  </div>

                  <div className="flex flex-col items-center gap-2 py-2">
                    <div className="relative">
                      <Avatar m={elegido} size={76} />
                      <span className="absolute bottom-0 right-0 p-1 rounded-full bg-emerald-500 border-2 border-slate-950" />
                    </div>
                    <strong className="text-base text-white font-extrabold">{elegido.apodo || elegido.nombre}</strong>
                    <span className="text-xs text-cyan-300 font-medium">Ingresá tu clave para acceder a tus Destellos</span>
                  </div>

                  <input
                    className="input text-center text-lg font-bold tracking-wider"
                    type="password"
                    placeholder="Tu clave secreta"
                    value={clave}
                    onChange={(e) => setClave(e.target.value)}
                    autoFocus
                    required
                    autoComplete="current-password"
                  />

                  <button className="btn btn-primario w-full font-black text-sm tracking-wide" disabled={cargando}>
                    {cargando ? 'Entrando a Destellos…' : 'Entrar a mis Destellos 📸'}
                  </button>

                  <div className="text-center pt-1 space-y-1.5">
                    <button
                      type="button"
                      className="text-xs text-slate-400 hover:text-white transition block mx-auto"
                      onClick={() => {
                        setIdent('');
                        setVista('recuperar');
                      }}
                    >
                      Olvidé mi contraseña
                    </button>
                    <p className="text-[11px] text-slate-400/80">
                      ¿Primer ingreso? La clave inicial es <span className="text-cyan-300 font-bold">123456</span> (o la que te indicó quien creó la familia).
                    </p>
                  </div>
                </form>
              )}

              {/* VISTA 4: IDENTIFICADOR ALTERNATIVO */}
              {vista === 'identificador' && (
                <form onSubmit={ingresar} className="space-y-4">
                  <Atras a="elegir" />
                  {info && <p className="text-sm text-emerald-300">{info}</p>}
                  <input
                    className="input"
                    placeholder="WhatsApp o mail"
                    value={ident}
                    onChange={(e) => setIdent(e.target.value)}
                    required
                    autoComplete="username"
                  />
                  <input
                    className="input"
                    type="password"
                    placeholder="Clave"
                    value={clave}
                    onChange={(e) => setClave(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <button className="btn btn-primario w-full" disabled={cargando}>
                    {cargando ? 'Entrando…' : 'Entrar'}
                  </button>
                  <button
                    type="button"
                    className="w-full text-xs text-suave hover:text-white text-center"
                    onClick={() => setVista('recuperar')}
                  >
                    Olvidé mi contraseña
                  </button>
                </form>
              )}

              {/* VISTA 5: REGISTRO DE NUEVO INTEGRANTE */}
              {vista === 'registro' && (
                <form onSubmit={registrar} className="space-y-3">
                  <Atras a="elegir" />
                  <div className="space-y-0.5">
                    <h2 className="text-base font-black text-white">Sumate a la familia {familia?.nombre}</h2>
                    <p className="text-xs text-slate-400">Una vez registrado, entrarás directo con tu usuario.</p>
                  </div>
                  <input name="nombre" className="input" placeholder="Nombre completo" required />
                  <input name="apodo" className="input" placeholder="Apodo (ej. Chacho, Tati)" />
                  <label className="block text-xs text-suave">
                    Fecha de nacimiento
                    <input name="nacimiento" type="date" className="input mt-1" />
                  </label>
                  <input name="whatsapp" className="input" inputMode="tel" placeholder="WhatsApp (ej. 54 9 11 2345 6789)" />
                  <input name="email" type="email" className="input" placeholder="Email (para recuperar tu clave)" />
                  <label className="block text-xs text-suave">
                    Foto de perfil (opcional)
                    <input name="foto" type="file" accept="image/*" className="input mt-1 text-sm" />
                  </label>
                  <input
                    name="password"
                    type="password"
                    className="input"
                    placeholder="Elegí una clave (mín. 6)"
                    minLength={6}
                    required
                    autoComplete="new-password"
                  />
                  <button className="btn btn-primario w-full font-black text-sm" disabled={cargando}>
                    {cargando ? 'Creando tu perfil…' : 'Unirme a la familia 📸'}
                  </button>
                </form>
              )}

              {/* VISTA 6: RECUPERACIÓN */}
              {vista === 'recuperar' && (
                <form onSubmit={pedirPin} className="space-y-4">
                  <Atras a="elegir" />
                  <p className="text-sm text-suave">Te mandamos un código de 6 dígitos al mail que registraste.</p>
                  <input
                    className="input"
                    placeholder="WhatsApp o mail"
                    value={ident}
                    onChange={(e) => setIdent(e.target.value)}
                    required
                  />
                  <button className="btn btn-primario w-full" disabled={cargando}>
                    {cargando ? 'Enviando…' : 'Enviar código'}
                  </button>
                </form>
              )}

              {/* VISTA 7: CONFIRMAR PIN */}
              {vista === 'recuperar2' && (
                <form onSubmit={confirmarPin} className="space-y-4">
                  {info && <p className="text-sm text-emerald-300">{info}</p>}
                  <input
                    className="input text-center tracking-[0.5em]"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    required
                  />
                  <input
                    className="input"
                    type="password"
                    placeholder="Nueva clave (mín. 6)"
                    minLength={6}
                    value={clave}
                    onChange={(e) => setClave(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                  <button className="btn btn-primario w-full" disabled={cargando}>
                    {cargando ? 'Guardando…' : 'Cambiar clave'}
                  </button>
                </form>
              )}

              {/* VISTA 8: CAMBIO OBLIGATORIO DE CLAVE EN PRIMER INGRESO */}
              {vista === 'cambiar_clave' && (
                <form onSubmit={guardarNuevaClave} className="space-y-4">
                  <div className="flex flex-col items-center gap-2 py-2 text-center">
                    <div className="grid place-items-center w-14 h-14 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                      <KeyRound size={28} />
                    </div>
                    <strong className="text-base text-white font-extrabold">
                      ¡Hola{elegido ? ` ${elegido.apodo || elegido.nombre}` : ''}! Creá tu clave personal
                    </strong>
                    <p className="text-xs text-slate-300">
                      Por seguridad, como ingresaste con la clave inicial (<strong>123456</strong>), definí tu contraseña propia para tus próximos ingresos.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <input
                      className="input text-center text-base font-semibold tracking-wider"
                      type="password"
                      placeholder="Nueva contraseña (mín. 4 caracteres)"
                      value={nuevaClave}
                      onChange={(e) => setNuevaClave(e.target.value)}
                      minLength={4}
                      required
                      autoFocus
                      autoComplete="new-password"
                    />
                    <input
                      className="input text-center text-base font-semibold tracking-wider"
                      type="password"
                      placeholder="Confirmá tu nueva contraseña"
                      value={confirmarNuevaClave}
                      onChange={(e) => setConfirmarNuevaClave(e.target.value)}
                      minLength={4}
                      required
                      autoComplete="new-password"
                    />
                  </div>

                  <button className="btn btn-primario w-full font-black text-sm tracking-wide" disabled={cargando}>
                    {cargando ? 'Guardando clave…' : 'Guardar mi clave y entrar a Destellos 🚀'}
                  </button>
                </form>
              )}

              {error && (
                <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-sm text-red-300 font-semibold">
                  {error}
                </p>
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </main>
  );
}
