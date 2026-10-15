import fs from 'fs';
import path from 'path';

/**
 * Persistencia sólida basada en SQLite (módulo nativo node:sqlite).
 *
 * Características:
 * - Archivo único: data/destellos.db
 * - Modo WAL (Write-Ahead Logging) + synchronous=NORMAL + busy_timeout=15000.
 * - Guardado atómico inmediato en cada operación (sin diffs ciegos que borren datos ajenos).
 * - Las eliminaciones son EXPLÍCITAS (solo se borra el ID indicado).
 * - Múltiples workers concurrentes pueden leer y escribir sin pisarse ni borrarse registros.
 * - Backups automáticos rotativos.
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
] as const;

export type CollectionName = (typeof COLLECTIONS)[number];

const DATA_DIR = path.join(process.cwd(), 'data');
export const DB_PATH = path.join(DATA_DIR, 'destellos.db');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const BACKUP_EVERY_MS = 30 * 60 * 1000;
const BACKUP_KEEP = 30;

const g = globalThis as unknown as {
  __destellos_sqlite?: any;
  __destellos_last_backup?: number;
};

export function getDb(): any {
  if (g.__destellos_sqlite) return g.__destellos_sqlite;

  const sqlite = (process as any).getBuiltinModule('node:sqlite');
  if (!sqlite) throw new Error('node:sqlite no disponible. Se requiere Node.js 22.5 o superior.');

  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = new sqlite.DatabaseSync(DB_PATH);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA synchronous = NORMAL;');
  db.exec('PRAGMA busy_timeout = 15000;');

  for (const c of COLLECTIONS) {
    db.exec(`CREATE TABLE IF NOT EXISTS c_${c} (id TEXT PRIMARY KEY, data TEXT NOT NULL)`);
  }
  db.exec('CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value INTEGER NOT NULL)');
  db.exec("INSERT OR IGNORE INTO meta (key, value) VALUES ('version', 1)");

  g.__destellos_sqlite = db;
  return db;
}

export function leerVersion(): number {
  try {
    const row = getDb().prepare("SELECT value FROM meta WHERE key='version'").get();
    return row ? Number(row.value) : 1;
  } catch {
    return 1;
  }
}

export function incrementarVersion(): number {
  try {
    const db = getDb();
    db.exec("UPDATE meta SET value = value + 1 WHERE key='version'");
    return leerVersion();
  } catch {
    return 1;
  }
}

export function cantidadUsuarios(): number {
  try {
    const row = getDb().prepare('SELECT COUNT(*) AS n FROM c_usuarios').get();
    return row ? Number(row.n) : 0;
  } catch {
    return 0;
  }
}

/** Inserta o actualiza un registro individual de forma atómica e inmediata */
export function dbUpsert(collection: CollectionName, item: any): void {
  if (!item) return;
  const id = item.id !== undefined && item.id !== null ? String(item.id) : null;
  if (!id) return;

  const db = getDb();
  const json = JSON.stringify(item);
  db.prepare(
    `INSERT INTO c_${collection} (id, data) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data`
  ).run(id, json);

  incrementarVersion();
  programarBackup();
}

/** Guarda múltiples registros con INSERT OR REPLACE (sin borrar los que no estén en la lista) */
export function dbUpsertBatch(collection: CollectionName, items: any[]): void {
  if (!Array.isArray(items) || items.length === 0) return;
  const db = getDb();
  db.exec('BEGIN IMMEDIATE');
  try {
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
    throw e;
  }
  programarBackup();
}

/** Elimina EXPLÍCITAMENTE un registro por su ID */
export function dbDelete(collection: CollectionName, id: string): boolean {
  if (!id) return false;
  const db = getDb();
  const res = db.prepare(`DELETE FROM c_${collection} WHERE id = ?`).run(String(id));
  incrementarVersion();
  return (res?.changes || 0) > 0;
}

/** Obtiene un registro por ID */
export function dbGet<T = any>(collection: CollectionName, id: string): T | null {
  if (!id) return null;
  const db = getDb();
  const row = db.prepare(`SELECT data FROM c_${collection} WHERE id = ?`).get(String(id));
  if (!row) return null;
  try {
    return JSON.parse(String(row.data)) as T;
  } catch {
    return null;
  }
}

/** Obtiene todos los registros de una colección */
export function dbGetAll<T = any>(collection: CollectionName): T[] {
  const db = getDb();
  const rows = db.prepare(`SELECT data FROM c_${collection}`).all();
  const res: T[] = [];
  for (const r of rows) {
    try {
      res.push(JSON.parse(String(r.data)));
    } catch {}
  }
  return res;
}

/** Lee toda la base de datos completa */
export function cargarTodo(): { data: Record<string, any[]>; version: number } {
  const db = getDb();
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
    throw e;
  }
}

/** Importa un store completo (migración desde el JSON viejo) solo si la base está vacía. */
export function importarSiVacia(store: Record<string, any>): boolean {
  if (cantidadUsuarios() > 0) return false;
  if (!Array.isArray(store.usuarios) || store.usuarios.length === 0) return false;

  const db = getDb();
  db.exec('BEGIN IMMEDIATE');
  try {
    for (const c of COLLECTIONS) {
      const arr = Array.isArray(store[c]) ? store[c] : [];
      const stmt = db.prepare(
        `INSERT INTO c_${c} (id, data) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data`
      );
      arr.forEach((item: any, i: number) => {
        const id = item?.id !== undefined && item?.id !== null ? String(item.id) : `idx-${i}-${Date.now()}`;
        stmt.run(id, JSON.stringify(item));
      });
    }
    db.exec("UPDATE meta SET value = value + 1 WHERE key='version'");
    db.exec('COMMIT');
    return true;
  } catch (e) {
    try { db.exec('ROLLBACK'); } catch {}
    throw e;
  }
}

export function hacerBackup(): string | null {
  try {
    if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dest = path.join(BACKUP_DIR, `destellos-${stamp}.db`);
    getDb().exec(`VACUUM INTO '${dest.replace(/'/g, "''")}'`);
    g.__destellos_last_backup = Date.now();

    const files = fs
      .readdirSync(BACKUP_DIR)
      .filter((f) => f.startsWith('destellos-') && f.endsWith('.db'))
      .sort();
    while (files.length > BACKUP_KEEP) {
      const viejo = files.shift()!;
      try { fs.unlinkSync(path.join(BACKUP_DIR, viejo)); } catch {}
    }
    return dest;
  } catch (e) {
    console.error('[db] Error haciendo backup:', e);
    return null;
  }
}

function programarBackup() {
  const ultimo = g.__destellos_last_backup || 0;
  if (Date.now() - ultimo > BACKUP_EVERY_MS) hacerBackup();
}
