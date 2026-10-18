import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env.local', 'utf8');
const lines = env.split('\n');
const parsed = {};
for (const line of lines) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) parsed[m[1].trim()] = m[2].trim().replace(/^['"]|['"]$/g, '');
}

const sb = createClient(parsed.SUPABASE_URL, parsed.SUPABASE_SERVICE_ROLE_KEY);
const { data: users } = await sb.from('usuarios').select('*');
console.log('Usuarios:', users.map(u => ({ id: u.id, nombre: u.nombre, apodo: u.apodo, rol: u.rol })));
