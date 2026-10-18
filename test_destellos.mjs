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
const { data: pz } = await sb.from('pizarra').select('*');
console.log('Pizarra:', pz);
const { data: st } = await sb.from('sorteos_arlequin').select('*');
console.log('Sorteos:', st);
