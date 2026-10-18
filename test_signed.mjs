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
const { data: buckets } = await sb.storage.listBuckets();
console.log('Buckets en Supabase:', buckets);

const { data: files } = await sb.storage.from('destellos').list('fotos');
console.log('Archivos en destellos/fotos:', files);

const { data: destellos } = await sb.from('destellos').select('*');
const paths = destellos.map(d => d.foto_path);
const { data: signed, error } = await sb.storage.from('destellos').createSignedUrls(paths, 3600);
console.log('Signed URLs error:', error);
console.log('Signed URLs data:', signed);
