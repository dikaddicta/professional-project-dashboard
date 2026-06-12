import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type SupabaseClient = ReturnType<typeof createClient>;

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

function jsonResponse(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...buildCorsHeaders(req), 'Content-Type': 'application/json' },
  });
}

function cleanText(value: unknown, fallback = '') {
  return String(value ?? fallback).trim();
}

function cleanSlugPart(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48);
}

function isIsoDate(value: string) {
  return !value || /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function addDays(dateText: string, days: number) {
  const base = dateText ? new Date(`${dateText}T00:00:00Z`) : new Date();
  if (Number.isNaN(base.getTime())) return null;
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

function isStrongPassword(password: string) {
  return password.length >= 10 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password);
}

async function findUserByEmail(adminClient: SupabaseClient, email: string) {
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

async function getCallerProfile(req: Request, supabaseUrl: string, anonKey: string, serviceRoleKey: string) {
  const authorization = req.headers.get('Authorization') || '';
  if (!authorization.startsWith('Bearer ')) throw new Error('Unauthorized');

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await userClient.auth.getUser();
  const caller = userData?.user;
  if (userError || !caller) throw new Error('Unauthorized');

  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('id,email,full_name,role')
    .eq('id', caller.id)
    .single();

  if (profileError || !profile) throw new Error('Profile tidak ditemukan.');
  if (profile.role !== 'project_manager') {
    throw new Error('Forbidden: hanya Project Manager yang boleh mengelola project.');
  }

  return { adminClient, caller, profile };
}

function normalizeProjectStatus(value: unknown) {
  const status = String(value || '').trim().toLowerCase().replace(/\s+/g, '-');
  if (['active', 'running', 'berjalan', 'in-progress'].includes(status)) return 'active';
  if (['completed', 'complete', 'closed', 'done', 'selesai'].includes(status)) return 'completed';
  if (['archived', 'archive', 'arsip', 'inactive'].includes(status)) return 'archived';
  return 'active';
}

function projectNumberFromLegacyId(legacyId: unknown) {
  const match = String(legacyId || '').match(/^project-(\d+)$/);
  return Number(match?.[1] || 0);
}

function isTemplatePlaceholderProject(row: Record<string, unknown>) {
  const number = projectNumberFromLegacyId(row.legacy_id);
  if (!number) return false;
  const label = `Project ${number}`;
  return row.is_active === false && row.code === label && row.name === label;
}

async function getNextProjectSlot(adminClient: SupabaseClient) {
  const { data, error } = await adminClient
    .from('projects')
    .select('id,legacy_id,code,name,is_active,project_status')
    .like('legacy_id', 'project-%');
  if (error) throw error;

  const used = new Set<number>();
  const placeholders = new Map<number, string>();
  for (const row of data || []) {
    const number = projectNumberFromLegacyId(row.legacy_id);
    if (!number) continue;
    if (isTemplatePlaceholderProject(row)) {
      placeholders.set(number, row.id);
    } else {
      used.add(number);
    }
  }

  for (let number = 1; number <= 500; number += 1) {
    if (!used.has(number)) {
      return { projectNumber: number, placeholderProjectId: placeholders.get(number) || null };
    }
  }

  throw new Error('Nomor project otomatis tidak tersedia. Hubungi administrator.');
}

async function clearPlaceholderProjectContent(adminClient: SupabaseClient, projectId: string) {
  const { data: timelineRows } = await adminClient
    .from('timeline_items')
    .select('id')
    .eq('project_id', projectId);

  const timelineIds = (timelineRows || []).map((row) => row.id).filter(Boolean);
  if (timelineIds.length) {
    const { error: phaseError } = await adminClient
      .from('timeline_phases')
      .delete()
      .in('timeline_item_id', timelineIds);
    if (phaseError && !String(phaseError.message || '').includes('relation')) throw phaseError;
  }

  for (const tableName of ['project_members', 'tasks', 'documents', 'document_outputs', 'meeting_logs', 'project_access', 'timeline_items']) {
    const { error } = await adminClient.from(tableName).delete().eq('project_id', projectId);
    if (error) throw error;
  }
}

function buildTimelineTemplate(template: string, startDate: string, endDate: string) {
  const start = startDate || new Date().toISOString().slice(0, 10);
  const due = endDate || addDays(start, 45) || start;
  const d = (offset: number) => addDays(start, offset) || start;

  if (template === 'pentest') {
    return [
      { name: 'Kick-off Meeting', type: 'assessment', startDate: start, endDate: start },
      { name: 'Scope Confirmation', type: 'assessment', startDate: d(1), endDate: d(3) },
      { name: 'Security Testing', type: 'assessment', startDate: d(4), endDate: d(18) },
      { name: 'Initial Report', type: 'reporting', startDate: d(19), endDate: d(25) },
      { name: 'Remediation Support', type: 'assessment', startDate: d(26), endDate: d(38) },
      { name: 'Final Report', type: 'reporting', startDate: d(39), endDate: due },
    ];
  }

  if (template === 'audit') {
    return [
      { name: 'Kick-off Meeting', type: 'assessment', startDate: start, endDate: start },
      { name: 'Document Request', type: 'assessment', startDate: d(1), endDate: d(7) },
      { name: 'Document Review', type: 'assessment', startDate: d(8), endDate: d(21) },
      { name: 'Interview & Observation', type: 'assessment', startDate: d(22), endDate: d(32) },
      { name: 'Finding Validation', type: 'assessment', startDate: d(33), endDate: d(39) },
      { name: 'Final Report', type: 'reporting', startDate: d(40), endDate: due },
    ];
  }

  return [
    { name: 'Kick-off Meeting', type: 'assessment', startDate: start, endDate: start },
    { name: 'Project Setup', type: 'assessment', startDate: d(1), endDate: d(5) },
    { name: 'Assessment Preparation', type: 'assessment', startDate: d(6), endDate: d(12) },
    { name: 'Assessment Execution', type: 'assessment', startDate: d(13), endDate: d(30) },
    { name: 'Reporting', type: 'reporting', startDate: d(31), endDate: due },
  ];
}

async function insertStarterRows(adminClient: SupabaseClient, projectId: string, body: Record<string, unknown>) {
  const startDate = cleanText(body.startDate);
  const endDate = cleanText(body.endDate);
  const template = cleanText(body.timelineTemplate, 'standard');
  const picCywa = cleanText(body.picCywa, 'Professional Project Team') || 'Professional Project Team';
  const picClient = cleanText(body.picClient, 'Client Team') || 'Client Team';
  const timeline = buildTimelineTemplate(template, startDate, endDate);

  const { error: membersError } = await adminClient.from('project_members').insert([
    { project_id: projectId, name: picCywa, role: 'Project Team', sort_order: 1 },
    { project_id: projectId, name: picClient, role: 'Client Representative', sort_order: 2 },
  ]);
  if (membersError) throw membersError;

  const { data: insertedTimeline, error: timelineError } = await adminClient
    .from('timeline_items')
    .insert(timeline.map((item, index) => ({
      project_id: projectId,
      name: item.name,
      type: item.type,
      start_date: item.startDate,
      end_date: item.endDate,
      sort_order: index + 1,
    })))
    .select('id,name,type,start_date,end_date,sort_order');
  if (timelineError) throw timelineError;

  if ((insertedTimeline || []).length) {
    const { error: phasesError } = await adminClient
      .from('timeline_phases')
      .insert((insertedTimeline || []).map((item) => ({
        timeline_item_id: item.id,
        label: item.type === 'reporting' ? 'Reporting' : 'Assessment',
        type: item.type || 'assessment',
        start_date: item.start_date,
        end_date: item.end_date,
        sort_order: 1,
      })));
    if (phasesError && !String(phasesError.message || '').includes('relation')) throw phasesError;
  }

  const taskRows = timeline.slice(0, Math.min(timeline.length, 5)).map((item, index) => ({
    project_id: projectId,
    task: item.name,
    status: index === 0 ? 'In progress' : 'Not started',
    start_date_actual: index === 0 ? item.startDate : null,
    end_date_actual: null,
    assigned_to: picCywa,
    progress: index === 0 ? 20 : 0,
    notes: index === 0 ? 'Initial project preparation is in progress.' : null,
    sort_order: index + 1,
  }));
  const { error: tasksError } = await adminClient.from('tasks').insert(taskRows);
  if (tasksError) throw tasksError;

  const { error: meetingError } = await adminClient.from('meeting_logs').insert({
    project_id: projectId,
    date: new Date().toISOString().slice(0, 10),
    type: 'Update',
    note: 'Internal project setup has been initiated.',
    action: 'Prepare kick-off and initial project materials.',
    client_note: 'Project setup has been initiated and initial preparation is in progress.',
    client_action: 'Coordinate the kick-off schedule and prepare the initial project materials.',
    is_client_visible: true,
    sort_order: 1,
  });
  if (meetingError) throw meetingError;
}

async function createProject(req: Request, adminClient: SupabaseClient, callerId: string, callerEmail: string, body: Record<string, unknown>) {
  const clientName = cleanText(body.clientName);
  const code = cleanText(body.projectCode, clientName);
  const name = cleanText(body.projectName);
  const startDate = cleanText(body.startDate);
  const endDate = cleanText(body.endDate);
  const picCywa = cleanText(body.picCywa, 'Professional Project Team') || 'Professional Project Team';
  const picClient = cleanText(body.picClient, 'Client Team') || 'Client Team';
  const guestDisplayName = cleanText(body.guestDisplayName, `Guest ${clientName || code}`);
  const guestPassword = cleanText(body.guestPassword);

  if (!clientName || !code || !name) return jsonResponse(req, { error: 'Client Name, Project Code, dan Project Name wajib diisi.' }, 400);
  if (!isIsoDate(startDate) || !isIsoDate(endDate)) return jsonResponse(req, { error: 'Format tanggal tidak valid.' }, 400);
  if (startDate && endDate && startDate > endDate) return jsonResponse(req, { error: 'End Date tidak boleh lebih awal dari Start Date.' }, 400);
  if (!isStrongPassword(guestPassword)) return jsonResponse(req, { error: 'Password guest minimal 10 karakter dan wajib berisi huruf besar, huruf kecil, angka, dan simbol.' }, 400);

  const { projectNumber, placeholderProjectId } = await getNextProjectSlot(adminClient);
  const legacyId = `project-${projectNumber}`;
  const guestEmail = `client-project-${projectNumber}@professional-demo.local`;

  const existingGuest = await findUserByEmail(adminClient, guestEmail);
  if (existingGuest) return jsonResponse(req, { error: `User internal ${guestEmail} sudah ada. Cek project numbering sebelum membuat project baru.` }, 409);

  const projectPayload = {
    legacy_id: legacyId,
    code,
    name,
    client_name: clientName,
    start_date: startDate || null,
    end_date: endDate || null,
    is_active: true,
    project_status: 'active',
    health_override: 'Setup Needed',
    health_reason: 'Project baru dibuat dan sedang dalam tahap setup awal.',
    current_phase_task: 'Project Setup',
    next_milestone_task: 'Kick-off Meeting',
    pic_cywa: picCywa,
    pic_client: picClient,
  };

  let project;
  if (placeholderProjectId) {
    await clearPlaceholderProjectContent(adminClient, placeholderProjectId);
    const { data, error } = await adminClient
      .from('projects')
      .update({ ...projectPayload, updated_at: new Date().toISOString() })
      .eq('id', placeholderProjectId)
      .select('id,legacy_id,code,name,client_name')
      .single();
    if (error) throw error;
    project = data;
  } else {
    const { data, error } = await adminClient
      .from('projects')
      .insert(projectPayload)
      .select('id,legacy_id,code,name,client_name')
      .single();
    if (error) throw error;
    project = data;
  }

  const { data: authUser, error: createUserError } = await adminClient.auth.admin.createUser({
    email: guestEmail,
    password: guestPassword,
    email_confirm: true,
    user_metadata: { label: guestDisplayName, project_legacy_id: legacyId },
  });
  if (createUserError || !authUser?.user) throw createUserError || new Error('User guest gagal dibuat.');

  const { error: profileError } = await adminClient.from('profiles').upsert({
    id: authUser.user.id,
    email: guestEmail,
    full_name: guestDisplayName,
    role: 'guest',
  }, { onConflict: 'id' });
  if (profileError) throw profileError;

  const accessRows = [{ user_id: authUser.user.id, project_id: project.id, access_role: 'guest', can_edit: false }];
  const { data: pmProfiles } = await adminClient.from('profiles').select('id,email,role').in('role', ['project_manager', 'admin']);
  for (const profile of pmProfiles || []) {
    accessRows.push({
      user_id: profile.id,
      project_id: project.id,
      access_role: profile.role === 'project_manager' ? 'project_manager' : 'admin',
      can_edit: profile.role === 'project_manager',
    });
  }
  const { error: accessError } = await adminClient.from('project_access').upsert(accessRows, { onConflict: 'user_id,project_id' });
  if (accessError) throw accessError;

  await insertStarterRows(adminClient, project.id, { ...body, startDate, endDate, picCywa, picClient });

  await adminClient.from('audit_logs').insert({
    user_id: callerId,
    project_id: project.id,
    action: 'create_project',
    table_name: 'projects',
    record_id: project.id,
    details: { legacy_id: legacyId, guest_email: guestEmail, client_name: clientName, changed_by_email: callerEmail, reused_placeholder: Boolean(placeholderProjectId) },
  });

  return jsonResponse(req, {
    ok: true,
    project: { id: project.id, legacyId, code, name, clientName, guestEmail, guestLabel: guestDisplayName },
  });
}

function targetKeyToGuestEmail(targetKey: string) {
  const match = cleanText(targetKey).match(/^client-project-(\d{1,3})$/);
  if (!match) return '';
  const n = Number(match[1]);
  if (!Number.isInteger(n) || n < 1 || n > 500) return '';
  return `client-project-${n}@professional-demo.local`;
}

function guestTargetKeyFromEmail(email: string) {
  const match = cleanText(email).match(/^(client-project-\d{1,3})@professional-demo\.local$/i);
  return match ? match[1].toLowerCase() : '';
}

async function listClientAccess(req: Request, adminClient: SupabaseClient) {
  const [{ data: projects, error: projectError }, { data: accessRows, error: accessError }, { data: profiles, error: profileError }] = await Promise.all([
    adminClient.from('projects').select('id,legacy_id,code,name,client_name,start_date,end_date,is_active,project_status,created_at').like('legacy_id', 'project-%'),
    adminClient.from('project_access').select('id,user_id,project_id,access_role,can_edit,is_enabled').eq('access_role', 'guest'),
    adminClient.from('profiles').select('id,email,full_name,role').eq('role', 'guest'),
  ]);

  if (projectError) throw projectError;
  if (accessError) throw accessError;
  if (profileError) throw profileError;

  const guestProfilesById = new Map((profiles || []).map((profile) => [profile.id, profile]));
  const guestProfilesByEmail = new Map((profiles || []).map((profile) => [String(profile.email || '').toLowerCase(), profile]));
  const accessByProject = new Map<string, Record<string, unknown>>();
  for (const access of accessRows || []) {
    if (!access.project_id || accessByProject.has(access.project_id)) continue;
    accessByProject.set(access.project_id, access);
  }

  const realProjects = (projects || [])
    .filter((project) => !isTemplatePlaceholderProject(project as Record<string, unknown>))
    .filter((project) => projectNumberFromLegacyId(project.legacy_id) > 0)
    .sort((a, b) => projectNumberFromLegacyId(a.legacy_id) - projectNumberFromLegacyId(b.legacy_id));

  const rows = realProjects.map((project) => {
    const number = projectNumberFromLegacyId(project.legacy_id);
    const expectedEmail = `client-project-${number}@professional-demo.local`;
    const access = accessByProject.get(project.id);
    const mappedProfile = access ? guestProfilesById.get(String(access.user_id)) : null;
    const expectedProfile = guestProfilesByEmail.get(expectedEmail);
    const profile = mappedProfile || expectedProfile || null;
    const guestEmail = String(profile?.email || expectedEmail).toLowerCase();
    const targetKey = guestTargetKeyFromEmail(guestEmail) || `client-project-${number}`;

    return {
      legacyId: project.legacy_id,
      projectId: project.id,
      projectCode: project.code,
      projectName: project.name,
      clientName: project.client_name || project.code,
      projectActive: project.is_active !== false && normalizeProjectStatus(project.project_status) !== 'archived',
      startDate: project.start_date,
      endDate: project.end_date,
      guestEmail,
      targetKey,
      guestLabel: profile?.full_name || `Client Project ${number}`,
      guestUserExists: Boolean(profile),
      accessEnabled: Boolean(access) && access.is_enabled !== false,
      canEdit: false,
    };
  });

  return jsonResponse(req, { ok: true, rows });
}

async function setClientAccess(req: Request, adminClient: SupabaseClient, callerId: string, callerEmail: string, body: Record<string, unknown>) {
  const legacyId = cleanText(body.legacyId);
  const targetKey = cleanText(body.targetKey);
  const enabled = body.enabled === true || body.enabled === 'true';
  const guestEmail = targetKeyToGuestEmail(targetKey);

  if (!/^project-\d+$/.test(legacyId)) return jsonResponse(req, { error: 'Project tidak valid.' }, 400);
  if (!guestEmail) return jsonResponse(req, { error: 'Target client tidak valid.' }, 400);

  const { data: project, error: projectError } = await adminClient
    .from('projects')
    .select('id,legacy_id,code,name')
    .eq('legacy_id', legacyId)
    .single();
  if (projectError || !project) return jsonResponse(req, { error: 'Project tidak ditemukan.' }, 404);

  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('id,email,full_name,role')
    .eq('email', guestEmail)
    .eq('role', 'guest')
    .single();
  if (profileError || !profile) return jsonResponse(req, { error: `Akun guest ${guestEmail} tidak ditemukan.` }, 404);

  if (enabled) {
    const { error } = await adminClient.from('project_access').upsert({
      user_id: profile.id,
      project_id: project.id,
      access_role: 'guest',
      can_edit: false,
      is_enabled: true,
    }, { onConflict: 'user_id,project_id' });
    if (error) throw error;
  } else {
    const { error } = await adminClient
      .from('project_access')
      .update({ is_enabled: false })
      .eq('user_id', profile.id)
      .eq('project_id', project.id)
      .eq('access_role', 'guest');
    if (error) throw error;
  }

  await adminClient.from('audit_logs').insert({
    user_id: callerId,
    project_id: project.id,
    action: enabled ? 'enable_client_access' : 'disable_client_access',
    table_name: 'project_access',
    record_id: project.id,
    details: { legacy_id: legacyId, guest_email: guestEmail, changed_by_email: callerEmail },
  });

  return jsonResponse(req, { ok: true, legacyId, targetKey, enabled });
}

async function setProjectStatus(req: Request, adminClient: SupabaseClient, callerId: string, callerEmail: string, legacyId: string, projectStatus: string) {
  const normalizedStatus = normalizeProjectStatus(projectStatus);
  if (!/^project-\d+$/.test(legacyId)) return jsonResponse(req, { error: 'Project tidak valid.' }, 400);
  const { data: project, error: findError } = await adminClient
    .from('projects')
    .select('id,legacy_id,code,name,is_active,project_status')
    .eq('legacy_id', legacyId)
    .single();
  if (findError || !project) return jsonResponse(req, { error: 'Project tidak ditemukan.' }, 404);

  const isActive = normalizedStatus !== 'archived';
  const healthPatch = normalizedStatus === 'completed'
    ? { health_override: 'Healthy', health_reason: 'Project ditandai selesai oleh Project Manager.' }
    : normalizedStatus === 'active'
      ? { health_override: null, health_reason: null }
      : {};

  const { error: updateError } = await adminClient
    .from('projects')
    .update({
      is_active: isActive,
      project_status: normalizedStatus,
      updated_at: new Date().toISOString(),
      ...healthPatch,
    })
    .eq('id', project.id);
  if (updateError) throw updateError;

  const action = normalizedStatus === 'archived'
    ? 'archive_project'
    : normalizedStatus === 'completed'
      ? 'complete_project'
      : 'activate_project';

  await adminClient.from('audit_logs').insert({
    user_id: callerId,
    project_id: project.id,
    action,
    table_name: 'projects',
    record_id: project.id,
    details: { legacy_id: legacyId, project_status: normalizedStatus, is_active: isActive, changed_by_email: callerEmail },
  });

  return jsonResponse(req, { ok: true, project: { legacyId, isActive, projectStatus: normalizedStatus } });
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

    const { adminClient, caller, profile } = await getCallerProfile(req, supabaseUrl, anonKey, serviceRoleKey);
    const body = await req.json().catch(() => ({}));
    const action = cleanText(body.action);

    if (action === 'create_project') {
      return await createProject(req, adminClient, caller.id, profile.email || caller.email || '', body);
    }
    if (action === 'list_client_access') {
      return await listClientAccess(req, adminClient);
    }
    if (action === 'set_client_access') {
      return await setClientAccess(req, adminClient, caller.id, profile.email || caller.email || '', body);
    }
    if (action === 'set_project_status') {
      return await setProjectStatus(req, adminClient, caller.id, profile.email || caller.email || '', cleanText(body.legacyId), cleanText(body.projectStatus, 'active'));
    }
    if (action === 'archive_project') {
      return await setProjectStatus(req, adminClient, caller.id, profile.email || caller.email || '', cleanText(body.legacyId), 'archived');
    }
    if (action === 'restore_project') {
      return await setProjectStatus(req, adminClient, caller.id, profile.email || caller.email || '', cleanText(body.legacyId), 'active');
    }

    return jsonResponse(req, { error: 'Action tidak valid.' }, 400);
  } catch (error) {
    const message = error?.message || 'Internal server error';
    const status = message === 'Unauthorized' ? 401 : message.startsWith('Forbidden') ? 403 : 500;
    console.error('project-admin function error:', message);
    return jsonResponse(req, { error: message }, status);
  }
});
