import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Persistencia universal basada en SQLite (node:sqlite) con fallback resiliente.
 *
 * Características:
 * - Compatible con Windows, Linux, Mac y Vercel Serverless (/tmp).
 * - Si node:sqlite está disponible, opera con SQLite en modo WAL atómico.
 * - Si node:sqlite no está disponible (ej. Node 20 en Vercel), opera con persistencia JSON atómica en disco.
 * - CERO cuelgues, CERO errores 500 por permisos de lectura/escritura.
 */

export const COLLECTIONS = [
  'usuarios',
  'grupos',
  'retos',
  'destellos',
  'evaluaciones',
  'puntos',
  'adivinanzas',
  'votosCruzados',
  'fotosPasado',
  'fotosPasadoAdivinanzas',
  'ruletaRondas',
  'ruletaPreguntas',
  'prodeFechas',
  'prodePartidos',
  'prodePronosticos',
  'publicidades',
  'reglas',
  'triviaPreguntas',
  'triviaIntentos',
  'feedPosts',
  'reacciones',
  'notificacionesAdmin',
  'boardMessages',
  'ai_logs',
] as const;

export type CollectionName = (typeof COLLECTIONS)[number];

const isVercel = process.env.VERCEL === '1' || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);
const DATA_DIR = isVercel
  ? path.join(os.tmpdir(), 'destellos-data')
  : path.join(process.cwd(), 'data');

export const DB_PATH = path.join(DATA_DIR, 'destellos.db');
const JSON_FALLBACK_PATH = path.join(DATA_DIR, 'destellos_store.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');

const g = globalThis as unknown as {
  __destellos_sqlite?: any;
  __destellos_memory?: Map<string, Map<string, any>>;
  __destellos_version?: number;
};

// Inicializador de directorio seguro
function asegurarDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    // Si estamos en Vercel y existe una base precompilada en el repo, copiarla a /tmp
    if (isVercel && !fs.existsSync(DB_PATH)) {
      const bundledDb = path.join(process.cwd(), 'data', 'destellos.db');
      if (fs.existsSync(bundledDb)) {
        try {
          fs.copyFileSync(bundledDb, DB_PATH);
        } catch {}
      }
    }
  } catch (err) {
    console.error('Error asegurando DATA_DIR:', err);
  }
}

// Fallback en memoria si SQLite no está disponible
function getMemoryStore(): Map<string, Map<string, any>> {
  if (!g.__destellos_memory) {
    g.__destellos_memory = new Map();
    for (const c of COLLECTIONS) {
      g.__destellos_memory.set(c, new Map());
    }
    // Intentar leer de JSON fallback si existe
    try {
      if (fs.existsSync(JSON_FALLBACK_PATH)) {
        const raw = JSON.parse(fs.readFileSync(JSON_FALLBACK_PATH, 'utf-8'));
        for (const c of COLLECTIONS) {
          if (Array.isArray(raw[c])) {
            const map = g.__destellos_memory.get(c)!;
            for (const item of raw[c]) {
              if (item?.id) map.set(String(item.id), item);
            }
          }
        }
      }
    } catch {}
  }
  return g.__destellos_memory;
}

function persistirMemoryJson() {
  try {
    asegurarDataDir();
    const mem = getMemoryStore();
    const obj: Record<string, any[]> = {};
    for (const c of COLLECTIONS) {
      obj[c] = Array.from(mem.get(c)!.values());
    }
    fs.writeFileSync(JSON_FALLBACK_PATH, JSON.stringify(obj, null, 2), 'utf-8');
  } catch {}
}

export function getDb(): any {
  if (g.__destellos_sqlite !== undefined) return g.__destellos_sqlite;

  asegurarDataDir();

  let sqlite: any = null;
  try {
    sqlite = eval('require')('node:sqlite');
  } catch {
    try {
      sqlite = (process as any).getBuiltinModule?.('node:sqlite');
    } catch {}
  }

  if (!sqlite || !sqlite.DatabaseSync) {
    g.__destellos_sqlite = null;
    return null;
  }

  try {
    const db = new sqlite.DatabaseSync(DB_PATH);
    try {
      db.exec('PRAGMA journal_mode = WAL;');
      db.exec('PRAGMA synchronous = NORMAL;');
      db.exec('PRAGMA busy_timeout = 15000;');
    } catch {}

    for (const c of COLLECTIONS) {
      db.exec(`CREATE TABLE IF NOT EXISTS c_${c} (id TEXT PRIMARY KEY, data TEXT NOT NULL)`);
    }
    db.exec('CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value INTEGER NOT NULL)');
    db.exec("INSERT OR IGNORE INTO meta (key, value) VALUES ('version', 1)");

    g.__destellos_sqlite = db;
    return db;
  } catch (err) {
    console.warn('[db] Error abriendo SQLite, usando motor JSON resiliente:', err);
    g.__destellos_sqlite = null;
    return null;
  }
}

export function leerVersion(): number {
  const db = getDb();
  if (!db) return g.__destellos_version || 1;
  try {
    const row = db.prepare("SELECT value FROM meta WHERE key='version'").get();
    return row ? Number(row.value) : 1;
  } catch {
    return 1;
  }
}

export function incrementarVersion(): number {
  g.__destellos_version = (g.__destellos_version || 1) + 1;
  const db = getDb();
  if (!db) return g.__destellos_version;
  try {
    db.exec("UPDATE meta SET value = value + 1 WHERE key='version'");
    return leerVersion();
  } catch {
    return g.__destellos_version;
  }
}

export function dbGetMeta(key: string): string | null {
  const db = getDb();
  if (!db) return null;
  try {
    const row = db.prepare('SELECT value FROM meta WHERE key = ?').get(key);
    return row ? String(row.value) : null;
  } catch {
    return null;
  }
}

export function dbSetMeta(key: string, value: string | number): void {
  const db = getDb();
  if (!db) return;
  try {
    db.prepare('INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, String(value));
  } catch {}
}

export function cantidadUsuarios(): number {
  const db = getDb();
  if (!db) {
    const mem = getMemoryStore();
    return mem.get('usuarios')?.size || 0;
  }
  try {
    const row = db.prepare('SELECT COUNT(*) AS n FROM c_usuarios').get();
    return row ? Number(row.n) : 0;
  } catch {
    return 0;
  }
}

export function dbUpsert(collection: CollectionName, item: any): void {
  if (!item) return;
  const id = item.id !== undefined && item.id !== null ? String(item.id) : null;
  if (!id) return;

  const db = getDb();
  if (!db) {
    const mem = getMemoryStore();
    mem.get(collection)?.set(id, item);
    persistirMemoryJson();
    incrementarVersion();
    return;
  }

  try {
    const json = JSON.stringify(item);
    db.prepare(
      `INSERT INTO c_${collection} (id, data) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data`
    ).run(id, json);
    incrementarVersion();
  } catch (err) {
    console.error(`Error en dbUpsert(${collection}):`, err);
    // Fallback a memoria
    const mem = getMemoryStore();
    mem.get(collection)?.set(id, item);
    persistirMemoryJson();
  }
}

export function dbUpsertBatch(collection: CollectionName, items: any[]): void {
  if (!Array.isArray(items) || items.length === 0) return;
  const db = getDb();
  if (!db) {
    const mem = getMemoryStore();
    const map = mem.get(collection)!;
    for (const item of items) {
      const id = item?.id !== undefined && item?.id !== null ? String(item.id) : null;
      if (id) map.set(id, item);
    }
    persistirMemoryJson();
    incrementarVersion();
    return;
  }

  try {
    db.exec('BEGIN IMMEDIATE');
    const stmt = db.prepare(
      `INSERT INTO c_${collection} (id, data) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data`
    );
    for (const item of items) {
      const id = item?.id !== undefined && item?.id !== null ? String(item.id) : null;
      if (id) stmt.run(id, JSON.stringify(item));
    }
    db.exec("UPDATE meta SET value = value + 1 WHERE key='version'");
    db.exec('COMMIT');
  } catch (e) {
    try { db.exec('ROLLBACK'); } catch {}
    // Fallback
    const mem = getMemoryStore();
    const map = mem.get(collection)!;
    for (const item of items) {
      const id = item?.id !== undefined && item?.id !== null ? String(item.id) : null;
      if (id) map.set(id, item);
    }
    persistirMemoryJson();
  }
}

export function dbDelete(collection: CollectionName, id: string): boolean {
  if (!id) return false;
  const db = getDb();
  if (!db) {
    const mem = getMemoryStore();
    const ok = mem.get(collection)?.delete(String(id)) || false;
    if (ok) persistirMemoryJson();
    incrementarVersion();
    return ok;
  }

  try {
    const res = db.prepare(`DELETE FROM c_${collection} WHERE id = ?`).run(String(id));
    incrementarVersion();
    return (res?.changes || 0) > 0;
  } catch (err) {
    const mem = getMemoryStore();
    const ok = mem.get(collection)?.delete(String(id)) || false;
    if (ok) persistirMemoryJson();
    return ok;
  }
}

export function dbGet<T = any>(collection: CollectionName, id: string): T | null {
  if (!id) return null;
  const db = getDb();
  if (!db) {
    const mem = getMemoryStore();
    return (mem.get(collection)?.get(String(id)) as T) || null;
  }

  try {
    const row = db.prepare(`SELECT data FROM c_${collection} WHERE id = ?`).get(String(id));
    if (!row) return null;
    return JSON.parse(String(row.data)) as T;
  } catch {
    const mem = getMemoryStore();
    return (mem.get(collection)?.get(String(id)) as T) || null;
  }
}

export function dbGetAll<T = any>(collection: CollectionName): T[] {
  const db = getDb();
  if (!db) {
    const mem = getMemoryStore();
    return Array.from(mem.get(collection)?.values() || []) as T[];
  }

  try {
    const rows = db.prepare(`SELECT data FROM c_${collection}`).all();
    return rows.map((r: any) => JSON.parse(String(r.data))) as T[];
  } catch {
    const mem = getMemoryStore();
    return Array.from(mem.get(collection)?.values() || []) as T[];
  }
}

export function cargarTodo(): { data: Record<string, any[]>; version: number } {
  const db = getDb();
  if (!db) {
    const mem = getMemoryStore();
    const data: Record<string, any[]> = {};
    for (const c of COLLECTIONS) {
      data[c] = Array.from(mem.get(c)?.values() || []);
    }
    return { data, version: leerVersion() };
  }

  const data: Record<string, any[]> = {};
  db.exec('BEGIN');
  try {
    const version = leerVersion();
    for (const c of COLLECTIONS) {
      const rows = db.prepare(`SELECT data FROM c_${c}`).all();
      data[c] = rows.map((r: any) => JSON.parse(String(r.data)));
    }
    db.exec('COMMIT');
    return { data, version };
  } catch (e) {
    try { db.exec('ROLLBACK'); } catch {}
    const mem = getMemoryStore();
    for (const c of COLLECTIONS) {
      data[c] = Array.from(mem.get(c)?.values() || []);
    }
    return { data, version: 1 };
  }
}

export function importarSiVacia(store: Record<string, any>): boolean {
  if (cantidadUsuarios() > 0) return false;
  if (!Array.isArray(store.usuarios) || store.usuarios.length === 0) return false;

  for (const c of COLLECTIONS) {
    const arr = Array.isArray(store[c]) ? store[c] : [];
    dbUpsertBatch(c, arr);
  }
  return true;
}

export function hacerBackup(): string | null {
  try {
    if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dest = path.join(BACKUP_DIR, `destellos-${stamp}.db`);
    const db = getDb();
    if (db) {
      db.exec(`VACUUM INTO '${dest.replace(/'/g, "''")}'`);
      return dest;
    }
    return null;
  } catch (e) {
    return null;
  }
}
