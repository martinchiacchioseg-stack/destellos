import { randomUUID } from 'crypto';
const uuidv4 = () => randomUUID();
import {
  Destello,
  EvaluacionDiaria,
  Grupo,
  JuegoAdivinaIntento,
  JuegoFotoPasado,
  JuegoFotoPasadoAdivinanza,
  JuegoVotoCruzado,
  PuntosEvento,
  RankingItem,
  RetoDiario,
  TipoEventoPuntos,
  Usuario,
  UsuarioPublico,
} from './types';
import { hashPassword } from './auth';
import { getFechaArgentina, getAyerFechaArgentina, getSemanaArgentina } from './date-utils';
import { getPuntosPorEvento, DESCRIPCIONES_PUNTOS } from './puntos';
import { supabaseAdmin, isSupabaseConfigured } from './supabase';
import { elegirDestelloDelDia } from './gemini';

// ==============================================================================
// ALMACENAMIENTO HÍBRIDO (Supabase + Memoria Reactiva con Inicialización Segura)
// ==============================================================================

interface StateStore {
  usuarios: Usuario[];
  grupos: Grupo[];
  retos: RetoDiario[];
  destellos: Destello[];
  evaluaciones: EvaluacionDiaria[];
  puntos: PuntosEvento[];
  adivinanzas: JuegoAdivinaIntento[];
  votosCruzados: JuegoVotoCruzado[];
  fotosPasado: JuegoFotoPasado[];
  fotosPasadoAdivinanzas: JuegoFotoPasadoAdivinanza[];
  initialized: boolean;
}

// Global singleton para persistencia entre requests en el runtime de Node
const globalState = global as unknown as { __destellos_store?: StateStore };

function getStore(): StateStore {
  if (!globalState.__destellos_store) {
    globalState.__destellos_store = {
      usuarios: [],
      grupos: [],
      retos: [],
      destellos: [],
      evaluaciones: [],
      puntos: [],
      adivinanzas: [],
      votosCruzados: [],
      fotosPasado: [],
      fotosPasadoAdivinanzas: [],
      initialized: false,
    };
  }
  return globalState.__destellos_store;
}

/**
 * Inicialización inicial (Seed) de Superadmin y datos de bienvenida
 */
export async function ensureInitialized() {
  const store = getStore();
  if (store.initialized) return;

  const superadminEmail = process.env.SUPERADMIN_EMAIL || 'martinchiaccio.seg@gmail.com';
  const superadminPass = process.env.SUPERADMIN_INITIAL_PASSWORD || 'qwerty1234';

  const defaultGroupId = 'grupo-familia-perez-001';
  const superadminId = 'usr-superadmin-001';
  const adminId = 'usr-admin-mama-002';
  const miembro1Id = 'usr-miembro-nico-003';
  const miembro2Id = 'usr-miembro-sofi-004';
  const miembro3Id = 'usr-miembro-abuela-005';

  const passHashAdmin = await hashPassword('familia2026');
  const passHashSuper = await hashPassword(superadminPass);

  // 1. Grupo inicial
  const grupoFamilia: Grupo = {
    id: defaultGroupId,
    nombre: 'Familia Pérez & Amigos',
    codigo_invitacion: 'DESTELLOS26',
    descripcion: 'El espacio para compartir nuestros momentos cotidianos y reírnos juntos.',
    activo: true,
    creado_en: new Date().toISOString(),
  };

  // 2. Usuarios iniciales
  const usuarios: Usuario[] = [
    {
      id: superadminId,
      email: superadminEmail.toLowerCase().trim(),
      password_hash: passHashSuper,
      nombre: 'Martín (Superadmin)',
      apodo: 'Martín',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      rol: 'superadmin',
      grupo_id: defaultGroupId,
      debe_cambiar_password: true, // Superadmin en su primer ingreso DEBE cambiar contraseña
      intentos_fallidos: 0,
      activo: true,
      creado_en: new Date().toISOString(),
    },
    {
      id: adminId,
      email: 'mama.perez@destellos.ar',
      password_hash: passHashAdmin,
      nombre: 'Mariana Pérez',
      apodo: 'Mamá',
      avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
      rol: 'admin',
      grupo_id: defaultGroupId,
      debe_cambiar_password: false,
      intentos_fallidos: 0,
      activo: true,
      creado_en: new Date().toISOString(),
    },
    {
      id: miembro1Id,
      email: 'nico.perez@destellos.ar',
      password_hash: passHashAdmin,
      nombre: 'Nicolás Pérez',
      apodo: 'Nico',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      rol: 'miembro',
      grupo_id: defaultGroupId,
      debe_cambiar_password: false,
      intentos_fallidos: 0,
      activo: true,
      creado_en: new Date().toISOString(),
    },
    {
      id: miembro2Id,
      email: 'sofi.perez@destellos.ar',
      password_hash: passHashAdmin,
      nombre: 'Sofía Pérez',
      apodo: 'Sofi',
      avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      rol: 'miembro',
      grupo_id: defaultGroupId,
      debe_cambiar_password: false,
      intentos_fallidos: 0,
      activo: true,
      creado_en: new Date().toISOString(),
    },
    {
      id: miembro3Id,
      email: 'abuela.rosa@destellos.ar',
      password_hash: passHashAdmin,
      nombre: 'Rosa Bellini',
      apodo: 'Abu Rosa',
      avatar_url: 'https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?w=150&auto=format&fit=crop&q=80',
      rol: 'miembro',
      grupo_id: defaultGroupId,
      debe_cambiar_password: false,
      intentos_fallidos: 0,
      activo: true,
      creado_en: new Date().toISOString(),
    },
  ];

  const hoyStr = getFechaArgentina();
  const ayerStr = getAyerFechaArgentina();
  const semanaStr = getSemanaArgentina();

  // 3. Reto de hoy
  const retoHoy: RetoDiario = {
    id: 'reto-' + hoyStr,
    grupo_id: defaultGroupId,
    fecha: hoyStr,
    tema: 'El mate o café de la tarde ☕🧉',
    descripcion: 'Mostrá tu infusión favorita con algo rico para acompañar. ¡Vale cualquier rincón cálido!',
    generado_por_ia: true,
    creado_en: new Date().toISOString(),
  };

  // 4. Destellos de ayer (para animación de revelado del ganador)
  const destelloAyerGanador: Destello = {
    id: 'destello-ayer-001',
    grupo_id: defaultGroupId,
    usuario_id: miembro2Id,
    fecha: ayerStr,
    media_url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800&auto=format&fit=crop&q=80',
    thumbnail_url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=300&auto=format&fit=crop&q=80',
    tipo_media: 'foto',
    pie_de_foto: '¡Miren a Tomi durmiendo arriba del teclado! No me deja estudiar 😂',
    cumple_reto: true,
    reto_verificacion_detalle: 'Una mascota tierna en acción',
    es_destello_del_dia: true,
    votos_comunidad: 4,
    es_favorito_comunidad: true,
    moderado: false,
    creado_en: new Date(Date.now() - 86400000).toISOString(),
    actualizado_en: new Date(Date.now() - 86400000).toISOString(),
  };

  const destelloAyer2: Destello = {
    id: 'destello-ayer-002',
    grupo_id: defaultGroupId,
    usuario_id: adminId,
    fecha: ayerStr,
    media_url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80',
    thumbnail_url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=300&auto=format&fit=crop&q=80',
    tipo_media: 'foto',
    pie_de_foto: 'Pizzas caseras listas para el horno del domingo 🍕',
    cumple_reto: true,
    es_destello_del_dia: false,
    votos_comunidad: 2,
    es_favorito_comunidad: false,
    moderado: false,
    creado_en: new Date(Date.now() - 86400000).toISOString(),
    actualizado_en: new Date(Date.now() - 86400000).toISOString(),
  };

  // 5. Destellos de hoy (en curso)
  const destelloHoy1: Destello = {
    id: 'destello-hoy-001',
    grupo_id: defaultGroupId,
    usuario_id: miembro1Id,
    fecha: hoyStr,
    media_url: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=800&auto=format&fit=crop&q=80',
    thumbnail_url: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=300&auto=format&fit=crop&q=80',
    tipo_media: 'foto',
    pie_de_foto: 'Unos amargos con bizcochitos de grasa en el taller 🧉✨',
    cumple_reto: true,
    reto_verificacion_detalle: 'Cumple perfectamente el reto del mate',
    es_destello_del_dia: false,
    votos_comunidad: 2,
    es_favorito_comunidad: false,
    moderado: false,
    creado_en: new Date().toISOString(),
    actualizado_en: new Date().toISOString(),
  };

  const destelloHoy2: Destello = {
    id: 'destello-hoy-002',
    grupo_id: defaultGroupId,
    usuario_id: miembro3Id,
    fecha: hoyStr,
    media_url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&auto=format&fit=crop&q=80',
    thumbnail_url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=300&auto=format&fit=crop&q=80',
    tipo_media: 'foto',
    pie_de_foto: 'Té con limón y galletitas caseras que hice esta mañana 🍋🍪',
    cumple_reto: true,
    reto_verificacion_detalle: 'Cumple el reto de infusión casera',
    es_destello_del_dia: false,
    votos_comunidad: 1,
    es_favorito_comunidad: false,
    moderado: false,
    creado_en: new Date().toISOString(),
    actualizado_en: new Date().toISOString(),
  };

  // 6. Puntos iniciales
  const puntos: PuntosEvento[] = [
    {
      id: 'pt-001',
      grupo_id: defaultGroupId,
      usuario_id: miembro2Id,
      fecha: ayerStr,
      tipo_evento: 'destello_del_dia',
      puntos: 10,
      descripcion: DESCRIPCIONES_PUNTOS.destello_del_dia,
      referencia_id: destelloAyerGanador.id,
      creado_en: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'pt-002',
      grupo_id: defaultGroupId,
      usuario_id: miembro2Id,
      fecha: ayerStr,
      tipo_evento: 'votacion_comunidad_ganador',
      puntos: 5,
      descripcion: DESCRIPCIONES_PUNTOS.votacion_comunidad_ganador,
      referencia_id: destelloAyerGanador.id,
      creado_en: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'pt-003',
      grupo_id: defaultGroupId,
      usuario_id: miembro2Id,
      fecha: ayerStr,
      tipo_evento: 'participacion_diaria',
      puntos: 1,
      descripcion: DESCRIPCIONES_PUNTOS.participacion_diaria,
      referencia_id: destelloAyerGanador.id,
      creado_en: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'pt-004',
      grupo_id: defaultGroupId,
      usuario_id: adminId,
      fecha: ayerStr,
      tipo_evento: 'participacion_diaria',
      puntos: 1,
      descripcion: DESCRIPCIONES_PUNTOS.participacion_diaria,
      referencia_id: destelloAyer2.id,
      creado_en: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'pt-005',
      grupo_id: defaultGroupId,
      usuario_id: miembro1Id,
      fecha: hoyStr,
      tipo_evento: 'participacion_diaria',
      puntos: 1,
      descripcion: DESCRIPCIONES_PUNTOS.participacion_diaria,
      referencia_id: destelloHoy1.id,
      creado_en: new Date().toISOString(),
    },
    {
      id: 'pt-006',
      grupo_id: defaultGroupId,
      usuario_id: miembro1Id,
      fecha: hoyStr,
      tipo_evento: 'cumplir_reto',
      puntos: 2,
      descripcion: DESCRIPCIONES_PUNTOS.cumplir_reto,
      referencia_id: destelloHoy1.id,
      creado_en: new Date().toISOString(),
    },
    {
      id: 'pt-007',
      grupo_id: defaultGroupId,
      usuario_id: miembro3Id,
      fecha: hoyStr,
      tipo_evento: 'participacion_diaria',
      puntos: 1,
      descripcion: DESCRIPCIONES_PUNTOS.participacion_diaria,
      referencia_id: destelloHoy2.id,
      creado_en: new Date().toISOString(),
    },
    {
      id: 'pt-008',
      grupo_id: defaultGroupId,
      usuario_id: miembro3Id,
      fecha: hoyStr,
      tipo_evento: 'cumplir_reto',
      puntos: 2,
      descripcion: DESCRIPCIONES_PUNTOS.cumplir_reto,
      referencia_id: destelloHoy2.id,
      creado_en: new Date().toISOString(),
    },
  ];

  // 7. Evaluación de ayer
  const evaluacionAyer: EvaluacionDiaria = {
    id: 'eval-' + ayerStr,
    grupo_id: defaultGroupId,
    fecha: ayerStr,
    destello_ganador_id: destelloAyerGanador.id,
    destello_favorito_id: destelloAyerGanador.id,
    total_participantes: 2,
    cerrado: true,
    cerrado_en: new Date(Date.now() - 40000000).toISOString(),
  };

  // 8. Foto del Pasado (Semanal)
  const fotoPasadoSemanal: JuegoFotoPasado = {
    id: 'foto-pasado-001',
    grupo_id: defaultGroupId,
    semana: semanaStr,
    usuario_id: adminId,
    media_url: 'https://images.unsplash.com/photo-1506869640319-fe1a24fd76dc?w=800&auto=format&fit=crop&q=80',
    anio_real: 1998,
    lugar_real: 'Mar del Plata, Playa Varese',
    pista: 'Verano caluroso, carpas a rayas y peinado con flequillo inflado.',
    cerrada: false,
    creado_en: new Date().toISOString(),
  };

  store.grupos = [grupoFamilia];
  store.usuarios = usuarios;
  store.retos = [retoHoy];
  store.destellos = [destelloAyerGanador, destelloAyer2, destelloHoy1, destelloHoy2];
  store.evaluaciones = [evaluacionAyer];
  store.puntos = puntos;
  store.fotosPasado = [fotoPasadoSemanal];
  store.initialized = true;

  // Si Supabase está configurado, intentamos sincronizar el Superadmin si no existe en la base de datos
  if (isSupabaseConfigured && supabaseAdmin) {
    try {
      const { data: existingSuper } = await supabaseAdmin
        .from('usuarios')
        .select('id')
        .eq('email', superadminEmail.toLowerCase().trim())
        .maybeSingle();

      if (!existingSuper) {
        await supabaseAdmin.from('usuarios').insert({
          id: superadminId,
          email: superadminEmail.toLowerCase().trim(),
          password_hash: passHashSuper,
          nombre: 'Martín (Superadmin)',
          apodo: 'Martín',
          rol: 'superadmin',
          debe_cambiar_password: true,
          intentos_fallidos: 0,
          activo: true,
        });
      }
    } catch (e) {
      console.warn('Sincronización inicial Supabase omitida o fallida:', e);
    }
  }
}

// ==============================================================================
// MÉTODOS DE USUARIOS
// ==============================================================================

export async function buscarUsuarioPorEmail(email: string): Promise<Usuario | null> {
  await ensureInitialized();
  const cleanEmail = email.toLowerCase().trim();

  if (isSupabaseConfigured && supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin
        .from('usuarios')
        .select('*')
        .eq('email', cleanEmail)
        .maybeSingle();
      if (!error && data) return data as Usuario;
    } catch {}
  }

  const store = getStore();
  const u = store.usuarios.find((x) => x.email.toLowerCase().trim() === cleanEmail);
  return u || null;
}

export async function buscarUsuarioPorId(id: string): Promise<Usuario | null> {
  await ensureInitialized();
  if (isSupabaseConfigured && supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin
        .from('usuarios')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (!error && data) return data as Usuario;
    } catch {}
  }

  const store = getStore();
  return store.usuarios.find((x) => x.id === id) || null;
}

export async function crearUsuario(data: {
  email: string;
  passwordTemporal: string;
  nombre: string;
  apodo?: string;
  rol: 'admin' | 'miembro';
  grupo_id?: string;
}): Promise<Usuario> {
  await ensureInitialized();
  const hash = await hashPassword(data.passwordTemporal);
  const nuevoUsuario: Usuario = {
    id: uuidv4(),
    email: data.email.toLowerCase().trim(),
    password_hash: hash,
    nombre: data.nombre.trim(),
    apodo: data.apodo?.trim() || data.nombre.split(' ')[0],
    avatar_url: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(data.nombre)}`,
    rol: data.rol,
    grupo_id: data.grupo_id || null,
    debe_cambiar_password: true, // Siempre obligatorio en primer ingreso
    intentos_fallidos: 0,
    activo: true,
    creado_en: new Date().toISOString(),
  };

  if (isSupabaseConfigured && supabaseAdmin) {
    try {
      await supabaseAdmin.from('usuarios').insert(nuevoUsuario);
    } catch (e) {
      console.error('Error insertando usuario en Supabase:', e);
    }
  }

  const store = getStore();
  store.usuarios.push(nuevoUsuario);
  return nuevoUsuario;
}

export async function actualizarPassword(usuarioId: string, nuevoPasswordPlano: string): Promise<boolean> {
  await ensureInitialized();
  const hash = await hashPassword(nuevoPasswordPlano);

  if (isSupabaseConfigured && supabaseAdmin) {
    try {
      await supabaseAdmin
        .from('usuarios')
        .update({
          password_hash: hash,
          debe_cambiar_password: false,
          intentos_fallidos: 0,
          bloqueado_hasta: null,
        })
        .eq('id', usuarioId);
    } catch (e) {
      console.error('Error actualizando password en Supabase:', e);
    }
  }

  const store = getStore();
  const u = store.usuarios.find((x) => x.id === usuarioId);
  if (u) {
    u.password_hash = hash;
    u.debe_cambiar_password = false;
    u.intentos_fallidos = 0;
    u.bloqueado_hasta = null;
    return true;
  }
  return false;
}

export async function resetearPassword(usuarioId: string, nuevaPassTemporal: string): Promise<boolean> {
  await ensureInitialized();
  const hash = await hashPassword(nuevaPassTemporal);

  if (isSupabaseConfigured && supabaseAdmin) {
    try {
      await supabaseAdmin
        .from('usuarios')
        .update({
          password_hash: hash,
          debe_cambiar_password: true, // Se vuelve a exigir el cambio obligatorio
          intentos_fallidos: 0,
          bloqueado_hasta: null,
        })
        .eq('id', usuarioId);
    } catch (e) {
      console.error('Error reseteando password en Supabase:', e);
    }
  }

  const store = getStore();
  const u = store.usuarios.find((x) => x.id === usuarioId);
  if (u) {
    u.password_hash = hash;
    u.debe_cambiar_password = true;
    u.intentos_fallidos = 0;
    u.bloqueado_hasta = null;
    return true;
  }
  return false;
}

export async function registrarIntentoFallido(email: string): Promise<number> {
  await ensureInitialized();
  const store = getStore();
  const u = store.usuarios.find((x) => x.email.toLowerCase().trim() === email.toLowerCase().trim());
  if (!u) return 0;
  u.intentos_fallidos = (u.intentos_fallidos || 0) + 1;
  if (u.intentos_fallidos >= 5) {
    // Bloquear por 15 minutos
    u.bloqueado_hasta = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  }
  return u.intentos_fallidos;
}

export async function resetearIntentosFallidos(email: string): Promise<void> {
  await ensureInitialized();
  const store = getStore();
  const u = store.usuarios.find((x) => x.email.toLowerCase().trim() === email.toLowerCase().trim());
  if (u) {
    u.intentos_fallidos = 0;
    u.bloqueado_hasta = null;
  }
}

export async function listarUsuariosGrupo(grupoId: string): Promise<UsuarioPublico[]> {
  await ensureInitialized();
  const store = getStore();
  return store.usuarios
    .filter((u) => u.grupo_id === grupoId && u.activo)
    .map(({ password_hash, intentos_fallidos, bloqueado_hasta, ...safe }) => safe);
}

export async function listarTodosLosUsuarios(): Promise<UsuarioPublico[]> {
  await ensureInitialized();
  const store = getStore();
  return store.usuarios.map(({ password_hash, intentos_fallidos, bloqueado_hasta, ...safe }) => safe);
}

// ==============================================================================
// MÉTODOS DE GRUPOS
// ==============================================================================

export async function listarGrupos(): Promise<Grupo[]> {
  await ensureInitialized();
  const store = getStore();
  return store.grupos.filter((g) => g.activo);
}

export async function buscarGrupoPorId(grupoId: string): Promise<Grupo | null> {
  await ensureInitialized();
  const store = getStore();
  return store.grupos.find((g) => g.id === grupoId) || null;
}

export async function crearGrupo(nombre: string, descripcion?: string): Promise<Grupo> {
  await ensureInitialized();
  const nuevoGrupo: Grupo = {
    id: uuidv4(),
    nombre: nombre.trim(),
    codigo_invitacion: 'DEST-' + Math.random().toString(36).substring(2, 7).toUpperCase(),
    descripcion: descripcion?.trim(),
    activo: true,
    creado_en: new Date().toISOString(),
  };

  if (isSupabaseConfigured && supabaseAdmin) {
    try {
      await supabaseAdmin.from('grupos').insert(nuevoGrupo);
    } catch (e) {
      console.error('Error insertando grupo en Supabase:', e);
    }
  }

  const store = getStore();
  store.grupos.push(nuevoGrupo);
  return nuevoGrupo;
}

export async function eliminarGrupo(grupoId: string): Promise<boolean> {
  await ensureInitialized();
  const store = getStore();
  const idx = store.grupos.findIndex((g) => g.id === grupoId);
  if (idx !== -1) {
    store.grupos[idx].activo = false;
    return true;
  }
  return false;
}

// ==============================================================================
// MÉTODOS DE RETOS DIARIOS
// ==============================================================================

export async function obtenerRetoDelDia(fecha: string, grupoId?: string): Promise<RetoDiario | null> {
  await ensureInitialized();
  const store = getStore();
  let reto = store.retos.find((r) => r.fecha === fecha && (!grupoId || !r.grupo_id || r.grupo_id === grupoId));
  return reto || null;
}

export async function guardarRetoDelDia(reto: Omit<RetoDiario, 'id' | 'creado_en'>): Promise<RetoDiario> {
  await ensureInitialized();
  const nuevoReto: RetoDiario = {
    ...reto,
    id: uuidv4(),
    creado_en: new Date().toISOString(),
  };

  const store = getStore();
  const existIdx = store.retos.findIndex((r) => r.fecha === reto.fecha && r.grupo_id === reto.grupo_id);
  if (existIdx !== -1) {
    store.retos[existIdx] = { ...store.retos[existIdx], ...nuevoReto };
    return store.retos[existIdx];
  }
  store.retos.push(nuevoReto);
  return nuevoReto;
}

// ==============================================================================
// MÉTODOS DE DESTELLOS
// ==============================================================================

export async function obtenerDestelloUsuarioDia(grupoId: string, usuarioId: string, fecha: string): Promise<Destello | null> {
  await ensureInitialized();
  const store = getStore();
  const d = store.destellos.find((x) => x.grupo_id === grupoId && x.usuario_id === usuarioId && x.fecha === fecha && !x.moderado);
  if (!d) return null;
  const usuario = store.usuarios.find((u) => u.id === d.usuario_id);
  return {
    ...d,
    usuario: usuario ? { id: usuario.id, email: usuario.email, nombre: usuario.nombre, apodo: usuario.apodo, avatar_url: usuario.avatar_url, rol: usuario.rol, grupo_id: usuario.grupo_id, debe_cambiar_password: usuario.debe_cambiar_password, activo: usuario.activo, creado_en: usuario.creado_en } : undefined,
  };
}

export async function guardarOActualizarDestello(data: {
  grupo_id: string;
  usuario_id: string;
  fecha: string;
  media_url: string;
  thumbnail_url?: string;
  tipo_media: 'foto' | 'video';
  pie_de_foto?: string;
  cumple_reto?: boolean;
  reto_verificacion_detalle?: string;
}): Promise<Destello> {
  await ensureInitialized();
  const store = getStore();
  const existIdx = store.destellos.findIndex(
    (x) => x.grupo_id === data.grupo_id && x.usuario_id === data.usuario_id && x.fecha === data.fecha
  );

  let destelloFinal: Destello;
  const esActualizacion = existIdx !== -1;

  if (esActualizacion) {
    destelloFinal = {
      ...store.destellos[existIdx],
      ...data,
      actualizado_en: new Date().toISOString(),
    };
    store.destellos[existIdx] = destelloFinal;
  } else {
    destelloFinal = {
      id: uuidv4(),
      ...data,
      es_destello_del_dia: false,
      votos_comunidad: 0,
      es_favorito_comunidad: false,
      moderado: false,
      creado_en: new Date().toISOString(),
      actualizado_en: new Date().toISOString(),
    };
    store.destellos.push(destelloFinal);

    // Sumar +1 por participación diaria
    await otorgarPuntos(
      data.grupo_id,
      data.usuario_id,
      data.fecha,
      'participacion_diaria',
      getPuntosPorEvento('participacion_diaria'),
      DESCRIPCIONES_PUNTOS.participacion_diaria,
      destelloFinal.id
    );

    // Si cumple el reto, sumar +2
    if (data.cumple_reto) {
      await otorgarPuntos(
        data.grupo_id,
        data.usuario_id,
        data.fecha,
        'cumplir_reto',
        getPuntosPorEvento('cumplir_reto'),
        DESCRIPCIONES_PUNTOS.cumplir_reto,
        destelloFinal.id
      );
    }
  }

  const usuario = store.usuarios.find((u) => u.id === destelloFinal.usuario_id);
  return {
    ...destelloFinal,
    usuario: usuario ? { id: usuario.id, email: usuario.email, nombre: usuario.nombre, apodo: usuario.apodo, avatar_url: usuario.avatar_url, rol: usuario.rol, grupo_id: usuario.grupo_id, debe_cambiar_password: usuario.debe_cambiar_password, activo: usuario.activo, creado_en: usuario.creado_en } : undefined,
  };
}

export async function listarDestellosDia(grupoId: string, fecha: string): Promise<Destello[]> {
  await ensureInitialized();
  const store = getStore();
  return store.destellos
    .filter((d) => d.grupo_id === grupoId && d.fecha === fecha && !d.moderado)
    .map((d) => {
      const u = store.usuarios.find((x) => x.id === d.usuario_id);
      return {
        ...d,
        usuario: u ? { id: u.id, email: u.email, nombre: u.nombre, apodo: u.apodo, avatar_url: u.avatar_url, rol: u.rol, grupo_id: u.grupo_id, debe_cambiar_password: u.debe_cambiar_password, activo: u.activo, creado_en: u.creado_en } : undefined,
      };
    });
}

export async function listarGaleria(grupoId: string, limite: number = 50): Promise<Destello[]> {
  await ensureInitialized();
  const store = getStore();
  return store.destellos
    .filter((d) => d.grupo_id === grupoId && !d.moderado)
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
    .slice(0, limite)
    .map((d) => {
      const u = store.usuarios.find((x) => x.id === d.usuario_id);
      return {
        ...d,
        usuario: u ? { id: u.id, email: u.email, nombre: u.nombre, apodo: u.apodo, avatar_url: u.avatar_url, rol: u.rol, grupo_id: u.grupo_id, debe_cambiar_password: u.debe_cambiar_password, activo: u.activo, creado_en: u.creado_en } : undefined,
      };
    });
}

export async function moderarDestello(destelloId: string, motivo: string): Promise<boolean> {
  await ensureInitialized();
  const store = getStore();
  const d = store.destellos.find((x) => x.id === destelloId);
  if (d) {
    d.moderado = true;
    d.motivo_moderacion = motivo;
    return true;
  }
  return false;
}

// ==============================================================================
// MÉTODOS DE PUNTOS Y RANKING
// ==============================================================================

export async function otorgarPuntos(
  grupoId: string,
  usuarioId: string,
  fecha: string,
  tipoEvento: TipoEventoPuntos,
  puntos: number,
  descripcion: string,
  referenciaId?: string
): Promise<PuntosEvento> {
  await ensureInitialized();
  const evento: PuntosEvento = {
    id: uuidv4(),
    grupo_id: grupoId,
    usuario_id: usuarioId,
    fecha,
    tipo_evento: tipoEvento,
    puntos,
    descripcion,
    referencia_id: referenciaId,
    creado_en: new Date().toISOString(),
  };

  const store = getStore();
  store.puntos.push(evento);
  return evento;
}

export async function obtenerRanking(
  grupoId: string,
  periodo: 'diario' | 'semanal' | 'total' = 'total',
  fechaReferencia?: string
): Promise<RankingItem[]> {
  await ensureInitialized();
  const store = getStore();
  const miembros = store.usuarios.filter((u) => u.grupo_id === grupoId && u.activo);
  const ref = fechaReferencia || getFechaArgentina();

  let puntosFiltrados = store.puntos.filter((p) => p.grupo_id === grupoId);

  if (periodo === 'diario') {
    puntosFiltrados = puntosFiltrados.filter((p) => p.fecha === ref);
  } else if (periodo === 'semanal') {
    // Últimos 7 días
    const sieteDiasAtras = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    puntosFiltrados = puntosFiltrados.filter((p) => p.fecha >= sieteDiasAtras && p.fecha <= ref);
  }

  const items: RankingItem[] = miembros.map((m) => {
    const misPuntos = puntosFiltrados.filter((p) => p.usuario_id === m.id);
    const total = misPuntos.reduce((acc, curr) => acc + curr.puntos, 0);

    const ganados = store.destellos.filter(
      (d) => d.grupo_id === grupoId && d.usuario_id === m.id && d.es_destello_del_dia
    ).length;

    const subidos = store.destellos.filter(
      (d) => d.grupo_id === grupoId && d.usuario_id === m.id
    ).length;

    return {
      usuario_id: m.id,
      nombre: m.nombre,
      apodo: m.apodo,
      avatar_url: m.avatar_url,
      puntos_totales: total,
      destellos_ganados: ganados,
      destellos_subidos: subidos,
      posicion: 0,
    };
  });

  items.sort((a, b) => b.puntos_totales - a.puntos_totales);
  items.forEach((item, index) => {
    item.posicion = index + 1;
  });

  return items;
}

export async function obtenerHistorialPuntos(usuarioId: string): Promise<PuntosEvento[]> {
  await ensureInitialized();
  const store = getStore();
  return store.puntos
    .filter((p) => p.usuario_id === usuarioId)
    .sort((a, b) => new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime());
}

// ==============================================================================
// MINI-JUEGO 2: Adiviná quién la sacó
// ==============================================================================

export async function obtenerFotosParaAdivinar(grupoId: string, fecha: string, usuarioId: string) {
  await ensureInitialized();
  const store = getStore();
  const destellos = store.destellos.filter((d) => d.grupo_id === grupoId && d.fecha === fecha && !d.moderado);

  const yaJugo = store.adivinanzas.some(
    (a) => a.grupo_id === grupoId && a.fecha === fecha && a.usuario_id === usuarioId
  );

  // Mezclar orden aleatoriamente
  const fotosSinNombre = destellos.map((d) => ({
    id: d.id,
    media_url: d.media_url,
    tipo_media: d.tipo_media,
    pie_de_foto: d.pie_de_foto,
    es_tuya: d.usuario_id === usuarioId,
    // Revelar autor solo si ya jugó
    autor_real_id: yaJugo ? d.usuario_id : undefined,
  })).sort(() => Math.random() - 0.5);

  const miembros = await listarUsuariosGrupo(grupoId);

  return {
    yaJugo,
    fotos: fotosSinNombre,
    miembros,
  };
}

export async function registrarAdivinanzas(
  grupoId: string,
  fecha: string,
  usuarioId: string,
  respuestas: Array<{ destelloId: string; autorAdivinadoId: string }>
): Promise<{ aciertos: number; puntosGanados: number; detalles: Array<{ destelloId: string; correcto: boolean; autorRealId: string }> }> {
  await ensureInitialized();
  const store = getStore();

  let aciertos = 0;
  const detalles: Array<{ destelloId: string; correcto: boolean; autorRealId: string }> = [];

  for (const resp of respuestas) {
    const d = store.destellos.find((x) => x.id === resp.destelloId);
    if (!d) continue;

    const correcto = d.usuario_id === resp.autorAdivinadoId;
    if (correcto) aciertos += 1;

    detalles.push({
      destelloId: d.id,
      correcto,
      autorRealId: d.usuario_id,
    });

    store.adivinanzas.push({
      id: uuidv4(),
      grupo_id: grupoId,
      fecha,
      usuario_id: usuarioId,
      destello_id: d.id,
      autor_adivinado_id: resp.autorAdivinadoId,
      es_correcto: correcto,
      creado_en: new Date().toISOString(),
    });
  }

  // +1 punto por cada acierto
  const puntosGanados = aciertos * getPuntosPorEvento('adivina_quien_acierto');
  if (puntosGanados > 0) {
    await otorgarPuntos(
      grupoId,
      usuarioId,
      fecha,
      'adivina_quien_acierto',
      puntosGanados,
      `🎯 ${aciertos} acierto(s) en Adiviná Quién!`
    );
  }

  return { aciertos, puntosGanados, detalles };
}

// ==============================================================================
// MINI-JUEGO 4: Votación Cruzada del Día
// ==============================================================================

export async function registrarVotoCruzado(
  grupoId: string,
  fecha: string,
  votanteId: string,
  destelloId: string
): Promise<{ ok: boolean; mensaje: string }> {
  await ensureInitialized();
  const store = getStore();

  const destello = store.destellos.find((d) => d.id === destelloId);
  if (!destello) return { ok: false, mensaje: 'El destello no existe.' };

  if (destello.usuario_id === votanteId) {
    return { ok: false, mensaje: '¡No podés votar tu propia foto, pícaro/a! 😉' };
  }

  const votoPrevio = store.votosCruzados.find(
    (v) => v.grupo_id === grupoId && v.fecha === fecha && v.votante_id === votanteId
  );

  if (votoPrevio) {
    // Si ya votó, actualizamos su voto
    const destelloAnterior = store.destellos.find((d) => d.id === votoPrevio.destello_id);
    if (destelloAnterior && destelloAnterior.votos_comunidad > 0) {
      destelloAnterior.votos_comunidad -= 1;
    }
    votoPrevio.destello_id = destelloId;
  } else {
    store.votosCruzados.push({
      id: uuidv4(),
      grupo_id: grupoId,
      fecha,
      votante_id: votanteId,
      destello_id: destelloId,
      creado_en: new Date().toISOString(),
    });
  }

  destello.votos_comunidad = (destello.votos_comunidad || 0) + 1;
  return { ok: true, mensaje: '¡Tu voto fue registrado con éxito! ❤️' };
}

export async function obtenerVotoUsuarioHoy(grupoId: string, fecha: string, votanteId: string): Promise<string | null> {
  await ensureInitialized();
  const store = getStore();
  const voto = store.votosCruzados.find(
    (v) => v.grupo_id === grupoId && v.fecha === fecha && v.votante_id === votanteId
  );
  return voto ? voto.destello_id : null;
}

// ==============================================================================
// MINI-JUEGO 3: Foto del Pasado (Semanal)
// ==============================================================================

export async function obtenerFotoPasadoSemanal(grupoId: string, semana: string) {
  await ensureInitialized();
  const store = getStore();
  const foto = store.fotosPasado.find((f) => f.grupo_id === grupoId && f.semana === semana && !f.cerrada);
  if (!foto) return null;

  const autor = store.usuarios.find((u) => u.id === foto.usuario_id);
  const adivinanzas = store.fotosPasadoAdivinanzas.filter((a) => a.foto_pasado_id === foto.id);

  return {
    ...foto,
    autor_nombre: autor?.nombre || 'Anónimo',
    autor_apodo: autor?.apodo || 'Familiar',
    adivinanzas_count: adivinanzas.length,
  };
}

export async function subirFotoPasado(data: {
  grupo_id: string;
  semana: string;
  usuario_id: string;
  media_url: string;
  anio_real: number;
  lugar_real: string;
  pista?: string;
}): Promise<JuegoFotoPasado> {
  await ensureInitialized();
  const nuevaFoto: JuegoFotoPasado = {
    id: uuidv4(),
    ...data,
    cerrada: false,
    creado_en: new Date().toISOString(),
  };

  const store = getStore();
  store.fotosPasado.push(nuevaFoto);
  return nuevaFoto;
}

export async function registrarAdivinanzaFotoPasado(
  fotoPasadoId: string,
  usuarioId: string,
  anioAdivinado: number,
  lugarAdivinado?: string
): Promise<{ puntos: number; anioReal: number; lugarReal: string; diferencia: number }> {
  await ensureInitialized();
  const store = getStore();
  const foto = store.fotosPasado.find((f) => f.id === fotoPasadoId);
  if (!foto) throw new Error('Foto no encontrada');

  const dif = Math.abs(foto.anio_real - anioAdivinado);
  let puntos = 0;
  let tipoEvento: TipoEventoPuntos | null = null;

  if (dif === 0) {
    puntos = getPuntosPorEvento('foto_pasado_acierto_exacto'); // +3
    tipoEvento = 'foto_pasado_acierto_exacto';
  } else if (dif <= 2) {
    puntos = getPuntosPorEvento('foto_pasado_acierto_cercano'); // +1
    tipoEvento = 'foto_pasado_acierto_cercano';
  }

  store.fotosPasadoAdivinanzas.push({
    id: uuidv4(),
    foto_pasado_id: fotoPasadoId,
    usuario_id: usuarioId,
    anio_adivinado: anioAdivinado,
    lugar_adivinado: lugarAdivinado,
    puntos_obtenidos: puntos,
    creado_en: new Date().toISOString(),
  });

  if (puntos > 0 && tipoEvento) {
    await otorgarPuntos(
      foto.grupo_id,
      usuarioId,
      getFechaArgentina(),
      tipoEvento,
      puntos,
      DESCRIPCIONES_PUNTOS[tipoEvento],
      foto.id
    );
  }

  // Quien la subió suma +1 por cada participante que adivina
  await otorgarPuntos(
    foto.grupo_id,
    foto.usuario_id,
    getFechaArgentina(),
    'foto_pasado_anfitrion',
    getPuntosPorEvento('foto_pasado_anfitrion'),
    DESCRIPCIONES_PUNTOS.foto_pasado_anfitrion,
    foto.id
  );

  return {
    puntos,
    anioReal: foto.anio_real,
    lugarReal: foto.lugar_real,
    diferencia: dif,
  };
}

export async function haAdivinadoFotoPasado(fotoPasadoId: string, usuarioId: string) {
  await ensureInitialized();
  const store = getStore();
  return store.fotosPasadoAdivinanzas.find(
    (a) => a.foto_pasado_id === fotoPasadoId && a.usuario_id === usuarioId
  );
}

// ==============================================================================
// CIERRE DEL DÍA (Cron 23:59 o Botón de Prueba en Admin)
// ==============================================================================

export async function cerrarDiaGrupo(grupoId: string, fecha: string) {
  await ensureInitialized();
  const store = getStore();

  const destellos = store.destellos.filter((d) => d.grupo_id === grupoId && d.fecha === fecha && !d.moderado);
  if (destellos.length === 0) {
    return {
      cerrado: true,
      mensaje: 'No hubo fotos subidas en este día.',
      totalParticipantes: 0,
    };
  }

  // 1. Elegir Destello del Día con Gemini (o fallback inteligente)
  const candidatos = destellos.map((d) => {
    const autor = store.usuarios.find((u) => u.id === d.usuario_id);
    return {
      id: d.id,
      usuario_id: d.usuario_id,
      autor_nombre: autor?.nombre || 'Familiar',
      media_url: d.media_url,
      pie_de_foto: d.pie_de_foto,
      cumple_reto: d.cumple_reto,
    };
  });

  const { ganadorDestelloId, ganadorUsuarioId } = await elegirDestelloDelDia(candidatos);

  if (ganadorDestelloId && ganadorUsuarioId) {
    const destelloGanador = store.destellos.find((d) => d.id === ganadorDestelloId);
    if (destelloGanador) {
      destelloGanador.es_destello_del_dia = true;
    }

    // Otorgar +10 puntos al ganador
    await otorgarPuntos(
      grupoId,
      ganadorUsuarioId,
      fecha,
      'destello_del_dia',
      getPuntosPorEvento('destello_del_dia'),
      DESCRIPCIONES_PUNTOS.destello_del_dia,
      ganadorDestelloId
    );
  }

  // 2. Votación Comunitaria: Determinar el más votado por el grupo
  let destelloFavoritoComunidad: Destello | null = null;
  let maxVotos = -1;

  for (const d of destellos) {
    if ((d.votos_comunidad || 0) > maxVotos && (d.votos_comunidad || 0) > 0) {
      maxVotos = d.votos_comunidad;
      destelloFavoritoComunidad = d;
    }
  }

  if (destelloFavoritoComunidad) {
    destelloFavoritoComunidad.es_favorito_comunidad = true;
    // Otorgar +5 puntos al favorito del grupo
    await otorgarPuntos(
      grupoId,
      destelloFavoritoComunidad.usuario_id,
      fecha,
      'votacion_comunidad_ganador',
      getPuntosPorEvento('votacion_comunidad_ganador'),
      DESCRIPCIONES_PUNTOS.votacion_comunidad_ganador,
      destelloFavoritoComunidad.id
    );
  }

  // Registrar evaluación del día
  const evalIdx = store.evaluaciones.findIndex((e) => e.grupo_id === grupoId && e.fecha === fecha);
  const nuevaEval: EvaluacionDiaria = {
    id: uuidv4(),
    grupo_id: grupoId,
    fecha,
    destello_ganador_id: ganadorDestelloId,
    destello_favorito_id: destelloFavoritoComunidad?.id || null,
    total_participantes: destellos.length,
    cerrado: true,
    cerrado_en: new Date().toISOString(),
  };

  if (evalIdx !== -1) {
    store.evaluaciones[evalIdx] = nuevaEval;
  } else {
    store.evaluaciones.push(nuevaEval);
  }

  return {
    cerrado: true,
    ganadorDestelloId,
    ganadorUsuarioId,
    favoritoComunidadId: destelloFavoritoComunidad?.id || null,
    totalParticipantes: destellos.length,
  };
}

export async function obtenerEvaluacionDia(grupoId: string, fecha: string): Promise<EvaluacionDiaria | null> {
  await ensureInitialized();
  const store = getStore();
  return store.evaluaciones.find((e) => e.grupo_id === grupoId && e.fecha === fecha) || null;
}
