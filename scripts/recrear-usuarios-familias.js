const { DatabaseSync } = require('node:sqlite');
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, '../data/destellos.db');
const db = new DatabaseSync(dbPath);

console.log('--- RECREANDO BASE DE USUARIOS Y FAMILIAS ---');

// 1. Limpiar completamente c_grupos y c_usuarios
db.exec('DELETE FROM c_grupos');
db.exec('DELETE FROM c_usuarios');

// 2. Crear al Superadministrador Martín Chiaccio
const superadminPass = '000000';
const superadminHash = bcrypt.hashSync(superadminPass, 10);

const superadmin = {
  id: 'usr-superadmin-001',
  email: 'martinchiacchio.seg@gmail.com',
  password_hash: superadminHash,
  nombre: 'Martín Chiaccio',
  apodo: 'Martín',
  telefono: '+54 9 2241 52-7357',
  avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  rol: 'superadmin',
  grupo_id: null,
  debe_cambiar_password: false,
  intentos_fallidos: 0,
  bloqueado_hasta: null,
  activo: true,
  creado_en: new Date().toISOString(),
};

db.prepare('INSERT INTO c_usuarios (id, data) VALUES (?, ?)').run(
  superadmin.id,
  JSON.stringify(superadmin)
);

// 3. Incrementar versión de la base
db.exec("UPDATE meta SET value = value + 1 WHERE key='version'");

console.log('✅ Base de datos limpiada con éxito:');
console.log('   - 0 Grupos (listo para crear desde el panel)');
console.log('   - 1 Superadmin: martinchiacchio.seg@gmail.com (clave: 000000)');
