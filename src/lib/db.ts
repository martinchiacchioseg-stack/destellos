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
  RetoDiario,
  JuegoAdivinaIntento,
  JuegoVotoCruzado,
  JuegoFotoPasado,
  JuegoFotoPasadoAdivinanza,
  NivelRuleta,
  JuegoRuletaRusa,
  JuegoRuletaPregunta,
  ResultadoPronostico,
  JuegoProdeFecha,
  JuegoProdePartido,
  JuegoProdePronostico,
  UbicacionPublicidad,
  Publicidad,
  NotificacionAdmin,
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
import os from 'os';

const uuidv4 = () => randomUUID();

const isVercel = process.env.VERCEL === '1' || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);
const UPLOADS_DIR = isVercel
  ? path.join(os.tmpdir(), 'destellos-uploads')
  : path.join(process.cwd(), 'public', 'uploads');

function asegurarUploadsDir() {
  try {
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
  } catch {
    // Seguro en entornos read-only
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

  try {
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
        debe_cambiar_password: false, // Acceso directo para el dueño
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
      existe.debe_cambiar_password = false;
      existe.intentos_fallidos = 0;
      existe.bloqueado_hasta = null;
      dbUpsert('usuarios', existe);
    }

    // Inicializar o asegurar código de familia en los grupos
    const gruposExistentes = dbGetAll<Grupo>('grupos');
    if (gruposExistentes.length === 0) {
      const grupoDefecto: Grupo = {
        id: 'grp-chiachio-001',
        nombre: 'Familia Chiachio',
        emoji_or_logo: '✨',
        hora_limite: '22:00',
        codigo_invitacion: 'CHIA-1938',
        codigo_familia: 'CHIA-1938',
        admin_id: 'usr-superadmin-001',
        admin_email: 'martinchiacchio.seg@gmail.com',
        admin_nombre: 'Martín Chiacchio',
        descripcion: 'Espacio familiar oficial',
        estado: 'activo',
        activo: true,
        creado_en: new Date().toISOString(),
      };
      dbUpsert('grupos', grupoDefecto);
    } else {
      for (const g of gruposExistentes) {
        if (!g.codigo_familia) {
          g.codigo_familia = g.codigo_invitacion || generarCodigoFamiliaUnico(g.nombre);
          dbUpsert('grupos', g);
        }
      }
    }

    dbInitialized = true;
  } catch (err) {
    console.error('Error inicializando base de datos:', err);
    dbInitialized = true;
  }
}

// ==============================================================================
// GESTIÓN DE GRUPOS Y CÓDIGOS DE FAMILIA
// ==============================================================================

export function generarCodigoFamiliaUnico(nombre: string): string {
  const clean = nombre
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z]/g, '');
  const prefix = clean.slice(0, 4).padEnd(4, 'X');
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${num}`;
}

export async function buscarGrupoPorCodigo(codigo: string): Promise<Grupo | null> {
  await ensureInitialized();
  if (!codigo) return null;
  const clean = codigo.toUpperCase().trim().replace(/\s+/g, '');
  const grupos = dbGetAll<Grupo>('grupos');
  return (
    grupos.find(
      (g) =>
        g.activo &&
        g.estado === 'activo' &&
        ((g.codigo_familia && g.codigo_familia.toUpperCase().trim() === clean) ||
          (g.codigo_invitacion && g.codigo_invitacion.toUpperCase().trim() === clean))
    ) || null
  );
}

export async function listarGrupos(): Promise<Grupo[]> {
  await ensureInitialized();
  return dbGetAll<Grupo>('grupos');
}

export async function obtenerGrupoIdPorDefecto(): Promise<string> {
  const grupos = await listarGrupos();
  return grupos[0]?.id || 'grp-chiachio-001';
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
  admin_id?: string;
  admin_email?: string;
  admin_nombre?: string;
  codigo_familia?: string;
}): Promise<Grupo> {
  await ensureInitialized();
  const codigo = data.codigo_familia || generarCodigoFamiliaUnico(data.nombre);
  const nuevoGrupo: Grupo = {
    id: uuidv4(),
    nombre: data.nombre.trim(),
    emoji_or_logo: data.emoji_or_logo || '✨',
    hora_limite: data.hora_limite || '22:00',
    descripcion: data.descripcion?.trim(),
    codigo_invitacion: codigo,
    codigo_familia: codigo,
    admin_id: data.admin_id,
    admin_email: data.admin_email,
    admin_nombre: data.admin_nombre,
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
// NOTIFICACIONES IN-APP PARA EL ADMINISTRADOR (CAMPANITA)
// ==============================================================================

export async function crearNotificacionAdmin(notif: Omit<NotificacionAdmin, 'id' | 'creado_en' | 'leido'>): Promise<NotificacionAdmin> {
  await ensureInitialized();
  const nueva: NotificacionAdmin = {
    id: uuidv4(),
    ...notif,
    leido: false,
    creado_en: new Date().toISOString(),
  };
  dbUpsert('notificacionesAdmin', nueva);
  return nueva;
}

export async function listarNotificacionesAdmin(adminId?: string, grupoId?: string): Promise<NotificacionAdmin[]> {
  await ensureInitialized();
  const todas = dbGetAll<NotificacionAdmin>('notificacionesAdmin');
  return todas
    .filter((n) => (!adminId || n.admin_id === adminId) && (!grupoId || n.grupo_id === grupoId))
    .sort((a, b) => new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime());
}

export async function contarNotificacionesNoLeidasAdmin(adminId?: string, grupoId?: string): Promise<number> {
  await ensureInitialized();
  const todas = await listarNotificacionesAdmin(adminId, grupoId);
  return todas.filter((n) => !n.leido).length;
}

export async function marcarNotificacionesLeidas(adminId?: string, grupoId?: string): Promise<void> {
  await ensureInitialized();
  const todas = dbGetAll<NotificacionAdmin>('notificacionesAdmin');
  for (const n of todas) {
    if ((!adminId || n.admin_id === adminId) && (!grupoId || n.grupo_id === grupoId)) {
      n.leido = true;
      dbUpsert('notificacionesAdmin', n);
    }
  }
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
    if (superEncontrado) {
      superEncontrado.debe_cambiar_password = false;
      return superEncontrado;
    }

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
      debe_cambiar_password: false,
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

export async function buscarUsuarioPorIdentificador(identificador: string): Promise<Usuario | null> {
  await ensureInitialized();
  if (!identificador) return null;
  const clean = identificador.toLowerCase().trim();
  const cleanDigits = identificador.replace(/\D/g, '');
  const usuarios = dbGetAll<Usuario>('usuarios');

  return (
    usuarios.find((u) => {
      if (u.email && u.email.toLowerCase().trim() === clean) return true;
      if (cleanDigits.length >= 6) {
        if (u.whatsapp && u.whatsapp.replace(/\D/g, '').endsWith(cleanDigits)) return true;
        if (u.telefono && u.telefono.replace(/\D/g, '').endsWith(cleanDigits)) return true;
      }
      return false;
    }) || null
  );
}

export async function guardarCodigoRecuperacion(email: string, codigo: string): Promise<{ ok: boolean; nombre?: string }> {
  await ensureInitialized();
  const usuario = await buscarUsuarioPorEmail(email);
  if (!usuario) return { ok: false };

  usuario.codigo_recuperacion = codigo;
  usuario.codigo_recuperacion_expira = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins
  dbUpsert('usuarios', usuario);
  return { ok: true, nombre: usuario.nombre };
}

export async function validarYAplicarNuevaPassword(
  email: string,
  codigo: string,
  nuevoHash: string
): Promise<{ ok: boolean; error?: string }> {
  await ensureInitialized();
  const usuario = await buscarUsuarioPorEmail(email);
  if (!usuario) {
    return { ok: false, error: 'No se encontró ninguna cuenta asociada a este correo.' };
  }

  if (!usuario.codigo_recuperacion || usuario.codigo_recuperacion !== codigo) {
    return { ok: false, error: 'El código de verificación ingresado es incorrecto.' };
  }

  if (usuario.codigo_recuperacion_expira && new Date(usuario.codigo_recuperacion_expira).getTime() < Date.now()) {
    return { ok: false, error: 'El código de verificación ha expirado. Por favor solicitá uno nuevo.' };
  }

  usuario.password_hash = nuevoHash;
  usuario.codigo_recuperacion = undefined;
  usuario.codigo_recuperacion_expira = undefined;
  usuario.debe_cambiar_password = false;
  usuario.intentos_fallidos = 0;
  usuario.bloqueado_hasta = null;
  dbUpsert('usuarios', usuario);

  return { ok: true };
}

export async function crearMiembroPorCodigoFamilia(data: {
  grupoId: string;
  nombre: string;
  apodo?: string;
  fechaNacimiento?: string;
  whatsapp?: string;
  email?: string;
  fotoUrl?: string;
  password?: string;
}): Promise<Usuario> {
  await ensureInitialized();

  const finalEmail = data.email
    ? data.email.toLowerCase().trim()
    : `${(data.whatsapp || uuidv4()).replace(/\D/g, '') || uuidv4()}@familia.destellos`;

  const passwordHash = data.password
    ? await hashPassword(data.password)
    : await hashPassword('Destellos@2026');

  const nuevoUsuario: Usuario = {
    id: uuidv4(),
    email: finalEmail,
    password_hash: passwordHash,
    nombre: data.nombre.trim(),
    apodo: data.apodo?.trim() || data.nombre.trim().split(' ')[0],
    whatsapp: data.whatsapp?.trim(),
    telefono: data.whatsapp?.trim(),
    fecha_nacimiento: data.fechaNacimiento?.trim(),
    avatar_url: data.fotoUrl?.trim() || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(data.nombre)}`,
    rol: 'miembro',
    grupo_id: data.grupoId,
    debe_cambiar_password: false,
    intentos_fallidos: 0,
    activo: true,
    racha: 0,
    creado_en: new Date().toISOString(),
  };

  dbUpsert('usuarios', nuevoUsuario);
  return nuevoUsuario;
}

export async function buscarUsuarioPorId(id: string): Promise<Usuario | null> {
  await ensureInitialized();
  const u = dbGet<Usuario>('usuarios', id);
  if (u) return u;
  if (id === 'usr-superadmin-001' || id.toLowerCase().includes('superadmin')) {
    return await buscarUsuarioPorEmail('martinchiacchio.seg@gmail.com');
  }
  return null;
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

// ==============================================================================
// GESTIÓN DE PUBLICIDADES (SUPERADMIN)
// ==============================================================================

export async function listarPublicidades(): Promise<Publicidad[]> {
  await ensureInitialized();
  return dbGetAll<Publicidad>('publicidades');
}

export async function guardarPublicidad(data: Omit<Publicidad, 'id' | 'creado_en'> & { id?: string }): Promise<Publicidad> {
  await ensureInitialized();
  const pub: Publicidad = {
    id: data.id || uuidv4(),
    titulo: data.titulo.trim(),
    texto: data.texto.trim(),
    imagen_url: data.imagen_url?.trim(),
    link_url: data.link_url?.trim(),
    ubicacion: data.ubicacion,
    activa: data.activa ?? true,
    creado_en: new Date().toISOString(),
  };

  dbUpsert('publicidades', pub);
  return pub;
}

export async function eliminarPublicidad(id: string): Promise<boolean> {
  await ensureInitialized();
  return dbDelete('publicidades', id);
}

export async function obtenerPublicidadPorUbicacion(ubicacion: UbicacionPublicidad): Promise<Publicidad | null> {
  await ensureInitialized();
  const todas = dbGetAll<Publicidad>('publicidades');
  const candidatas = todas.filter((p) => p.activa && p.ubicacion === ubicacion);
  if (candidatas.length === 0) return null;
  return candidatas[Math.floor(Math.random() * candidatas.length)];
}

// ==============================================================================
// RETOS DIARIOS
// ==============================================================================

export async function obtenerRetoDelDia(fecha: string, grupoId?: string): Promise<RetoDiario | null> {
  await ensureInitialized();
  const retos = dbGetAll<RetoDiario>('retos');
  return retos.find((r) => r.fecha === fecha && (!r.grupo_id || r.grupo_id === grupoId)) || null;
}

export async function guardarRetoDelDia(reto: Omit<RetoDiario, 'id' | 'creado_en'>): Promise<RetoDiario> {
  await ensureInitialized();
  const nuevo: RetoDiario = {
    id: uuidv4(),
    ...reto,
    creado_en: new Date().toISOString(),
  };
  dbUpsert('retos', nuevo);
  return nuevo;
}

// ==============================================================================
// VOTO CRUZADO Y DESTELLOS DEL DÍA
// ==============================================================================

export async function listarDestellosDia(grupoId: string, fecha: string): Promise<Destello[]> {
  await ensureInitialized();
  const destellos = dbGetAll<Destello>('destellos');
  return destellos.filter((d) => d.grupo_id === grupoId && d.fecha === fecha && d.moderado);
}

export async function registrarVotoCruzado(
  grupoId: string,
  fecha: string,
  votanteId: string,
  destelloId: string
): Promise<{ ok: boolean; mensaje?: string; destello?: Destello }> {
  await ensureInitialized();
  const votos = dbGetAll<JuegoVotoCruzado>('votosCruzados');
  const yaVoto = votos.find((v) => v.grupo_id === grupoId && v.fecha === fecha && v.votante_id === votanteId);

  if (yaVoto) {
    yaVoto.destello_id = destelloId;
    dbUpsert('votosCruzados', yaVoto);
  } else {
    const nuevoVoto: JuegoVotoCruzado = {
      id: uuidv4(),
      grupo_id: grupoId,
      fecha,
      votante_id: votanteId,
      destello_id: destelloId,
      creado_en: new Date().toISOString(),
    };
    dbUpsert('votosCruzados', nuevoVoto);
  }

  // Actualizar votos acumulados del destello
  const destello = dbGet<Destello>('destellos', destelloId);
  if (destello) {
    destello.votos_comunidad = (destello.votos_comunidad || 0) + 1;
    dbUpsert('destellos', destello);
  }

  return { ok: true, mensaje: '¡Voto registrado con éxito!', destello: destello || undefined };
}

export async function obtenerVotoUsuarioHoy(grupoId: string, fecha: string, votanteId: string): Promise<string | null> {
  await ensureInitialized();
  const votos = dbGetAll<JuegoVotoCruzado>('votosCruzados');
  const v = votos.find((x) => x.grupo_id === grupoId && x.fecha === fecha && x.votante_id === votanteId);
  return v?.destello_id || null;
}

// ==============================================================================
// MINI-JUEGO: FOTO DEL PASADO
// ==============================================================================

export async function obtenerFotoPasadoSemanal(grupoId: string, semana: string) {
  await ensureInitialized();
  const fotos = dbGetAll<JuegoFotoPasado>('fotosPasado');
  const foto = fotos.find((f) => f.grupo_id === grupoId && f.semana === semana && !f.cerrada);
  if (!foto) return null;

  const usuario = await buscarUsuarioPorId(foto.usuario_id);
  const adivinanzas = dbGetAll<JuegoFotoPasadoAdivinanza>('fotosPasadoAdivinanzas')
    .filter((a) => a.foto_pasado_id === foto.id);

  return {
    ...foto,
    autor_nombre: usuario?.nombre || 'Alguien del grupo',
    autor_apodo: usuario?.apodo,
    usuario: usuario ? { id: usuario.id, nombre: usuario.nombre, apodo: usuario.apodo, avatar_url: usuario.avatar_url, rol: usuario.rol, activo: usuario.activo, racha: usuario.racha, creado_en: usuario.creado_en } : undefined,
    adivinanzas_count: adivinanzas.length,
  };
}

export async function subirFotoPasado(data: {
  grupoId?: string;
  grupo_id?: string;
  semana: string;
  usuarioId?: string;
  usuario_id?: string;
  mediaUrl?: string;
  media_url?: string;
  anioReal?: number;
  anio_real?: number;
  lugarReal?: string;
  lugar_real?: string;
  pista?: string;
}): Promise<JuegoFotoPasado> {
  await ensureInitialized();
  const grupo_id = data.grupo_id || data.grupoId || '';
  const usuario_id = data.usuario_id || data.usuarioId || '';
  const media_url = data.media_url || data.mediaUrl || '';
  const anio_real = data.anio_real ?? data.anioReal ?? 2000;
  const lugar_real = (data.lugar_real || data.lugarReal || '').trim();

  const foto: JuegoFotoPasado = {
    id: uuidv4(),
    grupo_id,
    semana: data.semana,
    usuario_id,
    media_url,
    anio_real,
    lugar_real,
    pista: data.pista?.trim(),
    cerrada: false,
    creado_en: new Date().toISOString(),
  };

  dbUpsert('fotosPasado', foto);
  return foto;
}

export async function registrarAdivinanzaFotoPasado(
  fotoPasadoId: string,
  usuarioId: string,
  anioAdivinado: number,
  lugarAdivinado?: string
): Promise<JuegoFotoPasadoAdivinanza & { diferencia: number; anioReal: number }> {
  await ensureInitialized();
  const foto = dbGet<JuegoFotoPasado>('fotosPasado', fotoPasadoId);
  const dif = foto ? Math.abs(foto.anio_real - anioAdivinado) : 99;

  let puntos = 0;
  if (dif === 0) puntos = 3; // Exacto
  else if (dif <= 2) puntos = 1; // Cercano

  const adiv: JuegoFotoPasadoAdivinanza = {
    id: uuidv4(),
    foto_pasado_id: fotoPasadoId,
    usuario_id: usuarioId,
    anio_adivinado: anioAdivinado,
    lugar_adivinado: lugarAdivinado?.trim(),
    puntos_obtenidos: puntos,
    puntos_ganados: puntos,
    creado_en: new Date().toISOString(),
  };

  dbUpsert('fotosPasadoAdivinanzas', adiv);

  if (puntos > 0 && foto) {
    await otorgarPuntos(
      foto.grupo_id,
      usuarioId,
      getFechaArgentina(),
      'adivina_quien',
      puntos,
      `🕰️ Foto del pasado: año ${anioAdivinado} (${dif === 0 ? '¡Exacto!' : 'Muy cerca'})`
    );
  }

  return {
    ...adiv,
    diferencia: dif,
    anioReal: foto?.anio_real || 0,
  };
}

export async function haAdivinadoFotoPasado(fotoPasadoId: string, usuarioId: string) {
  await ensureInitialized();
  const adivinanzas = dbGetAll<JuegoFotoPasadoAdivinanza>('fotosPasadoAdivinanzas');
  return adivinanzas.find((a) => a.foto_pasado_id === fotoPasadoId && a.usuario_id === usuarioId) || null;
}

// ==============================================================================
// MINI-JUEGO: RULETA RUSA PICANTE
// ==============================================================================

export async function obtenerRondaRuletaActiva(grupoId: string) {
  await ensureInitialized();
  const rondas = dbGetAll<JuegoRuletaRusa>('ruletaRondas');
  const ronda = rondas.find((r) => r.grupo_id === grupoId && !r.cerrada);
  if (!ronda) return null;

  const todasPreguntas = dbGetAll<JuegoRuletaPregunta>('ruletaPreguntas');
  const preguntas = todasPreguntas.filter((p) => p.ronda_id === ronda.id && p.aprobada_ia);

  const usuarios = dbGetAll<Usuario>('usuarios');
  const preguntasConDetalles = preguntas.map((p) => {
    const autor = usuarios.find((u) => u.id === p.autor_usuario_id);
    const asignado = p.asignada_a_usuario_id ? usuarios.find((u) => u.id === p.asignada_a_usuario_id) : undefined;
    return {
      ...p,
      autor_nombre: autor?.apodo || autor?.nombre || 'Alguien',
      destinatario_nombre: asignado?.apodo || asignado?.nombre || 'Nadie aún',
    };
  });

  return { ronda, preguntas: preguntasConDetalles };
}

export async function abrirRondaRuleta(grupoId: string, nivelMaximo: NivelRuleta = 'picante'): Promise<JuegoRuletaRusa> {
  await ensureInitialized();
  const nueva: JuegoRuletaRusa = {
    id: uuidv4(),
    grupo_id: grupoId,
    nivel_maximo: nivelMaximo,
    estado: 'preguntas',
    cerrada: false,
    creado_en: new Date().toISOString(),
  };

  dbUpsert('ruletaRondas', nueva);
  return nueva;
}

export async function enviarPreguntaRuleta(
  rondaId: string,
  autorId: string,
  texto: string,
  nivel: NivelRuleta
): Promise<JuegoRuletaPregunta> {
  await ensureInitialized();
  const p: JuegoRuletaPregunta = {
    id: uuidv4(),
    ronda_id: rondaId,
    autor_usuario_id: autorId,
    texto_pregunta: texto.trim(),
    texto: texto.trim(),
    nivel,
    aprobada_ia: true,
    es_bala: Math.random() < 0.35,
    respondida: false,
    paso_utilizado: false,
    reacciones_risa: 0,
    reacciones_fuego: 0,
    reacciones_amor: 0,
    creado_en: new Date().toISOString(),
  };

  dbUpsert('ruletaPreguntas', p);
  return p;
}

export async function girarRuleta(rondaId: string): Promise<boolean> {
  await ensureInitialized();
  const ronda = dbGet<JuegoRuletaRusa>('ruletaRondas', rondaId);
  if (!ronda) return false;

  const miembros = (await listarUsuariosGrupo(ronda.grupo_id)).filter((m) => m.activo);
  if (miembros.length === 0) return false;

  const preguntas = dbGetAll<JuegoRuletaPregunta>('ruletaPreguntas').filter((p) => p.ronda_id === rondaId);
  let idx = 0;
  for (const preg of preguntas) {
    const destino = miembros[idx % miembros.length];
    preg.asignada_a_usuario_id = destino.id;
    preg.destinatario_id = destino.id;
    dbUpsert('ruletaPreguntas', preg);
    idx++;
  }

  ronda.estado = 'girada';
  dbUpsert('ruletaRondas', ronda);
  return true;
}

export async function responderPreguntaRuleta(
  preguntaId: string,
  usuarioId: string,
  respuestaTexto?: string,
  respuestaMediaUrl?: string
) {
  await ensureInitialized();
  const p = dbGet<JuegoRuletaPregunta>('ruletaPreguntas', preguntaId);
  if (!p) return { ok: false, error: 'Pregunta no encontrada' };

  p.respuesta_texto = respuestaTexto?.trim();
  p.respuesta_media_url = respuestaMediaUrl?.trim();
  p.respondida = true;
  dbUpsert('ruletaPreguntas', p);

  const ronda = dbGet<JuegoRuletaRusa>('ruletaRondas', p.ronda_id);
  const grupoId = ronda?.grupo_id || (await obtenerGrupoIdPorDefecto());

  await otorgarPuntos(
    grupoId,
    usuarioId,
    getFechaArgentina(),
    'adivina_quien',
    2,
    '🎲 Respuesta a la Ruleta Rusa'
  );

  return { ok: true, puntosSumados: 2 };
}

export async function pasarPreguntaRuleta(preguntaId: string, usuarioId: string): Promise<JuegoRuletaPregunta | null> {
  await ensureInitialized();
  const p = dbGet<JuegoRuletaPregunta>('ruletaPreguntas', preguntaId);
  if (!p || p.paso_utilizado) return null;

  p.paso_utilizado = true;
  dbUpsert('ruletaPreguntas', p);

  const todas = dbGetAll<JuegoRuletaPregunta>('ruletaPreguntas');
  const otra = todas.find(
    (x) => x.ronda_id === p.ronda_id && x.id !== p.id && x.autor_usuario_id !== usuarioId && !x.respondida
  );

  if (otra) {
    otra.asignada_a_usuario_id = usuarioId;
    otra.destinatario_id = usuarioId;
    dbUpsert('ruletaPreguntas', otra);
    return otra;
  }
  return p;
}

export async function reaccionarPreguntaRuleta(preguntaId: string, tipo: 'risa' | 'fuego' | 'amor') {
  await ensureInitialized();
  const p = dbGet<JuegoRuletaPregunta>('ruletaPreguntas', preguntaId);
  if (!p) return null;

  if (tipo === 'risa') p.reacciones_risa = (p.reacciones_risa || 0) + 1;
  if (tipo === 'fuego') p.reacciones_fuego = (p.reacciones_fuego || 0) + 1;
  if (tipo === 'amor') p.reacciones_amor = (p.reacciones_amor || 0) + 1;

  dbUpsert('ruletaPreguntas', p);
  return { risa: p.reacciones_risa, fuego: p.reacciones_fuego, amor: p.reacciones_amor };
}

// ==============================================================================
// MINI-JUEGO: PRODE DEL FÚTBOL
// ==============================================================================

export async function obtenerFechaProdeActiva(grupoId: string) {
  await ensureInitialized();
  const fechas = dbGetAll<JuegoProdeFecha>('prodeFechas');
  let fecha = fechas.find((f) => f.grupo_id === grupoId && !f.cerrada);

  if (!fecha) {
    fecha = {
      id: uuidv4(),
      grupo_id: grupoId,
      torneo_nombre: 'Liga Profesional Argentina',
      numero_fecha: 14,
      nombre: 'Fecha 14 - Liga Profesional',
      fecha_inicio: new Date().toISOString(),
      fecha_fin: new Date(Date.now() + 4 * 86400000).toISOString(),
      cerrada: false,
      creado_en: new Date().toISOString(),
    };
    dbUpsert('prodeFechas', fecha);

    // Inicializar con partidos argentinos
    await sincronizarPartidosProde(grupoId);
  }

  const partidos = dbGetAll<JuegoProdePartido>('prodePartidos').filter((p) => p.fecha_prode_id === fecha?.id);
  const pronosticos = dbGetAll<JuegoProdePronostico>('prodePronosticos').filter((pr) =>
    partidos.some((p) => p.id === pr.partido_id)
  );

  return { fecha, partidos, pronosticos };
}

export async function guardarPronosticoProde(
  partidoId: string,
  usuarioId: string,
  pronostico: ResultadoPronostico | 'local' | 'empate' | 'visitante',
  golesLocal?: number,
  golesVisitante?: number
): Promise<JuegoProdePronostico> {
  await ensureInitialized();
  const pronosticos = dbGetAll<JuegoProdePronostico>('prodePronosticos');
  const normalizado: ResultadoPronostico =
    pronostico === 'local' ? 'L' : pronostico === 'empate' ? 'E' : pronostico === 'visitante' ? 'V' : pronostico;

  const existente = pronosticos.find((p) => p.partido_id === partidoId && p.usuario_id === usuarioId);
  if (existente) {
    existente.pronostico = normalizado;
    existente.goles_local_pronostico = golesLocal;
    existente.goles_visitante_pronostico = golesVisitante;
    dbUpsert('prodePronosticos', existente);
    return existente;
  }

  const nuevo: JuegoProdePronostico = {
    id: uuidv4(),
    partido_id: partidoId,
    usuario_id: usuarioId,
    pronostico: normalizado,
    goles_local_pronostico: golesLocal,
    goles_visitante_pronostico: golesVisitante,
    corregido: false,
    acerto: false,
    puntos_sumados: 0,
    creado_en: new Date().toISOString(),
  };

  dbUpsert('prodePronosticos', nuevo);
  return nuevo;
}

export async function corregirPartidosProde(
  fechaProdeId: string,
  resultadosManuales?: Array<{ partidoId: string; golesLocal: number; golesVisitante: number }>
) {
  await ensureInitialized();
  const fecha = dbGet<JuegoProdeFecha>('prodeFechas', fechaProdeId);
  if (!fecha) return null;

  const partidos = dbGetAll<JuegoProdePartido>('prodePartidos').filter((p) => p.fecha_prode_id === fechaProdeId);
  const pronosticos = dbGetAll<JuegoProdePronostico>('prodePronosticos');

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
    } else if (part.goles_local === undefined || part.goles_local === null) {
      part.goles_local = Math.floor(Math.random() * 3);
      part.goles_visitante = Math.floor(Math.random() * 3);
      part.estado_partido = 'finalizado';
      part.resultado_final =
        part.goles_local > part.goles_visitante ? 'L' : part.goles_local === part.goles_visitante ? 'E' : 'V';
    }
    dbUpsert('prodePartidos', part);

    const pronosPartido = pronosticos.filter((pr) => pr.partido_id === part.id && !pr.corregido);
    for (const pr of pronosPartido) {
      pr.corregido = true;
      const acertoResultado = pr.pronostico === part.resultado_final;
      const acertoMarcador =
        pr.goles_local_pronostico === part.goles_local &&
        pr.goles_visitante_pronostico === part.goles_visitante;

      let pts = 0;
      if (acertoResultado) pts += 3;
      if (acertoMarcador) pts += 1;

      pr.acerto = acertoResultado;
      pr.acertado = acertoResultado;
      pr.puntos_sumados = pts;
      pr.puntos_ganados = pts;
      dbUpsert('prodePronosticos', pr);

      if (pts > 0) {
        await otorgarPuntos(
          fecha.grupo_id,
          pr.usuario_id,
          getFechaArgentina(),
          'trivia_acierto',
          pts,
          `⚽ Prode: ${part.equipo_local} vs ${part.equipo_visitante} (+${pts} pts)`
        );
      }
    }
  }

  fecha.cerrada = true;
  dbUpsert('prodeFechas', fecha);
  return { ok: true, fecha };
}

export async function sincronizarPartidosProde(grupoId: string) {
  await ensureInitialized();
  const fechas = dbGetAll<JuegoProdeFecha>('prodeFechas');
  let fecha = fechas.find((f) => f.grupo_id === grupoId && !f.cerrada);

  if (!fecha) {
    fecha = {
      id: uuidv4(),
      grupo_id: grupoId,
      torneo_nombre: 'Liga Profesional Argentina',
      numero_fecha: 14,
      nombre: 'Fecha 14 - Liga Profesional',
      fecha_inicio: new Date().toISOString(),
      fecha_fin: new Date(Date.now() + 4 * 86400000).toISOString(),
      cerrada: false,
      creado_en: new Date().toISOString(),
    };
    dbUpsert('prodeFechas', fecha);
  }

  const equiposArg = [
    { nombre: 'Boca Juniors', escudo: 'https://upload.wikimedia.org/wikipedia/commons/4/41/CABJ-Sitio-Oficial.png' },
    { nombre: 'River Plate', escudo: 'https://upload.wikimedia.org/wikipedia/commons/a/ac/Escudo_del_C_A_River_Plate.svg' },
    { nombre: 'Racing Club', escudo: 'https://upload.wikimedia.org/wikipedia/commons/5/56/Escudo_de_Racing_Club_%282014%29.svg' },
    { nombre: 'Independiente', escudo: 'https://upload.wikimedia.org/wikipedia/commons/d/db/Escudo_del_Club_Atl%C3%A9tico_Independiente.svg' },
    { nombre: 'San Lorenzo', escudo: 'https://upload.wikimedia.org/wikipedia/commons/7/77/Escudo_del_Club_Atl%C3%A9tico_San_Lorenzo_de_Almagro.svg' },
    { nombre: 'Huracán', escudo: 'https://upload.wikimedia.org/wikipedia/commons/1/1a/Escudo_del_Club_Atl%C3%A9tico_Hurac%C3%A1n.png' },
    { nombre: 'Rosario Central', escudo: 'https://upload.wikimedia.org/wikipedia/commons/2/23/Escudo_del_Club_Atl%C3%A9tico_Rosario_Central.svg' },
    { nombre: "Newell's Old Boys", escudo: 'https://upload.wikimedia.org/wikipedia/commons/8/87/Escudo_de_Newell%27s_Old_Boys.svg' },
  ];

  const existentes = dbGetAll<JuegoProdePartido>('prodePartidos').filter((p) => p.fecha_prode_id === fecha?.id);
  if (existentes.length === 0) {
    const p1: JuegoProdePartido = {
      id: uuidv4(),
      fecha_prode_id: fecha.id,
      equipo_local: equiposArg[0].nombre,
      escudo_local: equiposArg[0].escudo,
      equipo_visitante: equiposArg[1].nombre,
      escudo_visitante: equiposArg[1].escudo,
      fecha_hora_partido: new Date(Date.now() + 2 * 86400000).toISOString(),
      fecha_hora_texto: 'Domingo 17:00 hs',
      estado_partido: 'programado',
      creado_en: new Date().toISOString(),
    };
    const p2: JuegoProdePartido = {
      id: uuidv4(),
      fecha_prode_id: fecha.id,
      equipo_local: equiposArg[2].nombre,
      escudo_local: equiposArg[2].escudo,
      equipo_visitante: equiposArg[3].nombre,
      escudo_visitante: equiposArg[3].escudo,
      fecha_hora_partido: new Date(Date.now() + 2 * 86400000).toISOString(),
      fecha_hora_texto: 'Sábado 19:30 hs',
      estado_partido: 'programado',
      creado_en: new Date().toISOString(),
    };
    dbUpsert('prodePartidos', p1);
    dbUpsert('prodePartidos', p2);
  }

  return { ok: true, fecha };
}
