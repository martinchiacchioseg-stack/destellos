const bcrypt = require('bcryptjs');
const sqlite = process.getBuiltinModule('node:sqlite');
const fs = require('fs');
const path = require('path');

async function resetear() {
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash('000000', salt);

  const db = new sqlite.DatabaseSync('data/destellos.db');
  db.exec('PRAGMA busy_timeout = 15000;');

  const superadmin = {
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
    creado_en: new Date().toISOString()
  };

  db.exec('BEGIN IMMEDIATE;');
  try {
    // 1. Limpiar todas las colecciones dependientes
    const tablasALimpiar = [
      'c_grupos',
      'c_destellos',
      'c_evaluaciones',
      'c_puntos',
      'c_adivinanzas',
      'c_votosCruzados',
      'c_fotosPasado',
      'c_fotosPasadoAdivinanzas',
      'c_ruletaRondas',
      'c_ruletaPreguntas',
      'c_prodeFechas',
      'c_prodePartidos',
      'c_prodePronosticos',
      'c_reglas',
      'c_triviaPreguntas',
      'c_triviaIntentos'
    ];

    for (const t of tablasALimpiar) {
      db.exec(`DELETE FROM ${t};`);
    }

    // 2. Limpiar usuarios y dejar únicamente a Martín
    db.exec('DELETE FROM c_usuarios;');
    db.prepare('INSERT INTO c_usuarios (id, data) VALUES (?, ?)').run(
      superadmin.id,
      JSON.stringify(superadmin)
    );

    // Incrementar version
    db.exec("UPDATE meta SET value = value + 1 WHERE key='version';");
    db.exec('COMMIT;');
    console.log('Reset exitoso en SQLite.');
  } catch (err) {
    db.exec('ROLLBACK;');
    console.error('Error al resetear:', err);
    process.exit(1);
  }

  // Eliminar JSON viejo si existe
  const jsonPath = path.join(process.cwd(), 'data', 'destellos_store.json');
  if (fs.existsSync(jsonPath)) {
    fs.unlinkSync(jsonPath);
    console.log('destellos_store.json eliminado.');
  }
  const legacyBackup = path.join(process.cwd(), 'data', 'destellos_store.legacy-backup.json');
  if (fs.existsSync(legacyBackup)) {
    fs.unlinkSync(legacyBackup);
  }

  // Verificación
  const uRow = db.prepare('SELECT data FROM c_usuarios').all();
  console.log('Usuarios restantes en base:', uRow.map(r => JSON.parse(r.data)));
  const gRow = db.prepare('SELECT count(*) as c FROM c_grupos').get();
  console.log('Grupos restantes en base:', gRow.c);
}

resetear().catch(console.error);
