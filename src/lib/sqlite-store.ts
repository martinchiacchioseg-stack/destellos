import fs from 'fs';
import path from 'path';

/**
 * Persistencia sólida basada en SQLite (módulo nativo node:sqlite, sin dependencias).
 *
 * - Un archivo único: data/destellos.db (modo WAL, synchronous=FULL, busy_timeout).
 * - Una tabla por colección (id, data JSON). Se guardan SOLO las filas que cambiaron
 *   respecto a la última lectura de este proceso (diff por fila), dentro de una
 *   transacción IMMEDIATE. Un proceso con datos viejos nunca borra ni pisa filas
 *   que no tocó.
 * - Contador de versión compartido: todos los procesos detectan cambios ajenos.
 * - Backups automáticos con VACUUM INTO (data/backups).
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
] as const;

export type CollectionName = (typeof COLLECTIONS)[number];

const DATA_DIR = path.join(process.cwd(), 'data');
export const DB_PATH = path.join(DATA_DIR, 'destellos.db');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const BACKUP_EVERY_MS = 30 * 60 * 1000;
const BACKUP_KEEP = 30;

type Snapshot = Record<string, Map<string, string>>;

const g = globalThis as unknown as {
  __destellos_sqlite?: any;
  __destellos_snapshot?: Snapshot;
  __destellos_last_backup?: number;
};

function getDb(): any {
  if (g.__destellos_sqlite) return g.__destellos_sqlite;

  const sqlite = (process as any).getBuiltinModule('node:sqlite');
  if (!sqlite) throw new Error('node:sqlite no disponible. Se requiere Node.js 22.5 o superior.');

  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = new sqlite.DatabaseSync(DB_PATH);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA synchronous = FULL;');
  db.exec('PRAGMA busy_timeout = 15000;');
  for (const c of COLLECTIONS) {
    db.exec(`CREATE TABLE IF NOT EXISTS c_${c} (id TEXT PRIMARY KEY, data TEXT NOT NULL)`);
  }
  db.exec('CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value INTEGER NOT NULL)');
  db.exec("INSERT OR IGNORE INTO meta (key, value) VALUES ('version', 0)");

  g.__destellos_sqlite = db;
  return db;
}

function keyOf(item: any, index: number): string {
  if (item && item.id !== undefined && item.id !== null) return String(item.id);
  return `idx-${index}-${JSON.stringify(item).length}`;
}

export function leerVersion(): number {
  const row = getDb().prepare("SELECT value FROM meta WHERE key='version'").get();
  return row ? Number(row.value) : 0;
}

export function cantidadUsuarios(): number {
  const row = getDb().prepare('SELECT COUNT(*) AS n FROM c_usuarios').get();
  return row ? Number(row.n) : 0;
}

/** Lee toda la base y reemplaza el snapshot de este proceso. */
export function cargarTodo(): { data: Record<string, any[]>; version: number } {
  const db = getDb();
  const data: Record<string, any[]> = {};
  const snapshot: Snapshot = {};
  db.exec('BEGIN');
  try {
    const version = leerVersion();
    for (const c of COLLECTIONS) {
      const rows = db.prepare(`SELECT id, data FROM c_${c}`).all();
      const map = new Map<string, string>();
      data[c] = rows.map((r: any) => {
        map.set(String(r.id), String(r.data));
        return JSON.parse(String(r.data));
      });
      snapshot[c] = map;
    }
    db.exec('COMMIT');
    g.__destellos_snapshot = snapshot;
    return { data, version };
  } catch (e) {
    try { db.exec('ROLLBACK'); } catch {}
    throw e;
  }
}

/**
 * Guarda solo lo que cambió respecto del snapshot. Devuelve:
 *  - changed: si hubo escrituras
 *  - version: versión resultante
 *  - externo: true si otro proceso escribió entre nuestra última lectura y este guardado
 */
export function guardarCambios(
  store: Record<string, any>,
  versionConocida: number
): { changed: boolean; version: number; externo: boolean } {
  const db = getDb();
  const snapshot = g.__destellos_snapshot || (g.__destellos_snapshot = {});

  // Calcular diff fuera de la transacción (barato)
  const upserts: Record<string, [string, string][]> = {};
  const deletes: Record<string, string[]> = {};
  let hayCambios = false;

  for (const c of COLLECTIONS) {
    const arr: any[] = Array.isArray(store[c]) ? store[c] : [];
    const prev = snapshot[c] || new Map<string, string>();
    const actuales = new Map<string, string>();
    arr.forEach((item, i) => actuales.set(keyOf(item, i), JSON.stringify(item)));

    const ups: [string, string][] = [];
    actuales.forEach((json, id) => {
      if (prev.get(id) !== json) ups.push([id, json]);
    });
    const dels: string[] = [];
    prev.forEach((_json, id) => {
      if (!actuales.has(id)) dels.push(id);
    });

    if (ups.length || dels.length) {
      upserts[c] = ups;
      deletes[c] = dels;
      hayCambios = true;
    }
  }

  if (!hayCambios) return { changed: false, version: versionConocida, externo: false };

  // Protección anti-vaciado: nunca borrar todos los usuarios de golpe
  if ((deletes['usuarios'] || []).length > 0 && (store.usuarios || []).length === 0) {
    console.warn('[db] Guardado cancelado: intento de vaciar todos los usuarios.');
    return { changed: false, version: versionConocida, externo: false };
  }

  db.exec('BEGIN IMMEDIATE');
  try {
    const antes = leerVersion();
    for (const c of Object.keys(upserts)) {
      const up = db.prepare(
        `INSERT INTO c_${c} (id, data) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data`
      );
      for (const [id, json] of upserts[c]) up.run(id, json);
      const del = db.prepare(`DELETE FROM c_${c} WHERE id = ?`);
      for (const id of deletes[c]) del.run(id);
    }
    db.exec("UPDATE meta SET value = value + 1 WHERE key='version'");
    const despues = leerVersion();
    db.exec('COMMIT');

    // Actualizar snapshot con lo que acabamos de escribir
    for (const c of Object.keys(upserts)) {
      const m = snapshot[c] || (snapshot[c] = new Map());
      for (const [id, json] of upserts[c]) m.set(id, json);
      for (const id of deletes[c]) m.delete(id);
    }

    programarBackup();
    return { changed: true, version: despues, externo: antes !== versionConocida };
  } catch (e) {
    try { db.exec('ROLLBACK'); } catch {}
    throw e;
  }
}

/** Importa un store completo (migración desde el JSON viejo) solo si la base está vacía. */
export function importarSiVacia(store: Record<string, any>): boolean {
  if (cantidadUsuarios() > 0) return false;
  if (!Array.isArray(store.usuarios) || store.usuarios.length === 0) return false;
  const vacio = (g.__destellos_snapshot = {} as Snapshot);
  for (const c of COLLECTIONS) vacio[c] = new Map();
  guardarCambios(store, leerVersion());
  return true;
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
