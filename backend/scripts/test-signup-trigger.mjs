import crypto from 'node:crypto';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env' });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const email = `trigger-check-${Date.now()}@example.invalid`;
const password = crypto.randomBytes(24).toString('base64url');
const { data: created, error: createError } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: 'Trigger Check', phone: null },
});

if (createError || !created.user) {
  console.error(JSON.stringify({ trigger_test: 'create_failed', error: createError?.message ?? 'No user returned' }));
  process.exit(1);
}

const { data: profile, error: profileError } = await supabase
  .from('profiles')
  .select('id,email,full_name,is_org_admin,active')
  .eq('id', created.user.id)
  .maybeSingle();

const { error: cleanupError } = await supabase.auth.admin.deleteUser(created.user.id);

console.log(JSON.stringify({
  trigger_test: profile ? 'passed' : 'failed',
  profile_error: profileError?.message ?? null,
  profile_created: Boolean(profile),
  safe_defaults: profile ? profile.is_org_admin === false && profile.active === true : false,
  cleanup_error: cleanupError?.message ?? null,
}, null, 2));

if (!profile || profileError || cleanupError) process.exit(1);
