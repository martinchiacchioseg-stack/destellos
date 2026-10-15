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
  JuegoRuletaRusa,
  JuegoRuletaPregunta,
  NivelRuleta,
  JuegoProdeFecha,
  JuegoProdePartido,
  JuegoProdePronostico,
  ResultadoPronostico,
  Publicidad,
  UbicacionPublicidad,
  ReglasConfig,
  PuntosEvento,
  RankingItem,
  RetoDiario,
  TipoEventoPuntos,
  Usuario,
  UsuarioPublico,
  DificultadTrivia,
  TriviaPregunta,
  TriviaIntento,
} from './types';
import { hashPassword } from './auth';
import { getFechaArgentina, getAyerFechaArgentina, getSemanaArgentina } from './date-utils';
import fs from 'fs';
import path from 'path';
import { getPuntosPorEvento, DESCRIPCIONES_PUNTOS } from './puntos';
import { supabaseAdmin, isSupabaseConfigured } from './supabase';
import { elegirDestelloDelDia } from './gemini';
import { procesarYGuardarMedia } from './storage';
import {
  COLLECTIONS,
  cargarTodo as cargarTodoDeBase,
  dbUpsert,
  dbUpsertBatch,
  dbDelete,
  dbGet,
  dbGetAll,
  leerVersion as leerVersionDeBase,
  cantidadUsuarios as cantidadUsuariosEnBase,
  importarSiVacia as importarSiVaciaEnBase,
  hacerBackup as hacerBackupBase,
} from './sqlite-store';

// ==============================================================================
// ALMACENAMIENTO PERSISTENTE EN DISCO (SQLITE WAL) + SINCRONIZACIÓN MULTI-WORKER
// ==============================================================================

export const DEFAULT_GRUPO_ID = 'grupo-familia-chiaccio-001';

const DATA_FILE_PATH = path.join(process.cwd(), 'data', 'destellos_store.json'); // solo para migrar el JSON viejo

const globalState = global as unknown as {
  __destellos_store?: StateStore;
  __destellos_store_version?: number;
};

interface StateStore {
  _version?: number;
  _updated_at?: string;
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
  ruletaRondas: JuegoRuletaRusa[];
  ruletaPreguntas: JuegoRuletaPregunta[];
  prodeFechas: JuegoProdeFecha[];
  prodePartidos: JuegoProdePartido[];
  prodePronosticos: JuegoProdePronostico[];
  publicidades: Publicidad[];
  reglas: ReglasConfig[];
  triviaPreguntas: TriviaPregunta[];
  triviaIntentos: TriviaIntento[];
  initialized: boolean;
}

function recargarDesdeBase(store: StateStore) {
  const { data, version } = cargarTodoDeBase();
  const s = store as unknown as Record<string, any[]>;
  for (const c of COLLECTIONS) {
    s[c] = Array.isArray(data[c]) ? data[c] : [];
  }
  store.initialized = true;
  globalState.__destellos_store_version = version;
}

/** Primera carga: lee la base; si está vacía e hay un JSON viejo, lo migra una única vez. */
function cargaInicial(store: StateStore) {
  if (cantidadUsuariosEnBase() === 0 && fs.existsSync(DATA_FILE_PATH)) {
    try {
      const viejo = JSON.parse(fs.readFileSync(DATA_FILE_PATH, 'utf-8'));
      if (importarSiVaciaEnBase(viejo)) {
        console.log('[db] Datos del JSON anterior migrados a SQLite.');
      }
    } catch (e) {
      console.error('[db] No se pudo migrar el JSON anterior:', e);
    }
  }
  if (cantidadUsuariosEnBase() > 0) {
    recargarDesdeBase(store);
    try {
      hacerBackupBase();
    } catch {}
  }
}

/**
 * Guarda de inmediato los cambios pendientes en SQLite.
 * Utiliza dbUpsertBatch para persistencia atómica sin borrados destructivos.
 */
export function persistirStore(store: StateStore) {
  try {
    for (const c of COLLECTIONS) {
      const items = (store as unknown as Record<string, any[]>)[c];
      if (Array.isArray(items) && items.length > 0) {
        dbUpsertBatch(c, items);
      }
    }
    const version = leerVersionDeBase();
    globalState.__destellos_store_version = version;
    store._version = version;
    store._updated_at = new Date().toISOString();
  } catch (err) {
    console.error('Error al persistir store en SQLite:', err);
  }
}

/** Sincroniza: trae cambios de SQLite si otro worker o proceso actualizó la base */
function sincronizarInterno(store: StateStore) {
  try {
    if (!store.initialized) {
      cargaInicial(store);
      return;
    }
    const vBase = leerVersionDeBase();
    if (vBase !== (globalState.__destellos_store_version || 0)) {
      recargarDesdeBase(store);
    }
  } catch (err) {
    console.error('Error al sincronizar con SQLite:', err);
  }
}

export function sincronizarConDiscoSiCambio(): StateStore {
  return getStore();
}

export function getStore(): StateStore {
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
      ruletaRondas: [],
      ruletaPreguntas: [],
      prodeFechas: [],
      prodePartidos: [],
      prodePronosticos: [],
      publicidades: [],
      reglas: [],
      triviaPreguntas: [],
      triviaIntentos: [],
      initialized: false,
    };
    globalState.__destellos_store_version = 0;
  }

  const store = globalState.__destellos_store;
  sincronizarInterno(store);
  return store;
}

export async function obtenerGrupoIdPorDefecto(): Promise<string> {
  await ensureInitialized();
  const store = sincronizarConDiscoSiCambio();
  if (store.grupos && store.grupos.length > 0) {
    const activo = store.grupos.find((g) => g.activo);
    if (activo) return activo.id;
    return store.grupos[0].id;
  }
  return DEFAULT_GRUPO_ID;
}

export function migrarMediaExistenteADisco() {
  const store = getStore();
  let modificado = false;

  (store.destellos || []).forEach((d) => {
    if (d.media_url && d.media_url.startsWith('data:')) {
      d.media_url = procesarYGuardarMedia(d.media_url, `destello-${d.usuario_id}`);
      modificado = true;
    }
    if (d.thumbnail_url && d.thumbnail_url.startsWith('data:')) {
      d.thumbnail_url = procesarYGuardarMedia(d.thumbnail_url, `thumb-${d.usuario_id}`);
      modificado = true;
    }
  });

  (store.publicidades || []).forEach((p) => {
    if (p.imagen_url && p.imagen_url.startsWith('data:')) {
      p.imagen_url = procesarYGuardarMedia(p.imagen_url, 'pub');
      modificado = true;
    }
  });

  if (modificado) {
    persistirStore(store);
  }
}

/**
 * Inicialización segura de Superadmin y datos de bienvenida.
 * NUNCA sobreescribe si el archivo en disco ya existe.
 */
export async function ensureInitialized() {
  const store = getStore();
  if (store.initialized && store.usuarios && store.usuarios.length > 0) return;

  // 1. Si la base de datos ya tiene usuarios, cargarla y NUNCA ejecutar el seed
  if (cantidadUsuariosEnBase() > 0) {
    getStore(); // carga/sincroniza desde SQLite
    if (store.initialized) migrarMediaExistenteADisco();
    return;
  }

  const superadminEmail = process.env.SUPERADMIN_EMAIL || 'martinchiaccio.seg@gmail.com';
  const superadminPass = process.env.SUPERADMIN_INITIAL_PASSWORD || 'qwerty1234';

  const defaultGroupId = DEFAULT_GRUPO_ID;
  const superadminId = 'usr-superadmin-001';

  const passHashSuper = await hashPassword(superadminPass);

  // 1. Grupo inicial: Familia Chiaccio
  const grupoFamilia: Grupo = {
    id: defaultGroupId,
    nombre: 'Familia Chiaccio',
    codigo_invitacion: 'CHIACCIO26',
    descripcion: 'Nuestra familia compartiendo recuerdos, jugando y celebrando el destello del día.',
    activo: true,
    creado_en: new Date().toISOString(),
  };

  // 2. Usuarios iniciales: ÚNICAMENTE Martín Chiaccio (Superadmin)
  const usuarios: Usuario[] = [
    {
      id: superadminId,
      email: superadminEmail.toLowerCase().trim(),
      password_hash: passHashSuper,
      nombre: 'Martín Chiaccio',
      apodo: 'Martín',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      rol: 'superadmin',
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
    usuario_id: superadminId,
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

  // 6. Puntos iniciales
  const puntos: PuntosEvento[] = [
    {
      id: 'pt-001',
      grupo_id: defaultGroupId,
      usuario_id: superadminId,
      fecha: ayerStr,
      tipo_evento: 'destello_del_dia',
      puntos: 10,
      descripcion: DESCRIPCIONES_PUNTOS.destello_del_dia,
      referencia_id: destelloAyerGanador.id,
      creado_en: new Date(Date.now() - 86400000).toISOString(),
    },
  ];

  // 7. Evaluación de ayer
  const evaluacionAyer: EvaluacionDiaria = {
    id: 'eval-' + ayerStr,
    grupo_id: defaultGroupId,
    fecha: ayerStr,
    destello_ganador_id: destelloAyerGanador.id,
    destello_favorito_id: destelloAyerGanador.id,
    total_participantes: 1,
    cerrado: true,
    cerrado_en: new Date(Date.now() - 40000000).toISOString(),
  };

  // 8. Foto del Pasado (Semanal)
  const fotoPasadoSemanal: JuegoFotoPasado = {
    id: 'foto-pasado-001',
    grupo_id: defaultGroupId,
    semana: semanaStr,
    usuario_id: superadminId,
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
  store.destellos = [destelloAyerGanador];
  store.evaluaciones = [evaluacionAyer];
  store.puntos = puntos;
  store.fotosPasado = [fotoPasadoSemanal];

  // 9. Ruleta Rusa inicial
  const rondaRuletaInicial: JuegoRuletaRusa = {
    id: 'ronda-ruleta-001',
    grupo_id: defaultGroupId,
    nivel_maximo: 'picante',
    estado: 'ruleta',
    cerrada: false,
    creado_en: new Date().toISOString(),
  };

  const preguntasRuletaInicial: JuegoRuletaPregunta[] = [
    {
      id: 'preg-001',
      ronda_id: 'ronda-ruleta-001',
      autor_usuario_id: superadminId,
      texto_pregunta: '¿Quién fue el último en romper algo en la casa y no dijo nada?',
      nivel: 'suave',
      aprobada_ia: true,
      asignada_a_usuario_id: superadminId,
      es_bala: false,
      respondida: true,
      respuesta_texto: '¡Fue papá con la jarra de vidrio en año nuevo, yo lo vi esconder los pedazos! 😂',
      paso_utilizado: false,
      reacciones_risa: 3,
      reacciones_fuego: 1,
      reacciones_amor: 2,
      creado_en: new Date().toISOString(),
    },
    {
      id: 'preg-002',
      ronda_id: 'ronda-ruleta-001',
      autor_usuario_id: superadminId,
      texto_pregunta: '¿Cuál fue la peor anécdota o papelón cocinando algo para la familia?',
      nivel: 'picante',
      aprobada_ia: true,
      asignada_a_usuario_id: superadminId,
      es_bala: true, // ¡Bala! Debe responder con foto o video
      respondida: true,
      respuesta_texto: '¡Salió la bala! Acá tienen la torta quemada que intenté rescatar con dulce de leche 🎂🔥',
      respuesta_media_url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&auto=format&fit=crop&q=80',
      paso_utilizado: false,
      reacciones_risa: 4,
      reacciones_fuego: 3,
      reacciones_amor: 1,
      creado_en: new Date().toISOString(),
    },
    {
      id: 'preg-003',
      ronda_id: 'ronda-ruleta-001',
      autor_usuario_id: superadminId,
      texto_pregunta: '¿Qué comida típica familiar secretamente no te gusta nada?',
      nivel: 'suave',
      aprobada_ia: true,
      asignada_a_usuario_id: superadminId,
      es_bala: false,
      respondida: true,
      respuesta_texto: 'Perdón a todos... ¡pero el pastel de papas con pasas de uva me parece un crimen! 🙈',
      paso_utilizado: false,
      reacciones_risa: 5,
      reacciones_fuego: 0,
      reacciones_amor: 3,
      creado_en: new Date().toISOString(),
    },
  ];

  // 10. Prode del Fin de Semana inicial
  const fechaProdeInicial: JuegoProdeFecha = {
    id: 'prode-fecha-001',
    grupo_id: defaultGroupId,
    torneo_nombre: 'Liga Profesional Argentina',
    numero_fecha: 14,
    fecha_inicio: new Date(Date.now() + 86400000).toISOString(),
    fecha_fin: new Date(Date.now() + 3 * 86400000).toISOString(),
    cerrada: false,
    creado_en: new Date().toISOString(),
  };

  const partidosProdeInicial: JuegoProdePartido[] = [
    {
      id: 'partido-001',
      fecha_prode_id: 'prode-fecha-001',
      equipo_local: 'Boca Juniors',
      escudo_local: 'https://upload.wikimedia.org/wikipedia/commons/4/41/CABJ-Sitio-Oficial.png',
      equipo_visitante: 'River Plate',
      escudo_visitante: 'https://upload.wikimedia.org/wikipedia/commons/a/ac/Escudo_del_C_A_River_Plate.svg',
      fecha_hora_partido: new Date(Date.now() + 24 * 3600000).toISOString(),
      estado_partido: 'programado',
      creado_en: new Date().toISOString(),
    },
    {
      id: 'partido-002',
      fecha_prode_id: 'prode-fecha-001',
      equipo_local: 'Racing Club',
      escudo_local: 'https://upload.wikimedia.org/wikipedia/commons/5/56/Escudo_de_Racing_Club_%282014%29.svg',
      equipo_visitante: 'Independiente',
      escudo_visitante: 'https://upload.wikimedia.org/wikipedia/commons/d/db/Escudo_del_Club_Atl%C3%A9tico_Independiente.svg',
      fecha_hora_partido: new Date(Date.now() + 28 * 3600000).toISOString(),
      estado_partido: 'programado',
      creado_en: new Date().toISOString(),
    },
    {
      id: 'partido-003',
      fecha_prode_id: 'prode-fecha-001',
      equipo_local: 'San Lorenzo',
      escudo_local: 'https://upload.wikimedia.org/wikipedia/commons/7/77/Escudo_del_Club_Atl%C3%A9tico_San_Lorenzo_de_Almagro.svg',
      equipo_visitante: 'Huracán',
      escudo_visitante: 'https://upload.wikimedia.org/wikipedia/commons/1/1a/Escudo_del_Club_Atl%C3%A9tico_Hurac%C3%A1n.png',
      fecha_hora_partido: new Date(Date.now() + 48 * 3600000).toISOString(),
      estado_partido: 'programado',
      creado_en: new Date().toISOString(),
    },
  ];

  store.ruletaRondas = [rondaRuletaInicial];
  store.ruletaPreguntas = preguntasRuletaInicial;
  store.prodeFechas = [fechaProdeInicial];
  store.prodePartidos = partidosProdeInicial;
  store.prodePronosticos = [];

  // 11. Publicidades configuradas por Superadmin (inicia limpio)
  store.publicidades = [];

  // 12. Reglas del grupo
  store.reglas = [
    {
      id: 'reglas-' + defaultGroupId,
      grupo_id: defaultGroupId,
      solo_mostrar_si_todos_subieron: true,
      racha_activa: true,
      apurar_whatsapp_activo: true,
      nivel_ruleta_maximo: 'picante',
      puntos_destello_ganador: 10,
      puntos_participacion: 1,
    },
  ];

  store.initialized = true;
  persistirStore(store);

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

  const store = sincronizarConDiscoSiCambio();
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

  const store = sincronizarConDiscoSiCambio();
  return store.usuarios.find((x) => x.id === id) || null;
}

export async function crearUsuario(data: {
  email: string;
  passwordTemporal: string;
  nombre: string;
  apodo?: string;
  telefono?: string;
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
    telefono: data.telefono?.trim() || undefined,
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

  const store = sincronizarConDiscoSiCambio();
  store.usuarios.push(nuevoUsuario);
  dbUpsert('usuarios', nuevoUsuario);
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
    persistirStore(store);
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
    persistirStore(store);
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
  const store = sincronizarConDiscoSiCambio();
  return store.usuarios
    .filter((u) => u.grupo_id === grupoId && u.activo)
    .map(({ password_hash, intentos_fallidos, bloqueado_hasta, ...safe }) => safe);
}

export async function listarTodosLosUsuarios(): Promise<UsuarioPublico[]> {
  await ensureInitialized();
  const store = sincronizarConDiscoSiCambio();
  return store.usuarios.map(({ password_hash, intentos_fallidos, bloqueado_hasta, ...safe }) => safe);
}

export async function actualizarUsuario(
  usuarioId: string,
  data: {
    nombre?: string;
    apodo?: string;
    telefono?: string;
    avatar_url?: string;
    email?: string;
    rol?: 'superadmin' | 'admin' | 'miembro';
    grupo_id?: string | null;
    passwordTemporal?: string;
    debe_cambiar_password?: boolean;
    activo?: boolean;
  }
): Promise<UsuarioPublico | null> {
  await ensureInitialized();
  const store = sincronizarConDiscoSiCambio();
  const u = store.usuarios.find((x) => x.id === usuarioId);
  if (!u) return null;

  if (data.nombre) u.nombre = data.nombre.trim();
  if (data.apodo !== undefined) u.apodo = data.apodo.trim();
  if (data.telefono !== undefined) u.telefono = data.telefono.trim();
  if (data.email) u.email = data.email.toLowerCase().trim();
  if (data.rol) u.rol = data.rol;
  if (data.grupo_id !== undefined) u.grupo_id = data.grupo_id;
  if (data.activo !== undefined) u.activo = data.activo;
  if (data.avatar_url !== undefined) {
    let url = data.avatar_url;
    if (url && url.startsWith('data:')) {
      url = procesarYGuardarMedia(url, `avatar-${usuarioId}`);
    }
    u.avatar_url = url;
  }
  if (data.debe_cambiar_password !== undefined) {
    u.debe_cambiar_password = data.debe_cambiar_password;
  }
  if (data.passwordTemporal) {
    u.password_hash = await hashPassword(data.passwordTemporal);
    u.debe_cambiar_password = true;
    u.intentos_fallidos = 0;
    u.bloqueado_hasta = null;
  }

  persistirStore(store);
  dbUpsert('usuarios', u);
  const { password_hash, intentos_fallidos, bloqueado_hasta, ...safe } = u;
  return safe as UsuarioPublico;
}

export async function eliminarUsuarioPermanente(usuarioId: string): Promise<boolean> {
  await ensureInitialized();
  dbDelete('usuarios', usuarioId);
  const store = sincronizarConDiscoSiCambio();
  const idx = store.usuarios.findIndex((u) => u.id === usuarioId);
  if (idx !== -1) {
    store.usuarios.splice(idx, 1);
  }
  store.destellos = store.destellos.filter((d) => d.usuario_id !== usuarioId);
  return true;
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
  dbUpsert('grupos', nuevoGrupo);
  return nuevoGrupo;
}

export async function eliminarGrupo(grupoId: string): Promise<boolean> {
  await ensureInitialized();
  const store = getStore();
  const idx = store.grupos.findIndex((g) => g.id === grupoId);
  if (idx !== -1) {
    store.grupos[idx].activo = false;
    dbUpsert('grupos', store.grupos[idx]);
    return true;
  }
  return false;
}

export async function actualizarGrupo(
  grupoId: string,
  data: { nombre?: string; descripcion?: string }
): Promise<Grupo | null> {
  await ensureInitialized();
  const store = getStore();
  const g = store.grupos.find((x) => x.id === grupoId);
  if (!g) return null;

  if (data.nombre) g.nombre = data.nombre.trim();
  if (data.descripcion !== undefined) g.descripcion = data.descripcion.trim();

  dbUpsert('grupos', g);
  return g;
}

export async function eliminarGrupoPermanente(grupoId: string): Promise<boolean> {
  await ensureInitialized();
  dbDelete('grupos', grupoId);
  const store = getStore();
  const idx = store.grupos.findIndex((g) => g.id === grupoId);
  if (idx === -1) return false;

  store.grupos.splice(idx, 1);
  // Reasignar usuarios o desactivarlos si no tienen grupo
  store.usuarios.forEach((u) => {
    if (u.grupo_id === grupoId && u.rol !== 'superadmin') {
      u.activo = false;
      dbUpsert('usuarios', u);
    }
  });
  return true;
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
  const store = sincronizarConDiscoSiCambio();

  // Optimización de imágenes: si vienen en base64, se guardan en disco /public/uploads/
  let mediaUrl = data.media_url;
  let thumbUrl = data.thumbnail_url || data.media_url;

  if (mediaUrl && mediaUrl.startsWith('data:')) {
    mediaUrl = procesarYGuardarMedia(mediaUrl, `destello-${data.usuario_id}`);
  }
  if (thumbUrl && thumbUrl.startsWith('data:')) {
    thumbUrl = procesarYGuardarMedia(thumbUrl, `thumb-${data.usuario_id}`);
  }

  const datosLimpios = {
    ...data,
    media_url: mediaUrl,
    thumbnail_url: thumbUrl,
  };

  const existIdx = store.destellos.findIndex(
    (x) => x.grupo_id === data.grupo_id && x.usuario_id === data.usuario_id && x.fecha === data.fecha
  );

  let destelloFinal: Destello;
  const esActualizacion = existIdx !== -1;

  if (esActualizacion) {
    destelloFinal = {
      ...store.destellos[existIdx],
      ...datosLimpios,
      actualizado_en: new Date().toISOString(),
    };
    store.destellos[existIdx] = destelloFinal;
  } else {
    destelloFinal = {
      id: uuidv4(),
      ...datosLimpios,
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

  persistirStore(store);
  dbUpsert('destellos', destelloFinal);

  const usuario = store.usuarios.find((u) => u.id === destelloFinal.usuario_id);
  return {
    ...destelloFinal,
    usuario: usuario ? { id: usuario.id, email: usuario.email, nombre: usuario.nombre, apodo: usuario.apodo, avatar_url: usuario.avatar_url, rol: usuario.rol, grupo_id: usuario.grupo_id, debe_cambiar_password: usuario.debe_cambiar_password, activo: usuario.activo, creado_en: usuario.creado_en } : undefined,
  };
}

export async function listarDestellosDia(grupoId: string, fecha: string): Promise<Destello[]> {
  await ensureInitialized();
  const store = sincronizarConDiscoSiCambio();
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

export async function obtenerDestelloGanadorDia(grupoId: string, fecha: string): Promise<Destello | null> {
  await ensureInitialized();
  const store = getStore();
  const d = store.destellos.find((x) => x.grupo_id === grupoId && x.fecha === fecha && x.es_destello_del_dia && !x.moderado);
  if (!d) return null;
  const usuario = store.usuarios.find((u) => u.id === d.usuario_id);
  return {
    ...d,
    usuario: usuario ? { id: usuario.id, email: usuario.email, nombre: usuario.nombre, apodo: usuario.apodo, avatar_url: usuario.avatar_url, rol: usuario.rol, grupo_id: usuario.grupo_id, debe_cambiar_password: usuario.debe_cambiar_password, activo: usuario.activo, creado_en: usuario.creado_en } : undefined,
  };
}

// ==============================================================================
// RACHAS FAMILIARES (Streaks 🔥) Y MURO DE LOS COLGADOS (Fantasmas 👻)
// ==============================================================================

export async function obtenerRachaUsuario(usuarioId: string, grupoId: string): Promise<number> {
  await ensureInitialized();
  const store = getStore();
  const misDestellos = store.destellos
    .filter((d) => d.grupo_id === grupoId && d.usuario_id === usuarioId && !d.moderado)
    .map((d) => d.fecha)
    .sort()
    .reverse();

  if (misDestellos.length === 0) return 0;

  let racha = 0;
  const hoyStr = getFechaArgentina();
  let fechaEsperada = new Date();

  // Si hoy aún no subió, revisamos si subió ayer para no romper la racha
  const subioHoy = misDestellos.includes(hoyStr);
  if (!subioHoy) {
    fechaEsperada.setDate(fechaEsperada.getDate() - 1);
  }

  while (true) {
    const fStr = getFechaArgentina(fechaEsperada);
    if (misDestellos.includes(fStr)) {
      racha++;
      fechaEsperada.setDate(fechaEsperada.getDate() - 1);
    } else {
      break;
    }
  }

  return racha;
}

export async function obtenerColgadosAyer(grupoId: string): Promise<UsuarioPublico[]> {
  await ensureInitialized();
  const store = sincronizarConDiscoSiCambio();
  const ayerStr = getAyerFechaArgentina();
  const miembros = store.usuarios.filter((u) => u.grupo_id === grupoId && u.activo);

  const subieronAyer = new Set(
    store.destellos.filter((d) => d.grupo_id === grupoId && d.fecha === ayerStr && !d.moderado).map((d) => d.usuario_id)
  );

  return miembros
    .filter((m) => !subieronAyer.has(m.id))
    .map(({ password_hash, intentos_fallidos, bloqueado_hasta, ...safe }) => safe);
}

export async function obtenerFaltantesHoy(grupoId: string, fecha: string): Promise<UsuarioPublico[]> {
  await ensureInitialized();
  const store = sincronizarConDiscoSiCambio();
  const miembros = store.usuarios.filter((u) => u.grupo_id === grupoId && u.activo);
  const subieronHoy = new Set(
    store.destellos.filter((d) => d.grupo_id === grupoId && d.fecha === fecha && !d.moderado).map((d) => d.usuario_id)
  );

  return miembros
    .filter((m) => !subieronHoy.has(m.id))
    .map(({ password_hash, intentos_fallidos, bloqueado_hasta, ...safe }) => safe);
}

export function generarEnlaceApurarWhatsApp(nombreDestinatario: string, telefono?: string): string {
  const mensajes = [
    `¡Che ${nombreDestinatario}! Dale que todavía no subiste tu foto del día a Destellos. ¡No nos dejes con la intriga que hoy gano yo! 📸✨`,
    `¡Hola ${nombreDestinatario}! La familia está esperando tu destello de hoy. ¡Apurate antes de las 23:59 que te sacan puntos! ⏳✨`,
    `¡Che dormilón/a ${nombreDestinatario}! Falta tu destello del día en Destellos. Entrá acá y subilo antes de que cierre: https://destellos.vercel.app 🚀`,
    `¡${nombreDestinatario}! Todo el grupo ya subió su destello y faltás vos solo/a. ¡No nos dejes las fotos borrosas, subí la tuya ya! 😉📲`,
  ];
  const mensajeElegido = mensajes[Math.floor(Math.random() * mensajes.length)];
  const encoded = encodeURIComponent(mensajeElegido);

  if (telefono && telefono.replace(/\D/g, '').length >= 8) {
    const cleanTel = telefono.replace(/\D/g, '');
    return `https://wa.me/${cleanTel}?text=${encoded}`;
  }
  return `https://wa.me/?text=${encoded}`;
}

// ==============================================================================
// PUBLICIDADES Y MONETIZACIÓN (Superadmin)
// ==============================================================================

export async function obtenerPublicidadPorUbicacion(ubicacion: UbicacionPublicidad): Promise<Publicidad | null> {
  await ensureInitialized();
  const store = sincronizarConDiscoSiCambio();
  const activas = (store.publicidades || []).filter((p) => p.ubicacion === ubicacion && p.activa);
  if (activas.length === 0) return null;
  return activas[Math.floor(Math.random() * activas.length)];
}

export async function listarPublicidades(): Promise<Publicidad[]> {
  await ensureInitialized();
  const store = sincronizarConDiscoSiCambio();
  return store.publicidades || [];
}

export async function guardarPublicidad(data: Omit<Publicidad, 'id' | 'creado_en'> & { id?: string }): Promise<Publicidad> {
  await ensureInitialized();
  const store = sincronizarConDiscoSiCambio();

  // Optimización crítica: si la imagen vino en base64, guardarla en disco /public/uploads/
  let imagenUrl = data.imagen_url;
  if (imagenUrl && imagenUrl.startsWith('data:')) {
    imagenUrl = procesarYGuardarMedia(imagenUrl, 'pub');
  }

  if (data.id) {
    const idx = store.publicidades.findIndex((p) => p.id === data.id);
    if (idx !== -1) {
      store.publicidades[idx] = {
        ...store.publicidades[idx],
        ...data,
        imagen_url: imagenUrl,
      };
      dbUpsert('publicidades', store.publicidades[idx]);
      return store.publicidades[idx];
    }
  }

  const nuevaPub: Publicidad = {
    ...data,
    id: data.id || uuidv4(),
    imagen_url: imagenUrl,
    creado_en: new Date().toISOString(),
  };
  if (!store.publicidades) store.publicidades = [];
  store.publicidades.push(nuevaPub);
  dbUpsert('publicidades', nuevaPub);
  return nuevaPub;
}

export async function eliminarPublicidad(id: string): Promise<boolean> {
  await ensureInitialized();
  dbDelete('publicidades', id);
  const store = sincronizarConDiscoSiCambio();
  if (!store.publicidades) return false;
  const idx = store.publicidades.findIndex((p) => p.id === id);
  if (idx !== -1) {
    store.publicidades.splice(idx, 1);
  }
  return true;
}

export async function obtenerReglasGrupo(grupoId: string): Promise<ReglasConfig> {
  await ensureInitialized();
  const store = getStore();
  const r = store.reglas.find((x) => x.grupo_id === grupoId);
  if (r) return r;
  return {
    id: 'reglas-def',
    grupo_id: grupoId,
    solo_mostrar_si_todos_subieron: true,
    racha_activa: true,
    apurar_whatsapp_activo: true,
    nivel_ruleta_maximo: 'picante',
    puntos_destello_ganador: 10,
    puntos_participacion: 1,
  };
}

export async function actualizarReglasGrupo(grupoId: string, data: Partial<ReglasConfig>): Promise<ReglasConfig> {
  await ensureInitialized();
  const store = getStore();
  let r = store.reglas.find((x) => x.grupo_id === grupoId);
  if (!r) {
    r = {
      id: uuidv4(),
      grupo_id: grupoId,
      solo_mostrar_si_todos_subieron: true,
      racha_activa: true,
      apurar_whatsapp_activo: true,
      nivel_ruleta_maximo: 'picante',
      puntos_destello_ganador: 10,
      puntos_participacion: 1,
      ...data,
    };
    store.reglas.push(r);
  } else {
    Object.assign(r, data);
  }
  persistirStore(store);
  return r;
}

// ==============================================================================
// MINI-JUEGO: RULETA RUSA (Etapa 6)
// ==============================================================================

export async function obtenerRondaRuletaActiva(grupoId: string) {
  await ensureInitialized();
  const store = getStore();
  let ronda = store.ruletaRondas.find((r) => r.grupo_id === grupoId && !r.cerrada);
  if (!ronda) {
    ronda = {
      id: uuidv4(),
      grupo_id: grupoId,
      nivel_maximo: 'picante',
      estado: 'preguntas',
      cerrada: false,
      creado_en: new Date().toISOString(),
    };
    store.ruletaRondas.push(ronda);
  }

  const preguntas = store.ruletaPreguntas
    .filter((p) => p.ronda_id === ronda?.id)
    .map((p) => {
      const autor = store.usuarios.find((u) => u.id === p.autor_usuario_id);
      const asignado = p.asignada_a_usuario_id ? store.usuarios.find((u) => u.id === p.asignada_a_usuario_id) : undefined;
      return {
        ...p,
        autor: autor ? { id: autor.id, email: autor.email, nombre: autor.nombre, apodo: autor.apodo, avatar_url: autor.avatar_url, rol: autor.rol, grupo_id: autor.grupo_id, debe_cambiar_password: autor.debe_cambiar_password, activo: autor.activo, creado_en: autor.creado_en } : undefined,
        asignado: asignado ? { id: asignado.id, email: asignado.email, nombre: asignado.nombre, apodo: asignado.apodo, avatar_url: asignado.avatar_url, rol: asignado.rol, grupo_id: asignado.grupo_id, debe_cambiar_password: asignado.debe_cambiar_password, activo: asignado.activo, creado_en: asignado.creado_en } : undefined,
      };
    });

  return { ronda, preguntas };
}

export async function abrirRondaRuleta(grupoId: string, nivelMaximo: NivelRuleta = 'picante'): Promise<JuegoRuletaRusa> {
  await ensureInitialized();
  const store = getStore();
  // Cerrar anteriores
  store.ruletaRondas.forEach((r) => {
    if (r.grupo_id === grupoId) r.cerrada = true;
  });

  const nueva: JuegoRuletaRusa = {
    id: uuidv4(),
    grupo_id: grupoId,
    nivel_maximo: nivelMaximo,
    estado: 'preguntas',
    cerrada: false,
    creado_en: new Date().toISOString(),
  };
  store.ruletaRondas.push(nueva);
  return nueva;
}

export async function enviarPreguntaRuleta(
  rondaId: string,
  autorId: string,
  texto: string,
  nivel: NivelRuleta
): Promise<JuegoRuletaPregunta> {
  await ensureInitialized();
  const store = getStore();

  const nuevaPregunta: JuegoRuletaPregunta = {
    id: uuidv4(),
    ronda_id: rondaId,
    autor_usuario_id: autorId,
    texto_pregunta: texto.trim(),
    nivel,
    aprobada_ia: true,
    es_bala: false,
    respondida: false,
    paso_utilizado: false,
    reacciones_risa: 0,
    reacciones_fuego: 0,
    reacciones_amor: 0,
    creado_en: new Date().toISOString(),
  };

  store.ruletaPreguntas.push(nuevaPregunta);
  return nuevaPregunta;
}

export async function girarRuleta(rondaId: string): Promise<boolean> {
  await ensureInitialized();
  const store = getStore();
  const ronda = store.ruletaRondas.find((r) => r.id === rondaId);
  if (!ronda) return false;

  const preguntas = store.ruletaPreguntas.filter((p) => p.ronda_id === rondaId);
  const miembros = store.usuarios.filter((u) => u.grupo_id === ronda.grupo_id && u.activo && u.rol === 'miembro');

  if (preguntas.length === 0 || miembros.length === 0) return false;

  // Asignar al azar (nunca la propia)
  const miembrosShuffled = [...miembros].sort(() => Math.random() - 0.5);

  preguntas.forEach((p, idx) => {
    // Buscar miembro distinto del autor
    const candidato = miembrosShuffled.find((m) => m.id !== p.autor_usuario_id) || miembros[0];
    p.asignada_a_usuario_id = candidato.id;
  });

  // Elegir 1 recámara como "bala"
  const balaIdx = Math.floor(Math.random() * preguntas.length);
  preguntas[balaIdx].es_bala = true;

  ronda.estado = 'respuestas';
  return true;
}

export async function responderPreguntaRuleta(
  preguntaId: string,
  usuarioId: string,
  texto?: string,
  mediaUrl?: string
): Promise<{ ok: boolean; puntosSumados: number }> {
  await ensureInitialized();
  const store = getStore();
  const p = store.ruletaPreguntas.find((x) => x.id === preguntaId);
  if (!p) return { ok: false, puntosSumados: 0 };

  p.respondida = true;
  p.respuesta_texto = texto?.trim();
  p.respuesta_media_url = mediaUrl;

  const ronda = store.ruletaRondas.find((r) => r.id === p.ronda_id);
  const grupoId = ronda?.grupo_id || (await obtenerGrupoIdPorDefecto());

  // +2 por responder
  await otorgarPuntos(
    grupoId,
    usuarioId,
    getFechaArgentina(),
    'ruleta_rusa_responder',
    getPuntosPorEvento('ruleta_rusa_responder'),
    DESCRIPCIONES_PUNTOS.ruleta_rusa_responder,
    p.id
  );

  return { ok: true, puntosSumados: 2 };
}

export async function pasarPreguntaRuleta(preguntaId: string, usuarioId: string): Promise<JuegoRuletaPregunta | null> {
  await ensureInitialized();
  const store = getStore();
  const p = store.ruletaPreguntas.find((x) => x.id === preguntaId);
  if (!p || p.paso_utilizado) return null;

  p.paso_utilizado = true;

  // Recibe otra pregunta de nivel mayor si existe
  const otraPregunta = store.ruletaPreguntas.find(
    (x) => x.ronda_id === p.ronda_id && x.id !== p.id && x.autor_usuario_id !== usuarioId && !x.respondida
  );

  if (otraPregunta) {
    otraPregunta.asignada_a_usuario_id = usuarioId;
    return otraPregunta;
  }
  return p;
}

export async function reaccionarPreguntaRuleta(preguntaId: string, tipo: 'risa' | 'fuego' | 'amor') {
  await ensureInitialized();
  const store = getStore();
  const p = store.ruletaPreguntas.find((x) => x.id === preguntaId);
  if (!p) return null;

  if (tipo === 'risa') p.reacciones_risa = (p.reacciones_risa || 0) + 1;
  if (tipo === 'fuego') p.reacciones_fuego = (p.reacciones_fuego || 0) + 1;
  if (tipo === 'amor') p.reacciones_amor = (p.reacciones_amor || 0) + 1;

  return {
    risa: p.reacciones_risa,
    fuego: p.reacciones_fuego,
    amor: p.reacciones_amor,
  };
}

// ==============================================================================
// MINI-JUEGO: PRODE DEL FIN DE SEMANA (Etapa 7)
// ==============================================================================

export async function obtenerFechaProdeActiva(grupoId: string) {
  await ensureInitialized();
  const store = getStore();
  let fecha = store.prodeFechas.find((f) => f.grupo_id === grupoId && !f.cerrada);
  if (!fecha) {
    fecha = {
      id: uuidv4(),
      grupo_id: grupoId,
      torneo_nombre: 'Liga Profesional Argentina',
      numero_fecha: 14,
      fecha_inicio: new Date().toISOString(),
      fecha_fin: new Date(Date.now() + 4 * 86400000).toISOString(),
      cerrada: false,
      creado_en: new Date().toISOString(),
    };
    store.prodeFechas.push(fecha);
  }

  const partidos = store.prodePartidos.filter((p) => p.fecha_prode_id === fecha?.id);
  const pronosticos = store.prodePronosticos.filter((pr) => partidos.some((p) => p.id === pr.partido_id));

  return { fecha, partidos, pronosticos };
}

export async function guardarPronosticoProde(
  partidoId: string,
  usuarioId: string,
  pronostico: ResultadoPronostico,
  golesLocal?: number,
  golesVisitante?: number
): Promise<JuegoProdePronostico> {
  await ensureInitialized();
  const store = getStore();

  const existIdx = store.prodePronosticos.findIndex(
    (p) => p.partido_id === partidoId && p.usuario_id === usuarioId
  );

  if (existIdx !== -1) {
    store.prodePronosticos[existIdx].pronostico = pronostico;
    store.prodePronosticos[existIdx].goles_local_pronostico = golesLocal;
    store.prodePronosticos[existIdx].goles_visitante_pronostico = golesVisitante;
    return store.prodePronosticos[existIdx];
  }

  const nuevo: JuegoProdePronostico = {
    id: uuidv4(),
    partido_id: partidoId,
    usuario_id: usuarioId,
    pronostico,
    goles_local_pronostico: golesLocal,
    goles_visitante_pronostico: golesVisitante,
    corregido: false,
    acerto: false,
    puntos_sumados: 0,
    creado_en: new Date().toISOString(),
  };

  store.prodePronosticos.push(nuevo);
  return nuevo;
}

export async function corregirPartidosProde(
  fechaProdeId: string,
  resultadosManuales?: Array<{ partidoId: string; golesLocal: number; golesVisitante: number }>
) {
  await ensureInitialized();
  const store = getStore();
  const fecha = store.prodeFechas.find((f) => f.id === fechaProdeId);
  if (!fecha) return null;

  const partidos = store.prodePartidos.filter((p) => p.fecha_prode_id === fechaProdeId);

  for (const part of partidos) {
    if (resultadosManuales) {
      const manual = resultadosManuales.find((m) => m.partidoId === part.id);
      if (manual) {
        part.goles_local = manual.golesLocal;
        part.goles_visitante = manual.golesVisitante;
        part.estado_partido = 'finalizado';
        part.resultado_final =
          manual.golesLocal > manual.golesVisitante ? 'L' : manual.golesLocal === manual.golesVisitante ? 'E' : 'V';
      }
    } else {
      // Simulación de cierre si no hay manual
      if (part.goles_local === undefined || part.goles_local === null) {
        part.goles_local = Math.floor(Math.random() * 3);
        part.goles_visitante = Math.floor(Math.random() * 3);
        part.estado_partido = 'finalizado';
        part.resultado_final =
          part.goles_local > part.goles_visitante ? 'L' : part.goles_local === part.goles_visitante ? 'E' : 'V';
      }
    }

    // Corregir pronósticos para este partido
    const pronosticos = store.prodePronosticos.filter((pr) => pr.partido_id === part.id && !pr.corregido);
    for (const pr of pronosticos) {
      pr.corregido = true;
      if (pr.pronostico === part.resultado_final) {
        pr.acerto = true;
        let pts = getPuntosPorEvento('prode_acierto'); // +3
        if (
          pr.goles_local_pronostico === part.goles_local &&
          pr.goles_visitante_pronostico === part.goles_visitante
        ) {
          pts += getPuntosPorEvento('prode_marcador_exacto'); // +1 extra
        }
        pr.puntos_sumados = pts;

        await otorgarPuntos(
          fecha.grupo_id,
          pr.usuario_id,
          getFechaArgentina(),
          'prode_acierto',
          pts,
          `⚽ ¡Acierto en ${part.equipo_local} vs ${part.equipo_visitante}!`,
          part.id
        );
      }
    }
  }

  fecha.cerrada = true;
  return { partidos, cerrada: true };
}

export async function sincronizarPartidosProde(grupoId: string) {
  await ensureInitialized();
  const store = getStore();
  const equiposArg = [
    { nombre: 'Boca Juniors', escudo: 'https://upload.wikimedia.org/wikipedia/commons/4/41/CABJ-Sitio-Oficial.png' },
    { nombre: 'River Plate', escudo: 'https://upload.wikimedia.org/wikipedia/commons/a/ac/Escudo_del_C_A_River_Plate.svg' },
    { nombre: 'Racing Club', escudo: 'https://upload.wikimedia.org/wikipedia/commons/5/56/Escudo_de_Racing_Club_%282014%29.svg' },
    { nombre: 'Independiente', escudo: 'https://upload.wikimedia.org/wikipedia/commons/d/db/Escudo_del_Club_Atl%C3%A9tico_Independiente.svg' },
    { nombre: 'San Lorenzo', escudo: 'https://upload.wikimedia.org/wikipedia/commons/7/77/Escudo_del_Club_Atl%C3%A9tico_San_Lorenzo_de_Almagro.svg' },
    { nombre: 'Huracán', escudo: 'https://upload.wikimedia.org/wikipedia/commons/1/1a/Escudo_del_Club_Atl%C3%A9tico_Hurac%C3%A1n.png' },
    { nombre: 'Rosario Central', escudo: 'https://upload.wikimedia.org/wikipedia/commons/2/23/Escudo_del_Club_Atl%C3%A9tico_Rosario_Central.svg' },
    { nombre: 'Newell\'s Old Boys', escudo: 'https://upload.wikimedia.org/wikipedia/commons/8/87/Escudo_de_Newell%27s_Old_Boys.svg' },
    { nombre: 'Estudiantes LP', escudo: 'https://upload.wikimedia.org/wikipedia/commons/9/90/Escudo_de_Estudiantes_de_La_Plata.svg' },
    { nombre: 'Gimnasia LP', escudo: 'https://upload.wikimedia.org/wikipedia/commons/0/07/Escudo_del_Club_de_Gimnasia_y_Esgrima_La_Plata.svg' },
    { nombre: 'Talleres de Córdoba', escudo: 'https://upload.wikimedia.org/wikipedia/commons/b/b2/Escudo_del_Club_Atl%C3%A9tico_Talleres_%28C%C3%B3rdoba%29.svg' },
    { nombre: 'Belgrano de Córdoba', escudo: 'https://upload.wikimedia.org/wikipedia/commons/f/fc/Escudo_del_Club_Atl%C3%A9tico_Belgrano.svg' },
  ];

  const { fecha } = await obtenerFechaProdeActiva(grupoId);

  // Crear 4 partidos frescos para el fin de semana
  const nuevosPartidos: JuegoProdePartido[] = [
    {
      id: uuidv4(),
      fecha_prode_id: fecha.id,
      equipo_local: equiposArg[0].nombre,
      escudo_local: equiposArg[0].escudo,
      equipo_visitante: equiposArg[1].nombre,
      escudo_visitante: equiposArg[1].escudo,
      fecha_hora_partido: new Date(Date.now() + 2 * 86400000).toISOString(),
      estado_partido: 'programado',
      creado_en: new Date().toISOString(),
    },
    {
      id: uuidv4(),
      fecha_prode_id: fecha.id,
      equipo_local: equiposArg[2].nombre,
      escudo_local: equiposArg[2].escudo,
      equipo_visitante: equiposArg[3].nombre,
      escudo_visitante: equiposArg[3].escudo,
      fecha_hora_partido: new Date(Date.now() + 2 * 86400000 + 4 * 3600000).toISOString(),
      estado_partido: 'programado',
      creado_en: new Date().toISOString(),
    },
    {
      id: uuidv4(),
      fecha_prode_id: fecha.id,
      equipo_local: equiposArg[4].nombre,
      escudo_local: equiposArg[4].escudo,
      equipo_visitante: equiposArg[5].nombre,
      escudo_visitante: equiposArg[5].escudo,
      fecha_hora_partido: new Date(Date.now() + 3 * 86400000).toISOString(),
      estado_partido: 'programado',
      creado_en: new Date().toISOString(),
    },
    {
      id: uuidv4(),
      fecha_prode_id: fecha.id,
      equipo_local: equiposArg[6].nombre,
      escudo_local: equiposArg[6].escudo,
      equipo_visitante: equiposArg[7].nombre,
      escudo_visitante: equiposArg[7].escudo,
      fecha_hora_partido: new Date(Date.now() + 3 * 86400000 + 4 * 3600000).toISOString(),
      estado_partido: 'programado',
      creado_en: new Date().toISOString(),
    },
  ];

  store.prodePartidos = nuevosPartidos;
  return { ok: true, partidosSincronizados: nuevosPartidos.length };
}

// ==============================================================================
// MINI-JUEGO: TRIVIA DIARIA (1 intento por día por usuario)
// ==============================================================================

export async function obtenerTriviaDia(
  fecha: string,
  dificultad: DificultadTrivia
): Promise<TriviaPregunta | null> {
  await ensureInitialized();
  const store = getStore();
  const preguntas = store.triviaPreguntas || [];
  return preguntas.find((p) => p.fecha === fecha && p.difficulty === dificultad) || null;
}

export async function guardarTriviaPregunta(pregunta: TriviaPregunta): Promise<TriviaPregunta> {
  await ensureInitialized();
  dbUpsert('triviaPreguntas', pregunta);
  const store = getStore();
  if (!store.triviaPreguntas) store.triviaPreguntas = [];
  const idx = store.triviaPreguntas.findIndex((p) => p.id === pregunta.id);
  if (idx >= 0) {
    store.triviaPreguntas[idx] = pregunta;
  } else {
    store.triviaPreguntas.push(pregunta);
  }
  return pregunta;
}

export async function obtenerIntentoTriviaUsuario(
  usuarioId: string,
  fecha: string
): Promise<TriviaIntento | null> {
  await ensureInitialized();
  const store = getStore();
  const intentos = store.triviaIntentos || [];
  return intentos.find((i) => i.usuario_id === usuarioId && i.fecha === fecha) || null;
}

export async function registrarIntentoTrivia(intento: TriviaIntento): Promise<TriviaIntento> {
  await ensureInitialized();
  dbUpsert('triviaIntentos', intento);
  const store = getStore();
  if (!store.triviaIntentos) store.triviaIntentos = [];
  store.triviaIntentos.push(intento);
  return intento;
}
