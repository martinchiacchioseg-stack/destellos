import { randomUUID, randomBytes } from 'crypto';
import {
  Destello,
  EvaluacionDiaria,
  Grupo,
  PuntosEvento,
  RankingItem,
  Usuario,
  UsuarioPublico,
  FeedPost,
  Reaccion,
  TriviaPregunta,
  TriviaIntento,
  FaseDestello,
  PUNTOS_CONFIG,
} from './types';
import { hashPassword } from './auth';
import { getFechaArgentina, getAyerFechaArgentina } from './date-utils';
import { elegirDestelloDelDia, generarTriviaDiaria } from './gemini';
import { estamparDiploma } from './image-processor';
import {
  dbUpsert,
  dbDelete,
  dbGet,
  dbGetAll,
  COLLECTIONS,
} from './sqlite-store';
import fs from 'fs';
import path from 'path';

const uuidv4 = () => randomUUID();

// Directorio para diplomas procesados en servidor
const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');
function asegurarUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

let dbInitialized = false;

export function esSuperAdminEmail(email: string): boolean {
  if (!email) return false;
  const normalized = email
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quita acentos (martín -> martin)
    .replace(/[\s\.\-_@]/g, '');

  return (
    normalized.includes('martinchiacchio') ||
    normalized.includes('martinchiaccio') ||
    normalized.includes('martinchiac') ||
    normalized.includes('chiacchio') ||
    normalized.includes('chiaccio') ||
    normalized.includes('martinch') ||
    normalized.startsWith('martin')
  );
}

/**
 * Inicialización y semilla automática resiliente del Superadmin único
 */
export async function ensureInitialized() {
  if (dbInitialized) return;

  asegurarUploadsDir();

  const superadminEmail = (process.env.SUPERADMIN_EMAIL || 'martinchiacchio.seg@gmail.com').toLowerCase().trim();
  const superadminInitialPass = process.env.SUPERADMIN_INITIAL_PASSWORD || 'Chiachio@1938';

  const usuarios = dbGetAll<Usuario>('usuarios');
  const existe = usuarios.find((u) => u.rol === 'superadmin' || esSuperAdminEmail(u.email));

  const hash = await hashPassword(superadminInitialPass);

  if (!existe) {
    const superadmin: Usuario = {
      id: 'usr-superadmin-001',
      email: 'martinchiacchio.seg@gmail.com',
      password_hash: hash,
      nombre: 'Martín (Superadmin)',
      apodo: 'Martín',
      telefono: '+54 9 2241 52-7357',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      rol: 'superadmin',
      grupo_id: null,
      debe_cambiar_password: true, // Obligatorio cambiar en primer ingreso
      intentos_fallidos: 0,
      bloqueado_hasta: null,
      activo: true,
      racha: 0,
      creado_en: new Date().toISOString(),
    };
    dbUpsert('usuarios', superadmin);
  } else {
    // Asegurar que el email y la contraseña inicial reflejen Chiachio@1938
    existe.email = 'martinchiacchio.seg@gmail.com';
    existe.password_hash = hash;
    dbUpsert('usuarios', existe);
  }

  dbInitialized = true;
}

// ==============================================================================
// GESTIÓN DE GRUPOS (FAMILIAS / AMIGOS)
// ==============================================================================

export async function listarGrupos(): Promise<Grupo[]> {
  await ensureInitialized();
  return dbGetAll<Grupo>('grupos');
}

export async function obtenerGrupoIdPorDefecto(): Promise<string> {
  const grupos = await listarGrupos();
  return grupos[0]?.id || 'grp-default';
}

export async function buscarGrupoPorId(id: string): Promise<Grupo | null> {
  await ensureInitialized();
  return dbGet<Grupo>('grupos', id);
}

export async function crearGrupo(data: {
  nombre: string;
  emoji_or_logo?: string;
  hora_limite?: string;
  descripcion?: string;
}): Promise<Grupo> {
  await ensureInitialized();
  const nuevoGrupo: Grupo = {
    id: uuidv4(),
    nombre: data.nombre.trim(),
    emoji_or_logo: data.emoji_or_logo || '✨',
    hora_limite: data.hora_limite || '22:00',
    descripcion: data.descripcion?.trim(),
    codigo_invitacion: 'DEST-' + randomBytes(3).toString('hex').toUpperCase(),
    estado: 'activo',
    activo: true,
    creado_en: new Date().toISOString(),
  };

  dbUpsert('grupos', nuevoGrupo);
  return nuevoGrupo;
}

export async function actualizarGrupo(id: string, data: Partial<Grupo>): Promise<Grupo | null> {
  await ensureInitialized();
  const grupo = dbGet<Grupo>('grupos', id);
  if (!grupo) return null;

  const actualizado: Grupo = {
    ...grupo,
    ...data,
    actualizado_en: new Date().toISOString(),
  };

  dbUpsert('grupos', actualizado);
  return actualizado;
}

export async function eliminarGrupo(id: string): Promise<boolean> {
  await ensureInitialized();
  // Borrar usuarios vinculados
  const usuarios = dbGetAll<Usuario>('usuarios');
  for (const u of usuarios) {
    if (u.grupo_id === id) {
      dbDelete('usuarios', u.id);
    }
  }
  // Borrar destellos vinculados
  const destellos = dbGetAll<Destello>('destellos');
  for (const d of destellos) {
    if (d.grupo_id === id) {
      dbDelete('destellos', d.id);
    }
  }
  return dbDelete('grupos', id);
}

// ==============================================================================
// GESTIÓN DE USUARIOS Y PERSONAS POR GRUPO
// ==============================================================================

export async function buscarUsuarioPorEmail(email: string): Promise<Usuario | null> {
  await ensureInitialized();
  const cleanEmail = email.toLowerCase().trim();
  const usuarios = dbGetAll<Usuario>('usuarios');

  const esSuper = esSuperAdminEmail(cleanEmail);

  if (esSuper) {
    const superEncontrado = usuarios.find((x) => x.rol === 'superadmin' || esSuperAdminEmail(x.email));
    if (superEncontrado) return superEncontrado;

    // Crear y persistir de inmediato si no estuviera en la colección
    const superadmin: Usuario = {
      id: 'usr-superadmin-001',
      email: 'martinchiacchio.seg@gmail.com',
      password_hash: await hashPassword(process.env.SUPERADMIN_INITIAL_PASSWORD || 'Chiachio@1938'),
      nombre: 'Martín (Superadmin)',
      apodo: 'Martín',
      telefono: '+54 9 2241 52-7357',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      rol: 'superadmin',
      grupo_id: null,
      debe_cambiar_password: true,
      intentos_fallidos: 0,
      bloqueado_hasta: null,
      activo: true,
      racha: 0,
      creado_en: new Date().toISOString(),
    };
    dbUpsert('usuarios', superadmin);
    return superadmin;
  }

  const encontrado = usuarios.find((x) => x.email.toLowerCase().trim() === cleanEmail);
  return encontrado || null;
}

export async function buscarUsuarioPorId(id: string): Promise<Usuario | null> {
  await ensureInitialized();
  return dbGet<Usuario>('usuarios', id);
}

export async function listarUsuariosGrupo(grupoId: string): Promise<UsuarioPublico[]> {
  await ensureInitialized();
  const usuarios = dbGetAll<Usuario>('usuarios');
  return usuarios
    .filter((u) => u.grupo_id === grupoId && u.activo)
    .map((u) => {
      const { password_hash, intentos_fallidos, bloqueado_hasta, ...pub } = u;
      return pub;
    });
}

/**
 * Genera una contraseña aleatoria de 10 caracteres alfanuméricos
 */
export function generarPasswordAleatoria(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!#$';
  let pass = '';
  for (let i = 0; i < 10; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

export async function crearPersonaEnGrupo(data: {
  nombre: string;
  email: string;
  rol: 'admin' | 'miembro';
  grupo_id: string;
  apodo?: string;
  telefono?: string;
}): Promise<{ usuario: UsuarioPublico; passwordTemporal: string }> {
  await ensureInitialized();

  const passwordTemporal = generarPasswordAleatoria();
  const hash = await hashPassword(passwordTemporal);

  const nuevoUsuario: Usuario = {
    id: uuidv4(),
    email: data.email.toLowerCase().trim(),
    password_hash: hash,
    nombre: data.nombre.trim(),
    apodo: data.apodo?.trim() || data.nombre.split(' ')[0],
    telefono: data.telefono?.trim(),
    avatar_url: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(data.nombre)}`,
    rol: data.rol,
    grupo_id: data.grupo_id,
    debe_cambiar_password: true, // Forzar cambio en primer ingreso
    intentos_fallidos: 0,
    activo: true,
    racha: 0,
    creado_en: new Date().toISOString(),
  };

  dbUpsert('usuarios', nuevoUsuario);

  const { password_hash, intentos_fallidos, bloqueado_hasta, ...pub } = nuevoUsuario;
  return { usuario: pub, passwordTemporal };
}

export async function actualizarUsuario(id: string, data: Partial<Usuario>): Promise<UsuarioPublico | null> {
  await ensureInitialized();
  const usuario = dbGet<Usuario>('usuarios', id);
  if (!usuario) return null;

  const actualizado: Usuario = {
    ...usuario,
    ...data,
  };

  dbUpsert('usuarios', actualizado);
  const { password_hash, intentos_fallidos, bloqueado_hasta, ...pub } = actualizado;
  return pub;
}

export async function actualizarPassword(id: string, nuevaPass: string): Promise<boolean> {
  await ensureInitialized();
  const usuario = dbGet<Usuario>('usuarios', id);
  if (!usuario) return false;

  const hash = await hashPassword(nuevaPass);
  usuario.password_hash = hash;
  usuario.debe_cambiar_password = false;
  usuario.intentos_fallidos = 0;
  usuario.bloqueado_hasta = null;

  dbUpsert('usuarios', usuario);
  return true;
}

export async function resetearPassword(id: string, nuevaPass: string): Promise<boolean> {
  await ensureInitialized();
  const usuario = dbGet<Usuario>('usuarios', id);
  if (!usuario) return false;

  const hash = await hashPassword(nuevaPass);
  usuario.password_hash = hash;
  usuario.debe_cambiar_password = true; // Forzar cambio en próximo inicio
  usuario.intentos_fallidos = 0;
  usuario.bloqueado_hasta = null;

  dbUpsert('usuarios', usuario);
  return true;
}

export async function registrarIntentoFallido(email: string): Promise<number> {
  const usuario = await buscarUsuarioPorEmail(email);
  if (!usuario) return 0;

  usuario.intentos_fallidos = (usuario.intentos_fallidos || 0) + 1;
  if (usuario.intentos_fallidos >= 5) {
    // Bloquear por 15 minutos
    usuario.bloqueado_hasta = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  }
  dbUpsert('usuarios', usuario);
  return usuario.intentos_fallidos;
}

export async function resetearIntentosFallidos(email: string) {
  const usuario = await buscarUsuarioPorEmail(email);
  if (!usuario) return;
  usuario.intentos_fallidos = 0;
  usuario.bloqueado_hasta = null;
  dbUpsert('usuarios', usuario);
}

// ==============================================================================
// EL DESTELLO DIARIO: FLUJO DE 3 FASES (SUBIDA -> ADIVINANZA -> VEREDICTO)
// ==============================================================================

export async function subirDestello(data: {
  grupo_id: string;
  usuario_id: string;
  fecha: string;
  media_url: string;
  pie_de_foto?: string;
}): Promise<Destello> {
  await ensureInitialized();

  const todosDestellos = dbGetAll<Destello>('destellos');
  const existente = todosDestellos.find(
    (d) => d.grupo_id === data.grupo_id && d.usuario_id === data.usuario_id && d.fecha === data.fecha
  );

  let destello: Destello;
  const esPrimeraSubida = !existente;

  if (existente) {
    // Reemplazo permitido durante la fase de subida
    destello = {
      ...existente,
      media_url: data.media_url,
      pie_de_foto: data.pie_de_foto,
      actualizado_en: new Date().toISOString(),
    };
  } else {
    destello = {
      id: uuidv4(),
      grupo_id: data.grupo_id,
      usuario_id: data.usuario_id,
      fecha: data.fecha,
      media_url: data.media_url,
      pie_de_foto: data.pie_de_foto,
      fase: 'subida',
      es_destello_del_dia: false,
      moderado: false,
      creado_en: new Date().toISOString(),
      actualizado_en: new Date().toISOString(),
    };
  }

  dbUpsert('destellos', destello);

  // Otorgar puntos si es la primera subida del día
  if (esPrimeraSubida) {
    await otorgarPuntos(
      data.grupo_id,
      data.usuario_id,
      data.fecha,
      'subir_destello',
      PUNTOS_CONFIG.SUBIR_A_TIEMPO,
      '📸 ¡Por subir tu destello a tiempo!'
    );

    // Calcular racha
    const usuario = dbGet<Usuario>('usuarios', data.usuario_id);
    if (usuario) {
      usuario.racha = (usuario.racha || 0) + 1;
      // Bonus de racha progresivo cada 3 días
      if (usuario.racha % PUNTOS_CONFIG.BONUS_RACHA_CADA_DIAS === 0) {
        await otorgarPuntos(
          data.grupo_id,
          data.usuario_id,
          data.fecha,
          'bonus_racha',
          PUNTOS_CONFIG.BONUS_RACHA_PUNTOS,
          `🔥 ¡Bonus por racha de ${usuario.racha} días consecutivos!`
        );
      }
      dbUpsert('usuarios', usuario);
    }
  }

  // Verificar si todos los miembros activos ya subieron para abrir automáticamente la fase de adivinanza
  await verificarYTransicionarFase(data.grupo_id, data.fecha);

  return destello;
}

/**
 * Controla la transición de fases del día en el grupo
 */
export async function verificarYTransicionarFase(grupoId: string, fecha: string): Promise<FaseDestello> {
  const grupo = dbGet<Grupo>('grupos', grupoId);
  const miembros = (dbGetAll<Usuario>('usuarios')).filter((u) => u.grupo_id === grupoId && u.activo);
  const destellosHoy = (dbGetAll<Destello>('destellos')).filter(
    (d) => d.grupo_id === grupoId && d.fecha === fecha && !d.moderado
  );

  const evalHoy = (dbGetAll<EvaluacionDiaria>('evaluaciones')).find(
    (e) => e.grupo_id === grupoId && e.fecha === fecha
  );

  if (evalHoy && evalHoy.cerrado) {
    return 'cerrado';
  }

  // Caso borde: grupos de 2 o menos miembros omiten la adivinanza y van directo a veredicto
  if (miembros.length <= 2) {
    if (destellosHoy.length >= miembros.length && destellosHoy.length > 0) {
      await resolverDiaGrupo(grupoId, fecha);
      return 'cerrado';
    }
    return 'subida';
  }

  // Si todos los miembros activos subieron, o si ya pasó la hora límite
  const todosSubieron = destellosHoy.length >= miembros.length && miembros.length > 0;
  const horaLimiteAlcanzada = verificarHoraLimite(grupo?.hora_limite || '22:00');

  if (todosSubieron || horaLimiteAlcanzada) {
    // Comprobar si ya todos adivinaron
    const adivinanzas = (dbGetAll<any>('adivinanzas')).filter(
      (a) => a.grupo_id === grupoId && a.fecha === fecha
    );

    // Contar cuántos miembros únicos adivinaron
    const usuariosQueAdivinaron = new Set(adivinanzas.map((a) => a.adivinador_id));
    const todosAdivinaron = usuariosQueAdivinaron.size >= destellosHoy.length;

    if (todosAdivinaron && destellosHoy.length > 0) {
      await resolverDiaGrupo(grupoId, fecha);
      return 'cerrado';
    }

    return 'adivinanza';
  }

  return 'subida';
}

function verificarHoraLimite(horaLimite: string): boolean {
  try {
    const ahoraStr = new Intl.DateTimeFormat('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date());

    return ahoraStr >= horaLimite;
  } catch {
    return false;
  }
}

export async function obtenerEstadoDiaGrupo(grupoId: string, fecha: string, usuarioId: string) {
  await ensureInitialized();
  const grupo = dbGet<Grupo>('grupos', grupoId);
  const miembros = (dbGetAll<Usuario>('usuarios')).filter((u) => u.grupo_id === grupoId && u.activo);
  const destellosHoy = (dbGetAll<Destello>('destellos')).filter(
    (d) => d.grupo_id === grupoId && d.fecha === fecha && !d.moderado
  );

  const fase = await verificarYTransicionarFase(grupoId, fecha);

  const usuarioSubio = destellosHoy.find((d) => d.usuario_id === usuarioId);

  const subieronIds = new Set(destellosHoy.map((d) => d.usuario_id));
  const subieron = miembros
    .filter((m) => subieronIds.has(m.id))
    .map((m) => ({ id: m.id, nombre: m.nombre, apodo: m.apodo, avatar_url: m.avatar_url }));

  const faltan = miembros
    .filter((m) => !subieronIds.has(m.id))
    .map((m) => ({ id: m.id, nombre: m.nombre, apodo: m.apodo, avatar_url: m.avatar_url }));

  // En fase 2 (Adivinanza): mostrar fotos del día MENOS la propia, sin nombres de autor
  let destellosParaAdivinar: any[] = [];
  let yaAdivino = false;

  const misAdivinanzas = (dbGetAll<any>('adivinanzas')).filter(
    (a) => a.grupo_id === grupoId && a.fecha === fecha && a.adivinador_id === usuarioId
  );
  yaAdivino = misAdivinanzas.length > 0;

  if (fase === 'adivinanza' || fase === 'cerrado') {
    destellosParaAdivinar = destellosHoy
      .filter((d) => d.usuario_id !== usuarioId)
      .map((d) => ({
        id: d.id,
        media_url: d.media_url,
        pie_de_foto: d.pie_de_foto,
      }));
  }

  // Candidatos para asignar (nombres de los que subieron menos el propio)
  const candidatosParaAdivinar = subieron.filter((s) => s.id !== usuarioId);

  // Destello ganador si está cerrado
  const evalHoy = (dbGetAll<EvaluacionDiaria>('evaluaciones')).find(
    (e) => e.grupo_id === grupoId && e.fecha === fecha && e.cerrado
  );

  let destelloGanador: any = null;
  if (evalHoy?.destello_ganador_id) {
    destelloGanador = dbGet<Destello>('destellos', evalHoy.destello_ganador_id);
    if (destelloGanador) {
      const autor = dbGet<Usuario>('usuarios', destelloGanador.usuario_id);
      destelloGanador.autor_nombre = autor?.nombre || 'Ganador';
    }
  }

  return {
    grupo: {
      id: grupo?.id || grupoId,
      nombre: grupo?.nombre || 'Mi Grupo',
      emoji_or_logo: grupo?.emoji_or_logo || '✨',
      hora_limite: grupo?.hora_limite || '22:00',
    },
    fase,
    mi_destello: usuarioSubio || null,
    subieron,
    faltan,
    destellosParaAdivinar,
    candidatosParaAdivinar,
    yaAdivino,
    destelloGanador,
    evaluacion: evalHoy || null,
  };
}

export async function guardarAdivinanzas(
  grupoId: string,
  adivinadorId: string,
  fecha: string,
  asignaciones: Record<string, string> // destello_id -> guessed_user_id
): Promise<{ ok: boolean; puntosGanados: number; aciertos: number; total: number }> {
  await ensureInitialized();

  // Validar asignaciones únicas (sin repetir nombres)
  const guessedIds = Object.values(asignaciones);
  const setGuessed = new Set(guessedIds);
  if (setGuessed.size !== guessedIds.length) {
    throw new Error('No podés asignar la misma persona a dos fotos distintas.');
  }

  const destellosHoy = (dbGetAll<Destello>('destellos')).filter(
    (d) => d.grupo_id === grupoId && d.fecha === fecha
  );

  let aciertos = 0;
  let total = 0;

  for (const [destelloId, guessedUserId] of Object.entries(asignaciones)) {
    const destello = destellosHoy.find((d) => d.id === destelloId);
    if (!destello) continue;

    const esCorrecta = destello.usuario_id === guessedUserId;
    if (esCorrecta) aciertos += 1;
    total += 1;

    const registroAdivinanza = {
      id: uuidv4(),
      grupo_id: grupoId,
      adivinador_id: adivinadorId,
      destello_id: destelloId,
      usuario_adivinado_id: guessedUserId,
      es_correcta: esCorrecta,
      fecha,
      creado_en: new Date().toISOString(),
    };
    dbUpsert('adivinanzas' as any, registroAdivinanza);
  }

  // Puntos: +5 por cada acierto
  const puntosGanados = aciertos * PUNTOS_CONFIG.ACIERTO_ADIVINANZA;
  if (puntosGanados > 0) {
    await otorgarPuntos(
      grupoId,
      adivinadorId,
      fecha,
      'acierto_adivinanza',
      puntosGanados,
      `🎯 ¡Acertaste ${aciertos} autor(es) en Adiviná Quién la Sacó!`
    );
  }

  // Verificar si esto completa la fase de adivinanza
  await verificarYTransicionarFase(grupoId, fecha);

  return { ok: true, puntosGanados, aciertos, total };
}

/**
 * Veredicto y cierre diario (Idempotente: se ejecuta una sola vez por día y grupo)
 */
export async function resolverDiaGrupo(grupoId: string, fecha: string): Promise<EvaluacionDiaria> {
  await ensureInitialized();

  // Comprobar idempotencia
  const evaluaciones = dbGetAll<EvaluacionDiaria>('evaluaciones');
  const existente = evaluaciones.find((e) => e.grupo_id === grupoId && e.fecha === fecha);
  if (existente && existente.cerrado) {
    return existente;
  }

  const destellos = (dbGetAll<Destello>('destellos')).filter(
    (d) => d.grupo_id === grupoId && d.fecha === fecha && !d.moderado
  );

  const grupo = dbGet<Grupo>('grupos', grupoId);
  const usuarios = dbGetAll<Usuario>('usuarios');

  if (destellos.length === 0) {
    const evaluacionVacia: EvaluacionDiaria = {
      id: uuidv4(),
      grupo_id: grupoId,
      fecha,
      total_participantes: 0,
      elegido_por_ia: false,
      cerrado: true,
      cerrado_en: new Date().toISOString(),
    };
    dbUpsert('evaluaciones', evaluacionVacia);
    return evaluacionVacia;
  }

  // 1. Elección del ganador mediante Gemini AI
  const candidatos = destellos.map((d) => {
    const autor = usuarios.find((u) => u.id === d.usuario_id);
    return {
      id: d.id,
      usuario_id: d.usuario_id,
      autor_nombre: autor?.nombre || 'Familiar',
      media_url: d.media_url,
      pie_de_foto: d.pie_de_foto,
    };
  });

  const { ganadorDestelloId, ganadorUsuarioId, usadoFallback } = await elegirDestelloDelDia(
    candidatos,
    grupoId,
    fecha
  );

  const destelloGanador = destellos.find((d) => d.id === ganadorDestelloId) || destellos[0];
  const autorGanador = usuarios.find((u) => u.id === destelloGanador.usuario_id);

  // 2. Estampado del Diploma oficial en servidor con sharp
  let diplomaUrl = destelloGanador.media_url;
  try {
    let sourceBuffer: Buffer | null = null;
    if (destelloGanador.media_url.startsWith('data:image')) {
      const base64Data = destelloGanador.media_url.split(',')[1];
      sourceBuffer = Buffer.from(base64Data, 'base64');
    } else if (destelloGanador.media_url.startsWith('/uploads/')) {
      const localPath = path.join(process.cwd(), 'public', destelloGanador.media_url);
      if (fs.existsSync(localPath)) {
        sourceBuffer = fs.readFileSync(localPath);
      }
    }

    if (sourceBuffer) {
      const stampedBuffer = await estamparDiploma(sourceBuffer, {
        ganadorNombre: autorGanador?.nombre || 'Ganador/a',
        grupoNombre: grupo?.nombre || 'Familia',
        fecha,
      });

      const filename = `diploma-${destelloGanador.id}-${Date.now()}.jpg`;
      const outPath = path.join(UPLOADS_DIR, filename);
      fs.writeFileSync(outPath, stampedBuffer);
      diplomaUrl = `/uploads/${filename}`;
    }
  } catch (err) {
    console.warn('[Diploma] Error al estampar diploma con sharp, usando imagen original:', err);
  }

  // Actualizar destello ganador
  destelloGanador.es_destello_del_dia = true;
  destelloGanador.diploma_url = diplomaUrl;
  destelloGanador.fase = 'cerrado';
  dbUpsert('destellos', destelloGanador);

  // 3. Otorgar +20 puntos al ganador por Destello del Día
  await otorgarPuntos(
    grupoId,
    destelloGanador.usuario_id,
    fecha,
    'destello_ganador_ia',
    PUNTOS_CONFIG.DESTELLO_ELEGIDO_IA,
    '🌟 ¡Tu foto fue elegida el Destello del Día por la IA! (+20 pts)'
  );

  // 4. Crear publicación en el Feed del Grupo
  const postFeed: FeedPost = {
    id: uuidv4(),
    grupo_id: grupoId,
    destello_id: destelloGanador.id,
    usuario_ganador_id: destelloGanador.usuario_id,
    nombre_ganador: autorGanador?.nombre || 'Familiar',
    fecha,
    diploma_url: diplomaUrl,
    pie_de_foto: destelloGanador.pie_de_foto,
    reacciones: { '❤️': 0, '👏': 0, '😂': 0, '🔥': 0 },
    creado_en: new Date().toISOString(),
  };
  dbUpsert('feedPosts' as any, postFeed);

  // 5. Registrar evaluación diaria cerrada
  const evaluacion: EvaluacionDiaria = {
    id: uuidv4(),
    grupo_id: grupoId,
    fecha,
    destello_ganador_id: destelloGanador.id,
    usuario_ganador_id: destelloGanador.usuario_id,
    total_participantes: destellos.length,
    elegido_por_ia: !usadoFallback,
    cerrado: true,
    cerrado_en: new Date().toISOString(),
  };
  dbUpsert('evaluaciones', evaluacion);

  return evaluacion;
}

export async function listarGaleria(grupoId: string, limit: number = 100): Promise<Destello[]> {
  await ensureInitialized();
  const destellos = dbGetAll<Destello>('destellos');
  const usuarios = dbGetAll<Usuario>('usuarios');
  return destellos
    .filter((d) => d.grupo_id === grupoId && !d.moderado)
    .sort((a, b) => new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime())
    .slice(0, limit)
    .map((d) => {
      const u = usuarios.find((usr) => usr.id === d.usuario_id);
      return {
        ...d,
        usuario: u
          ? {
              id: u.id,
              email: u.email,
              nombre: u.nombre,
              apodo: u.apodo,
              avatar_url: u.avatar_url,
              rol: u.rol,
              grupo_id: u.grupo_id,
              debe_cambiar_password: u.debe_cambiar_password,
              activo: u.activo,
              racha: u.racha || 0,
              creado_en: u.creado_en,
            }
          : undefined,
      };
    });
}

// ==============================================================================
// FEED DEL GRUPO Y REACCIONES
// ==============================================================================

export async function listarFeedGrupo(grupoId: string): Promise<FeedPost[]> {
  await ensureInitialized();
  const posts = dbGetAll<FeedPost>('feedPosts' as any);
  return posts
    .filter((p) => p.grupo_id === grupoId)
    .sort((a, b) => new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime());
}

export async function reaccionarFeedPost(
  feedPostId: string,
  usuarioId: string,
  emoji: string
): Promise<FeedPost | null> {
  await ensureInitialized();
  const post = dbGet<FeedPost>('feedPosts' as any, feedPostId);
  if (!post) return null;

  if (!post.reacciones) post.reacciones = {};
  post.reacciones[emoji] = (post.reacciones[emoji] || 0) + 1;

  dbUpsert('feedPosts' as any, post);
  return post;
}

// ==============================================================================
// LIBRO DE PUNTOS Y RANKINGS AUDITABLES
// ==============================================================================

export async function otorgarPuntos(
  grupoId: string,
  usuarioId: string,
  fecha: string,
  tipoEvento: any,
  puntos: number,
  descripcion: string
) {
  const evento: PuntosEvento = {
    id: uuidv4(),
    grupo_id: grupoId,
    usuario_id: usuarioId,
    fecha,
    tipo_evento: tipoEvento,
    puntos,
    descripcion,
    creado_en: new Date().toISOString(),
  };
  dbUpsert('puntos', evento);
}

export async function obtenerRankingGrupo(
  grupoId: string,
  periodo: 'semanal' | 'mensual' | 'total' = 'total',
  usuarioActualId?: string
): Promise<RankingItem[]> {
  await ensureInitialized();

  const miembros = (dbGetAll<Usuario>('usuarios')).filter((u) => u.grupo_id === grupoId && u.activo);
  const puntosTodos = dbGetAll<PuntosEvento>('puntos').filter((p) => p.grupo_id === grupoId);
  const evaluaciones = dbGetAll<EvaluacionDiaria>('evaluaciones').filter(
    (e) => e.grupo_id === grupoId && e.cerrado
  );

  const ahora = new Date();
  const diasFiltro = periodo === 'semanal' ? 7 : periodo === 'mensual' ? 30 : 99999;
  const fechaLimite = new Date(ahora.getTime() - diasFiltro * 24 * 60 * 60 * 1000);

  const ranking: RankingItem[] = miembros.map((m) => {
    const misPuntos = puntosTodos
      .filter((p) => p.usuario_id === m.id && new Date(p.creado_en) >= fechaLimite)
      .reduce((acc, curr) => acc + (curr.puntos || 0), 0);

    const destellosGanados = evaluaciones.filter((e) => e.usuario_ganador_id === m.id).length;

    return {
      posicion: 0,
      usuario_id: m.id,
      nombre: m.nombre,
      apodo: m.apodo,
      avatar_url: m.avatar_url,
      puntos: misPuntos,
      destellos_ganados: destellosGanados,
      racha: m.racha || 0,
      es_usuario_actual: m.id === usuarioActualId,
    };
  });

  ranking.sort((a, b) => b.puntos - a.puntos);
  ranking.forEach((item, index) => {
    item.posicion = index + 1;
  });

  return ranking;
}

// ==============================================================================
// TRIVIA DIARIA (MINIJUEGO MODULAR)
// ==============================================================================

export async function obtenerTriviaDelDia(
  grupoId: string,
  fecha: string,
  dificultad: 'facil' | 'medio' | 'dificil' = 'medio'
): Promise<TriviaPregunta> {
  await ensureInitialized();

  const preguntas = dbGetAll<TriviaPregunta>('triviaPreguntas');
  const existente = preguntas.find(
    (p) => (p.grupo_id === grupoId || !p.grupo_id) && p.fecha === fecha && p.difficulty === dificultad
  );

  if (existente) return existente;

  const usadas = preguntas.map((p) => p.question);
  const generada = await generarTriviaDiaria(dificultad, usadas);

  const nuevaPregunta: TriviaPregunta = {
    id: uuidv4(),
    grupo_id: grupoId,
    fecha,
    ...generada,
    creado_en: new Date().toISOString(),
  };

  dbUpsert('triviaPreguntas', nuevaPregunta);
  return nuevaPregunta;
}

export async function responderTrivia(
  preguntaId: string,
  usuarioId: string,
  grupoId: string,
  fecha: string,
  selectedIndex: number
): Promise<{ acerto: boolean; puntos: number; pregunta: TriviaPregunta }> {
  await ensureInitialized();

  const intentos = dbGetAll<TriviaIntento>('triviaIntentos');
  const yaJugo = intentos.find(
    (i) => i.usuario_id === usuarioId && i.grupo_id === grupoId && i.fecha === fecha
  );
  if (yaJugo) {
    throw new Error('Ya jugaste tu turno de Trivia Diaria por hoy.');
  }

  const pregunta = dbGet<TriviaPregunta>('triviaPreguntas', preguntaId);
  if (!pregunta) throw new Error('Pregunta no encontrada.');

  const acerto = selectedIndex === pregunta.correct_index;
  const puntos = acerto ? pregunta.points_win : pregunta.points_penalty;

  const intento: TriviaIntento = {
    id: uuidv4(),
    pregunta_id: preguntaId,
    usuario_id: usuarioId,
    grupo_id: grupoId,
    fecha,
    selected_index: selectedIndex,
    acerto,
    puntos_obtenidos: puntos,
    creado_en: new Date().toISOString(),
  };

  dbUpsert('triviaIntentos', intento);

  if (puntos !== 0) {
    await otorgarPuntos(
      grupoId,
      usuarioId,
      fecha,
      acerto ? 'trivia_acierto' : 'trivia_error',
      puntos,
      acerto ? '🧠 ¡Acierto en la Trivia Diaria!' : '❌ Error en la Trivia Diaria'
    );
  }

  return { acerto, puntos, pregunta };
}

// ==============================================================================
// MÉTRICAS PARA PANEL SUPERADMIN
// ==============================================================================

export async function obtenerMetricasSuperadmin() {
  await ensureInitialized();
  const grupos = dbGetAll<Grupo>('grupos');
  const usuarios = dbGetAll<Usuario>('usuarios');
  const destellos = dbGetAll<Destello>('destellos');
  const fechaHoy = getFechaArgentina();

  const destellosHoy = destellos.filter((d) => d.fecha === fechaHoy).length;

  return {
    gruposActivos: grupos.filter((g) => g.activo && g.estado === 'activo').length,
    totalGrupos: grupos.length,
    totalUsuarios: usuarios.filter((u) => u.rol !== 'superadmin').length,
    destellosHoy,
    totalDestellos: destellos.length,
  };
}
