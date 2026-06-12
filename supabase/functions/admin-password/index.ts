import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

function buildCorsHeaders(req: Request) {
  const configuredOrigins = (Deno.env.get('ALLOWED_ORIGINS') || '*')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const requestOrigin = req.headers.get('Origin') || '';
  const allowOrigin = configuredOrigins.includes('*')
    ? '*'
    : (configuredOrigins.includes(requestOrigin) ? requestOrigin : configuredOrigins[0] || requestOrigin);

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

function resolvePasswordTarget(targetKey: string) {
  if (targetKey === 'admin') return { email: 'admin@professional-demo.local', label: 'Admin' };
  if (targetKey === 'pm') return { email: 'pm@professional-demo.local', label: 'Project Manager' };
  const guestMatch = targetKey.match(/^client-project-(\d{1,3})$/);
  if (guestMatch) {
    const n = Number(guestMatch[1]);
    if (Number.isInteger(n) && n >= 1 && n <= 50) {
      return { email: `client-project-${n}@professional-demo.local`, label: `Client Project ${n}` };
    }
  }
  return null;
}

function jsonResponse(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...buildCorsHeaders(req), 'Content-Type': 'application/json' },
  });
}

function isStrongPassword(password: string) {
  return password.length >= 10 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password);
}

async function findUserByEmail(adminClient: ReturnType<typeof createClient>, email: string) {
  let page = 1;
  const perPage = 100;

  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const found = data.users.find((user) => user.email === email);
    if (found) return found;
    if (!data.users.length || data.users.length < perPage) return null;
    page += 1;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: buildCorsHeaders(req) });
  if (req.method !== 'POST') return jsonResponse(req, { error: 'Method not allowed' }, 405);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return jsonResponse(req, { error: 'Konfigurasi backend belum lengkap.' }, 500);
    }

    const authorization = req.headers.get('Authorization') || '';
    if (!authorization.startsWith('Bearer ')) {
      return jsonResponse(req, { error: 'Unauthorized' }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser();
    const caller = userData?.user;
    if (userError || !caller) return jsonResponse(req, { error: 'Unauthorized' }, 401);

    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('id,email,full_name,role')
      .eq('id', caller.id)
      .single();

    if (profileError || !profile) return jsonResponse(req, { error: 'Profile tidak ditemukan.' }, 403);
    if (!['project_manager', 'admin'].includes(profile.role)) {
      return jsonResponse(req, { error: 'Forbidden: hanya PM/Admin yang boleh mengelola password.' }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || '').trim();

    if (action === 'list_logs') {
      const limit = Math.min(Math.max(Number(body.limit || 50), 1), 100);
      const { data: logs, error: logError } = await adminClient
        .from('auth_password_admin_log')
        .select('id,target_key,target_email,target_label,changed_by,changed_by_email,changed_at,status,note')
        .order('changed_at', { ascending: false })
        .limit(limit);

      if (logError) throw logError;
      return jsonResponse(req, { ok: true, logs: logs || [] });
    }

    if (action === 'set_password') {
      const targetKey = String(body.targetKey || '').trim();
      const newPassword = String(body.newPassword || '').trim();
      const target = resolvePasswordTarget(targetKey);

      if (!target) return jsonResponse(req, { error: 'Target akun tidak valid.' }, 400);
      if (!isStrongPassword(newPassword)) {
        return jsonResponse(req, { error: 'Password minimal 10 karakter dan wajib berisi huruf besar, huruf kecil, angka, dan simbol.' }, 400);
      }

      const targetUser = await findUserByEmail(adminClient, target.email);
      if (!targetUser) return jsonResponse(req, { error: `User ${target.label} tidak ditemukan di sistem akses.` }, 404);

      const { error: updateError } = await adminClient.auth.admin.updateUserById(targetUser.id, {
        password: newPassword,
      });

      if (updateError) throw updateError;

      // Deliberately log metadata only. Never log plaintext passwords.
      const { error: insertLogError } = await adminClient
        .from('auth_password_admin_log')
        .insert({
          target_key: targetKey,
          target_email: target.email,
          target_label: target.label,
          changed_by: caller.id,
          changed_by_email: profile.email || caller.email,
          status: 'success',
          note: 'Password reset via Professional Project Dashboard dashboard backend function',
        });

      if (insertLogError) throw insertLogError;

      return jsonResponse(req, { ok: true, targetKey, targetEmail: target.email, targetLabel: target.label });
    }

    return jsonResponse(req, { error: 'Action tidak valid.' }, 400);
  } catch (error) {
    console.error('admin-password function error:', error?.message || error);
    return jsonResponse(req, { error: error?.message || 'Internal server error' }, 500);
  }
});
