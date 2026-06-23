import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env' });
const apply = process.argv.includes('--apply');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const maskEmail = (email) => email?.replace(/(^.).*(@.*$)/, '$1***$2');
const authResult = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (authResult.error) throw authResult.error;
const profileResult = await supabase.from('profiles').select('id');
if (profileResult.error) throw profileResult.error;

const profileIds = new Set((profileResult.data ?? []).map((profile) => profile.id));
const missing = (authResult.data.users ?? []).filter((user) => !profileIds.has(user.id));
const rows = missing.map((user) => ({
  id: user.id,
  email: user.email?.toLowerCase() ?? `${user.id}@invalid.local`,
  full_name: user.user_metadata?.full_name?.trim() || user.user_metadata?.name?.trim() || user.email?.split('@')[0] || 'Employee',
  phone: user.user_metadata?.phone?.trim() || null,
  is_org_admin: false,
  active: true,
}));

if (apply && rows.length) {
  const insertResult = await supabase.from('profiles').insert(rows);
  if (insertResult.error) throw insertResult.error;
}

console.log(JSON.stringify({
  mode: apply ? 'apply' : 'dry-run',
  missing_count: rows.length,
  accounts: rows.map((row) => ({ id: row.id, email: maskEmail(row.email), full_name: row.full_name })),
}, null, 2));
