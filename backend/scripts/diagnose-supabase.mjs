import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const maskEmail = (email) => email?.replace(/(^.).*(@.*$)/, '$1***$2');
const authResult = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
const profileResult = await supabase.from('profiles').select('id,email,full_name,active,is_org_admin,created_at');
const projectResult = await supabase.from('projects').select('id', { count: 'exact', head: true });

const authUsers = authResult.data?.users ?? [];
const profiles = profileResult.data ?? [];
const profileIds = new Set(profiles.map((profile) => profile.id));
const authIds = new Set(authUsers.map((user) => user.id));

console.log(JSON.stringify({
  auth_error: authResult.error?.message ?? null,
  profiles_error: profileResult.error?.message ?? null,
  projects_error: projectResult.error?.message ?? null,
  auth_user_count: authUsers.length,
  profile_count: profiles.length,
  auth_users_without_profiles: authUsers.filter((user) => !profileIds.has(user.id)).map((user) => ({
    id: user.id,
    email: maskEmail(user.email),
    created_at: user.created_at,
    confirmed: Boolean(user.email_confirmed_at),
  })),
  profiles_without_auth_users: profiles.filter((profile) => !authIds.has(profile.id)).map((profile) => ({
    id: profile.id,
    email: maskEmail(profile.email),
  })),
  profiles: profiles.map((profile) => ({ ...profile, email: maskEmail(profile.email) })),
}, null, 2));
