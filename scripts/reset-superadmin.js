const { DatabaseSync } = require('node:sqlite');
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, '../data/destellos.db');
const db = new DatabaseSync(dbPath);
const hash = bcrypt.hashSync('000000', 10);

const row = db.prepare("SELECT data FROM c_usuarios WHERE id = 'usr-superadmin-001'").get();
if (row) {
  const u = JSON.parse(row.data);
  u.password_hash = hash;
  u.debe_cambiar_password = false;
  u.intentos_fallidos = 0;
  u.bloqueado_hasta = null;
  u.activo = true;
  db.prepare("UPDATE c_usuarios SET data = ? WHERE id = 'usr-superadmin-001'").run(JSON.stringify(u));
  db.exec("UPDATE meta SET value = value + 1 WHERE key = 'version'");
  console.log('EXITO: Superadmin actualizado en SQLite!');
  console.log('Email:', u.email);
  console.log('Hash configurado para 000000:', hash);
  console.log('debe_cambiar_password:', u.debe_cambiar_password);
} else {
  // Si no estuviera, crearlo
  const nuevo = {
    id: 'usr-superadmin-001',
    email: 'martinchiacchio.seg@gmail.com',
    password_hash: hash,
    nombre: 'Martín Chiaccio',
    apodo: 'Martín',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    rol: 'superadmin',
    grupo_id: null,
    debe_cambiar_password: false,
    intentos_fallidos: 0,
    bloqueado_hasta: null,
    activo: true,
    creado_en: new Date().toISOString(),
  };
  db.prepare("INSERT INTO c_usuarios (id, data) VALUES (?, ?)").run(nuevo.id, JSON.stringify(nuevo));
  console.log('EXITO: Superadmin creado en SQLite!');
}
