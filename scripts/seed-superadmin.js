/**
 * Script de inicialización (Seed) del Superadministrador único para Destellos
 * Ejecución: node scripts/seed-superadmin.js
 */

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

let sqliteModule = null;
try {
  sqliteModule = require('node:sqlite');
} catch (e) {
  console.error('Error cargando node:sqlite:', e);
  process.exit(1);
}

const { DatabaseSync } = sqliteModule;

const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'destellos.db');
const db = new DatabaseSync(DB_PATH);

db.exec('CREATE TABLE IF NOT EXISTS c_usuarios (id TEXT PRIMARY KEY, data TEXT NOT NULL)');

const superadminEmail = (process.env.SUPERADMIN_EMAIL || 'martinchiacchio.seg@gmail.com').toLowerCase().trim();
const superadminInitialPass = process.env.SUPERADMIN_INITIAL_PASSWORD || 'qwerty1234';

console.log(`[Seed] Configurando Superadmin: ${superadminEmail}`);

// Generar hash bcrypt
const salt = bcrypt.genSaltSync(10);
const hash = bcrypt.hashSync(superadminInitialPass, salt);

const superadmin = {
  id: 'usr-superadmin-001',
  email: superadminEmail,
  password_hash: hash,
  nombre: 'Martín (Superadmin)',
  apodo: 'Martín',
  telefono: '+54 9 2241 52-7357',
  avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  rol: 'superadmin',
  grupo_id: null,
  debe_cambiar_password: true, // Forzado en el primer ingreso
  intentos_fallidos: 0,
  bloqueado_hasta: null,
  activo: true,
  racha: 0,
  creado_en: new Date().toISOString(),
};

db.prepare('INSERT OR REPLACE INTO c_usuarios (id, data) VALUES (?, ?)').run(
  superadmin.id,
  JSON.stringify(superadmin)
);

console.log('[Seed] Superadministrador creado exitosamente.');
console.log(`- Correo: ${superadminEmail}`);
console.log(`- Debe cambiar contraseña en primer ingreso: Sí`);
console.log('[Seed] Todo listo para iniciar sesión en /login.');
