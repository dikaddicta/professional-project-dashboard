const RAW_DATA = window.DASHBOARD_DATA || {
  generatedAt: new Date().toISOString(),
  sourceWorkbook: 'Fallback',
  passwords: {},
  projects: []
};
const app = document.getElementById('app');

const SUPABASE_CONFIG = window.PPD_SUPABASE_CONFIG || {};
const SUPABASE_PLACEHOLDER_VALUES = new Set(['', 'PASTE_SUPABASE_PROJECT_URL_HERE', 'PASTE_SUPABASE_ANON_OR_PUBLISHABLE_KEY_HERE']);
function buildInternalAuthEmails(){
  const configured = Array.isArray(SUPABASE_CONFIG.internalAuthEmails) ? SUPABASE_CONFIG.internalAuthEmails : [];
  const defaultGuestEmails = Array.from({length: 50}, (_, index) => `client-project-${index + 1}@professional-demo.local`);
  return [...new Set([...configured, 'pm@professional-demo.local', 'admin@professional-demo.local', ...defaultGuestEmails].filter(Boolean))];
}
const SUPABASE_INTERNAL_AUTH_EMAILS = buildInternalAuthEmails();
let supabaseClient = null;

const STORAGE_KEY = 'ppd-dashboard-data-v1';
const STATUS_OPTIONS = ['Not started', 'In progress', 'Completed', 'On hold', 'Blocked'];
const PROJECT_STATUS_OPTIONS = [
  { value: 'active', label: 'Berjalan', tone: 's-progress' },
  { value: 'completed', label: 'Selesai', tone: 's-completed' },
  { value: 'archived', label: 'Arsip', tone: 's-hold' }
];
const TIMELINE_TYPE_OPTIONS = [
  { value: 'assessment', label: 'Assessment / Timeline' },
  { value: 'reporting', label: 'Reporting' },
  { value: 'hold', label: 'Hold' },
  { value: 'hold-reporting', label: 'Reporting (Hold)' }
];
const LOGIN_ATTEMPT_KEY = 'ppd-login-attempts-v1';
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_LOCK_MS = 60 * 1000;
const REPORT_LANGUAGE_KEY = 'ppd-report-export-language-v1';
const REPORT_LANGUAGE_OPTIONS = [
  { value: 'id', label: 'Bahasa Indonesia', short: 'ID' },
  { value: 'en', label: 'English', short: 'EN' }
];
const BRANDING_ACCENT_PRESETS = ['#0f2747', '#1f5f9f', '#2563eb', '#0f766e', '#7c3aed', '#334155'];
const BRANDING_LOGO_BUCKET = 'project-brand-assets';
const BRANDING_LOGO_MAX_BYTES = 2 * 1024 * 1024;
const BRANDING_LOGO_ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml']);
const PROJECT_CODE_LABELS = {
  1: 'Project 1 - BPR Sentosa',
  2: 'Project 2 - Shinhan',
  3: 'Project 3 - Shinhan',
  4: 'Project 4 - Shinhan'
};
function loadReportExportLanguage(){
  try{
    const saved = sessionStorage.getItem(REPORT_LANGUAGE_KEY) || localStorage.getItem(REPORT_LANGUAGE_KEY);
    return ['id','en'].includes(String(saved || '').toLowerCase()) ? String(saved).toLowerCase() : 'id';
  }catch(_err){
    return 'id';
  }
}

const state = {
  session: null,
  selectedProjectId: null,
  activeTab: 'summary',
  sidebarSearch: '',
  tableSearch: '',
  page: 'dashboard',
  data: loadData(),
  newProjectDraft: null,
  projectAdminDraft: null,
  projectAdminTouched: {},
  projectAdminBusy: false,
  projectAdminMessage: null,
  clientAccessRows: null,
  clientAccessBusy: false,
  clientAccessMessage: null,
  scheduleBusy: false,
  scheduleMessage: null,
  scheduleDraft: null,
  homePanel: null,
  homeAgendaOpenProjectId: null,
  notificationFilter: 'all',
  activityLogs: null,
  activityLogBusy: false,
  activityLogMessage: null,
  activityLogProjectFilter: 'all',
  activityLogActionFilter: 'all',
  activityLogSearch: '',
  backupExportProjectId: '',
  clientProjectFilter: 'all',
  backupExportBusy: false,
  backupExportMessage: null,
  reportExportLanguage: loadReportExportLanguage(),
  brandingDraft: null,
  brandingBusy: false,
  brandingUploadBusy: false,
  brandingMessage: null,
  projectSaveBusy: false,
  projectSaveMessage: null,
  passwordAuditLogs: null
};

function deepClone(v){ return JSON.parse(JSON.stringify(v)); }
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
function normalize(s){ return String(s ?? '').trim().toLowerCase(); }
function normalizeProjectStatus(status, isActive = true){
  const value = normalize(status).replace(/\s+/g, '-');
  if(['active', 'running', 'berjalan', 'in-progress'].includes(value)) return 'active';
  if(['completed', 'complete', 'closed', 'done', 'selesai'].includes(value)) return 'completed';
  if(['archived', 'archive', 'arsip', 'inactive'].includes(value)) return 'archived';
  return isActive === false ? 'archived' : 'active';
}
function projectStatusMeta(project){
  const status = normalizeProjectStatus(project?.projectStatus, project?.isActive !== false);
  return PROJECT_STATUS_OPTIONS.find(option => option.value === status) || PROJECT_STATUS_OPTIONS[0];
}
function projectStatusLabel(project){ return projectStatusMeta(project).label; }
function projectStatusClass(project){ return projectStatusMeta(project).tone; }
function projectIsArchived(project){ return normalizeProjectStatus(project?.projectStatus, project?.isActive !== false) === 'archived' || project?.isActive === false; }
function projectIsExplicitlyCompleted(project){ return normalizeProjectStatus(project?.projectStatus, project?.isActive !== false) === 'completed'; }

function isHexColor(value){ return /^#[0-9a-f]{6}$/i.test(String(value || '').trim()); }
function getDemoClientLogoUrl(value){
  const logoMap = {
    'asteria bank': 'asteria-bank.svg',
    'merapi retail group': 'merapi-retail-group.svg',
    'sagara logistics': 'sagara-logistics.svg',
    'vantara insurance': 'vantara-insurance.svg',
    'arunika healthcare': 'arunika-healthcare.svg',
    'zenith finance': 'zenith-finance.svg',
    'borealis energy': 'borealis-energy.svg',
    'lumina telco': 'lumina-telco.svg',
    'kaldera manufacturing': 'kaldera-manufacturing.svg',
    'nova public services': 'nova-public-services.svg'
  };
  const key = normalize(value).replace(/\s+/g, ' ');
  const file = logoMap[key];
  return file ? `assets/client-logos/${file}` : '';
}
function defaultProjectBranding(project = {}){
  const client = project.clientName || project.code || 'Client';
  const demoLogoUrl = getDemoClientLogoUrl(client);
  return {
    clientLogoUrl: demoLogoUrl,
    brandAccentColor: '#6f8b78',
    preparedFor: client,
    preparedBy: 'Professional Project Team',
    confidentialityLabel: 'Confidential — Demo Data',
    reportFooterText: 'This report is prepared for portfolio demonstration purposes.',
    reportLanguage: 'id',
    showClientLogo: true,
    showCywaLogo: true
  };
}
function normalizeProjectBranding(raw = {}, project = {}){
  const base = defaultProjectBranding(project);
  const accent = raw.brand_accent_color || raw.brandAccentColor || base.brandAccentColor;
  return {
    clientLogoUrl: raw.client_logo_url || raw.clientLogoUrl || base.clientLogoUrl,
    brandAccentColor: isHexColor(accent) ? accent : base.brandAccentColor,
    preparedFor: raw.prepared_for || raw.preparedFor || base.preparedFor,
    preparedBy: raw.prepared_by || raw.preparedBy || base.preparedBy,
    confidentialityLabel: raw.confidentiality_label || raw.confidentialityLabel || base.confidentialityLabel,
    reportFooterText: raw.report_footer_text || raw.reportFooterText || base.reportFooterText,
    reportLanguage: ['id','en'].includes(String(raw.report_language || raw.reportLanguage || '').toLowerCase()) ? String(raw.report_language || raw.reportLanguage).toLowerCase() : base.reportLanguage,
    showClientLogo: raw.show_client_logo !== false && raw.showClientLogo !== false,
    showCywaLogo: raw.show_cywa_logo !== false && raw.showCywaLogo !== false
  };
}
function brandingForProject(project){
  return normalizeProjectBranding(project?.branding || {}, project || {});
}
function renderAccentOptions(selected){
  const current = isHexColor(selected) ? selected : BRANDING_ACCENT_PRESETS[0];
  return BRANDING_ACCENT_PRESETS.map(color => `<option value="${esc(color)}" ${color.toLowerCase() === current.toLowerCase() ? 'selected' : ''}>${esc(color)}</option>`).join('');
}


function normalizeTimelineType(value){
  const raw = normalize(value).replace(/\s+/g, '-');
  if(['assessment', 'timeline', 'assessment-timeline'].includes(raw)) return 'assessment';
  if(['reporting', 'report'].includes(raw)) return 'reporting';
  if(['hold', 'on-hold', 'blocked'].includes(raw)) return 'hold';
  if(['hold-reporting', 'reporting-hold', 'reporting-(hold)', 'reporting-hold'].includes(raw)) return 'hold-reporting';
  return 'assessment';
}
function timelineTypeLabel(value){
  const type = normalizeTimelineType(value);
  return TIMELINE_TYPE_OPTIONS.find(option => option.value === type)?.label || 'Assessment / Timeline';
}
function renderTimelineTypeOptions(selected){
  const current = normalizeTimelineType(selected);
  return TIMELINE_TYPE_OPTIONS.map(option => `<option value="${esc(option.value)}" ${option.value === current ? 'selected' : ''}>${esc(option.label)}</option>`).join('');
}

function hasSupabaseRuntimeConfig(){
  return !!(SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey && !SUPABASE_PLACEHOLDER_VALUES.has(SUPABASE_CONFIG.url) && !SUPABASE_PLACEHOLDER_VALUES.has(SUPABASE_CONFIG.anonKey));
}

function isSupabaseConfigured(){
  return !!(hasSupabaseRuntimeConfig() && window.supabase);
}

function getSupabaseClient(){
  if(!hasSupabaseRuntimeConfig()) return null;
  if(!window.supabase){
    throw new Error('Layanan akses belum siap. Periksa koneksi internet lalu muat ulang halaman.');
  }
  if(!supabaseClient){
    supabaseClient = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
      auth: {
        storage: window.sessionStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false
      }
    });
  }
  return supabaseClient;
}

function isSupabaseSession(){
  return state.session?.dataSource === 'supabase';
}

function isGuestSession(){
  return state.session?.role === 'guest';
}

function meetingVisibleToCurrentUser(row){
  if(!isGuestSession()) return true;
  return row?.isClientVisible !== false;
}

function meetingDisplayNote(row){
  if(!row) return '';
  if(isGuestSession() && row.clientNote) return row.clientNote;
  return row.clientNote || row.note || '';
}

function meetingDisplayAction(row){
  if(!row) return '';
  if(isGuestSession() && row.clientAction) return row.clientAction;
  return row.clientAction || row.action || '';
}

function shouldShowLocalDevTools(){
  return !!(window.PPD_ENABLE_DEV_TOOLS && state.session?.dataSource === 'local');
}

function renderBootLoading(message = 'Menyiapkan dashboard...'){
  app.innerHTML = `<main class="login-shell"><section class="login-card"><img class="login-logo" src="assets/professional-dashboard-logo.png" alt="Professional Project Dashboard Logo"><div class="eyebrow">Project Dashboard</div><h1>Loading</h1><p>${esc(message)}</p></section></main>`;
}

function groupBy(items, key){
  return (items || []).reduce((acc, item) => {
    const value = item?.[key];
    if(!value) return acc;
    (acc[value] ||= []).push(item);
    return acc;
  }, {});
}

function localDateISO(date){
  const d = date instanceof Date ? date : new Date(date);
  if(Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function excelSerialToISO(serial){
  const n = Number(serial);
  if(!Number.isFinite(n)) return '';
  const utcDays = Math.floor(n - 25569);
  const utcValue = utcDays * 86400;
  const dateInfo = new Date(utcValue * 1000);
  if(Number.isNaN(dateInfo.getTime())) return '';
  return new Date(Date.UTC(dateInfo.getUTCFullYear(), dateInfo.getUTCMonth(), dateInfo.getUTCDate())).toISOString().slice(0,10);
}

function toISODate(v){
  if(v === null || v === undefined || v === '') return '';
  if(typeof v === 'number') return excelSerialToISO(v);
  if(v instanceof Date) return localDateISO(v);
  const s = String(v).trim();
  if(!s) return '';
  if(/^\d{5}$/.test(s)) return excelSerialToISO(Number(s));
  if(/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if(dmy) return `${dmy[3]}-${dmy[2].padStart(2,'0')}-${dmy[1].padStart(2,'0')}`;
  const parsed = new Date(s);
  if(!Number.isNaN(parsed.getTime())) return localDateISO(parsed);
  return '';
}

function dateValue(v){
  const iso = toISODate(v);
  return iso ? new Date(`${iso}T00:00:00`) : null;
}

function formatDate(v){
  const d = dateValue(v);
  if(!d) return '-';
  return d.toLocaleDateString('id-ID', {day:'2-digit', month:'short', year:'numeric'});
}

function pct(v){
  if(v === null || v === undefined || v === '') return 0;
  if(typeof v === 'number') return v <= 1 ? Math.round(v * 100) : Math.round(v);
  const n = parseFloat(String(v).replace('%','').replace(',','.').trim());
  if(Number.isNaN(n)) return 0;
  return n <= 1 ? Math.round(n * 100) : Math.round(n);
}

function statusClass(v){
  const s = normalize(v);
  if(s.includes('completed')) return 's-completed';
  if(s.includes('progress')) return 's-progress';
  if(s.includes('hold')) return 's-hold';
  if(s.includes('block')) return 's-blocked';
  return 's-started';
}

function unique(arr){ return [...new Set(arr.filter(Boolean).map(v => String(v).trim()).filter(Boolean))]; }
function memberName(member){ return typeof member === 'string' ? member : (member?.name || ''); }
function memberRole(member){ return typeof member === 'string' ? '' : (member?.role || ''); }
function getMemberNames(project){ return unique((project?.members || []).map(memberName)); }
function normalizeMembers(members){ return (members || []).map(member => typeof member === 'string' ? {name: member, role: ''} : {name: member.name || '', role: member.role || ''}).filter(member => member.name || member.role); }
function normalizeTimelineItems(items){
  return (items || []).map(item => {
    const phases = (item.phases || []).map(phase => ({
      label: phase.label || '',
      type: phase.type || 'assessment',
      startDate: toISODate(phase.startDate),
      endDate: toISODate(phase.endDate)
    })).filter(phase => phase.startDate || phase.endDate || phase.label);
    return {
      task: item.task || item.name || '',
      startDate: toISODate(item.startDate),
      endDate: toISODate(item.endDate),
      type: normalizeTimelineType(item.type || phases[0]?.type || 'assessment'),
      phases
    };
  }).filter(item => item.task || item.startDate || item.endDate || (item.phases || []).length);
}
function normalizeDocumentItems(items){
  return (items || []).map((item, index) => ({
    id: item.id || `doc-${index + 1}`,
    name: item.name || item['Nama Dokumen'] || item['Nama Dokumen Output'] || item.Uraian || item.uraian || '',
    description: item.description || item.Deskripsi || item.Category || item.category || '',
    status: item.status || item.Status || 'Not started',
    date: toISODate(item.date || item.Tanggal || item.Date || ''),
    reviewStatus: item.reviewStatus || item['Review Status'] || item.review || item.Review || ''
  })).filter(item => item.name || item.description || item.date);
}
function projectNumber(project){ return Number(String(project?.id || project?.code || '').match(/(\d+)/)?.[1] || 0); }
function defaultProjectCode(n){ return PROJECT_CODE_LABELS[n] || `Project ${n}`; }
function createEmptyProjectSlot(n){
  const code = defaultProjectCode(n);
  return { id:`project-${n}`, code, name:code, startDate:'', endDate:'', isActive:false, timelineColor:'', members:[], timelinePlan:[], tasks:[], documents:[], documentOutputs:[], meetings:[] };
}
function isProjectFilled(project){
  if(!project) return false;
  const code = String(project.code || '').trim();
  const name = String(project.name || '').trim();
  const hasCustomName = !!name && name !== code;
  return hasCustomName || !!project.startDate || !!project.endDate ||
    (project.members || []).length > 0 ||
    (project.timelinePlan || []).length > 0 ||
    (project.tasks || []).length > 0 ||
    (project.documents || []).length > 0 ||
    (project.documentOutputs || []).length > 0 ||
    (project.meetings || []).length > 0;
}
function ensureEmptyProjectSlots(data){
  data.projects = data.projects || [];
  data.passwords = data.passwords || {};
  for(let n = 1; n <= 25; n++){
    let slot = data.projects.find(project => project.id === `project-${n}`);
    if(!slot){
      slot = createEmptyProjectSlot(n);
      data.projects.push(slot);
    }
    const defaultPassword = `p${n}`;
    const defaultRule = data.passwords[defaultPassword];
    if(isProjectFilled(slot)){
      if(defaultRule?.role === 'guest' && defaultRule.label === `Client Project ${n}` && Array.isArray(defaultRule.projectIds) && defaultRule.projectIds.includes(`project-${n}`)){
        delete data.passwords[defaultPassword];
      }
    } else if(!defaultRule){
      data.passwords[defaultPassword] = { role:'guest', label:`Client Project ${n}`, projectIds:[`project-${n}`], canEdit:false };
    }
  }
  data.projects.sort((a,b) => (projectNumber(a) || 9999) - (projectNumber(b) || 9999));
  return data;
}
function getProjectPeriod(project){
  const timelineDates = (project?.timelinePlan || []).flatMap(item => {
    const phaseDates = (item.phases || []).flatMap(phase => [phase.startDate, phase.endDate]);
    return [...phaseDates, item.startDate, item.endDate];
  }).filter(Boolean).sort();
  if(timelineDates.length) return { startDate: timelineDates[0], endDate: timelineDates[timelineDates.length - 1] };
  return { startDate: project?.startDate || '', endDate: project?.endDate || '' };
}
function findTimelineReference(project, taskName){ const name = normalize(taskName); return (project?.timelinePlan || []).find(item => normalize(item.task) === name) || null; }

function parseTaskMatrix(matrix){
  if(!matrix?.length) return [];
  const rows = matrix.slice(1);
  return rows
    .filter(row => row && row.some(cell => String(cell ?? '').trim() !== ''))
    .map(row => ({
      task: row[0] ?? '',
      status: row[1] ?? 'Not started',
      startDate: toISODate(row[3]),
      endDate: toISODate(row[4]),
      assignedTo: row[5] ?? '',
      progress: pct(row[8]),
      notes: row[9] ?? ''
    }))
    .filter(item => item.task || item.notes || item.assignedTo);
}

function normalizeTaskItems(items){
  return (items || []).map((task, index) => ({
    task: task.task ?? task.Task ?? task.name ?? task.Nama ?? '',
    status: task.status ?? task.Status ?? 'Not started',
    startDate: toISODate(task.startDate ?? task['Tanggal Mulai'] ?? task['Tanggal Mulai Aktual'] ?? task['Start Aktual'] ?? ''),
    endDate: toISODate(task.endDate ?? task['Tanggal Selesai'] ?? task['Tanggal Selesai Aktual'] ?? task['End Aktual'] ?? ''),
    assignedTo: task.assignedTo ?? task['Assigned To'] ?? task.Owner ?? task.PIC ?? '',
    progress: pct(task.progress ?? task.Progress ?? ''),
    notes: task.notes ?? task.Notes ?? task.Note ?? ''
  })).filter(item => item.task || item.notes || item.assignedTo || item.startDate || item.endDate);
}

function parseDocuments(matrix){
  if(!matrix?.length) return [];
  return matrix.slice(1)
    .filter(row => row && row.some(cell => String(cell ?? '').trim() !== ''))
    .map((row, index) => ({
      id: `doc-${index + 1}`,
      name: row[1] ?? '',
      description: row[2] ?? '',
      status: row[3] ?? 'Not started',
      date: toISODate(row[4]),
      reviewStatus: row[5] ?? ''
    }))
    .filter(item => item.name || item.description);
}

function parseMeetings(matrix){
  if(!matrix?.length) return [];
  return matrix.slice(1)
    .filter(row => row && row.some(cell => String(cell ?? '').trim() !== ''))
    .map((row, index) => ({
      id: `meeting-${index + 1}`,
      date: toISODate(row[1]),
      note: row[2] ?? '',
      action: row[3] ?? '',
      type: row[4] ?? '',
      clientNote: row[2] ?? '',
      clientAction: row[3] ?? '',
      isClientVisible: true
    }))
    .filter(item => item.note || item.action || item.date || item.type);
}

function normalizeMeetingItems(items){
  return (items || []).map((item, index) => ({
    id: item.id || `meeting-${index + 1}`,
    date: toISODate(item.date || item.Tanggal || item.Date || ''),
    note: item.note || item.Note || item.Report || item.report || '',
    action: item.action || item['Tindak Lanjut'] || item.Action || '',
    type: item.type || item.Type || 'Update',
    clientNote: item.clientNote || item.client_note || item['Client Note'] || '',
    clientAction: item.clientAction || item.client_action || item['Client Action'] || '',
    isClientVisible: item.isClientVisible !== false && item.is_client_visible !== false
  })).filter(item => item.note || item.action || item.clientNote || item.clientAction || item.date || item.type);
}

function normalizeProject(rawProject){
  const taskSheet = (rawProject.sheets || []).find(s => normalize(s.name).includes('task tracker'));
  const docSheet = (rawProject.sheets || []).find(s => normalize(s.name).includes('document list'));
  const outputSheet = (rawProject.sheets || []).find(s => normalize(s.name).includes('document output') || normalize(s.name).includes('dokumen output') || normalize(s.name) === 'output');
  const meetingSheet = (rawProject.sheets || []).find(s => normalize(s.name).includes('meeting notes'));

  const rawTasks = Array.isArray(rawProject.tasks) && rawProject.tasks.length
    ? normalizeTaskItems(rawProject.tasks)
    : parseTaskMatrix(taskSheet?.matrix || []);

  const tasks = rawTasks.filter(t => t.task || t.notes || t.assignedTo || t.startDate || t.endDate);
  const documents = docSheet ? parseDocuments(docSheet?.matrix || []) : normalizeDocumentItems(rawProject.documents || []);
  const documentOutputs = outputSheet ? parseDocuments(outputSheet?.matrix || []) : normalizeDocumentItems(rawProject.documentOutputs || []);
  const meetings = meetingSheet ? parseMeetings(meetingSheet?.matrix || []) : normalizeMeetingItems(rawProject.meetings || rawProject.notes || []);
  const members = normalizeMembers(unique(tasks.map(t => t.assignedTo)).map(name => ({name, role: ''})));
  const timelinePlan = normalizeTimelineItems(rawProject.timelinePlan || tasks.map(t => ({ task: t.task, startDate: t.startDate, endDate: t.endDate }))); 

  let startDate = toISODate(rawProject.startDate);
  let endDate = toISODate(rawProject.endDate);

  const taskStartDates = tasks.map(t => toISODate(t.startDate)).filter(Boolean).sort();
  const taskEndDates = tasks.map(t => toISODate(t.endDate)).filter(Boolean).sort();
  if(!startDate) startDate = taskStartDates[0] || '';
  if(!endDate) endDate = taskEndDates[taskEndDates.length - 1] || startDate || '';

  return {
    id: rawProject.id,
    code: rawProject.code,
    name: rawProject.name,
    clientName: rawProject.clientName || rawProject.client_name || rawProject.code || '',
    startDate,
    endDate,
    isActive: rawProject.isActive !== false && rawProject.is_active !== false,
    projectStatus: normalizeProjectStatus(rawProject.projectStatus || rawProject.project_status, rawProject.isActive !== false && rawProject.is_active !== false),
    timelineColor: rawProject.timelineColor || '',
    branding: normalizeProjectBranding(rawProject.branding || {}, rawProject),
    members,
    timelinePlan,
    tasks,
    documents,
    documentOutputs,
    meetings
  };
}

function migrateData(data){
  data.projects = (data.projects || []).map(project => ({
    ...project,
    clientName: project.clientName || project.client_name || project.code || '',
    members: normalizeMembers(project.members || []),
    timelinePlan: normalizeTimelineItems(project.timelinePlan || project.tasks || []),
    currentPhaseTask: project.currentPhaseTask || '',
    nextMilestoneTask: project.nextMilestoneTask || '',
    isActive: project.isActive !== false && project.is_active !== false && normalizeProjectStatus(project.projectStatus || project.project_status, project.isActive !== false && project.is_active !== false) !== 'archived',
    projectStatus: normalizeProjectStatus(project.projectStatus || project.project_status, project.isActive !== false && project.is_active !== false),
    picCywa: project.picCywa || '',
    picClient: project.picClient || '',
    documents: normalizeDocumentItems(project.documents || []),
    documentOutputs: normalizeDocumentItems(project.documentOutputs || []),
    tasks: normalizeTaskItems(project.tasks || []),
    meetings: normalizeMeetingItems(project.meetings || [])
  }));
  return ensureEmptyProjectSlots(data);
}

function normalizeData(raw){
  return migrateData({
    generatedAt: raw.generatedAt,
    sourceWorkbook: raw.sourceWorkbook,
    passwords: deepClone(raw.passwords),
    projects: (raw.projects || []).map(normalizeProject)
  });
}

function loadData(){
  try{
    const stored = localStorage.getItem(STORAGE_KEY);
    if(stored) return migrateData(JSON.parse(stored));
  }catch(err){ console.warn('Failed to read stored data', err); }
  return normalizeData(RAW_DATA);
}

function persistData(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
}

function resetLocalChanges(){
  if(!confirm('Hapus semua perubahan lokal di browser ini?')) return;
  localStorage.removeItem(STORAGE_KEY);
  state.data = normalizeData(RAW_DATA);
  state.page = 'dashboard';
  state.activeTab = 'summary';
  render();
}

function downloadTextFile(filename, content, mimeType = 'text/plain;charset=utf-8'){
  const blob = new Blob([content], {type:mimeType});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
function safeFilename(value, fallback = 'export'){
  const clean = String(value || '').trim().replace(/[^a-z0-9._-]+/gi, '_').replace(/^_+|_+$/g, '');
  return clean || fallback;
}
function exportChanges(){
  downloadTextFile('cywa-dashboard-data.json', JSON.stringify(state.data, null, 2), 'application/json;charset=utf-8');
}

async function login(password){
  if(hasSupabaseRuntimeConfig()){
    return await loginWithSupabasePassword(password);
  }

  const rule = state.data.passwords[password];
  if(!rule) return false;
  state.session = { password, ...rule, dataSource: 'local', canManagePasswords: ['project_manager','admin'].includes(rule.role) };
  const allowed = getAllowedProjects();
  state.selectedProjectId = allowed[0]?.id || null;
  state.activeTab = 'summary';
  state.page = 'dashboard';
  state.tableSearch = '';
  return true;
}

async function loginWithSupabasePassword(password){
  const client = getSupabaseClient();
  if(!client) return false;
  let lastError = null;

  for(const email of SUPABASE_INTERNAL_AUTH_EMAILS){
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if(data?.session?.user){
      try{
        await hydrateSupabaseSession(data.session.user);
        return true;
      }catch(err){
        await client.auth.signOut();
        throw err;
      }
    }
    lastError = error;
  }

  if(lastError) console.warn('Password-only login failed:', lastError.message);
  return false;
}

function normalizeSupabaseRole(role){
  if(role === 'project_manager') return 'project_manager';
  if(role === 'admin') return 'admin';
  return 'guest';
}

async function hydrateSupabaseSession(user){
  const client = getSupabaseClient();
  if(!client || !user) throw new Error('Supabase session tidak tersedia.');

  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('id,email,full_name,role')
    .eq('id', user.id)
    .single();

  if(profileError) throw profileError;

  const dashboardData = await fetchSupabaseDashboardData(client);
  state.data = dashboardData;

  const role = normalizeSupabaseRole(profile.role);

  let allowedProjectIds = [];

  if(role === 'project_manager' || role === 'admin'){
    allowedProjectIds = 'all';
  }else{
    const { data: accessRows, error: accessError } = await client
      .from('project_access')
      .select('project_id')
      .eq('user_id', user.id);

    if(accessError) throw accessError;

    const allowedSupabaseProjectIds = new Set(
      (accessRows || []).map(row => row.project_id).filter(Boolean)
    );

    allowedProjectIds = dashboardData.projects
      .filter(project => allowedSupabaseProjectIds.has(project.supabaseId))
      .map(project => project.id);
  }

  state.session = {
    role,
    label: profile.full_name || profile.email || 'Pengguna',
    projectIds: allowedProjectIds,
    canEdit: role === 'project_manager',
    canManagePasswords: role === 'project_manager' || role === 'admin',
    dataSource: 'supabase',
    userId: profile.id,
    email: profile.email
  };

  const allowed = getAllowedProjects();
  state.selectedProjectId = allowed[0]?.id || null;
  state.activeTab = 'summary';
  state.page = (role === 'project_manager' || role === 'admin' || role === 'guest') ? 'home' : 'dashboard';
  state.tableSearch = '';
}

async function fetchTable(client, table, columns = '*', order = 'sort_order'){
  let query = client.from(table).select(columns);
  if(order) query = query.order(order, { ascending: true });
  const { data, error } = await query;
  if(error) throw error;
  return data || [];
}

async function fetchSupabaseDashboardData(client){
  const [projects, members, timelineItems, tasks, documents, outputs, meetings] = await Promise.all([
    fetchTable(client, 'projects', '*', 'legacy_id'),
    fetchTable(client, 'project_members'),
    fetchTable(client, 'timeline_items'),
    fetchTable(client, 'tasks'),
    fetchTable(client, 'documents'),
    fetchTable(client, 'document_outputs'),
    fetchTable(client, 'meeting_logs')
  ]);

  let scheduleRows = [];
  try{
    scheduleRows = await fetchTable(client, 'project_schedule_events', '*', null);
  }catch(err){
    console.warn('project_schedule_events belum tersedia atau tidak bisa dibaca:', err.message);
  }

  let brandingRows = [];
  try{
    brandingRows = await fetchTable(client, 'project_branding', '*', null);
  }catch(err){
    console.warn('project_branding belum tersedia atau tidak bisa dibaca:', err.message);
  }

  let timelinePhases = [];
  try{
    timelinePhases = await fetchTable(client, 'timeline_phases');
  }catch(err){
    console.warn('timeline_phases belum tersedia atau tidak bisa dibaca:', err.message);
  }

  const membersByProject = groupBy(members, 'project_id');
  const timelineByProject = groupBy(timelineItems, 'project_id');
  const tasksByProject = groupBy(tasks, 'project_id');
  const docsByProject = groupBy(documents, 'project_id');
  const outputsByProject = groupBy(outputs, 'project_id');
  const meetingsByProject = groupBy(meetings, 'project_id');
  const schedulesByProject = groupBy(scheduleRows, 'project_id');
  const phasesByTimeline = groupBy(timelinePhases, 'timeline_item_id');
  const brandingByProject = groupBy(brandingRows, 'project_id');

  const transformedProjects = (projects || []).map(project => ({
    id: project.legacy_id || project.id,
    supabaseId: project.id,
    code: project.code || '',
    name: project.name || project.code || '',
    clientName: project.client_name || project.code || '',
    startDate: project.start_date || '',
    endDate: project.end_date || '',
    isActive: project.is_active !== false && normalizeProjectStatus(project.project_status, project.is_active !== false) !== 'archived',
    projectStatus: normalizeProjectStatus(project.project_status, project.is_active !== false),
    nextMilestoneTask: project.next_milestone_task || '',
    currentPhaseTask: project.current_phase_task || '',
    picCywa: project.pic_cywa || '',
    picClient: project.pic_client || '',
    timelineColor: '',
    branding: normalizeProjectBranding((brandingByProject[project.id] || [])[0] || {}, project),
    members: (membersByProject[project.id] || []).sort((a,b) => (a.sort_order || 0) - (b.sort_order || 0)).map(member => ({
      name: member.name || '',
      role: member.role || ''
    })),
    timelinePlan: (timelineByProject[project.id] || []).sort((a,b) => (a.sort_order || 0) - (b.sort_order || 0)).map(item => ({
      task: item.name || '',
      startDate: item.start_date || '',
      endDate: item.end_date || '',
      type: normalizeTimelineType(item.type || (phasesByTimeline[item.id] || [])[0]?.type || 'assessment'),
      phases: (phasesByTimeline[item.id] || []).sort((a,b) => (a.sort_order || 0) - (b.sort_order || 0)).map(phase => ({
        label: phase.label || '',
        type: phase.type || 'assessment',
        startDate: phase.start_date || '',
        endDate: phase.end_date || ''
      }))
    })),
    tasks: (tasksByProject[project.id] || []).sort((a,b) => (a.sort_order || 0) - (b.sort_order || 0)).map(task => ({
      task: task.task || '',
      status: task.status || 'Not started',
      startDate: task.start_date_actual || '',
      endDate: task.end_date_actual || '',
      assignedTo: task.assigned_to || '',
      progress: pct(task.progress),
      notes: task.notes || ''
    })),
    documents: (docsByProject[project.id] || []).sort((a,b) => (a.sort_order || a.doc_no || 0) - (b.sort_order || b.doc_no || 0)).map(doc => ({
      id: doc.id,
      no: doc.doc_no || 0,
      name: doc.name || '',
      description: doc.description || '',
      status: doc.status || 'Not started',
      date: doc.date || '',
      reviewStatus: doc.review_status || ''
    })),
    documentOutputs: (outputsByProject[project.id] || []).sort((a,b) => (a.sort_order || a.output_no || 0) - (b.sort_order || b.output_no || 0)).map(output => ({
      id: output.id,
      no: output.output_no || 0,
      name: output.name || '',
      description: output.description || '',
      status: output.status || 'Not started',
      date: output.date || ''
    })),
    meetings: (meetingsByProject[project.id] || []).sort((a,b) => (a.sort_order || 0) - (b.sort_order || 0)).map((meeting, index) => ({
      id: meeting.id || `meeting-${index + 1}`,
      date: meeting.date || '',
      type: meeting.type || '',
      note: meeting.note || '',
      action: meeting.action || '',
      clientNote: meeting.client_note || '',
      clientAction: meeting.client_action || '',
      isClientVisible: meeting.is_client_visible !== false
    })),
    scheduleEvents: (schedulesByProject[project.id] || []).sort((a,b) => `${a.event_date || ''} ${a.start_time || ''}`.localeCompare(`${b.event_date || ''} ${b.start_time || ''}`)).map((event, index) => ({
      id: event.id || `schedule-${index + 1}`,
      supabaseId: event.id || '',
      projectId: project.legacy_id || project.id,
      projectSupabaseId: project.id,
      title: event.title || '',
      date: event.event_date || '',
      startTime: event.start_time || '',
      endTime: event.end_time || '',
      type: event.event_type || 'Meeting',
      deliveryMode: event.delivery_mode || 'Online',
      location: event.location || '',
      description: event.description || '',
      isInternal: event.is_internal === true
    }))
  }));

  return migrateData({
    generatedAt: new Date().toISOString(),
    sourceWorkbook: 'Ruang Data Utama',
    passwords: deepClone(RAW_DATA.passwords || {}),
    projects: transformedProjects
  });
}

async function logout(){
  if(hasSupabaseRuntimeConfig()){
    try{ await getSupabaseClient()?.auth.signOut(); }catch(err){ console.warn('Gagal mengakhiri session akses', err); }
  }
  state.session = null;
  state.selectedProjectId = null;
  state.activeTab = 'summary';
  state.sidebarSearch = '';
  state.tableSearch = '';
  state.page = 'dashboard';
  state.data = loadData();
  renderLogin();
}

async function bootApp(){
  if(hasSupabaseRuntimeConfig()){
    renderBootLoading('Menyiapkan ruang kerja...');
    try{
      const client = getSupabaseClient();
      const { data } = await client.auth.getSession();
      if(data?.session?.user){
        try{
          await hydrateSupabaseSession(data.session.user);
          render();
          return;
        }catch(err){
          console.warn('Gagal memuat session akses:', err);
          try{ await client.auth.signOut(); }catch(signOutErr){ console.warn('Gagal mengakhiri session lama:', signOutErr); }
        }
      }
    }catch(err){
      console.warn('Layanan akses belum siap:', err);
    }
  }
  renderLogin();
}

function projectVisibleInDashboard(project){
  if(!project) return false;
  if(isSupabaseSession()) return !projectIsArchived(project) && isProjectFilled(project);
  return true;
}

function getAllowedProjects(){
  if(!state.session) return [];
  if(state.session.projectIds === 'all'){
    const projects = state.data.projects || [];
    const visible = isSupabaseSession() ? projects.filter(projectVisibleInDashboard) : projects;
    return state.session.role === 'admin' ? visible.filter(isProjectFilled) : visible;
  }
  return state.data.projects.filter(p => state.session.projectIds.includes(p.id) && projectVisibleInDashboard(p));
}

function selectedProject(){
  return getAllowedProjects().find(p => p.id === state.selectedProjectId) || getAllowedProjects()[0] || null;
}

function getGuestPasswordForProject(projectId){
  const entry = Object.entries(state.data.passwords || {}).find(([password, rule]) =>
    rule?.role === 'guest' && Array.isArray(rule.projectIds) && rule.projectIds.includes(projectId)
  );
  return entry ? entry[0] : '';
}

function removeGuestPasswordsForProject(projectId){
  Object.entries(state.data.passwords || {}).forEach(([password, rule]) => {
    if(rule?.role === 'guest' && Array.isArray(rule.projectIds) && rule.projectIds.includes(projectId)){
      delete state.data.passwords[password];
    }
  });
}

function getAdminPassword(){
  const entry = Object.entries(state.data.passwords || {}).find(([, rule]) => rule?.role === 'admin');
  return entry ? entry[0] : '';
}

function removeAdminPasswords(){
  Object.entries(state.data.passwords || {}).forEach(([password, rule]) => {
    if(rule?.role === 'admin') delete state.data.passwords[password];
  });
}


function canManagePasswords(){
  return !!state.session && (state.session.canManagePasswords || state.session.role === 'project_manager' || state.session.role === 'admin');
}

function passwordTargetLabelForProject(project){
  return `${project.code || project.id} — ${project.name || 'Project Dashboard'}`;
}

function getPasswordAdminTargets(){
  const targets = [
    { key:'admin', email:'admin@professional-demo.local', label:'Admin', scope:'Semua project yang sudah terisi' }
  ];

  // PM target hanya ditampilkan agar Admin/PM bisa melakukan reset jika diperlukan.
  targets.push({ key:'pm', email:'pm@professional-demo.local', label:'Project Manager', scope:'Akses pengelolaan dashboard' });

  (state.data.projects || [])
    .filter(isProjectFilled)
    .sort((a,b) => (projectNumber(a) || 9999) - (projectNumber(b) || 9999))
    .forEach(project => {
      const n = projectNumber(project);
      if(n >= 1){
        targets.push({
          key:`client-project-${n}`,
          email:`client-project-${n}@professional-demo.local`,
          label:`Client Project ${n}`,
          scope: passwordTargetLabelForProject(project)
        });
      }
    });

  return targets;
}

function isStrongPassword(password){
  return password.length >= 10 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password);
}

async function callPasswordAdminFunction(action, payload = {}){
  const client = getSupabaseClient();
  if(!client) throw new Error('Layanan pengelolaan akses belum tersedia. Silakan muat ulang halaman dan coba kembali.');
  const { data, error } = await client.functions.invoke('admin-password', {
    body: { action, ...payload }
  });
  if(error) throw error;
  if(data?.error) throw new Error(data.error);
  return data || {};
}

async function resetAccessPassword(targetKey){
  if(!canManagePasswords()) return;
  const target = getPasswordAdminTargets().find(item => item.key === targetKey);
  if(!target){ alert('Target akun tidak ditemukan.'); return; }
  const input = document.getElementById(`password-target-${targetKey}`);
  const newPassword = String(input?.value || '').trim();
  if(!newPassword){ alert('Password baru wajib diisi.'); return; }
  if(!isStrongPassword(newPassword)){
    alert('Password minimal 10 karakter dan harus mengandung huruf besar, huruf kecil, angka, dan simbol.');
    return;
  }
  if(!confirm(`Set password baru untuk ${target.label}?\n\nPassword lama tidak akan ditampilkan dan akan langsung diganti pada sistem akses.`)) return;

  try{
    await callPasswordAdminFunction('set_password', { targetKey, newPassword });
    if(input) input.value = '';
    state.passwordAuditLogs = null;
    alert(`Password ${target.label} berhasil diganti.`);
    render();
  }catch(err){
    console.error(err);
    alert(`Gagal mengganti password: ${err.message || err}`);
  }
}

async function loadPasswordAuditLog(){
  if(!canManagePasswords()) return;
  try{
    const data = await callPasswordAdminFunction('list_logs', { limit: 50 });
    state.passwordAuditLogs = data.logs || [];
    render();
  }catch(err){
    console.error(err);
    alert(`Gagal mengambil log password: ${err.message || err}`);
  }
}

function setProject(projectId){
  state.selectedProjectId = projectId;
  state.activeTab = 'summary';
  state.tableSearch = '';
  if(state.page === 'new-project') state.page = 'input-data';
  else state.page = 'dashboard';
  render();
}

function compareDateClass(dateStr, project, field, taskName){
  const d = dateValue(dateStr);
  if(!d) return '';
  const timelineRef = findTimelineReference(project, taskName);
  const period = getProjectPeriod(project);
  const refStart = dateValue(timelineRef?.startDate || period.startDate);
  const refEnd = dateValue(timelineRef?.endDate || period.endDate);
  if(field === 'start' && refStart){
    if(d < refStart) return 'date-fast';
    if(d > refStart) return 'date-late';
    return 'date-ontime';
  }
  if(field === 'end' && refEnd){
    if(d < refEnd) return 'date-fast';
    if(d > refEnd) return 'date-late';
    return 'date-ontime';
  }
  return 'date-neutral';
}

function taskHasStarted(task){
  const status = normalize(task?.status || '');
  return !!dateValue(task?.startDate) || status.includes('progress') || isCompletedStatus(task?.status) || isHoldStatus(task?.status);
}

function getTaskScheduleState(project, task){
  const timelineRef = findTimelineReference(project, task?.task);
  const refStart = dateValue(timelineRef?.startDate);
  const refEnd = dateValue(timelineRef?.endDate);
  const actualStart = dateValue(task?.startDate);
  const actualEnd = dateValue(task?.endDate);
  const today = startOfDay();
  const started = taskHasStarted(task);
  const notStarted = normalize(task?.status || '').includes('not started') || (!started && !isCompletedStatus(task?.status));
  const reasons = [];
  if(refStart && actualStart && startOfDay(actualStart) > startOfDay(refStart)) reasons.push(`Start aktual melewati timeline (${formatDate(timelineRef.startDate)})`);
  if(refEnd && actualEnd && startOfDay(actualEnd) > startOfDay(refEnd)) reasons.push(`End aktual melewati timeline (${formatDate(timelineRef.endDate)})`);
  if(refStart && notStarted && startOfDay(today) > startOfDay(refStart)) reasons.push(`Belum dimulai padahal timeline start ${formatDate(timelineRef.startDate)} sudah lewat`);
  if(refEnd && started && !isCompletedStatus(task?.status) && !actualEnd && startOfDay(today) > startOfDay(refEnd)) reasons.push(`Masih berjalan setelah timeline end ${formatDate(timelineRef.endDate)}`);
  const lateEnd = reasons.some(v => /End aktual|Masih berjalan/.test(v));
  const missedStart = reasons.some(v => /Belum dimulai/.test(v));
  const lateStart = reasons.some(v => /Start aktual/.test(v));
  const primaryReason = lateEnd
    ? (reasons.find(v => /End aktual|Masih berjalan/.test(v)) || 'End aktual melewati timeline')
    : missedStart
      ? (reasons.find(v => /Belum dimulai/.test(v)) || 'Belum dimulai melewati start timeline')
      : (reasons[0] || 'Sesuai timeline');
  const sortDate = lateEnd
    ? (actualEnd || refEnd || actualStart || refStart || new Date(0))
    : missedStart
      ? (refStart || actualStart || new Date(0))
      : (actualStart || refStart || new Date(0));
  const completed = isCompletedStatus(task?.status);
  const isActiveRisk = !completed && (lateEnd || missedStart);
  const isClosedVariance = completed && (lateEnd || lateStart);
  return {
    started,
    notStarted,
    lateStart,
    lateEnd,
    missedStart,
    isAtRisk: isActiveRisk,
    isClosedVariance,
    reasons,
    primaryReason,
    sortDate,
    timelineRef
  };
}

function renderProgressBar(value, large = false){
  const p = Math.max(0, Math.min(100, pct(value)));
  return `<div class="mini-progress ${large ? 'large' : ''} ${p === 0 ? 'zero' : ''}">
    <span>${p}%</span>
    <div class="bar">${p > 0 ? `<b style="width:${p}%"></b>` : ''}</div>
  </div>`;
}


function getLoginAttemptState(){
  try{
    const parsed = JSON.parse(localStorage.getItem(LOGIN_ATTEMPT_KEY) || '{}');
    return {
      count: Number(parsed.count || 0),
      lockedUntil: Number(parsed.lockedUntil || 0)
    };
  }catch(_err){
    return {count:0, lockedUntil:0};
  }
}

function setLoginAttemptState(nextState){
  localStorage.setItem(LOGIN_ATTEMPT_KEY, JSON.stringify(nextState));
}

function getLoginLockRemainingSeconds(){
  const state = getLoginAttemptState();
  const remaining = state.lockedUntil - Date.now();
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}

function recordLoginFailure(){
  const current = getLoginAttemptState();
  const count = current.lockedUntil > Date.now() ? current.count : current.count + 1;
  const lockedUntil = count >= LOGIN_MAX_ATTEMPTS ? Date.now() + LOGIN_LOCK_MS : 0;
  setLoginAttemptState({count, lockedUntil});
  return {count, lockedUntil};
}

function resetLoginAttempts(){
  localStorage.removeItem(LOGIN_ATTEMPT_KEY);
}

function renderLogin(){
  app.innerHTML = `<main class="login-shell">
    <a class="demo-guide-link" href="assets/professional-demo-guide.pdf" download>Demo Guide</a>
    <section class="login-card">
      <img class="login-logo" src="assets/professional-dashboard-logo.png" alt="Professional Project Dashboard Logo">
      <div class="eyebrow">Professional Project Dashboard</div>
      <h1>Demo Project Portal</h1>
      <p>Gunakan akun demo yang tersedia pada Demo Guide untuk menjelajahi dashboard berdasarkan role Project Manager, Admin, atau Client.</p>
      <form class="login-form" id="loginForm">
        <input id="password" type="password" autocomplete="current-password" placeholder="Masukkan password" autofocus />
        <button class="primary-btn" type="submit">Masuk</button>
      </form>
      <div class="error" id="loginError"></div>
    </section>
  </main>`;

  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const passwordInput = document.getElementById('password');
    const submitBtn = e.currentTarget.querySelector('button[type="submit"]');
    const errorBox = document.getElementById('loginError');
    errorBox.textContent = '';
    const lockRemaining = getLoginLockRemainingSeconds();
    if(lockRemaining > 0){
      errorBox.textContent = `Terlalu banyak percobaan login. Coba lagi dalam ${lockRemaining} detik.`;
      return;
    }
    submitBtn.disabled = true;
    submitBtn.textContent = 'Memeriksa...';
    try{
      const ok = await login(passwordInput.value.trim());
      if(ok){
        resetLoginAttempts();
        render();
      } else {
        const attempt = recordLoginFailure();
        const remaining = LOGIN_MAX_ATTEMPTS - attempt.count;
        errorBox.textContent = attempt.lockedUntil
          ? 'Terlalu banyak percobaan login. Coba lagi dalam 60 detik.'
          : `Password tidak sesuai atau belum terdaftar. Sisa percobaan: ${Math.max(0, remaining)}.`;
      }
    }catch(err){
      console.error(err);
      errorBox.textContent = 'Login gagal. Periksa koneksi sistem atau coba kembali.';
    }finally{
      submitBtn.disabled = false;
      submitBtn.textContent = 'Masuk';
    }
  });
}

function metricSummary(project){
  const tasks = project.tasks || [];
  const documents = project.documents || [];
  const outputs = project.documentOutputs || [];
  const allDocs = [...documents, ...outputs];
  const total = tasks.length;
  const completed = tasks.filter(t => normalize(t.status).includes('completed')).length;
  const inProgress = tasks.filter(t => normalize(t.status).includes('progress')).length;
  const holdTaskNames = new Set(tasks.filter(t => isHoldStatus(t.status)).map(t => normalize(t.task)).filter(Boolean));
  (project.timelinePlan || []).forEach(item => {
    const itemType = normalize(item.type);
    const phaseTypes = (item.phases || []).map(phase => normalize(phase.type)).join(' ');
    if(itemType.includes('hold') || phaseTypes.includes('hold')) holdTaskNames.add(normalize(item.task));
  });
  const hold = holdTaskNames.size;
  const notStarted = tasks.filter(t => normalize(t.status).includes('not started')).length;
  const projectProgress = total ? Math.round(tasks.reduce((sum, item) => sum + pct(item.progress), 0) / total) : 0;
  const documentCompleted = documents.filter(d => normalize(d.status) === 'completed').length;
  const outputCompleted = outputs.filter(d => normalize(d.status) === 'completed').length;
  const allDocumentCompleted = allDocs.filter(d => normalize(d.status) === 'completed').length;
  return { total, completed, inProgress, hold, notStarted, projectProgress, documentCompleted, documentTotal: documents.length, outputCompleted, outputTotal: outputs.length, allDocumentCompleted, allDocumentTotal: allDocs.length };
}
function renderKpis(project){
  const m = metricSummary(project);
  const docRate = m.documentTotal ? Math.round((m.documentCompleted / m.documentTotal) * 100) : 0;
  return `<section class="kpi-grid kpi-grid-dashboard executive-metrics">
    <div class="kpi"><div class="label">Total Task</div><div class="value">${m.total}</div></div>
    <div class="kpi"><div class="label">Task Completed</div><div class="value">${m.completed}</div></div>
    <div class="kpi"><div class="label">In Progress</div><div class="value">${m.inProgress}</div></div>
    <div class="kpi"><div class="label">Hold</div><div class="value">${m.hold}</div></div>
    <div class="kpi"><div class="label">Not Started</div><div class="value">${m.notStarted}</div></div>
    <div class="kpi"><div class="label">Document List</div><div class="value">${m.documentCompleted}/${m.documentTotal}</div><div class="progress-line slim">${docRate > 0 ? `<b style="width:${docRate}%"></b>` : ''}</div></div>
  </section>`;
}
function renderSidebar(){
  const projects = getAllowedProjects().filter(p => `${p.code} ${p.name}`.toLowerCase().includes(state.sidebarSearch.toLowerCase()));
  return `<aside class="sidebar">
    <div class="brand"><img src="assets/professional-dashboard-logo.png" alt="Professional Project Dashboard"><div class="brand-title">Professional Dashboard<span>Project Command Center</span></div></div>
    <div class="session-card">
      <span class="role-badge ${state.session.canEdit ? 'edit' : ''}">${state.session.canEdit ? '● Project Manager' : '● View Only'} · ${esc(state.session.label)}</span>
      <button class="logout" onclick="logout()">Keluar</button>
    </div>
    ${getAllowedProjects().length > 1 ? `<input class="search" placeholder="Cari project..." value="${esc(state.sidebarSearch)}" oninput="state.sidebarSearch=this.value;render()">` : ''}
    <nav class="project-list">${projects.map(p => `<button class="project-link ${p.id === state.selectedProjectId ? 'active' : ''}" onclick="setProject('${p.id}')"><strong>${esc(p.code)}</strong><small>${esc(p.name)}</small></button>`).join('')}</nav>
  </aside>`;
}

function renderTabs(){
  const tabs = [
    {id:'summary', html:'Ringkasan <em>Timeline</em>'},
    {id:'task', html:'<em>Task Tracker</em>'},
    {id:'document', html:'<em>Document List</em>'},
    {id:'output', html:'<em>Document Output</em>'},
    {id:'timeline', html:'<em>Timeline Project</em>'},
    {id:'meeting', html:'Catatan <em>Meeting</em> / <em>Update Log</em>'}
  ];
  return `<div class="tabs">${tabs.map(tab => `<button class="tab ${state.activeTab === tab.id ? 'active' : ''}" onclick="state.activeTab='${tab.id}';state.tableSearch='';render()">${tab.html}</button>`).join('')}</div>`;
}

function renderSummaryTimeline(project){
  const tasks = (project.tasks || []).filter(t => t.task);
  if(!tasks.length) return renderEmpty('Belum ada task timeline.', 'Isi task pada project untuk menampilkan timeline otomatis.');

  return `<section class="section-card">
    <div class="section-head"><div><h2>Ringkasan <em>Timeline</em></h2></div></div>
    <div class="timeline"><div class="timeline-grid numbered-timeline-grid">
      ${tasks.map((task, index) => {
        const progress = Math.max(0, Math.min(100, pct(task.progress)));
        return `<div class="tl-row numbered-tl-row">
          <div class="tl-no">${index + 1}</div>
          <div class="tl-meta">
            <div class="tl-name-wrap"><span class="status ${statusClass(task.status)}">${esc(task.status || 'Not started')}</span><div class="tl-name">${esc(task.task)}</div></div>
            <div class="tl-dates">${formatDate(task.startDate)} → ${formatDate(task.endDate)}</div>
          </div>
          <div class="tl-track progress-track">
            ${progress > 0 ? `<div class="tl-bar progress-fill" style="width:${progress}%"></div>` : ''}
            <span class="tl-label ${progress === 0 ? 'muted' : ''}">${progress}%</span>
          </div>
        </div>`;
      }).join('')}
    </div></div>
  </section>`;
}

function taskRows(project){
  let rows = project.tasks || [];
  if(state.tableSearch){
    const q = state.tableSearch.toLowerCase();
    rows = rows.filter(row => [row.task, row.status, row.startDate, row.endDate, row.assignedTo, row.notes, row.progress].some(val => String(val ?? '').toLowerCase().includes(q)));
  }
  return rows;
}

function renderTaskTracker(project){
  const rows = taskRows(project);
  return `<section class="section-card">
    <div class="section-head"><div><h2><em>Task Tracker</em></h2></div>
      <div class="table-tools"><input placeholder="Cari update..." value="${esc(state.tableSearch)}" oninput="state.tableSearch=this.value;render()"><span class="save-dot">${state.session.canEdit ? 'Edit dari menu Pengelolaan Project' : 'Readonly'}</span></div>
    </div>
    <div class="table-wrap"><table class="excel modern-table task-table"><thead><tr>
      <th class="w-no narrow">No</th>
      <th class="w-task">Task</th>
      <th class="w-status">Status</th>
      <th class="w-date">Tanggal Mulai</th>
      <th class="w-date">Tanggal Selesai</th>
      <th class="w-assigned">Assigned To</th>
      <th class="w-progress">Progress</th>
      <th class="w-notes">Notes</th>
    </tr></thead><tbody>
    ${rows.length ? rows.map((row, index) => `<tr>
      <td class="col-no table-row-no">${index + 1}</td>
      <td>${esc(row.task)}</td>
      <td><span class="status ${statusClass(row.status)}">${esc(row.status || 'Not started')}</span>${isDocumentInReview(row) ? '<span class="status s-progress mini-status">In Review</span>' : ''}</td>
      <td><span class="date-pill ${compareDateClass(row.startDate, project, 'start', row.task)}">${formatDate(row.startDate)}</span></td>
      <td><span class="date-pill ${compareDateClass(row.endDate, project, 'end', row.task)}">${formatDate(row.endDate)}</span></td>
      <td>${esc(row.assignedTo || '-')}</td>
      <td>${renderProgressBar(row.progress)}</td>
      <td>${esc(row.notes || '-')}</td>
    </tr>`).join('') : `<tr><td colspan="8" class="center-muted">Tidak ada data task.</td></tr>`}
    </tbody></table></div>
  </section>`;
}

function documentRows(project){
  let rows = project.documents || [];
  if(state.tableSearch){
    const q = state.tableSearch.toLowerCase();
    rows = rows.filter(row => [row.name, row.description, row.status].some(val => String(val ?? '').toLowerCase().includes(q)));
  }
  return rows;
}

function renderDocumentTable(project, type){
  const isOutput = type === 'output';
  let rows = isOutput ? (project.documentOutputs || []) : (project.documents || []);
  if(state.tableSearch){
    const q = state.tableSearch.toLowerCase();
    rows = rows.filter(row => [row.name, row.description, row.status, row.reviewStatus, row.date].some(val => String(val ?? '').toLowerCase().includes(q)));
  }
  const title = isOutput ? '<em>Document Output</em>' : '<em>Document List</em>';
  const plainTitle = isOutput ? 'Document Output' : 'Document List';
  const emptyText = isOutput ? 'Tidak ada dokumen output.' : 'Tidak ada dokumen.';
  return `<section class="section-card">
    <div class="section-head"><div><h2>${title}</h2></div>
      <div class="table-tools"><input placeholder="Cari update..." value="${esc(state.tableSearch)}" oninput="state.tableSearch=this.value;render()"></div>
    </div>
    <div class="table-wrap"><table class="excel modern-table"><thead><tr>
      <th class="w-no narrow">No</th>
      <th class="w-date">Tanggal</th>
      <th class="w-doc">Nama Dokumen</th>
      <th>Deskripsi</th>
      <th class="w-status">Status</th>
    </tr></thead><tbody>
    ${rows.length ? rows.map((row, index) => `<tr>
      <td class="col-no">${index + 1}</td>
      <td>${formatDate(row.date)}</td>
      <td>${esc(row.name)}</td>
      <td>${esc(row.description || '-')}</td>
      <td><span class="status ${statusClass(row.status)}">${esc(row.status || 'Not started')}</span></td>
    </tr>`).join('') : `<tr><td colspan="5" class="center-muted">${emptyText}</td></tr>`}
    </tbody></table></div>
  </section>`;
}

function renderDocumentList(project){ return renderDocumentTable(project, 'list'); }
function renderDocumentOutput(project){ return renderDocumentTable(project, 'output'); }

function buildGanttModel(project){
  const timelineItems = normalizeTimelineItems(project.timelinePlan || []);
  if(!timelineItems.length) return null;
  const period = getProjectPeriod({ ...project, timelinePlan: timelineItems });
  const projectStart = dateValue(period.startDate);
  const projectEnd = dateValue(period.endDate);
  if(!projectStart || !projectEnd) return null;
  const items = timelineItems.filter(t => t.task).map(item => {
    const fallbackPhase = {
      label: 'Timeline',
      type: item.type || 'assessment',
      startDate: item.startDate,
      endDate: item.endDate
    };
    const rawPhases = (item.phases && item.phases.length) ? item.phases : [fallbackPhase];
    const phases = rawPhases.map(phase => {
      const start = dateValue(phase.startDate) || dateValue(item.startDate) || projectStart;
      const end = dateValue(phase.endDate) || dateValue(item.endDate) || start;
      return {
        ...phase,
        _start: start,
        _end: end < start ? start : end,
        type: phase.type || item.type || 'assessment'
      };
    });
    return {...item, phases};
  });
  const days = [];
  const cursor = new Date(projectStart);
  while(cursor <= projectEnd){
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  const months = [];
  let currentKey = '';
  days.forEach(day => {
    const key = `${day.getFullYear()}-${day.getMonth()}`;
    const label = day.toLocaleDateString('id-ID', {month:'long', year:'numeric'});
    if(key !== currentKey){
      months.push({ key, label, span: 1 });
      currentKey = key;
    } else {
      months[months.length - 1].span += 1;
    }
  });
  return { tasks: items, days, months, start: projectStart, end: projectEnd, totalDays: days.length };
}

function renderTimelineProject(project){
  const model = buildGanttModel(project);
  if(!model) return renderEmpty('Timeline belum siap.', 'Isi data Timeline Project agar jadwal yang disepakati bisa ditampilkan.');
  const dayWidth = 34;
  const headerWidth = model.totalDays * dayWidth;
  const filteredTasks = model.tasks.filter(task => !state.tableSearch || task.task.toLowerCase().includes(state.tableSearch.toLowerCase()));

  const phaseTypes = new Set();
  filteredTasks.forEach(task => (task.phases || []).forEach(phase => phaseTypes.add(normalize(phase.type || 'assessment'))));
  const legendDefs = [
    { type: 'assessment', label: 'Assessment / Timeline' },
    { type: 'reporting', label: 'Reporting' },
    { type: 'hold', label: 'Hold' },
    { type: 'hold-reporting', label: 'Reporting (Hold)' }
  ];
  const legend = legendDefs
    .filter(item => phaseTypes.has(item.type) || (item.type === 'hold' && phaseTypes.has('hold-reporting')))
    .map(item => `<span class="legend-item"><i class="${item.type}"></i>${esc(item.label)}</span>`)
    .join('');

  return `<section class="section-card">
    <div class="section-head timeline-head">
      <div><h2>Timeline Project</h2>${legend ? `<div class="gantt-legend">${legend}</div>` : ''}</div>
      <div class="table-tools"><input placeholder="Cari task..." value="${esc(state.tableSearch)}" oninput="state.tableSearch=this.value;render()"></div>
    </div>
    <div class="gantt-wrap">
      <div class="gantt-board">
        <div class="gantt-left sticky-head gantt-task-head"><span class="gantt-row-no head">No</span><span>Task</span></div>
        <div class="gantt-right sticky-head" style="width:${headerWidth}px">
          <div class="gantt-months">${model.months.map(m => `<div class="month-block" style="width:${m.span * dayWidth}px">${esc(m.label)}</div>`).join('')}</div>
          <div class="gantt-days">${model.days.map(d => `<div class="day-block">${d.getDate()}</div>`).join('')}</div>
        </div>
        ${filteredTasks.map((task, index) => {
          return `<div class="gantt-left row-label gantt-task-label"><span class="gantt-row-no">${index + 1}</span><span>${esc(task.task)}</span></div>
            <div class="gantt-right gantt-row-canvas" style="width:${headerWidth}px">
              <div class="gantt-gridline">${model.days.map(() => `<span></span>`).join('')}</div>
              ${task.phases.map(phase => {
                const start = phase._start < model.start ? model.start : phase._start;
                const end = phase._end > model.end ? model.end : phase._end;
                const startIndex = Math.max(0, Math.round((start - model.start) / 86400000));
                const endIndex = Math.max(startIndex, Math.round((end - model.start) / 86400000));
                const barLeft = startIndex * dayWidth;
                const barWidth = Math.max(dayWidth, ((endIndex - startIndex) + 1) * dayWidth);
                const typeClass = normalize(phase.type || 'assessment').replace(/[^a-z0-9-]+/g, '-');
                const title = `${phase.label || 'Timeline'}: ${formatDate(phase.startDate)} - ${formatDate(phase.endDate)}`;
                return `<div class="gantt-bar-shell ${typeClass}" title="${esc(title)}" style="left:${barLeft}px;width:${barWidth}px"></div>`;
              }).join('')}
            </div>`;
        }).join('')}
      </div>
    </div>
  </section>`;
}

function meetingRows(project){
  let rows = project.meetings || [];
  if(state.tableSearch){
    const q = state.tableSearch.toLowerCase();
    rows = rows.filter(row => [row.date, row.note, row.action].some(val => String(val ?? '').toLowerCase().includes(q)));
  }
  return rows;
}

function renderMeetingNotes(project){
  const rows = meetingRows(project);
  return `<section class="section-card">
    <div class="section-head"><div><h2>Project Updates</h2></div>
      <div class="table-tools"><input placeholder="Cari update..." value="${esc(state.tableSearch)}" oninput="state.tableSearch=this.value;render()"></div>
    </div>
    <div class="table-wrap"><table class="excel modern-table task-table"><thead><tr>
      <th class="w-no narrow">No</th>
      <th class="w-date">Tanggal</th>
      <th>Update</th>
      <th>Tindak Lanjut</th>
    </tr></thead><tbody>
    ${rows.length ? rows.map((row, index) => `<tr>
      <td class="col-no">${index + 1}</td>
      <td>${formatDate(row.date)}</td>
      <td>${esc(row.note || '-')}</td>
      <td>${esc(row.action || '-')}</td>
    </tr>`).join('') : `<tr><td colspan="4" class="center-muted">Belum ada update project.</td></tr>`}
    </tbody></table></div>
  </section>`;
}

function renderEmpty(title, message){
  return `<div class="empty"><strong>${esc(title)}</strong><div>${esc(message)}</div></div>`;
}

function renderDashboardMain(){
  const project = selectedProject();
  if(!project) return `<main class="main">${renderEmpty('Belum ada project yang tersedia.', 'Pastikan akun ini sudah diberikan akses ke project yang sesuai.')}</main>`;
  let content = '';
  if(state.activeTab === 'summary') content = renderSummaryTimeline(project);
  if(state.activeTab === 'task') content = renderTaskTracker(project);
  if(state.activeTab === 'document') content = renderDocumentList(project);
  if(state.activeTab === 'output') content = renderDocumentOutput(project);
  if(state.activeTab === 'timeline') content = renderTimelineProject(project);
  if(state.activeTab === 'meeting') content = renderMeetingNotes(project);

  return `<main class="main">
    <div class="topbar">
      <div class="title"><h1>${esc(project.name)}</h1></div>
      <div class="actions">
        ${canManageProjects() ? `<button class="ghost-btn" onclick="state.page='project-management';render()">Kelola Project</button>` : ''}${state.session.canEdit ? `<button class="ghost-btn" onclick="state.page='input-data';render()">Pengelolaan Project</button>` : ''}${canManagePasswords() ? `<button class="ghost-btn" onclick="state.page='pm-settings';render()">Pengaturan</button>` : ''}${shouldShowLocalDevTools() ? `<button class="ghost-btn" onclick="exportChanges()">Unduh JSON</button><button class="ghost-btn" onclick="resetLocalChanges()">Reset Data</button>` : ''}
      </div>
    </div>
    ${state.session.canEdit ? `<div class="notice"><strong>Mode <em>Project Manager</em>:</strong> perubahan data dilakukan melalui menu <strong><em>Pengelolaan Project</em></strong>. Pastikan data yang tersimpan sudah sesuai sebelum dibagikan kepada klien.</div>` : ''}
    ${renderKpis(project)}
    ${renderTabs()}
    ${content}
    <div class="footer-note">Dokumen ini bersifat rahasia dan hanya digunakan untuk pemantauan project yang terkait.</div>
  </main>`;
}

function projectEditorHeader(project){
  const milestoneOptions = (project.tasks || []).filter(task => task.task).map(task => task.task);
  const currentPhaseOptions = (project.timelinePlan || []).filter(item => item.task).map(item => item.task);
  const memberSuggestions = getMemberNames(project);
  const localOnlyActions = !isSupabaseSession() ? `<button class="danger-btn" onclick="deleteCurrentProject()">Hapus Project</button>${shouldShowLocalDevTools() ? `<button class="ghost-btn" onclick="exportChanges()">Unduh JSON</button>` : ''}` : '';
  return `<div class="editor-head">
    <div>
      <h2>Edit Project</h2>
      <p>Perbarui informasi project, timeline, task, dan dokumen sesuai kebutuhan monitoring.</p>
    </div>
    <div class="editor-head-actions">
      <button class="primary-btn" type="button" onclick="saveProjectManual(event)" ${state.projectSaveBusy ? 'disabled' : ''}>${state.projectSaveBusy ? 'Menyimpan...' : 'Simpan'}</button>
      ${localOnlyActions}
      <button class="ghost-btn" onclick="state.page='input-data';render()">Kembali</button>
    </div>
  </div>
  ${state.projectSaveMessage ? `<div class="notice ${state.projectSaveMessage.type === 'error' ? 'danger-notice' : 'subtle'}">${esc(state.projectSaveMessage.text)}</div>` : ''}
  <div class="editor-block">
    <div class="editor-grid editor-grid-2">
      <label><span>Kode Project</span><input value="${esc(project.code)}" onchange="updateProjectMeta('code', this.value)"></label>
      <label><span>Nama Project</span><input value="${esc(project.name)}" onchange="updateProjectMeta('name', this.value)"></label>
      <label><span>Tanggal Mulai Project</span><input type="date" value="${esc(project.startDate)}" onchange="updateProjectMeta('startDate', this.value)"></label>
      <label><span>Tanggal Selesai Project</span><input type="date" value="${esc(project.endDate)}" onchange="updateProjectMeta('endDate', this.value)"></label>
      <label><span>Fase Saat Ini</span><select onchange="updateProjectMeta('currentPhaseTask', this.value)"><option value="" ${!project.currentPhaseTask ? 'selected' : ''}>Otomatis dari timeline aktif</option>${currentPhaseOptions.map(name => `<option value="${esc(name)}" ${normalize(project.currentPhaseTask) === normalize(name) ? 'selected' : ''}>${esc(name)}</option>`).join('')}</select></label>
      <label><span>Milestone Berikutnya</span><select onchange="updateProjectMeta('nextMilestoneTask', this.value)"><option value="" ${!project.nextMilestoneTask ? 'selected' : ''}>Otomatis dari milestone terdekat</option>${milestoneOptions.map(name => `<option value="${esc(name)}" ${normalize(project.nextMilestoneTask) === normalize(name) ? 'selected' : ''}>${esc(name)}</option>`).join('')}</select></label>
      <label><span>Project Lead</span><input list="pic-cywa-options" value="${esc(project.picCywa || '')}" placeholder="Contoh: Dika" onchange="updateProjectMeta('picCywa', this.value)"></label>
      <label><span>PIC Client</span><input list="pic-client-options" value="${esc(project.picClient || '')}" placeholder="Contoh: PIC Client" onchange="updateProjectMeta('picClient', this.value)"></label>
    </div>
    <datalist id="pic-cywa-options">${memberSuggestions.map(name => `<option value="${esc(name)}"></option>`).join('')}</datalist>
    <datalist id="pic-client-options">${memberSuggestions.map(name => `<option value="${esc(name)}"></option>`).join('')}</datalist>
    <div class="editor-helper">Fase saat ini dan milestone berikutnya dapat mengikuti timeline otomatis atau dipilih manual. Informasi PIC akan tampil pada header project dan report.</div>
  </div>`;
}

function renderInputDataPage(){
  const project = selectedProject();
  return `<main class="main">
    <div class="topbar">
      <div class="title"><h1>Pengelolaan Project</h1><p>Pilih area yang ingin diperbarui untuk project aktif.</p></div>
      <div class="actions"><button class="ghost-btn" onclick="state.page='dashboard';render()">Kembali ke Project</button></div>
    </div>
    ${isSupabaseSession() ? `<div class="notice subtle">Gunakan <strong>Kelola Project</strong> untuk membuat project baru, mengatur status project, dan mengelola akses client.</div>` : ''}
    <div class="input-choice-grid">
      ${canManageProjects() ? `<button class="input-choice-card" onclick="state.page='project-management';render()">
        <div class="choice-icon">▦</div>
        <strong>Kelola Project</strong>
        <span>Buat project baru, atur status project, dan kelola akses client dari satu tempat.</span>
      </button>` : ''}
      ${!isSupabaseSession() ? `<button class="input-choice-card" onclick="startNewProject()">
        <div class="choice-icon">＋</div>
        <strong>New Project</strong>
        <span>Buat project baru beserta timeline awal, dokumen, tim, dan akses client.</span>
      </button>` : ''}
      <button class="input-choice-card" onclick="state.page='edit-project';render()">
        <div class="choice-icon">✎</div>
        <strong>Edit Project</strong>
        <span>Perbarui project aktif, termasuk tim, task, timeline, dokumen, dan update project.</span>
      </button>
      <button class="input-choice-card" onclick="state.page='pm-settings';render()">
        <div class="choice-icon">⚙</div>
        <strong>Pengaturan Akses</strong>
        <span>Kelola password akses sesuai role dan kewenangan.</span>
      </button>
      ${!isSupabaseSession() ? `<button class="input-choice-card danger-choice" onclick="deleteCurrentProject()">
        <div class="choice-icon">🗑</div>
        <strong>Hapus Project</strong>
        <span>Hapus project lokal beserta akses yang terhubung.</span>
      </button>` : ''}
    </div>
    <div class="notice subtle">Project aktif saat ini: <strong>${project ? esc(project.code) + ' — ' + esc(project.name) : '-'}</strong></div>
  </main>`;
}

function renderNewProjectIntro(){
  const draft = ensureNewProjectDraft();
  const memberOptions = unique((draft.members || []).map(m => m.name));
  return `<main class="main">
    <div class="topbar">
      <div class="title"><h1>New Project</h1><p>Isi data project baru. Data yang dibuat langsung masuk ke dashboard dan password guest otomatis ditambahkan.</p></div>
      <div class="actions"><button class="ghost-btn" onclick="state.page='input-data';render()">Kembali</button></div>
    </div>

    <section class="editor-block">
      <div class="block-title-row"><h3>Informasi Project</h3><span class="editor-note">Password dipakai guest untuk akses dashboard project ini.</span></div>
      <div class="editor-grid editor-grid-2">
        <label><span>Nama Project</span><input value="${esc(draft.projectName)}" placeholder="Contoh: [Client] Audit IT" onchange="updateNewProjectField('projectName', this.value)"></label>
        <label><span>Password Client Project</span><input value="${esc(draft.password)}" placeholder="Password khusus untuk guest" onchange="updateNewProjectField('password', this.value)"></label>
      </div>
    </section>

    <section class="editor-block">
      <div class="block-title-row"><h3>Nama Anggota Tim</h3><button class="small-btn" onclick="addDraftRow('members')">+ Tambah Anggota</button></div>
      <div class="editor-table-wrap"><table class="editor-table"><thead><tr><th>Nama Anggota</th><th>Posisi / Peran</th><th>Aksi</th></tr></thead><tbody>
      ${draft.members.map((member, index) => `<tr>
        <td><input value="${esc(member.name)}" placeholder="Nama anggota" onchange="updateDraftRow('members', ${index}, 'name', this.value)"></td>
        <td><input value="${esc(member.role)}" placeholder="Contoh: Project Manager, Auditor, Pentester" onchange="updateDraftRow('members', ${index}, 'role', this.value)"></td>
        <td><button class="danger-btn" onclick="deleteDraftRow('members', ${index})">Hapus</button></td>
      </tr>`).join('')}
      </tbody></table></div>
    </section>

    <section class="editor-block">
      <div class="block-title-row"><h3><em>Timeline Project</em></h3><button class="small-btn" onclick="addDraftRow('timelinePlan')">+ Tambah Timeline</button></div>
      <div class="editor-table-wrap"><table class="editor-table"><thead><tr>
        <th>Nama Timeline</th><th>Tanggal Mulai</th><th>Tanggal Selesai</th><th>Aksi</th>
      </tr></thead><tbody>
      ${draft.timelinePlan.map((item, index) => `<tr>
        <td><input value="${esc(item.task)}" placeholder="Nama timeline" onchange="updateDraftRow('timelinePlan', ${index}, 'task', this.value)"></td>
        <td><input type="date" value="${esc(item.startDate)}" onchange="updateDraftRow('timelinePlan', ${index}, 'startDate', this.value)"></td>
        <td><input type="date" value="${esc(item.endDate)}" onchange="updateDraftRow('timelinePlan', ${index}, 'endDate', this.value)"></td>
        <td><button class="danger-btn" onclick="deleteDraftRow('timelinePlan', ${index})">Hapus</button></td>
      </tr>`).join('')}
      </tbody></table></div>
    </section>

    <section class="editor-block">
      <div class="block-title-row"><h3><em>Task Tracker</em></h3><button class="small-btn" onclick="addDraftRow('tasks')">+ Tambah Task</button></div>
      <div class="editor-table-wrap"><table class="editor-table"><thead><tr>
        <th>Nama Task</th><th>Status</th><th>Tanggal Mulai Aktual</th><th>Tanggal Selesai Aktual</th><th>Assigned To</th><th>Progress</th><th>Notes</th><th>Aksi</th>
      </tr></thead><tbody>
      ${draft.tasks.map((task, index) => `<tr>
        <td><input value="${esc(task.task)}" placeholder="Nama task realisasi" onchange="updateDraftRow('tasks', ${index}, 'task', this.value)"></td>
        <td><select onchange="updateDraftRow('tasks', ${index}, 'status', this.value)">${STATUS_OPTIONS.map(opt => `<option value="${esc(opt)}" ${normalize(opt) === normalize(task.status) ? 'selected' : ''}>${esc(opt)}</option>`).join('')}</select></td>
        <td><input type="date" value="${esc(task.startDate)}" onchange="updateDraftRow('tasks', ${index}, 'startDate', this.value)"></td>
        <td><input type="date" value="${esc(task.endDate)}" onchange="updateDraftRow('tasks', ${index}, 'endDate', this.value)"></td>
        <td><select onchange="updateDraftRow('tasks', ${index}, 'assignedTo', this.value)"><option value="">Pilih member</option>${memberOptions.map(name => `<option value="${esc(name)}" ${normalize(name) === normalize(task.assignedTo) ? 'selected' : ''}>${esc(name)}</option>`).join('')}</select></td>
        <td><input type="number" min="0" max="100" value="${pct(task.progress)}" onchange="updateDraftRow('tasks', ${index}, 'progress', this.value)"></td>
        <td><textarea placeholder="Catatan realisasi" onchange="updateDraftRow('tasks', ${index}, 'notes', this.value)">${esc(task.notes || '')}</textarea></td>
        <td><button class="danger-btn" onclick="deleteDraftRow('tasks', ${index})">Hapus</button></td>
      </tr>`).join('')}
      </tbody></table></div>
    </section>

    <section class="editor-block">
      <div class="block-title-row"><h3>Document List</h3><button class="small-btn" ${draft.noDocuments ? 'disabled' : ''} onclick="addDraftRow('documents')">+ Tambah Dokumen</button></div>
      <label class="check-row"><input type="checkbox" ${draft.noDocuments ? 'checked' : ''} onchange="toggleDraftNone('documents', this.checked)"><span>Tidak Ada</span></label>
      ${draft.noDocuments ? `<div class="empty compact"><strong>Document List tidak diisi.</strong><div>Bagian ini akan tampil kosong di dashboard.</div></div>` : `<div class="editor-table-wrap"><table class="editor-table"><thead><tr><th>Nama Dokumen</th><th>Tanggal</th><th>Deskripsi</th><th>Status</th><th>Aksi</th></tr></thead><tbody>
        ${draft.documents.map((doc, index) => `<tr>
          <td><input value="${esc(doc.name)}" placeholder="Nama dokumen" onchange="updateDraftRow('documents', ${index}, 'name', this.value)"></td>
          <td><input type="date" value="${esc(doc.date || '')}" onchange="updateDraftRow('documents', ${index}, 'date', this.value)"></td>
          <td><input value="${esc(doc.description)}" placeholder="Deskripsi" onchange="updateDraftRow('documents', ${index}, 'description', this.value)"></td>
          <td><select onchange="updateDraftRow('documents', ${index}, 'status', this.value)">${STATUS_OPTIONS.map(opt => `<option value="${esc(opt)}" ${normalize(opt) === normalize(doc.status) ? 'selected' : ''}>${esc(opt)}</option>`).join('')}</select></td>
          <td><button class="danger-btn" onclick="deleteDraftRow('documents', ${index})">Hapus</button></td>
        </tr>`).join('')}
      </tbody></table></div>`}
    </section>

    <section class="editor-block">
      <div class="block-title-row"><h3>Document Output</h3><button class="small-btn" ${draft.noOutputs ? 'disabled' : ''} onclick="addDraftRow('documentOutputs')">+ Tambah Output</button></div>
      <label class="check-row"><input type="checkbox" ${draft.noOutputs ? 'checked' : ''} onchange="toggleDraftNone('documentOutputs', this.checked)"><span>Tidak Ada</span></label>
      ${draft.noOutputs ? `<div class="empty compact"><strong>Document Output tidak diisi.</strong><div>Bagian ini akan tampil kosong di dashboard.</div></div>` : `<div class="editor-table-wrap"><table class="editor-table"><thead><tr><th>Nama Dokumen Output</th><th>Tanggal</th><th>Deskripsi</th><th>Status</th><th>Aksi</th></tr></thead><tbody>
        ${draft.documentOutputs.map((doc, index) => `<tr>
          <td><input value="${esc(doc.name)}" placeholder="Nama output" onchange="updateDraftRow('documentOutputs', ${index}, 'name', this.value)"></td>
          <td><input type="date" value="${esc(doc.date || '')}" onchange="updateDraftRow('documentOutputs', ${index}, 'date', this.value)"></td>
          <td><input value="${esc(doc.description)}" placeholder="Deskripsi" onchange="updateDraftRow('documentOutputs', ${index}, 'description', this.value)"></td>
          <td><select onchange="updateDraftRow('documentOutputs', ${index}, 'status', this.value)">${STATUS_OPTIONS.map(opt => `<option value="${esc(opt)}" ${normalize(opt) === normalize(doc.status) ? 'selected' : ''}>${esc(opt)}</option>`).join('')}</select></td>
          <td><button class="danger-btn" onclick="deleteDraftRow('documentOutputs', ${index})">Hapus</button></td>
        </tr>`).join('')}
      </tbody></table></div>`}
    </section>

    <div class="form-actions">
      <button class="primary-btn" onclick="createProjectFromDraft()">Create Project</button>
      <button class="ghost-btn" onclick="state.page='input-data';render()">Batal</button>
    </div>
  </main>`;
}

function defaultNewProjectDraft(){
  return {
    projectName: '',
    password: '',
    members: [{name:'', role:''}],
    timelinePlan: [{task:'', startDate:'', endDate:''}],
    tasks: [{task:'', status:'Not started', startDate:'', endDate:'', assignedTo:'', progress:0, notes:''}],
    noDocuments: false,
    documents: [{name:'', description:'', status:'Not started', date:''}],
    noOutputs: false,
    documentOutputs: [{name:'', description:'', status:'Not started', date:''}]
  };
}

function ensureNewProjectDraft(){
  if(!state.newProjectDraft) state.newProjectDraft = defaultNewProjectDraft();
  return state.newProjectDraft;
}

function startNewProject(){
  state.newProjectDraft = defaultNewProjectDraft();
  state.page = 'new-project';
  render();
}

function updateNewProjectField(field, value){
  const draft = ensureNewProjectDraft();
  draft[field] = value;
}

function draftRowTemplate(type){
  if(type === 'members') return {name:'', role:''};
  if(type === 'timelinePlan') return {task:'', startDate:'', endDate:''};
  if(type === 'tasks') return {task:'', status:'Not started', startDate:'', endDate:'', assignedTo:'', progress:0, notes:''};
  return {name:'', description:'', status:'Not started', date:''};
}

function addDraftRow(type){
  const draft = ensureNewProjectDraft();
  draft[type].push(draftRowTemplate(type));
  render();
}

function updateDraftRow(type, index, field, value){
  const draft = ensureNewProjectDraft();
  if(!draft[type]?.[index]) return;
  draft[type][index][field] = field === 'progress' ? Math.max(0, Math.min(100, Number(value) || 0)) : value;
  if(type === 'members') render();
}

function deleteDraftRow(type, index){
  const draft = ensureNewProjectDraft();
  if(!draft[type]) return;
  draft[type].splice(index, 1);
  if(!draft[type].length) draft[type].push(draftRowTemplate(type));
  render();
}

function toggleDraftNone(type, checked){
  const draft = ensureNewProjectDraft();
  if(type === 'documents'){
    draft.noDocuments = checked;
    if(checked) draft.documents = [];
    else if(!draft.documents.length) draft.documents = [draftRowTemplate('documents')];
  }
  if(type === 'documentOutputs'){
    draft.noOutputs = checked;
    if(checked) draft.documentOutputs = [];
    else if(!draft.documentOutputs.length) draft.documentOutputs = [draftRowTemplate('documentOutputs')];
  }
  render();
}

function nextProjectNumber(){
  const emptySlot = state.data.projects.find(project => {
    const n = projectNumber(project);
    return n >= 1 && n <= 25 && !isProjectFilled(project);
  });
  if(emptySlot) return projectNumber(emptySlot);
  const nums = state.data.projects.map(p => projectNumber(p)).filter(Boolean);
  let n = nums.length ? Math.max(...nums) + 1 : state.data.projects.length + 1;
  while(state.data.projects.some(p => p.id === `project-${n}`)) n += 1;
  return n;
}

function createProjectFromDraft(){
  if(isSupabaseSession()){
    alert('Penambahan project produksi dikelola melalui database/back-office agar akses client tetap aman.');
    return;
  }
  const draft = ensureNewProjectDraft();
  const projectName = String(draft.projectName || '').trim();
  const password = String(draft.password || '').trim();
  if(!projectName){ alert('Nama Project wajib diisi.'); return; }
  if(!password){ alert('Password guest wajib diisi.'); return; }
  if(state.data.passwords[password]){ alert('Password sudah digunakan. Gunakan password lain untuk guest project ini.'); return; }

  const members = normalizeMembers(draft.members);
  const timelinePlan = normalizeTimelineItems(draft.timelinePlan || []);
  const tasks = (draft.tasks || [])
    .map(t => ({...t, progress: pct(t.progress)}))
    .filter(t => t.task || t.startDate || t.endDate || t.assignedTo || t.notes);
  const documents = draft.noDocuments ? [] : normalizeDocumentItems((draft.documents || []).filter(d => d.name || d.description || d.date));
  const documentOutputs = draft.noOutputs ? [] : normalizeDocumentItems((draft.documentOutputs || []).filter(d => d.name || d.description || d.date));

  const dates = [...timelinePlan.flatMap(t => [t.startDate, t.endDate]), ...tasks.flatMap(t => [t.startDate, t.endDate])].filter(Boolean).sort();
  const startDate = dates[0] || '';
  const endDate = dates[dates.length - 1] || '';
  const num = nextProjectNumber();
  const projectId = `project-${num}`;
  const code = defaultProjectCode(num);

  const project = {
    id: projectId,
    code,
    name: projectName,
    startDate,
    endDate,
    timelineColor: '',
    members,
    timelinePlan,
    tasks,
    documents,
    documentOutputs,
    meetings: []
  };

  const existingIndex = state.data.projects.findIndex(item => item.id === projectId);
  Object.entries(state.data.passwords || {}).forEach(([savedPassword, rule]) => {
    if(rule?.role === 'guest' && Array.isArray(rule.projectIds) && rule.projectIds.includes(projectId)){
      delete state.data.passwords[savedPassword];
    }
  });
  if(existingIndex >= 0) state.data.projects[existingIndex] = project;
  else state.data.projects.push(project);
  state.data.passwords[password] = { role:'guest', label:`Guest ${code}`, projectIds:[projectId], canEdit:false };
  ensureEmptyProjectSlots(state.data);
  persistData();
  state.selectedProjectId = projectId;
  state.activeTab = 'summary';
  state.tableSearch = '';
  state.newProjectDraft = null;
  state.page = 'dashboard';
  render();
}


function renderTimelinePhasesEditor(item, itemIndex){
  const phases = item.phases || [];
  const phaseRows = phases.length ? phases.map((phase, phaseIndex) => `
    <div class="timeline-phase-row">
      <input class="phase-name" value="${esc(phase.label || '')}" placeholder="Nama fase" onchange="updateTimelinePhase(${itemIndex}, ${phaseIndex}, 'label', this.value)">
      <select onchange="updateTimelinePhase(${itemIndex}, ${phaseIndex}, 'type', this.value)">${renderTimelineTypeOptions(phase.type || item.type)}</select>
      <input type="date" value="${esc(phase.startDate || '')}" onchange="updateTimelinePhase(${itemIndex}, ${phaseIndex}, 'startDate', this.value)">
      <input type="date" value="${esc(phase.endDate || '')}" onchange="updateTimelinePhase(${itemIndex}, ${phaseIndex}, 'endDate', this.value)">
      <button class="danger-btn tiny-btn" onclick="deleteTimelinePhase(${itemIndex}, ${phaseIndex})">Hapus</button>
    </div>`).join('') : `<div class="timeline-phase-empty">Belum ada detail fase. Warna bar mengikuti <strong>Tipe Utama</strong>.</div>`;
  return `<div class="timeline-phase-editor">
    <div class="timeline-phase-head"><span>Detail Fase</span><button class="small-btn compact-btn" onclick="addTimelinePhase(${itemIndex})">+ Tambah Fase</button></div>
    ${phaseRows}
  </div>`;
}

function renderEditProjectPage(){
  const project = selectedProject();
  if(!project) return `<main class="main">${renderEmpty('Project tidak ditemukan.', 'Pilih project terlebih dahulu.')}</main>`;
  return `<main class="main">
    ${projectEditorHeader(project)}

    <section class="editor-block">
      <div class="block-title-row"><h3>Nama Anggota Tim</h3><button class="small-btn" onclick="addMember()">+ Tambah Anggota</button></div>
      <div class="editor-table-wrap"><table class="editor-table"><thead><tr>
        <th>Nama Anggota</th><th>Posisi / Peran</th><th>Aksi</th>
      </tr></thead><tbody>
      ${project.members.length ? project.members.map((member, index) => `<tr>
        <td><input value="${esc(memberName(member))}" placeholder="Nama anggota" onchange="updateMember(${index}, 'name', this.value)"></td>
        <td><input value="${esc(memberRole(member))}" placeholder="Contoh: Project Manager, Auditor, Pentester" onchange="updateMember(${index}, 'role', this.value)"></td>
        <td><button class="danger-btn" onclick="deleteMember(${index})">Hapus</button></td>
      </tr>`).join('') : `<tr><td colspan="3" class="center-muted">Belum ada anggota tim.</td></tr>`}
      </tbody></table></div>
    </section>

    <section class="editor-block">
      <div class="block-title-row"><h3><em>Timeline Project</em></h3><button class="small-btn" onclick="addTimelinePlan()">+ Tambah Timeline</button></div>
      <p class="editor-help-text">Gunakan <strong>Tipe Utama</strong> untuk mengubah warna/status bar timeline. Jika timeline memiliki detail fase, warna bar mengikuti tipe pada masing-masing fase.</p>
      <div class="editor-table-wrap"><table class="editor-table timeline-editor-table"><thead><tr>
        <th>Nama Timeline</th><th>Tipe Utama</th><th>Tanggal Mulai</th><th>Tanggal Selesai</th><th>Detail Fase</th><th>Aksi</th>
      </tr></thead><tbody>
      ${project.timelinePlan.length ? project.timelinePlan.map((item, index) => `<tr>
        <td><input value="${esc(item.task)}" onchange="updateTimelinePlan(${index}, 'task', this.value)"></td>
        <td><select onchange="updateTimelinePlanType(${index}, this.value)">${renderTimelineTypeOptions(item.type)}</select></td>
        <td><input type="date" value="${esc(item.startDate)}" onchange="updateTimelinePlan(${index}, 'startDate', this.value)"></td>
        <td><input type="date" value="${esc(item.endDate)}" onchange="updateTimelinePlan(${index}, 'endDate', this.value)"></td>
        <td>${renderTimelinePhasesEditor(item, index)}</td>
        <td><button class="danger-btn" onclick="deleteTimelinePlan(${index})">Hapus</button></td>
      </tr>`).join('') : `<tr><td colspan="6" class="center-muted">Belum ada timeline project.</td></tr>`}
      </tbody></table></div>
    </section>

    <section class="editor-block">
      <div class="block-title-row"><h3><em>Task Tracker</em></h3><span class="editor-note">Otomatis mengikuti <em>Timeline Project</em></span></div>
      <p class="editor-help-text">Daftar task dibuat dari <strong>Timeline Project</strong>. Ubah nama/tambah/hapus kegiatan di Timeline Project. Bagian ini hanya untuk update realisasi: status, tanggal aktual, PIC, progress, dan catatan tindak lanjut.</p>
      <div class="editor-table-wrap"><table class="editor-table task-sync-table"><thead><tr>
        <th class="narrow">No</th><th>Task dari Timeline</th><th>Status</th><th>Tanggal Mulai Aktual</th><th>Tanggal Selesai Aktual</th><th>Assigned To</th><th>Progress</th><th>Notes / Reason / Next Action</th>
      </tr></thead><tbody>
      ${syncTasksFromTimeline(project).length ? project.tasks.map((task, index) => `<tr>
        <td class="col-no">${index + 1}</td>
        <td><input class="readonly-input" value="${esc(task.task)}" readonly title="Ubah nama task dari Timeline Project"></td>
        <td><select onchange="updateTask(${index}, 'status', this.value)">${STATUS_OPTIONS.map(opt => `<option value="${esc(opt)}" ${normalize(opt) === normalize(task.status) ? 'selected' : ''}>${esc(opt)}</option>`).join('')}</select></td>
        <td><input type="date" value="${esc(task.startDate)}" onchange="updateTask(${index}, 'startDate', this.value)"></td>
        <td><input type="date" value="${esc(task.endDate)}" onchange="updateTask(${index}, 'endDate', this.value)"></td>
        <td><select onchange="updateTask(${index}, 'assignedTo', this.value)"><option value="">Pilih member</option>${getMemberNames(project).map(name => `<option value="${esc(name)}" ${normalize(name) === normalize(task.assignedTo) ? 'selected' : ''}>${esc(name)}</option>`).join('')}</select></td>
        <td><input type="number" min="0" max="100" value="${pct(task.progress)}" onchange="updateTask(${index}, 'progress', this.value)"></td>
        <td><textarea placeholder="Alasan delay, update progress, blocker, atau next action" onchange="updateTask(${index}, 'notes', this.value)">${esc(task.notes || '')}</textarea></td>
      </tr>`).join('') : `<tr><td colspan="8" class="center-muted">Belum ada task. Tambahkan kegiatan di Timeline Project terlebih dahulu.</td></tr>`}
      </tbody></table></div>
    </section>

    <section class="editor-block">
      <div class="block-title-row"><h3>Document List</h3><button class="small-btn" onclick="addDocument()">+ Tambah Dokumen</button></div>
      <div class="editor-table-wrap"><table class="editor-table"><thead><tr>
        <th class="narrow">No</th><th>Nama Dokumen</th><th>Tanggal</th><th>Deskripsi</th><th>Status</th><th>Review</th><th>Aksi</th>
      </tr></thead><tbody>
      ${project.documents.length ? project.documents.map((doc, index) => `<tr>
        <td class="col-no">${index + 1}</td>
        <td><input value="${esc(doc.name)}" onchange="updateDocument(${index}, 'name', this.value)"></td>
        <td><input type="date" value="${esc(doc.date || '')}" onchange="updateDocument(${index}, 'date', this.value)"></td>
        <td><input value="${esc(doc.description || '')}" onchange="updateDocument(${index}, 'description', this.value)"></td>
        <td><select onchange="updateDocument(${index}, 'status', this.value)">${STATUS_OPTIONS.map(opt => `<option value="${esc(opt)}" ${normalize(opt) === normalize(doc.status) ? 'selected' : ''}>${esc(opt)}</option>`).join('')}</select></td>
        <td><select onchange="updateDocument(${index}, 'reviewStatus', this.value)"><option value="" ${!doc.reviewStatus ? 'selected' : ''}>-</option><option value="In Review" ${normalize(doc.reviewStatus) === 'in review' ? 'selected' : ''}>In Review</option></select></td>
        <td><button class="danger-btn" onclick="deleteDocument(${index})">Hapus</button></td>
      </tr>`).join('') : `<tr><td colspan="7" class="center-muted">Belum ada dokumen.</td></tr>`}
      </tbody></table></div>
    </section>

    <section class="editor-block">
      <div class="block-title-row"><h3>Document Output</h3><button class="small-btn" onclick="addDocumentOutput()">+ Tambah Output</button></div>
      <div class="editor-table-wrap"><table class="editor-table"><thead><tr>
        <th class="narrow">No</th><th>Nama Dokumen Output</th><th>Tanggal</th><th>Deskripsi</th><th>Status</th><th>Review</th><th>Aksi</th>
      </tr></thead><tbody>
      ${project.documentOutputs.length ? project.documentOutputs.map((doc, index) => `<tr>
        <td class="col-no">${index + 1}</td>
        <td><input value="${esc(doc.name)}" onchange="updateDocumentOutput(${index}, 'name', this.value)"></td>
        <td><input type="date" value="${esc(doc.date || '')}" onchange="updateDocumentOutput(${index}, 'date', this.value)"></td>
        <td><input value="${esc(doc.description || '')}" onchange="updateDocumentOutput(${index}, 'description', this.value)"></td>
        <td><select onchange="updateDocumentOutput(${index}, 'status', this.value)">${STATUS_OPTIONS.map(opt => `<option value="${esc(opt)}" ${normalize(opt) === normalize(doc.status) ? 'selected' : ''}>${esc(opt)}</option>`).join('')}</select></td>
        <td><select onchange="updateDocumentOutput(${index}, 'reviewStatus', this.value)"><option value="" ${!doc.reviewStatus ? 'selected' : ''}>-</option><option value="In Review" ${normalize(doc.reviewStatus) === 'in review' ? 'selected' : ''}>In Review</option></select></td>
        <td><button class="danger-btn" onclick="deleteDocumentOutput(${index})">Hapus</button></td>
      </tr>`).join('') : `<tr><td colspan="7" class="center-muted">Tidak ada dokumen output.</td></tr>`}
      </tbody></table></div>
    </section>


    <section class="editor-block">
      <div class="block-title-row"><h3>Catatan <em>Meeting</em> / <em>Update Log</em></h3><button class="small-btn" onclick="addMeeting()">+ Tambah Update</button></div>
      <div class="editor-table-wrap"><table class="editor-table"><thead><tr>
        <th class="narrow">No</th><th>Tanggal</th><th>Type</th><th>Internal Update</th><th>Internal Action</th><th>Client Update</th><th>Client Action</th><th>Tampil ke Client</th><th>Aksi</th>
      </tr></thead><tbody>
      ${project.meetings.length ? project.meetings.map((item, index) => `<tr>
        <td class="col-no">${index + 1}</td>
        <td><input type="date" value="${esc(item.date)}" onchange="updateMeeting(${index}, 'date', this.value)"></td>
        <td><select onchange="updateMeeting(${index}, 'type', this.value)"><option value="" ${!item.type ? 'selected' : ''}>Auto</option><option value="Update" ${item.type === 'Update' ? 'selected' : ''}>Update</option><option value="Action Item" ${item.type === 'Action Item' ? 'selected' : ''}>Action Item</option><option value="Decision" ${item.type === 'Decision' ? 'selected' : ''}>Decision</option><option value="Risk / Issue" ${item.type === 'Risk / Issue' ? 'selected' : ''}>Risk / Issue</option></select></td>
        <td><textarea onchange="updateMeeting(${index}, 'note', this.value)">${esc(item.note || '')}</textarea></td>
        <td><textarea onchange="updateMeeting(${index}, 'action', this.value)">${esc(item.action || '')}</textarea></td>
        <td><textarea placeholder="Ringkasan untuk client" onchange="updateMeeting(${index}, 'clientNote', this.value)">${esc(item.clientNote || '')}</textarea></td>
        <td><textarea placeholder="Tindak lanjut untuk client" onchange="updateMeeting(${index}, 'clientAction', this.value)">${esc(item.clientAction || '')}</textarea></td>
        <td><label class="inline-check"><input type="checkbox" ${item.isClientVisible !== false ? 'checked' : ''} onchange="updateMeeting(${index}, 'isClientVisible', this.checked)"> Ya</label></td>
        <td><button class="danger-btn" onclick="deleteMeeting(${index})">Hapus</button></td>
      </tr>`).join('') : `<tr><td colspan="9" class="center-muted">Belum ada update log.</td></tr>`}
      </tbody></table></div>
    </section>

    <div class="footer-note">Klik <strong>Simpan</strong> untuk menyimpan perubahan pada ruang data project.</div>
  </main>`;
}


async function saveProjectManual(event){
  if(event && typeof event.preventDefault === 'function') event.preventDefault();
  if(state.projectSaveBusy) return;
  if(state.session?.dataSource === 'supabase'){
    await saveProjectToSupabase();
    return;
  }
  persistData();
  state.projectSaveMessage = { type: 'success', text: 'Data project berhasil disimpan.' };
  render();
}

function nullDate(value){ return toISODate(value) || null; }
function cleanText(value){ return String(value ?? '').trim(); }

async function replaceSupabaseRows(client, table, projectId, rows){
  const { error: deleteError } = await client.from(table).delete().eq('project_id', projectId);
  if(deleteError) throw deleteError;
  if(rows.length){
    const { error: insertError } = await client.from(table).insert(rows);
    if(insertError) throw insertError;
  }
}

async function saveProjectToSupabase(){
  let client;
  try{
    client = getSupabaseClient();
  }catch(error){
    state.projectSaveMessage = { type: 'error', text: error.message || 'Koneksi layanan belum siap. Muat ulang halaman lalu coba kembali.' };
    render();
    return;
  }
  const project = selectedProject();
  if(!client || !project?.supabaseId){
    state.projectSaveMessage = { type: 'error', text: 'Project belum tersinkron. Muat ulang halaman lalu coba kembali.' };
    render();
    return;
  }
  if(!state.session?.canEdit){
    state.projectSaveMessage = { type: 'error', text: 'Akses edit hanya untuk Project Manager.' };
    render();
    return;
  }
  if(state.projectSaveBusy) return;
  state.projectSaveBusy = true;
  state.projectSaveMessage = { type: 'info', text: 'Menyimpan perubahan project...' };
  render();
  try{
    const projectId = project.supabaseId;
    syncTasksFromTimeline(project);
    const { error: projectError } = await client.from('projects').update({
      code: cleanText(project.code),
      name: cleanText(project.name),
      start_date: nullDate(project.startDate),
      end_date: nullDate(project.endDate),
      next_milestone_task: cleanText(project.nextMilestoneTask || '') || null,
      current_phase_task: cleanText(project.currentPhaseTask || '') || null,
      pic_cywa: cleanText(project.picCywa || '') || null,
      pic_client: cleanText(project.picClient || '') || null,
      updated_at: new Date().toISOString()
    }).eq('id', projectId);
    if(projectError) throw projectError;

    await replaceSupabaseRows(client, 'project_members', projectId, (project.members || []).map((member, index) => ({
      project_id: projectId,
      name: cleanText(memberName(member)) || '-',
      role: cleanText(memberRole(member)),
      sort_order: index + 1
    })).filter(row => row.name !== '-'));

    const existingTimeline = await client.from('timeline_items').select('id').eq('project_id', projectId);
    if(existingTimeline.error) throw existingTimeline.error;
    const timelineIds = (existingTimeline.data || []).map(row => row.id);
    if(timelineIds.length){
      try{ await client.from('timeline_phases').delete().in('timeline_item_id', timelineIds); }catch(err){ console.warn('timeline_phases delete skipped:', err.message); }
    }
    const { error: timelineDeleteError } = await client.from('timeline_items').delete().eq('project_id', projectId);
    if(timelineDeleteError) throw timelineDeleteError;
    const timelineRows = (project.timelinePlan || []).map((item, index) => ({
      project_id: projectId,
      name: cleanText(item.task) || `Timeline ${index + 1}`,
      start_date: nullDate(item.startDate),
      end_date: nullDate(item.endDate),
      type: cleanText(item.type || 'assessment') || 'assessment',
      sort_order: index + 1
    })).filter(row => row.name);
    let insertedTimeline = [];
    if(timelineRows.length){
      const { data, error } = await client.from('timeline_items').insert(timelineRows).select('id,name,sort_order');
      if(error) throw error;
      insertedTimeline = data || [];
    }
    const phaseRows = [];
    (project.timelinePlan || []).forEach((item, itemIndex) => {
      const timeline = insertedTimeline.find(row => Number(row.sort_order) === itemIndex + 1);
      if(!timeline || !(item.phases || []).length) return;
      (item.phases || []).forEach((phase, phaseIndex) => {
        phaseRows.push({
          timeline_item_id: timeline.id,
          label: cleanText(phase.label || item.task || `Phase ${phaseIndex + 1}`),
          type: cleanText(phase.type || item.type || 'assessment') || 'assessment',
          start_date: nullDate(phase.startDate || item.startDate),
          end_date: nullDate(phase.endDate || item.endDate),
          sort_order: phaseIndex + 1
        });
      });
    });
    if(phaseRows.length){
      const { error } = await client.from('timeline_phases').insert(phaseRows);
      if(error) throw error;
    }

    await replaceSupabaseRows(client, 'tasks', projectId, (project.tasks || []).map((task, index) => ({
      project_id: projectId,
      task: cleanText(task.task) || `Task ${index + 1}`,
      status: cleanText(task.status || 'Not started') || 'Not started',
      start_date_actual: nullDate(task.startDate),
      end_date_actual: nullDate(task.endDate),
      assigned_to: cleanText(task.assignedTo),
      progress: Math.max(0, Math.min(100, pct(task.progress))),
      notes: cleanText(task.notes),
      sort_order: index + 1,
      updated_at: new Date().toISOString()
    })).filter(row => row.task));

    await replaceSupabaseRows(client, 'documents', projectId, (project.documents || []).map((doc, index) => ({
      project_id: projectId,
      doc_no: index + 1,
      date: nullDate(doc.date),
      name: cleanText(doc.name) || `Document ${index + 1}`,
      description: cleanText(doc.description),
      status: cleanText(doc.status || 'Not started') || 'Not started',
      review_status: cleanText(doc.reviewStatus),
      sort_order: index + 1,
      updated_at: new Date().toISOString()
    })).filter(row => row.name));

    await replaceSupabaseRows(client, 'document_outputs', projectId, (project.documentOutputs || []).map((doc, index) => ({
      project_id: projectId,
      output_no: index + 1,
      date: nullDate(doc.date),
      name: cleanText(doc.name) || `Output ${index + 1}`,
      description: cleanText(doc.description),
      status: cleanText(doc.status || 'Not started') || 'Not started',
      sort_order: index + 1,
      updated_at: new Date().toISOString()
    })).filter(row => row.name));

    await replaceSupabaseRows(client, 'meeting_logs', projectId, (project.meetings || []).map((meeting, index) => ({
      project_id: projectId,
      date: nullDate(meeting.date),
      type: ['Update','Action Item','Decision','Risk / Issue'].includes(meeting.type) ? meeting.type : 'Update',
      note: cleanText(meeting.note),
      action: cleanText(meeting.action),
      client_note: cleanText(meeting.clientNote),
      client_action: cleanText(meeting.clientAction),
      is_client_visible: meeting.isClientVisible !== false,
      sort_order: index + 1,
      updated_at: new Date().toISOString()
    })).filter(row => row.date || row.note || row.action));

    await logActivity('update_project_data', project, 'projects', projectId, { updated_sections: ['timeline', 'tasks', 'documents', 'project_updates'] });

    const selectedId = state.selectedProjectId;
    state.data = await fetchSupabaseDashboardData(client);
    state.selectedProjectId = selectedId;
    state.page = 'edit-project';
    state.projectSaveMessage = { type: 'success', text: 'Data berhasil disimpan. Dashboard sudah disinkronkan.' };
    persistData();
  }catch(error){
    console.error('Supabase save failed:', error);
    state.projectSaveMessage = { type: 'error', text: `Gagal menyimpan data: ${error.message || error}. Muat ulang halaman lalu coba kembali.` };
  }finally{
    state.projectSaveBusy = false;
    render();
  }
}

function deleteCurrentProject(){
  if(isSupabaseSession()){
    alert('Penghapusan project produksi dikelola melalui database/back-office agar akses client tetap aman.');
    return;
  }
  const project = selectedProject();
  if(!project){ alert('Tidak ada project yang dipilih.'); return; }
  const name = project.name || project.code || 'project ini';
  const firstConfirm = confirm(`Hapus project "${name}"?

Data project, timeline, task tracker, document list, document output, meeting log, dan akses guest project ini akan dihapus dari ruang kerja saat ini.`);
  if(!firstConfirm) return;
  const typed = prompt(`Ketik HAPUS untuk konfirmasi penghapusan project "${name}".`);
  if(String(typed || '').trim().toUpperCase() !== 'HAPUS') return;

  const n = projectNumber(project);
  if(n >= 1 && n <= 25){
    const idx = state.data.projects.findIndex(item => item.id === project.id);
    if(idx >= 0) state.data.projects[idx] = createEmptyProjectSlot(n);
  } else {
    state.data.projects = state.data.projects.filter(item => item.id !== project.id);
  }
  removeGuestPasswordsForProject(project.id);
  ensureEmptyProjectSlots(state.data);

  const allowed = getAllowedProjects();
  state.selectedProjectId = allowed[0]?.id || null;
  state.activeTab = 'summary';
  state.tableSearch = '';
  state.page = 'dashboard';
  persistData();
  alert(`Project "${name}" berhasil dihapus.`);
  render();
}

function currentProjectIndex(){
  return state.data.projects.findIndex(p => p.id === state.selectedProjectId);
}

function saveProjectChange(){
  persistData();
  render();
}

function updateProjectMeta(field, value){
  const idx = currentProjectIndex();
  if(idx < 0) return;
  state.data.projects[idx][field] = value;
  saveProjectChange();
}

function updateMember(index, field, value){
  const project = selectedProject();
  if(!project?.members[index]) return;
  project.members[index][field] = value;
  saveProjectChange();
}

function addMember(){
  const project = selectedProject();
  if(!project) return;
  project.members.push({name:'', role:''});
  saveProjectChange();
}

function deleteMember(index){
  if(!confirm('Hapus anggota ini?')) return;
  const project = selectedProject();
  if(!project) return;
  project.members.splice(index, 1);
  saveProjectChange();
}

function updateMembers(value){
  const idx = currentProjectIndex();
  if(idx < 0) return;
  state.data.projects[idx].members = normalizeMembers(String(value || '').split(',').map(name => ({name, role:''})));
  saveProjectChange();
}


function syncTasksFromTimeline(project){
  if(!project) return [];
  const timelineItems = normalizeTimelineItems(project.timelinePlan || [])
    .filter(item => cleanText(item.task));
  const existingTasks = Array.isArray(project.tasks) ? project.tasks : [];
  const existingByName = new Map();
  existingTasks.forEach(task => {
    const key = normalize(task?.task || '');
    if(key && !existingByName.has(key)) existingByName.set(key, task);
  });
  project.tasks = timelineItems.map((item, index) => {
    const name = cleanText(item.task) || `Timeline ${index + 1}`;
    const previous = existingTasks[index] || existingByName.get(normalize(name)) || {};
    return {
      task: name,
      status: previous.status || 'Not started',
      startDate: previous.startDate || '',
      endDate: previous.endDate || '',
      assignedTo: previous.assignedTo || '',
      progress: Math.max(0, Math.min(100, pct(previous.progress))),
      notes: previous.notes || ''
    };
  });
  return project.tasks;
}

function updateTimelinePlan(index, field, value){
  const project = selectedProject();
  if(!project?.timelinePlan[index]) return;
  if(field === 'type') value = normalizeTimelineType(value);
  project.timelinePlan[index][field] = value;
  if(['task','startDate','endDate'].includes(field)) syncTasksFromTimeline(project);
  saveProjectChange();
}

function updateTimelinePlanType(index, value){
  const project = selectedProject();
  const item = project?.timelinePlan[index];
  if(!item) return;
  const type = normalizeTimelineType(value);
  item.type = type;
  // Jika detail fase sudah dibuat, samakan semua fase agar perubahan tipe langsung terlihat pada visual timeline.
  // Setelah itu, PM tetap bisa menyesuaikan masing-masing fase secara manual.
  if((item.phases || []).length){
    item.phases = item.phases.map(phase => ({ ...phase, type }));
  }
  syncTasksFromTimeline(project);
  saveProjectChange();
}

function addTimelinePlan(){
  const project = selectedProject();
  if(!project) return;
  project.timelinePlan.push({ task:'', startDate:'', endDate:'', type:'assessment', phases:[] });
  syncTasksFromTimeline(project);
  saveProjectChange();
}

function addTimelinePhase(itemIndex){
  const project = selectedProject();
  const item = project?.timelinePlan[itemIndex];
  if(!item) return;
  item.phases ||= [];
  item.phases.push({
    label: item.task || `Fase ${item.phases.length + 1}`,
    type: normalizeTimelineType(item.type || 'assessment'),
    startDate: item.startDate || '',
    endDate: item.endDate || ''
  });
  saveProjectChange();
}

function updateTimelinePhase(itemIndex, phaseIndex, field, value){
  const project = selectedProject();
  const phase = project?.timelinePlan[itemIndex]?.phases?.[phaseIndex];
  if(!phase) return;
  phase[field] = field === 'type' ? normalizeTimelineType(value) : value;
  saveProjectChange();
}

function deleteTimelinePhase(itemIndex, phaseIndex){
  if(!confirm('Hapus fase timeline ini?')) return;
  const project = selectedProject();
  const phases = project?.timelinePlan[itemIndex]?.phases;
  if(!phases) return;
  phases.splice(phaseIndex, 1);
  saveProjectChange();
}

function deleteTimelinePlan(index){
  if(!confirm('Hapus timeline ini? Task Tracker yang terkait juga akan dihapus dari daftar update realisasi.')) return;
  const project = selectedProject();
  if(!project) return;
  project.timelinePlan.splice(index, 1);
  syncTasksFromTimeline(project);
  saveProjectChange();
}

function updateTask(index, field, value){
  const project = selectedProject();
  if(!project?.tasks[index]) return;
  project.tasks[index][field] = field === 'progress' ? Math.max(0, Math.min(100, Number(value) || 0)) : value;
  if(field === 'assignedTo' && value && !getMemberNames(project).some(name => normalize(name) === normalize(value))){
    project.members.push({name:value, role:''});
  }
  saveProjectChange();
}

function addTask(){
  const project = selectedProject();
  if(!project) return;
  project.tasks.push({ task:'', status:'Not started', startDate:'', endDate:'', assignedTo:'', progress:0, notes:'' });
  saveProjectChange();
}

function deleteTask(index){
  if(!confirm('Hapus task ini?')) return;
  const project = selectedProject();
  if(!project) return;
  project.tasks.splice(index, 1);
  saveProjectChange();
}

function updateDocument(index, field, value){
  const project = selectedProject();
  if(!project?.documents[index]) return;
  project.documents[index][field] = value;
  saveProjectChange();
}

function addDocument(){
  const project = selectedProject();
  if(!project) return;
  project.documents.push({ id:`doc-${Date.now()}`, name:'', description:'', status:'Not started', date:'' });
  saveProjectChange();
}

function deleteDocument(index){
  if(!confirm('Hapus dokumen ini?')) return;
  const project = selectedProject();
  if(!project) return;
  project.documents.splice(index, 1);
  saveProjectChange();
}

function updateDocumentOutput(index, field, value){
  const project = selectedProject();
  if(!project?.documentOutputs[index]) return;
  project.documentOutputs[index][field] = value;
  saveProjectChange();
}

function addDocumentOutput(){
  const project = selectedProject();
  if(!project) return;
  project.documentOutputs.push({ id:`output-${Date.now()}`, name:'', description:'', status:'Not started', date:'' });
  saveProjectChange();
}

function deleteDocumentOutput(index){
  if(!confirm('Hapus dokumen output ini?')) return;
  const project = selectedProject();
  if(!project) return;
  project.documentOutputs.splice(index, 1);
  saveProjectChange();
}


function updateMeeting(index, field, value){
  const project = selectedProject();
  if(!project?.meetings[index]) return;
  project.meetings[index][field] = value;
  saveProjectChange();
}

function addMeeting(){
  const project = selectedProject();
  if(!project) return;
  project.meetings.push({ id:`meeting-${Date.now()}`, date:'', type:'', note:'', action:'', clientNote:'', clientAction:'', isClientVisible:true });
  saveProjectChange();
}

function deleteMeeting(index){
  if(!confirm('Hapus update log ini?')) return;
  const project = selectedProject();
  if(!project) return;
  project.meetings.splice(index, 1);
  saveProjectChange();
}


function renderPmPengaturansPage(){
  if(!canManagePasswords()) return renderDashboardMain();
  const targets = getPasswordAdminTargets();
  const logs = state.passwordAuditLogs;
  return `<main class="main">
    <div class="topbar">
      <div class="title"><h1>Pengaturan Akses</h1><p>Atur password baru untuk akses dashboard. Password lama dan password aktif tidak ditampilkan.</p></div>
      <div class="actions"><button class="ghost-btn" onclick="state.page='dashboard';render()">Kembali ke Project</button></div>
    </div>

    <section class="editor-block">
      <div class="block-title-row"><h3>Set Password Baru</h3><span class="editor-note">Password dapat diperbarui tanpa menampilkan password lama.</span></div>
      <div class="editor-table-wrap"><table class="editor-table settings-table"><thead><tr>
        <th>Akun</th><th>Identitas Akses</th><th>Cakupan</th><th>Password Saat Ini</th><th>Password Baru</th><th>Aksi</th>
      </tr></thead><tbody>
        ${targets.map(target => `<tr>
          <td><strong>${esc(target.label)}</strong></td>
          <td><code>${esc(target.email)}</code></td>
          <td>${esc(target.scope)}</td>
          <td><span class="center-muted">Tidak ditampilkan</span></td>
          <td><input id="password-target-${esc(target.key)}" type="password" autocomplete="new-password" placeholder="Masukkan password baru"></td>
          <td><button class="primary-btn small-primary" onclick="resetAccessPassword('${esc(target.key)}')">Set Password</button></td>
        </tr>`).join('')}
      </tbody></table></div>
      <div class="footer-note">Password aktif tidak disimpan sebagai teks terbaca dan tidak pernah ditampilkan kembali di dashboard.</div>
    </section>

    <section class="editor-block">
      <div class="block-title-row"><h3>Log Perubahan Password</h3><span class="editor-note">Log hanya berisi riwayat perubahan, bukan password.</span></div>
      <div class="form-actions inline-actions"><button class="ghost-btn" onclick="loadPasswordAuditLog()">Muat / Refresh Log</button></div>
      <div class="editor-table-wrap"><table class="editor-table settings-table"><thead><tr>
        <th>Waktu</th><th>Target</th><th>Identitas Akses</th><th>Diubah Oleh</th><th>Status</th>
      </tr></thead><tbody>
        ${logs === null ? `<tr><td colspan="5" class="center-muted">Klik “Muat / Refresh Log” untuk melihat riwayat.</td></tr>` :
          logs.length ? logs.map(log => `<tr>
            <td>${esc(formatDate(log.changed_at))}</td>
            <td>${esc(log.target_label || '-')}</td>
            <td><code>${esc(log.target_email || '-')}</code></td>
            <td>${esc(log.changed_by_email || log.changed_by || '-')}</td>
            <td><span class="status s-completed">${esc(log.status || 'success')}</span></td>
          </tr>`).join('') : `<tr><td colspan="5" class="center-muted">Belum ada log perubahan password.</td></tr>`}
      </tbody></table></div>
    </section>
  </main>`;
}

function canManageProjects(){
  return !!state.session && isSupabaseSession() && state.session.role === 'project_manager' && state.session.canEdit;
}

function ensureProjectAdminDraft(){
  if(!state.projectAdminDraft){
    state.projectAdminDraft = {
      clientName: '',
      projectCode: '',
      projectName: '',
      startDate: '',
      endDate: '',
      picCywa: 'Professional Project Team',
      picClient: 'Client Team',
      guestDisplayName: '',
      guestPassword: '',
      timelineTemplate: 'standard'
    };
  }
  if(!state.projectAdminTouched) state.projectAdminTouched = {};
  return state.projectAdminDraft;
}

function setProjectAdminInputValue(field, value){
  const input = document.querySelector(`[data-project-admin-field="${field}"]`);
  if(input && input !== document.activeElement) input.value = value ?? '';
}

function clearProjectAdminMessageElement(){
  const alert = document.querySelector('.project-admin-alert');
  if(alert) alert.remove();
}

function updateProjectAdminDraft(field, value){
  const draft = ensureProjectAdminDraft();
  state.projectAdminTouched[field] = true;
  draft[field] = value;

  if(field === 'clientName'){
    const shouldSyncCode = !state.projectAdminTouched.projectCode || !String(draft.projectCode || '').trim();
    if(shouldSyncCode){
      draft.projectCode = value;
      setProjectAdminInputValue('projectCode', draft.projectCode);
    }
  }

  if(field === 'projectCode'){
    const shouldSyncClient = !state.projectAdminTouched.clientName || !String(draft.clientName || '').trim();
    if(shouldSyncClient){
      draft.clientName = value;
      setProjectAdminInputValue('clientName', draft.clientName);
    }
  }

  if(field === 'clientName' || field === 'projectCode'){
    const autoGuestName = `Guest ${draft.clientName || draft.projectCode || 'Client'}`;
    const shouldSyncGuestName = !state.projectAdminTouched.guestDisplayName || !String(draft.guestDisplayName || '').trim() || /^Guest( |$)/i.test(String(draft.guestDisplayName || ''));
    if(shouldSyncGuestName){
      draft.guestDisplayName = autoGuestName;
      setProjectAdminInputValue('guestDisplayName', draft.guestDisplayName);
    }
  }

  state.projectAdminMessage = null;
  clearProjectAdminMessageElement();
}

function generateProjectGuestPassword(){
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%*?';
  const pick = (set) => set[Math.floor(Math.random() * set.length)];
  const password = [pick('ABCDEFGHJKLMNPQRSTUVWXYZ'), pick('abcdefghijkmnopqrstuvwxyz'), pick('23456789'), pick('!@#$%*?')]
    .concat(Array.from({length: 10}, () => pick(chars)))
    .sort(() => Math.random() - 0.5)
    .join('');
  ensureProjectAdminDraft().guestPassword = password;
  state.projectAdminMessage = {type:'info', text:'Password kuat berhasil dibuat. Simpan password ini dan berikan hanya kepada client yang berwenang.'};
  render();
}

async function callProjectAdminFunction(action, payload = {}){
  const client = getSupabaseClient();
  if(!client) throw new Error('Layanan pengelolaan project belum tersedia. Silakan muat ulang halaman dan coba kembali.');
  const { data, error } = await client.functions.invoke('project-admin', {
    body: { action, ...payload }
  });
  if(error) throw error;
  if(data?.error) throw new Error(data.error);
  return data || {};
}

async function refreshSupabaseDashboardAfterAdmin(selectedLegacyId){
  const client = getSupabaseClient();
  const { data } = await client.auth.getSession();
  if(data?.session?.user){
    await hydrateSupabaseSession(data.session.user);
    if(selectedLegacyId) state.selectedProjectId = selectedLegacyId;
  }
}

async function submitProjectAdminCreate(){
  if(!canManageProjects() || state.projectAdminBusy) return;
  const draft = ensureProjectAdminDraft();
  const payload = {
    clientName: String(draft.clientName || '').trim(),
    projectCode: String(draft.projectCode || '').trim(),
    projectName: String(draft.projectName || '').trim(),
    startDate: String(draft.startDate || '').trim(),
    endDate: String(draft.endDate || '').trim(),
    picCywa: String(draft.picCywa || '').trim(),
    picClient: String(draft.picClient || '').trim(),
    guestDisplayName: String(draft.guestDisplayName || '').trim(),
    guestPassword: String(draft.guestPassword || '').trim(),
    timelineTemplate: String(draft.timelineTemplate || 'standard').trim()
  };
  if(!payload.clientName || !payload.projectCode || !payload.projectName){
    state.projectAdminMessage = {type:'error', text:'Nama Client, Kode Project, dan Nama Project wajib diisi.'};
    render();
    return;
  }
  if(!payload.guestPassword || !isStrongPassword(payload.guestPassword)){
    state.projectAdminMessage = {type:'error', text:'Password guest minimal 10 karakter dan wajib berisi huruf besar, huruf kecil, angka, dan simbol.'};
    render();
    return;
  }
  state.projectAdminBusy = true;
  state.projectAdminMessage = {type:'info', text:'Membuat project dan akses guest...'};
  render();
  try{
    const result = await callProjectAdminFunction('create_project', payload);
    state.projectAdminDraft = null;
    state.projectAdminTouched = {};
    await refreshSupabaseDashboardAfterAdmin(result?.project?.legacyId);
    state.page = 'project-management';
    state.projectAdminMessage = {type:'success', text:`Project ${result?.project?.legacyId || ''} berhasil dibuat. Guest login memakai password yang baru dibuat.`};
  }catch(err){
    state.projectAdminMessage = {type:'error', text: err?.message || 'Project gagal dibuat.'};
  }finally{
    state.projectAdminBusy = false;
    render();
  }
}

async function setProjectLifecycleStatus(legacyId, projectName, status, options = {}){
  if(!canManageProjects() || state.projectAdminBusy) return;
  const targetStatus = normalizeProjectStatus(status, true);
  const label = targetStatus === 'completed' ? 'selesai' : targetStatus === 'archived' ? 'arsip' : 'berjalan';
  if(options.confirmMessage && !confirm(options.confirmMessage)) return;
  state.projectAdminBusy = true;
  state.projectAdminAction = { legacyId, type:'info', text: options.busyText || 'Memperbarui status...' };
  state.projectAdminMessage = {type:'info', text:`Memperbarui status ${projectName || legacyId}...`};
  render();
  try{
    await callProjectAdminFunction('set_project_status', { legacyId, projectStatus: targetStatus });
    await refreshSupabaseDashboardAfterAdmin(targetStatus === 'archived' ? null : legacyId);
    state.page = 'project-management';
    state.projectAdminAction = { legacyId, type:'success', text: options.successText || `Status menjadi ${label}` };
    state.projectAdminMessage = {type:'success', text: options.successMessage || `${projectName || 'Project'} berhasil ditandai ${label}.`};
  }catch(err){
    state.projectAdminAction = { legacyId, type:'error', text:'Gagal memperbarui status' };
    state.projectAdminMessage = {type:'error', text: err?.message || 'Status project gagal diperbarui.'};
  }finally{
    state.projectAdminBusy = false;
    render();
  }
}

async function completeProjectFromConsole(legacyId, projectName){
  return setProjectLifecycleStatus(legacyId, projectName, 'completed', {
    confirmMessage: `Tandai project ini sebagai selesai?

${projectName}

Project tetap bisa dibuka dan dilaporkan, tetapi tidak lagi dihitung sebagai project berjalan.`,
    busyText: 'Menandai selesai...',
    successText: 'Berhasil ditandai selesai',
    successMessage: `${projectName || 'Project'} berhasil ditandai selesai.`
  });
}

async function reactivateProjectFromConsole(legacyId, projectName){
  return setProjectLifecycleStatus(legacyId, projectName, 'active', {
    confirmMessage: `Aktifkan kembali project ini sebagai project berjalan?

${projectName}`,
    busyText: 'Mengaktifkan...',
    successText: 'Berhasil diaktifkan',
    successMessage: `${projectName || 'Project'} aktif kembali sebagai project berjalan.`
  });
}

async function archiveProjectFromConsole(legacyId, projectName){
  return setProjectLifecycleStatus(legacyId, projectName, 'archived', {
    confirmMessage: `Arsipkan project ini?

${projectName}

Project tidak akan tampil untuk client, tetapi histori datanya tetap tersimpan.`,
    busyText: 'Mengarsipkan...',
    successText: 'Berhasil diarsipkan',
    successMessage: `${projectName || 'Project'} berhasil diarsipkan.`
  });
}

async function restoreProjectFromConsole(legacyId, projectName){
  return setProjectLifecycleStatus(legacyId, projectName, 'active', {
    confirmMessage: `Pulihkan project ini sebagai project berjalan?

${projectName}`,
    busyText: 'Memulihkan...',
    successText: 'Berhasil dipulihkan',
    successMessage: `${projectName || 'Project'} berhasil dipulihkan dan aktif kembali.`
  });
}

function canManageClientAccess(){
  return canManageProjects();
}

function clientAccessRowKey(row){
  return row?.targetKey || row?.guestEmail || row?.legacyId || '';
}

function setClientAccessMessage(type, text){
  state.clientAccessMessage = { type, text };
}

async function loadClientAccess(){
  if(!canManageClientAccess() || state.clientAccessBusy) return;
  state.clientAccessBusy = true;
  setClientAccessMessage('info', 'Memuat akses client...');
  render();
  try{
    const result = await callProjectAdminFunction('list_client_access', {});
    state.clientAccessRows = result.rows || [];
    setClientAccessMessage('success', 'Daftar akses client berhasil dimuat.');
  }catch(err){
    setClientAccessMessage('error', err?.message || 'Daftar akses client gagal dimuat.');
  }finally{
    state.clientAccessBusy = false;
    render();
  }
}

function generateClientAccessPassword(targetKey){
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%*?';
  const pick = (set) => set[Math.floor(Math.random() * set.length)];
  const password = [pick('ABCDEFGHJKLMNPQRSTUVWXYZ'), pick('abcdefghijkmnopqrstuvwxyz'), pick('23456789'), pick('!@#$%*?')]
    .concat(Array.from({length: 10}, () => pick(chars)))
    .sort(() => Math.random() - 0.5)
    .join('');
  const input = document.getElementById(`client-access-password-${targetKey}`);
  if(input) input.value = password;
  setClientAccessMessage('info', 'Password kuat berhasil dibuat. Simpan dan kirimkan hanya kepada client yang berwenang.');
  const alert = document.querySelector('.client-access-alert');
  if(alert) alert.className = 'client-access-alert info', alert.textContent = state.clientAccessMessage.text;
}

async function resetClientAccessPassword(targetKey, targetLabel){
  if(!canManageClientAccess() || state.clientAccessBusy) return;
  const input = document.getElementById(`client-access-password-${targetKey}`);
  const newPassword = String(input?.value || '').trim();
  if(!newPassword){ setClientAccessMessage('error', 'Password baru wajib diisi.'); render(); return; }
  if(!isStrongPassword(newPassword)){
    setClientAccessMessage('error', 'Password minimal 10 karakter dan wajib berisi huruf besar, huruf kecil, angka, dan simbol.');
    render();
    return;
  }
  if(!confirm(`Set password baru untuk ${targetLabel || targetKey}?\n\nPassword lama tidak akan ditampilkan dan akan langsung diganti.`)) return;
  state.clientAccessBusy = true;
  setClientAccessMessage('info', 'Mengganti password client...');
  render();
  try{
    await callPasswordAdminFunction('set_password', { targetKey, newPassword });
    const freshInput = document.getElementById(`client-access-password-${targetKey}`);
    if(freshInput) freshInput.value = '';
    state.passwordAuditLogs = null;
    setClientAccessMessage('success', `Password ${targetLabel || 'client'} berhasil diganti.`);
  }catch(err){
    setClientAccessMessage('error', err?.message || 'Password client gagal diganti.');
  }finally{
    state.clientAccessBusy = false;
    render();
  }
}

async function setClientAccessEnabled(legacyId, targetKey, enabled, label){
  if(!canManageClientAccess() || state.clientAccessBusy) return;
  const actionText = enabled ? 'aktifkan' : 'nonaktifkan';
  if(!confirm(`${enabled ? 'Aktifkan' : 'Nonaktifkan'} akses client untuk ${label || legacyId}?`)) return;
  state.clientAccessBusy = true;
  setClientAccessMessage('info', `Sedang ${actionText} akses client...`);
  render();
  try{
    await callProjectAdminFunction('set_client_access', { legacyId, targetKey, enabled });
    const result = await callProjectAdminFunction('list_client_access', {});
    state.clientAccessRows = result.rows || [];
    await refreshSupabaseDashboardAfterAdmin();
    state.page = 'project-management';
    setClientAccessMessage('success', `Akses client berhasil di${enabled ? 'aktifkan' : 'nonaktifkan'}.`);
  }catch(err){
    setClientAccessMessage('error', err?.message || `Akses client gagal di${enabled ? 'aktifkan' : 'nonaktifkan'}.`);
  }finally{
    state.clientAccessBusy = false;
    render();
  }
}

function buildClientOnboardingText(row){
  const dashboardUrl = window.location.origin || 'URL dashboard';
  const passwordInput = document.getElementById(`client-access-password-${clientAccessRowKey(row)}`);
  const passwordLine = passwordInput?.value?.trim()
    ? `Password akses: ${passwordInput.value.trim()}`
    : 'Password akses: akan dikirimkan secara terpisah oleh tim Professional Project Dashboard.';
  return [
    `Halo ${row.guestLabel || row.clientName || 'Client'},`,
    '',
    `Akses demo Professional Project Dashboard untuk ${row.projectName || row.projectCode || row.legacyId} sudah disiapkan.`,
    `Dashboard: ${dashboardUrl}`,
    passwordLine,
    '',
    'Cara masuk:',
    '1. Buka link dashboard.',
    '2. Masukkan password akses pada halaman login.',
    '3. Tidak perlu memasukkan email; akses client sudah dipetakan otomatis ke project terkait.',
    '',
    'Menu utama yang tersedia:',
    '- Executive Summary',
    '- Timeline Project',
    '- Task Tracker',
    '- Document Status',
    '- Project Updates',
    '- Presentation Mode',
    '',
    'Mohon tidak membagikan password akses kepada pihak yang tidak berwenang.'
  ].join('\n');
}

async function copyClientOnboardingText(rowKey){
  const row = (state.clientAccessRows || []).find(item => clientAccessRowKey(item) === rowKey);
  if(!row){ setClientAccessMessage('error', 'Data onboarding tidak ditemukan.'); render(); return; }
  const text = buildClientOnboardingText(row);
  try{
    if(navigator.clipboard?.writeText){
      await navigator.clipboard.writeText(text);
    }else{
      const area = document.createElement('textarea');
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      area.remove();
    }
    setClientAccessMessage('success', 'Panduan onboarding client berhasil disalin.');
  }catch(err){
    setClientAccessMessage('error', 'Gagal menyalin panduan. Salin manual dari preview onboarding.');
  }
  render();
}


function getBrandingProjects(){
  return (state.data.projects || []).filter(project => isProjectFilled(project)).sort((a,b) => (projectNumber(a) || 9999) - (projectNumber(b) || 9999));
}
function setBrandingMessage(type, text){ state.brandingMessage = { type, text }; }
function ensureBrandingDraft(){
  const projects = getBrandingProjects();
  const fallbackProject = projects.find(project => project.id === state.selectedProjectId) || projects[0] || null;
  if(!state.brandingDraft || !projects.some(project => project.id === state.brandingDraft.projectId)){
    const project = fallbackProject;
    const branding = brandingForProject(project || {});
    state.brandingDraft = { projectId: project?.id || '', ...branding };
  }
  return state.brandingDraft;
}
function setBrandingProject(projectId){
  const project = getBrandingProjects().find(item => item.id === projectId) || getBrandingProjects()[0] || null;
  const branding = brandingForProject(project || {});
  state.brandingDraft = { projectId: project?.id || '', ...branding };
  state.brandingMessage = null;
  render();
}
function updateBrandingDraft(field, value){
  const draft = ensureBrandingDraft();
  if(field === 'showClientLogo' || field === 'showCywaLogo'){
    draft[field] = value === true || value === 'true';
  }else{
    draft[field] = value;
  }
  state.brandingMessage = null;
}

function brandingLogoExtension(file){
  const nameExt = String(file?.name || '').split('.').pop()?.toLowerCase();
  const mime = String(file?.type || '').toLowerCase();
  if(mime === 'image/svg+xml') return 'svg';
  if(mime === 'image/jpeg' || mime === 'image/jpg') return 'jpg';
  if(mime === 'image/png') return 'png';
  if(mime === 'image/webp') return 'webp';
  if(['png','jpg','jpeg','webp','svg'].includes(nameExt)) return nameExt === 'jpeg' ? 'jpg' : nameExt;
  return '';
}
function validateBrandingLogoFile(file){
  if(!file) return 'Pilih file logo terlebih dahulu.';
  const mime = String(file.type || '').toLowerCase();
  const ext = brandingLogoExtension(file);
  const extAllowed = ['png','jpg','jpeg','webp','svg'].includes(ext);
  if(!BRANDING_LOGO_ALLOWED_TYPES.has(mime) && !extAllowed){
    return 'Format logo harus PNG, JPG, WEBP, atau SVG.';
  }
  if(file.size > BRANDING_LOGO_MAX_BYTES){
    return 'Ukuran logo maksimal 2 MB.';
  }
  return '';
}
async function uploadBrandingLogo(){
  if(!canManageProjects() || state.brandingUploadBusy || state.brandingBusy) return;
  const input = document.getElementById('brandingLogoFile');
  const file = input?.files?.[0];
  const validationError = validateBrandingLogoFile(file);
  if(validationError){ setBrandingMessage('error', validationError); render(); return; }
  const draft = ensureBrandingDraft();
  const project = getBrandingProjects().find(item => item.id === draft.projectId);
  if(!project?.supabaseId){ setBrandingMessage('error', 'Project belum siap untuk menyimpan pengaturan. Muat ulang halaman lalu coba kembali.'); render(); return; }
  state.brandingUploadBusy = true;
  try{
    const client = getSupabaseClient();
    const ext = brandingLogoExtension(file) || 'png';
    const safeProjectId = String(project.id || project.supabaseId || 'project').replace(/[^a-z0-9_-]/gi, '-').toLowerCase();
    const path = `${safeProjectId}/client-logo.${ext}`;
    const { error: uploadError } = await client.storage
      .from(BRANDING_LOGO_BUCKET)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type || undefined
      });
    if(uploadError) throw uploadError;
    const { data } = client.storage.from(BRANDING_LOGO_BUCKET).getPublicUrl(path);
    const publicUrl = data?.publicUrl;
    if(!publicUrl) throw new Error('Logo berhasil diupload tetapi URL publik tidak tersedia.');
    draft.clientLogoUrl = `${publicUrl}?v=${Date.now()}`;
    draft.showClientLogo = true;
    state.brandingUploadBusy = false;
    setBrandingMessage('info', 'Logo berhasil diupload. Menyimpan identitas client...');
    await saveProjectBranding();
  }catch(err){
    state.brandingUploadBusy = false;
    const message = String(err?.message || err || 'Logo gagal diupload.');
    setBrandingMessage('error', message.includes('Bucket not found') || message.includes('bucket') ? 'Penyimpanan logo belum siap. Periksa konfigurasi upload logo terlebih dahulu.' : message);
    render();
  }
}
async function clearBrandingLogo(){
  if(!canManageProjects() || state.brandingBusy || state.brandingUploadBusy) return;
  const draft = ensureBrandingDraft();
  draft.clientLogoUrl = '';
  draft.showClientLogo = false;
  setBrandingMessage('info', 'Logo client akan dikosongkan. Menyimpan branding...');
  await saveProjectBranding();
}

async function saveProjectBranding(){
  if(!canManageProjects() || state.brandingBusy) return;
  const draft = ensureBrandingDraft();
  const project = getBrandingProjects().find(item => item.id === draft.projectId);
  if(!project?.supabaseId){ setBrandingMessage('error', 'Project belum siap untuk menyimpan pengaturan. Muat ulang halaman lalu coba kembali.'); render(); return; }
  const accent = isHexColor(draft.brandAccentColor) ? draft.brandAccentColor : '#0f2747';
  state.brandingBusy = true;
  setBrandingMessage('info', 'Menyimpan identitas client...');
  render();
  try{
    const client = getSupabaseClient();
    const payload = {
      project_id: project.supabaseId,
      client_logo_url: String(draft.clientLogoUrl || '').trim(),
      brand_accent_color: accent,
      prepared_for: String(draft.preparedFor || '').trim() || project.clientName || project.code || 'Client',
      prepared_by: String(draft.preparedBy || '').trim() || 'Professional Project Team',
      confidentiality_label: String(draft.confidentialityLabel || '').trim() || `Confidential — Prepared for ${project.clientName || project.code || 'Client'}`,
      report_footer_text: String(draft.reportFooterText || '').trim() || 'This report is intended solely for authorized stakeholders.',
      show_client_logo: draft.showClientLogo !== false,
      show_cywa_logo: draft.showCywaLogo !== false,
      updated_at: new Date().toISOString()
    };
    const { error } = await client.from('project_branding').upsert(payload, { onConflict: 'project_id' });
    if(error) throw error;
    await logActivity('update_branding', project, 'project_branding', project.supabaseId, { prepared_for: payload.prepared_for });
    await refreshSupabaseDashboardAfterAdmin(project.id);
    const fresh = (state.data.projects || []).find(item => item.id === project.id) || project;
    state.brandingDraft = { projectId: fresh.id, ...brandingForProject(fresh) };
    setBrandingMessage('success', 'Identitas client berhasil disimpan. Report berikutnya akan memakai pengaturan ini.');
  }catch(err){
    setBrandingMessage('error', err?.message || 'Identitas client gagal disimpan.');
  }finally{
    state.brandingBusy = false;
    render();
  }
}
function renderClientBrandingConsole(){
  const projects = getBrandingProjects();
  const draft = ensureBrandingDraft();
  const project = projects.find(item => item.id === draft.projectId) || projects[0] || null;
  const msg = state.brandingMessage ? `<div class="client-access-alert ${state.brandingMessage.type === 'error' ? 'error' : state.brandingMessage.type === 'success' ? 'success' : 'info'}">${esc(state.brandingMessage.text)}</div>` : '';
  const logoPreview = draft.clientLogoUrl && draft.showClientLogo !== false
    ? `<img src="${esc(draft.clientLogoUrl)}" alt="Client logo preview" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span class="brand-logo-fallback" style="display:none">${esc((draft.preparedFor || project?.clientName || 'Client').slice(0,2).toUpperCase())}</span>`
    : `<span class="brand-logo-fallback">${esc((draft.preparedFor || project?.clientName || 'Client').slice(0,2).toUpperCase())}</span>`;
  return `<section class="section-card project-admin-card client-branding-card">
    <div class="section-head premium-section-head"><div><h2>Identitas Client</h2><p class="section-subtitle">Atur identitas client yang digunakan pada dashboard, presentation mode, dan report project.</p></div></div>
    ${msg}
    <div class="branding-console-layout">
      <div class="branding-form-grid">
        <label class="wide"><span>Project</span><select data-branding-field="projectId" onchange="setBrandingProject(this.value)">${projects.map(item => `<option value="${esc(item.id)}" ${item.id === draft.projectId ? 'selected' : ''}>${esc(item.code || item.id)} — ${esc(item.name || '-')}</option>`).join('')}</select></label>
        <label><span>Prepared For</span><input data-branding-field="preparedFor" value="${esc(draft.preparedFor)}" placeholder="Nama client" oninput="updateBrandingDraft('preparedFor', this.value)"></label>
        <label><span>Prepared By</span><input data-branding-field="preparedBy" value="${esc(draft.preparedBy)}" placeholder="Professional Project Team" oninput="updateBrandingDraft('preparedBy', this.value)"></label>
        <label class="wide"><span>Label Kerahasiaan</span><input data-branding-field="confidentialityLabel" value="${esc(draft.confidentialityLabel)}" placeholder="Confidential — Prepared for Client" oninput="updateBrandingDraft('confidentialityLabel', this.value)"></label>
        <label class="wide"><span>Footer Report</span><input data-branding-field="reportFooterText" value="${esc(draft.reportFooterText)}" placeholder="Footer confidential report" oninput="updateBrandingDraft('reportFooterText', this.value)"></label>
        <div class="branding-logo-upload wide">
          <div class="branding-logo-upload-head"><span>Client Logo</span><small>Upload logo atau gunakan URL publik.</small></div>
          <div class="branding-upload-row">
            <input id="brandingLogoFile" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml">
            <button type="button" class="secondary-btn" onclick="uploadBrandingLogo()" ${state.brandingUploadBusy || state.brandingBusy ? 'disabled' : ''}>${state.brandingUploadBusy ? 'Mengupload...' : 'Upload Logo'}</button>
            <button type="button" class="secondary-btn danger-soft" onclick="clearBrandingLogo()" ${state.brandingBusy || state.brandingUploadBusy || !draft.clientLogoUrl ? 'disabled' : ''}>Hapus Logo</button>
          </div>
          <div class="branding-upload-note">Format PNG, JPG, WEBP, atau SVG. Maksimal 2 MB. Logo akan digunakan pada dashboard dan report project.</div>
        </div>
        <label class="wide"><span>URL Logo Client</span><input data-branding-field="clientLogoUrl" value="${esc(draft.clientLogoUrl)}" placeholder="https://.../logo.png atau data:image/..." oninput="updateBrandingDraft('clientLogoUrl', this.value)"></label>
        <label><span>Accent Color</span><select data-branding-field="brandAccentColor" onchange="updateBrandingDraft('brandAccentColor', this.value);render()">${renderAccentOptions(draft.brandAccentColor)}</select></label>
        <label class="branding-check"><input type="checkbox" ${draft.showClientLogo !== false ? 'checked' : ''} onchange="updateBrandingDraft('showClientLogo', this.checked);render()"><span>Tampilkan logo client</span></label>
        <label class="branding-check"><input type="checkbox" ${draft.showCywaLogo !== false ? 'checked' : ''} onchange="updateBrandingDraft('showCywaLogo', this.checked);render()"><span>Tampilkan identitas Professional Project Dashboard</span></label>
      </div>
      <div class="branding-preview-card" style="--brand-accent:${esc(draft.brandAccentColor || '#0f2747')}">
        <div class="branding-preview-logo">${logoPreview}</div>
        <div class="branding-preview-body">
          <span>Prepared for</span>
          <strong>${esc(draft.preparedFor || project?.clientName || '-')}</strong>
          <small>${esc(draft.confidentialityLabel || 'Confidential')}</small>
        </div>
        <div class="branding-preview-footer">${draft.showCywaLogo !== false ? 'Prepared by Professional Project Team' : 'Tanpa identitas brand'} · Bahasa report dipilih saat unduh</div>
      </div>
    </div>
    <div class="project-admin-footnote">Gunakan logo client agar dashboard dan report tampil konsisten. Jika logo tidak tersedia, sistem akan menampilkan inisial client. Bahasa report dipilih langsung saat proses unduh.</div>
    <div class="actions admin-form-actions"><button class="primary-btn" onclick="saveProjectBranding()" ${state.brandingBusy || !projects.length ? 'disabled' : ''}>${state.brandingBusy ? 'Menyimpan...' : 'Simpan Branding'}</button></div>
  </section>`;
}

function renderClientAccessConsole(){
  const rows = state.clientAccessRows || [];
  const msg = state.clientAccessMessage ? `<div class="client-access-alert ${state.clientAccessMessage.type === 'error' ? 'error' : state.clientAccessMessage.type === 'success' ? 'success' : 'info'}">${esc(state.clientAccessMessage.text)}</div>` : '';
  const body = rows.length ? rows.map(row => {
    const key = clientAccessRowKey(row);
    const enabled = row.accessEnabled === true;
    const statusClass = enabled ? 's-completed' : 's-hold';
    const statusText = enabled ? 'Akses Aktif' : 'Akses Dinonaktifkan';
    const guestText = row.guestUserExists
      ? `<strong>${esc(row.guestLabel || row.guestEmail || '-')}</strong><br><small>${esc(row.guestEmail || 'Akun akses internal')}</small>`
      : `<strong>Akun client belum tersedia</strong><br><small>${esc(row.guestEmail || '-')}</small>`;
    return `<tr class="client-access-row">
      <td><strong>${esc(row.projectCode || row.legacyId)}</strong><br><small>${esc(row.projectName || '-')}</small></td>
      <td>${esc(row.clientName || '-')}</td>
      <td>${guestText}</td>
      <td><span class="status ${statusClass}">${statusText}</span><br><small>${row.projectActive === false ? 'Project diarsipkan' : 'Project aktif'}</small></td>
      <td><div class="client-password-cell"><input id="client-access-password-${esc(key)}" type="text" placeholder="Password baru" ${row.guestUserExists ? '' : 'disabled'}><button class="small-btn" onclick="generateClientAccessPassword('${esc(key)}')" ${row.guestUserExists && !state.clientAccessBusy ? '' : 'disabled'}>Buat Otomatis</button><button class="small-btn" onclick="resetClientAccessPassword('${esc(key)}', ${jsValue(row.guestLabel || row.guestEmail || key)})" ${row.guestUserExists && !state.clientAccessBusy ? '' : 'disabled'}>Set</button></div></td>
      <td><button class="small-btn" onclick="copyClientOnboardingText('${esc(key)}')">Salin Panduan</button></td>
      <td><button class="small-btn ${enabled ? 'danger-inline' : ''}" onclick="setClientAccessEnabled('${esc(row.legacyId)}', '${esc(key)}', ${enabled ? 'false' : 'true'}, ${jsValue(row.guestLabel || row.projectName || row.legacyId)})" ${row.guestUserExists && !state.clientAccessBusy ? '' : 'disabled'}>${enabled ? 'Nonaktifkan' : 'Aktifkan'}</button></td>
    </tr>`;
  }).join('') : `<tr><td colspan="7" class="center-muted project-admin-empty-row">Klik “Muat Akses Client” untuk menampilkan daftar akun guest/client per project.</td></tr>`;
  return `<section class="section-card project-admin-card client-access-card">
    <div class="section-head premium-section-head"><div><h2>Akses Client & Onboarding</h2><p class="section-subtitle">Kelola akses guest, reset password, dan salin panduan onboarding client tanpa membuka SQL.</p></div><button class="small-btn" onclick="loadClientAccess()" ${state.clientAccessBusy ? 'disabled' : ''}>${state.clientAccessBusy ? 'Memuat...' : 'Muat Akses Client'}</button></div>
    ${msg}
    <div class="client-access-note">Detail akun teknis tidak dibagikan kepada client. Client hanya menerima link dashboard dan password akses.</div>
    <div class="project-admin-table-wrap"><table class="excel modern-table project-admin-table client-access-table"><thead><tr><th>Project</th><th>Client</th><th>Akun Akses</th><th>Status</th><th>Password</th><th>Onboarding</th><th>Aksi</th></tr></thead><tbody>${body}</tbody></table></div>
  </section>`;
}

function renderProjectStatusActions(project, isBusy){
  const status = normalizeProjectStatus(project.projectStatus, project.isActive !== false);
  const nameValue = jsValue(project.name || project.id);
  if(status === 'archived'){
    return `<button class="small-btn" onclick="restoreProjectFromConsole('${esc(project.id)}', ${nameValue})" ${isBusy ? 'disabled' : ''}>${isBusy ? 'Memproses...' : 'Pulihkan'}</button>`;
  }
  const completeBtn = status === 'completed'
    ? `<button class="small-btn" onclick="reactivateProjectFromConsole('${esc(project.id)}', ${nameValue})" ${isBusy ? 'disabled' : ''}>Aktifkan</button>`
    : `<button class="small-btn success-inline" onclick="completeProjectFromConsole('${esc(project.id)}', ${nameValue})" ${isBusy ? 'disabled' : ''}>Tandai Selesai</button>`;
  return `<div class="project-status-actions">${completeBtn}<button class="small-btn danger-inline" onclick="archiveProjectFromConsole('${esc(project.id)}', ${nameValue})" ${isBusy ? 'disabled' : ''}>Arsipkan</button></div>`;
}

function renderProjectAdminRows(projects){
  return `<div class="project-admin-table-wrap"><table class="excel modern-table project-admin-table"><thead><tr><th>Project</th><th>Client</th><th>Periode</th><th>Progress</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${projects.length ? projects.map(project => {
    const action = state.projectAdminAction?.legacyId === project.id ? state.projectAdminAction : null;
    const actionClass = action ? ` project-row-${action.type}` : '';
    const actionText = action ? `<div class="project-row-message ${action.type}">${esc(action.text)}</div>` : '';
    const isBusy = state.projectAdminBusy && action?.legacyId === project.id;
    const progress = projectProgressValue(project);
    const actionButton = renderProjectStatusActions(project, isBusy);
    return `<tr class="project-admin-row${actionClass}"><td><strong>${esc(project.code || project.id)}</strong><br><small>${esc(project.name || '-')}</small></td><td>${esc(project.clientName || project.code || '-')}</td><td>${formatDate(project.startDate)} → ${formatDate(project.endDate)}</td><td><span class="home-project-progress inline-progress"><b style="width:${progress}%"></b><i>${progress}%</i></span></td><td><span class="status ${projectStatusClass(project)}">${esc(projectStatusLabel(project))}</span>${actionText}</td><td>${actionButton}</td></tr>`;
  }).join('') : `<tr><td colspan="6" class="center-muted project-admin-empty-row">Belum ada project pada kategori ini.</td></tr>`}</tbody></table></div>`;
}

function renderProjectManagementPage(){
  if(!canManageProjects()) return renderDashboardMain();
  const draft = ensureProjectAdminDraft();
  const projects = (state.data.projects || []).filter(project => isProjectFilled(project));
  const activeProjects = projects.filter(projectIsRunning).sort((a,b) => (projectNumber(a) || 9999) - (projectNumber(b) || 9999));
  const completedProjects = projects.filter(projectIsCompleted).sort((a,b) => (projectNumber(a) || 9999) - (projectNumber(b) || 9999));
  const archivedProjects = projects.filter(projectIsArchived).sort((a,b) => (projectNumber(a) || 9999) - (projectNumber(b) || 9999));
  const msg = state.projectAdminMessage ? `<div class="project-admin-alert ${state.projectAdminMessage.type === 'error' ? 'error' : state.projectAdminMessage.type === 'success' ? 'success' : 'info'}">${esc(state.projectAdminMessage.text)}</div>` : '';
  return `<main class="main project-admin-main">
    <div class="project-admin-hero">
      <div>
        <p class="eyebrow left">Project Management</p>
        <h1>Kelola <em>Project</em></h1>
        <p>Buat project baru, kelola akses client, dan atur status project dalam satu halaman. Daftar hanya menampilkan project yang sudah digunakan.</p>
      </div>
      <button class="ghost-btn" onclick="state.page='dashboard';render()">Kembali ke Project</button>
    </div>
    ${msg}
    <section class="section-card project-admin-card project-create-card">
      <div class="section-head premium-section-head"><div><h2>Tambah <em>Project</em> Baru</h2><p class="section-subtitle">Sistem menyiapkan struktur project, timeline awal, akses client, dan catatan aktivitas secara otomatis.</p></div></div>
      <div class="project-admin-form-grid">
        <label><span>Nama Client</span><input data-project-admin-field="clientName" value="${esc(draft.clientName)}" placeholder="Contoh: Bank ABC" oninput="updateProjectAdminDraft('clientName', this.value)"></label>
        <label><span>Kode Project</span><input data-project-admin-field="projectCode" value="${esc(draft.projectCode)}" placeholder="Contoh: Bank ABC" oninput="updateProjectAdminDraft('projectCode', this.value)"></label>
        <label class="wide"><span>Nama Project</span><input data-project-admin-field="projectName" value="${esc(draft.projectName)}" placeholder="Contoh: Security Assessment 2026" oninput="updateProjectAdminDraft('projectName', this.value)"></label>
        <label><span>Template Timeline</span><select data-project-admin-field="timelineTemplate" onchange="updateProjectAdminDraft('timelineTemplate', this.value)"><option value="standard" ${draft.timelineTemplate === 'standard' ? 'selected' : ''}>Standard Assessment</option><option value="pentest" ${draft.timelineTemplate === 'pentest' ? 'selected' : ''}>Pentest / Security Testing</option><option value="audit" ${draft.timelineTemplate === 'audit' ? 'selected' : ''}>Audit / Compliance</option></select></label>
        <label><span>Tanggal Mulai</span><input data-project-admin-field="startDate" type="date" value="${esc(draft.startDate)}" oninput="updateProjectAdminDraft('startDate', this.value)"></label>
        <label><span>Tanggal Selesai</span><input data-project-admin-field="endDate" type="date" value="${esc(draft.endDate)}" oninput="updateProjectAdminDraft('endDate', this.value)"></label>
        <label><span>Project Lead</span><input data-project-admin-field="picCywa" value="${esc(draft.picCywa)}" placeholder="Professional Project Team" oninput="updateProjectAdminDraft('picCywa', this.value)"></label>
        <label><span>PIC Client</span><input data-project-admin-field="picClient" value="${esc(draft.picClient)}" placeholder="Client Team" oninput="updateProjectAdminDraft('picClient', this.value)"></label>
        <label><span>Nama Tampilan Client</span><input data-project-admin-field="guestDisplayName" value="${esc(draft.guestDisplayName)}" placeholder="Guest Bank ABC" oninput="updateProjectAdminDraft('guestDisplayName', this.value)"></label>
        <label class="wide"><span>Password Client</span><div class="input-with-action"><input data-project-admin-field="guestPassword" type="text" value="${esc(draft.guestPassword)}" placeholder="Minimal 10 karakter dengan kombinasi huruf besar, huruf kecil, angka, dan simbol" oninput="updateProjectAdminDraft('guestPassword', this.value)"><button class="small-btn" onclick="generateProjectGuestPassword()">Buat Otomatis</button></div></label>
      </div>
      <div class="project-admin-footnote">Nomor project dipilih otomatis dari urutan yang tersedia. Project yang diarsipkan tetap disimpan sebagai histori, sedangkan akses client dibuat secara terkontrol dan hanya dibagikan melalui link dashboard serta password akses.</div>
      <div class="actions admin-form-actions"><button class="primary-btn" onclick="submitProjectAdminCreate()" ${state.projectAdminBusy ? 'disabled' : ''}>${state.projectAdminBusy ? 'Memproses...' : 'Tambah Project'}</button></div>
    </section>
    ${renderClientAccessConsole()}
    ${renderClientBrandingConsole()}
    <section class="section-card project-admin-card"><div class="section-head premium-section-head"><div><h2>Project Berjalan</h2><p class="section-subtitle">Project yang masih aktif berjalan dan membutuhkan monitoring harian.</p></div><strong>${activeProjects.length}</strong></div>${renderProjectAdminRows(activeProjects)}</section>
    <section class="section-card project-admin-card"><div class="section-head premium-section-head"><div><h2>Project Selesai</h2><p class="section-subtitle">Project yang sudah ditandai selesai, tetapi tetap bisa dibuka untuk report dan histori client.</p></div><strong>${completedProjects.length}</strong></div>${renderProjectAdminRows(completedProjects)}</section>
    <section class="section-card project-admin-card"><div class="section-head premium-section-head"><div><h2>Project Arsip</h2><p class="section-subtitle">Project nonaktif yang disimpan untuk histori. Slot kosong bawaan sistem disembunyikan dari daftar ini.</p></div><strong>${archivedProjects.length}</strong></div>${renderProjectAdminRows(archivedProjects)}</section>
  </main>`;
}


/* =========================================================
   Command Center and Schedule Calendar
   ========================================================= */
function canAccessCommandCenter(){
  return !!state.session && isSupabaseSession() && ['project_manager', 'admin'].includes(state.session.role);
}
function canAccessClientPortal(){
  return !!state.session && state.session.role === 'guest';
}
function canAccessSchedulePage(){
  return canAccessCommandCenter() || canAccessClientPortal();
}
function isClientPortalSession(){
  return canAccessClientPortal();
}
function canViewActivityLog(){
  return !!state.session && isSupabaseSession() && state.session.role === 'project_manager' && state.session.canEdit === true;
}
function commandProjects(){
  return getAllowedProjects().filter(isProjectFilled).sort((a,b) => (projectNumber(a) || 9999) - (projectNumber(b) || 9999));
}
function clientPortalProjects(){
  return commandProjects();
}
function clientFilteredProjects(){
  const projects = clientPortalProjects();
  const filter = state.clientProjectFilter || 'all';
  if(filter === 'all') return projects;
  const picked = projects.filter(project => project.id === filter);
  return picked.length ? picked : projects;
}
function setClientProjectFilter(value){
  state.clientProjectFilter = value || 'all';
  render();
}
function projectProgressValue(project){ return metricSummary(project).projectProgress || 0; }
function projectIsCompleted(project){
  if(projectIsExplicitlyCompleted(project)) return true;
  if(isSupabaseSession()) return false;
  return projectProgressValue(project) >= 100;
}
function projectIsRunning(project){
  return !projectIsArchived(project) && !projectIsCompleted(project);
}
function todayISO(){ return localDateISO(new Date()); }
function monthISO(date = new Date()){
  const d = dateValue(date) || new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-01`;
}
function monthLabel(iso){
  const d = dateValue(iso) || new Date();
  return d.toLocaleDateString('id-ID', { month:'long', year:'numeric' });
}
function timeRangeLabel(event){
  const start = String(event?.startTime || '').slice(0,5);
  const end = String(event?.endTime || '').slice(0,5);
  if(start && end) return `${start}–${end}`;
  if(start) return start;
  return 'All day';
}
const SCHEDULE_EVENT_TYPES = ['Audit','Discussion','Meeting','Presentation','Technical Onsite','Project Sync'];
const SCHEDULE_DELIVERY_MODES = ['Online','Onsite'];
function normalizeScheduleType(type){
  const value = String(type || 'Meeting').trim();
  return SCHEDULE_EVENT_TYPES.includes(value) ? value : 'Project Sync';
}
function scheduleTypeLabel(type){
  return normalizeScheduleType(type);
}
function scheduleDeliveryModeLabel(mode){
  const value = String(mode || 'Online').trim();
  return SCHEDULE_DELIVERY_MODES.includes(value) ? value : 'Online';
}
function scheduleDeliveryModeClass(event){
  return scheduleDeliveryModeLabel(event?.deliveryMode).toLowerCase() === 'onsite' ? 'schedule-mode-onsite' : 'schedule-mode-online';
}
function scheduleLocationPlaceholder(){
  return scheduleDeliveryModeLabel(state.scheduleDraft?.deliveryMode).toLowerCase() === 'onsite'
    ? 'Contoh: Meeting room, kantor client, atau lokasi onsite'
    : 'Contoh: Teams link, Zoom link, atau meeting URL';
}
function scheduleLocationLabel(){
  return scheduleDeliveryModeLabel(state.scheduleDraft?.deliveryMode).toLowerCase() === 'onsite' ? 'Location' : 'Meeting Link';
}
function scheduleModeLegend(){
  return `<div class="schedule-mode-legend" aria-label="Schedule color legend"><span><i class="online"></i>Online</span><span><i class="onsite"></i>Onsite</span></div>`;
}
function isValidTimeValue(value){
  return !value || /^\d{2}:\d{2}$/.test(String(value || '').slice(0,5));
}
function scheduleTimeOrderError(start, end){
  const s = String(start || '').slice(0,5);
  const e = String(end || '').slice(0,5);
  if(!isValidTimeValue(s) || !isValidTimeValue(e)) return 'Format waktu agenda tidak valid.';
  if(s && e && e < s) return 'End Time tidak boleh lebih awal dari Start Time.';
  return '';
}
function openScheduleAgenda(projectId, eventId){
  const project = getProjectById(projectId);
  const event = (project?.scheduleEvents || []).find(item => item.id === eventId || item.supabaseId === eventId);
  if(!event) return;
  state.page = 'schedule';
  state.scheduleSelectedDate = event.date || todayISO();
  state.scheduleMonth = monthISO(state.scheduleSelectedDate);
  state.scheduleMessage = {type:'info', text: canManageProjects() ? 'Detail agenda ditampilkan. Klik Edit Agenda jika perlu mengubah data.' : 'Detail agenda ditampilkan.'};
  render();
}
function getProjectById(projectId){ return (state.data.projects || []).find(project => project.id === projectId); }
function scheduleEventVisibleToCurrentUser(event){
  return !isClientPortalSession() || event?.isInternal !== true;
}
function scheduleEventsFlat(){
  return commandProjects().flatMap(project => (project.scheduleEvents || [])
    .filter(scheduleEventVisibleToCurrentUser)
    .map(event => ({...event, projectId: project.id, projectCode: project.code, projectName: project.name, projectClient: project.clientName || project.code})));
}
function filteredScheduleEvents(){
  const allowedIds = new Set(commandProjects().map(project => project.id));
  const projectFilter = allowedIds.has(state.scheduleProjectFilter) ? state.scheduleProjectFilter : 'all';
  if(state.scheduleProjectFilter !== projectFilter) state.scheduleProjectFilter = projectFilter;
  return scheduleEventsFlat().filter(event => projectFilter === 'all' || event.projectId === projectFilter).sort((a,b) => `${a.date || ''} ${a.startTime || ''}`.localeCompare(`${b.date || ''} ${b.startTime || ''}`));
}
function scheduleEventsForDate(date){
  const iso = toISODate(date);
  return filteredScheduleEvents().filter(event => event.date === iso);
}
function setCommandPage(page){
  state.page = page;
  if(page === 'home') state.homePanel = null;
  if(page === 'schedule') ensureScheduleState();
  if(page === 'schedule' && !canAccessSchedulePage()) state.page = canAccessClientPortal() ? 'home' : 'dashboard';
  if(page === 'activity-log' && !canViewActivityLog()) state.page = 'home';
  if(page === 'backup-tools' && !canManageProjects()) state.page = 'home';
  render();
  if(page === 'activity-log' && canViewActivityLog() && state.activityLogs === null){
    loadActivityLogs(true);
  }
}
function openHomePanel(panel){ state.homePanel = panel; render(); }
function closeHomePanel(){ state.homePanel = null; render(); }
function toggleHomeAgendaProject(projectId){ state.homeAgendaOpenProjectId = state.homeAgendaOpenProjectId === projectId ? null : projectId; render(); }
function ensureScheduleState(){
  if(!state.scheduleMonth) state.scheduleMonth = monthISO(new Date());
  if(!state.scheduleProjectFilter) state.scheduleProjectFilter = 'all';
  if(!state.scheduleSelectedDate) state.scheduleSelectedDate = todayISO();
  if(!state.scheduleDraft) resetScheduleDraft(state.scheduleSelectedDate, false);
}
function resetScheduleDraft(date = state.scheduleSelectedDate || todayISO(), shouldRender = true){
  const firstProject = commandProjects()[0] || null;
  state.scheduleDraft = {
    id: '',
    projectId: state.scheduleProjectFilter !== 'all' ? state.scheduleProjectFilter : (state.selectedProjectId || firstProject?.id || ''),
    title: '',
    date: toISODate(date) || todayISO(),
    startTime: '',
    endTime: '',
    type: 'Meeting',
    deliveryMode: 'Online',
    location: '',
    description: '',
    isInternal: false
  };
  state.scheduleMessage = null;
  if(shouldRender) render();
}
function setScheduleMonth(offset){
  ensureScheduleState();
  const base = dateValue(state.scheduleMonth) || new Date();
  base.setMonth(base.getMonth() + offset);
  state.scheduleMonth = monthISO(base);
  render();
}
function setScheduleMonthValue(value){
  const iso = toISODate(`${value || ''}-01`) || monthISO(new Date());
  state.scheduleMonth = iso;
  render();
}
function setScheduleProjectFilter(value){
  state.scheduleProjectFilter = value || 'all';
  if(state.scheduleDraft && state.scheduleProjectFilter !== 'all') state.scheduleDraft.projectId = state.scheduleProjectFilter;
  render();
}
function selectScheduleDate(date){
  state.scheduleSelectedDate = toISODate(date) || todayISO();
  if(state.scheduleDraft && !state.scheduleDraft.id) state.scheduleDraft.date = state.scheduleSelectedDate;
  render();
}
function updateScheduleDraft(field, value){
  ensureScheduleState();
  if(field === 'isInternal') state.scheduleDraft[field] = value === true || value === 'true';
  else state.scheduleDraft[field] = value;
  state.scheduleMessage = null;
}
function focusScheduleForm(){
  window.setTimeout(() => {
    const form = document.querySelector('[data-schedule-form="true"]');
    const titleInput = document.querySelector('[data-schedule-title="true"]');
    if(form) form.scrollIntoView({behavior:'smooth', block:'nearest'});
    if(titleInput) titleInput.focus({preventScroll:true});
  }, 40);
}
function editScheduleEvent(projectId, eventId){
  const project = getProjectById(projectId);
  const event = (project?.scheduleEvents || []).find(item => item.id === eventId || item.supabaseId === eventId);
  if(!event) return;
  const currentFilter = state.scheduleProjectFilter || 'all';
  state.scheduleDraft = {
    id: event.supabaseId || event.id,
    projectId: project.id,
    title: event.title || '',
    date: event.date || todayISO(),
    startTime: String(event.startTime || '').slice(0,5),
    endTime: String(event.endTime || '').slice(0,5),
    type: normalizeScheduleType(event.type),
    deliveryMode: scheduleDeliveryModeLabel(event.deliveryMode),
    location: event.location || '',
    description: event.description || '',
    isInternal: event.isInternal === true
  };
  state.scheduleSelectedDate = state.scheduleDraft.date;
  state.scheduleProjectFilter = currentFilter;
  state.scheduleMessage = {type:'info', text:'Agenda siap diedit. Form sudah diarahkan ke data yang dipilih tanpa mengubah filter project.'};
  render();
  focusScheduleForm();
}

function normalizeScheduleEventRow(row, project){
  if(!row || !project) return null;
  return {
    id: row.id || `schedule-${Date.now()}`,
    supabaseId: row.id || '',
    projectId: project.id,
    projectSupabaseId: project.supabaseId,
    title: row.title || '',
    date: toISODate(row.event_date) || '',
    startTime: String(row.start_time || '').slice(0,5),
    endTime: String(row.end_time || '').slice(0,5),
    type: normalizeScheduleType(row.event_type),
    deliveryMode: scheduleDeliveryModeLabel(row.delivery_mode),
    location: row.location || '',
    description: row.description || '',
    isInternal: row.is_internal === true
  };
}
function sortScheduleEvents(events){
  return (events || []).sort((a,b) => `${a.date || ''} ${a.startTime || ''} ${a.title || ''}`.localeCompare(`${b.date || ''} ${b.startTime || ''} ${b.title || ''}`));
}
function syncScheduleRowsIntoState(rows){
  const grouped = groupBy(rows || [], 'project_id');
  (state.data.projects || []).forEach(project => {
    const projectRows = grouped[project.supabaseId] || [];
    project.scheduleEvents = sortScheduleEvents(projectRows.map(row => normalizeScheduleEventRow(row, project)).filter(Boolean));
  });
}
async function refreshScheduleEventsOnly(){
  const client = getSupabaseClient();
  if(!client) return;
  const rows = await fetchTable(client, 'project_schedule_events', '*', null);
  syncScheduleRowsIntoState(rows);
}
function upsertScheduleEventInState(row, fallbackProject){
  const project = (state.data.projects || []).find(item => item.supabaseId === row?.project_id) || fallbackProject;
  const normalized = normalizeScheduleEventRow(row, project);
  if(!project || !normalized) return;
  project.scheduleEvents = (project.scheduleEvents || []).filter(event => (event.supabaseId || event.id) !== (normalized.supabaseId || normalized.id));
  project.scheduleEvents.push(normalized);
  project.scheduleEvents = sortScheduleEvents(project.scheduleEvents);
}
function removeScheduleEventFromState(eventId){
  (state.data.projects || []).forEach(project => {
    project.scheduleEvents = (project.scheduleEvents || []).filter(event => event.id !== eventId && event.supabaseId !== eventId);
  });
}
async function saveScheduleEvent(event){
  if(event && typeof event.preventDefault === 'function') event.preventDefault();
  if(!canManageProjects() || state.scheduleBusy) return;
  ensureScheduleState();
  const draft = state.scheduleDraft || {};
  const project = getProjectById(draft.projectId);
  if(!project?.supabaseId){ state.scheduleMessage = {type:'error', text:'Pilih project yang valid.'}; render(); return; }
  if(!String(draft.title || '').trim()){ state.scheduleMessage = {type:'error', text:'Judul agenda wajib diisi.'}; render(); return; }
  if(!toISODate(draft.date)){ state.scheduleMessage = {type:'error', text:'Tanggal agenda wajib diisi.'}; render(); return; }
  const timeError = scheduleTimeOrderError(draft.startTime, draft.endTime);
  if(timeError){ state.scheduleMessage = {type:'error', text:timeError}; render(); return; }
  state.scheduleBusy = true;
  state.scheduleMessage = {type:'info', text:'Menyimpan agenda...'};
  render();
  try{
    const client = getSupabaseClient();
    const payload = {
      project_id: project.supabaseId,
      title: String(draft.title || '').trim(),
      event_date: toISODate(draft.date),
      start_time: String(draft.startTime || '').trim() || null,
      end_time: String(draft.endTime || '').trim() || null,
      event_type: normalizeScheduleType(draft.type),
      delivery_mode: scheduleDeliveryModeLabel(draft.deliveryMode),
      location: String(draft.location || '').trim() || null,
      description: String(draft.description || '').trim() || null,
      is_internal: draft.isInternal === true,
      updated_at: new Date().toISOString()
    };
    const wasUpdate = Boolean(draft.id);
    let savedRow = null;
    if(draft.id){
      const { data, error } = await client.from('project_schedule_events').update(payload).eq('id', draft.id).select('*').single();
      if(error) throw error;
      savedRow = data;
    }else{
      const { data, error } = await client.from('project_schedule_events').insert(payload).select('*').single();
      if(error) throw error;
      savedRow = data;
    }
    if(savedRow){
      upsertScheduleEventInState(savedRow, project);
      await logActivity(wasUpdate ? 'update_schedule' : 'create_schedule', project, 'project_schedule_events', savedRow.id, { title: payload.title, event_date: payload.event_date, event_type: payload.event_type, delivery_mode: payload.delivery_mode });
    }
    state.page = 'schedule';
    state.scheduleSelectedDate = payload.event_date;
    state.scheduleMonth = monthISO(payload.event_date);
    resetScheduleDraft(payload.event_date, false);
    state.scheduleMessage = {type:'success', text:'Agenda berhasil disimpan dan kalender sudah diperbarui.'};
    try{ await refreshScheduleEventsOnly(); }catch(refreshError){ console.warn('Agenda tersimpan, tetapi refresh schedule penuh gagal:', refreshError?.message || refreshError); }
  }catch(err){
    state.scheduleMessage = {type:'error', text: err?.message || 'Agenda gagal disimpan.'};
  }finally{
    state.scheduleBusy = false;
    render();
  }
}
async function deleteScheduleEvent(eventId){
  if(!canManageProjects() || state.scheduleBusy) return;
  if(!confirm('Hapus agenda ini?\nAgenda yang dihapus tidak dapat dikembalikan.')) return;
  state.scheduleBusy = true;
  state.scheduleMessage = {type:'info', text:'Menghapus agenda...'};
  render();
  try{
    const deletedEvent = scheduleEventsFlat().find(event => event.id === eventId || event.supabaseId === eventId);
    const deletedProject = deletedEvent ? getProjectById(deletedEvent.projectId) : null;
    const client = getSupabaseClient();
    const { error } = await client.from('project_schedule_events').delete().eq('id', eventId);
    if(error) throw error;
    await logActivity('delete_schedule', deletedProject, 'project_schedule_events', eventId, { title: deletedEvent?.title || '', event_date: deletedEvent?.date || '' });
    removeScheduleEventFromState(eventId);
    state.page = 'schedule';
    resetScheduleDraft(state.scheduleSelectedDate, false);
    state.scheduleMessage = {type:'success', text:'Agenda berhasil dihapus dan kalender sudah diperbarui.'};
    try{ await refreshScheduleEventsOnly(); }catch(refreshError){ console.warn('Agenda dihapus, tetapi refresh schedule penuh gagal:', refreshError?.message || refreshError); }
  }catch(err){
    state.scheduleMessage = {type:'error', text: err?.message || 'Agenda gagal dihapus.'};
  }finally{
    state.scheduleBusy = false;
    render();
  }
}
function renderHomeProjectList(projects){
  if(!projects.length) return `<div class="home-modal-empty">Tidak ada project pada kategori ini.</div>`;
  return `<div class="home-project-list">${projects.map(project => {
    const progress = projectProgressValue(project);
    const health = getProjectHealth(project);
    return `<button class="home-project-row" onclick="setProject('${esc(project.id)}')"><span><strong>${esc(project.code || project.id)}</strong><small>${esc(project.name || '-')}</small></span><em class="sidebar-health ${health.tone}">${esc(health.label)}</em><span class="home-project-progress"><b style="width:${progress}%"></b><i>${progress}%</i></span></button>`;
  }).join('')}</div>`;
}
function renderHomePanel(){
  if(!state.homePanel) return '';
  const projects = commandProjects();
  const running = projects.filter(projectIsRunning);
  const completed = projects.filter(projectIsCompleted);
  const map = {
    all: {title:'Semua Project', rows:projects},
    running: {title:'Project Berjalan', rows:running},
    completed: {title:'Project Selesai', rows:completed}
  };
  const picked = map[state.homePanel] || map.all;
  return `<div class="modal-backdrop" onclick="closeHomePanel()"><section class="home-modal" onclick="event.stopPropagation()"><div class="home-modal-head"><div><span>Beranda</span><h3>${esc(picked.title)}</h3></div><button class="ghost-btn" onclick="closeHomePanel()">Tutup</button></div>${renderHomeProjectList(picked.rows)}</section></div>`;
}
function renderTodayScheduleCard(events){
  const items = events.slice(0,5);
  return `<button class="home-stat-card schedule" onclick="setCommandPage('schedule')"><span>Schedule Hari Ini</span><strong>${events.length}</strong><small>${items.length ? items.map(event => `${timeRangeLabel(event)} · ${event.title}`).join(' • ') : 'Tidak ada agenda hari ini.'}</small></button>`;
}
function renderHomeAgendaEvent(event){
  const mode = scheduleDeliveryModeLabel(event.deliveryMode);
  const modeClass = scheduleDeliveryModeClass(event);
  return `<button type="button" class="agenda-event-row ${modeClass}" onclick="openScheduleAgenda('${esc(event.projectId)}','${esc(event.id)}')"><b>${esc(timeRangeLabel(event))}</b><span>${esc(event.title)}</span><small>${esc(event.type || 'Meeting')} · ${esc(mode)}${event.location ? ` · ${esc(event.location)}` : ''}</small></button>`;
}
function renderProjectAgendaToday(events){
  const grouped = commandProjects().map(project => ({project, events: events.filter(event => event.projectId === project.id)})).filter(item => item.events.length);
  if(!grouped.length) return `<section class="section-card command-card"><div class="section-head premium-section-head"><div><h2>Project Agenda</h2><p class="section-subtitle">Tidak ada project dengan agenda pada tanggal hari ini.</p></div></div><div class="empty-schedule">Agenda hari ini kosong.</div></section>`;
  return `<section class="section-card command-card"><div class="section-head premium-section-head"><div><h2>Project Agenda</h2><p class="section-subtitle">Klik project untuk membuka daftar agenda, lalu klik agenda untuk melihat detail di kalender.</p></div><button class="ghost-btn" onclick="setCommandPage('schedule')">Buka Schedule</button></div><div class="agenda-accordion">${grouped.map(({project, events}) => `<div class="agenda-project"><button onclick="toggleHomeAgendaProject('${esc(project.id)}')"><span><strong>${esc(project.code)}</strong><small>${esc(project.name)}</small></span><em>${events.length} agenda</em></button>${state.homeAgendaOpenProjectId === project.id ? `<div class="agenda-detail">${events.map(renderHomeAgendaEvent).join('')}</div>` : ''}</div>`).join('')}</div></section>`;
}

function notificationItems(){
  const today = startOfDay(new Date());
  const nextLimit = addDays(today, 7);
  const items = [];
  commandProjects().forEach(project => {
    getOverdueTasks(project).slice(0, 10).forEach(({task, index, schedule}) => {
      items.push({
        id: `risk-${project.id}-${index}`,
        severity: 'high',
        category: 'Task Risk',
        title: task.task || 'Task membutuhkan perhatian',
        projectId: project.id,
        projectCode: project.code,
        detail: schedule.primaryReason || 'Task melewati rencana timeline.',
        date: schedule.timelineRef?.endDate || schedule.timelineRef?.startDate || task.endDate || task.startDate || '',
        actionLabel: 'Buka Project',
        actionType: 'project'
      });
    });
    (project.tasks || []).forEach((task, index) => {
      if(isCompletedStatus(task.status)) return;
      if(/blocked|block|hold/i.test(`${task.status || ''} ${task.notes || ''}`)){
        items.push({
          id: `blocked-${project.id}-${index}`,
          severity: 'medium',
          category: 'Blocked / Hold',
          title: task.task || 'Task tertahan',
          projectId: project.id,
          projectCode: project.code,
          detail: task.notes || task.status || 'Task membutuhkan tindak lanjut.',
          date: task.startDate || task.endDate || '',
          actionLabel: 'Buka Project',
          actionType: 'project'
        });
      }
    });
    (project.scheduleEvents || []).forEach(event => {
      const d = dateValue(event.date);
      if(!d) return;
      const day = startOfDay(d);
      if(day.getTime() === today.getTime()){
        items.push({
          id: `today-${event.id || event.supabaseId}`,
          severity: 'info',
          category: 'Agenda Hari Ini',
          title: event.title || 'Agenda project',
          projectId: project.id,
          eventId: event.id || event.supabaseId,
          projectCode: project.code,
          detail: `${timeRangeLabel(event)} · ${scheduleTypeLabel(event.type)} · ${scheduleDeliveryModeLabel(event.deliveryMode)}`,
          date: event.date,
          actionLabel: 'Buka Agenda',
          actionType: 'schedule'
        });
      }else if(day > today && day <= nextLimit){
        items.push({
          id: `upcoming-${event.id || event.supabaseId}`,
          severity: 'low',
          category: 'Agenda 7 Hari',
          title: event.title || 'Agenda project',
          projectId: project.id,
          eventId: event.id || event.supabaseId,
          projectCode: project.code,
          detail: `${formatDate(event.date)} · ${timeRangeLabel(event)} · ${scheduleTypeLabel(event.type)}`,
          date: event.date,
          actionLabel: 'Buka Agenda',
          actionType: 'schedule'
        });
      }
    });
    const progress = projectProgressValue(project);
    if(progress >= 100 && !projectIsCompleted(project)){
      items.push({
        id: `completion-${project.id}`,
        severity: 'medium',
        category: 'Completion Review',
        title: `${project.code} siap direview selesai`,
        projectId: project.id,
        projectCode: project.code,
        detail: 'Progress sudah 100%, pertimbangkan tandai project sebagai Selesai di Kelola Project.',
        date: '',
        actionLabel: 'Kelola Project',
        actionType: 'project-management'
      });
    }
  });
  const rank = {high:0, medium:1, info:2, low:3};
  return items.sort((a,b) => (rank[a.severity] ?? 9) - (rank[b.severity] ?? 9) || String(a.date || '9999').localeCompare(String(b.date || '9999')) || String(a.projectCode || '').localeCompare(String(b.projectCode || '')));
}
function notificationCounts(){
  const items = notificationItems();
  return {
    total: items.length,
    high: items.filter(item => item.severity === 'high').length,
    medium: items.filter(item => item.severity === 'medium').length,
    today: items.filter(item => item.category === 'Agenda Hari Ini').length,
    upcoming: items.filter(item => item.category === 'Agenda 7 Hari').length
  };
}
function setNotificationFilter(value){
  state.notificationFilter = value || 'all';
  render();
}
function openNotificationTarget(actionType, projectId, eventId){
  if(actionType === 'schedule' && projectId && eventId) return openScheduleAgenda(projectId, eventId);
  if(actionType === 'project-management') return setCommandPage('project-management');
  if(projectId) return setProject(projectId);
  setCommandPage('notifications');
}

function openActivityLogPage(){
  if(!canViewActivityLog()) return setCommandPage('home');
  state.page = 'activity-log';
  render();
  if(state.activityLogs === null) loadActivityLogs(true);
}
function activityProjectByUuid(projectUuid){
  return commandProjects().find(project => project.supabaseId === projectUuid) || null;
}
function activityActionLabel(action){
  const map = {
    create_project: 'Project dibuat',
    update_project_data: 'Data project diperbarui',
    archive_project: 'Project diarsipkan',
    restore_project: 'Project dipulihkan',
    activate_project: 'Project diaktifkan',
    complete_project: 'Project ditandai selesai',
    disable_client_access: 'Akses client dinonaktifkan',
    enable_client_access: 'Akses client diaktifkan',
    update_branding: 'Branding client diperbarui',
    upload_client_logo: 'Logo client diunggah',
    remove_client_logo: 'Logo client dihapus',
    create_schedule: 'Agenda dibuat',
    update_schedule: 'Agenda diperbarui',
    delete_schedule: 'Agenda dihapus',
    export_executive_summary: 'Ringkasan Eksekutif diunduh',
    export_report_pack: 'Paket Laporan Lengkap diunduh',
    export_timeline_pdf: 'Timeline PDF diunduh',
    export_project_backup: 'Backup project diunduh',
    export_all_projects_backup: 'Backup semua project diunduh',
    export_task_tracker_csv: 'Task Tracker CSV diunduh',
    export_schedule_csv: 'Schedule CSV diunduh',
    export_activity_log_csv: 'Activity Log CSV diunduh'
  };
  return map[action] || String(action || '-').replace(/_/g, ' ');
}
function activityModuleLabel(tableName){
  const map = {
    projects: 'Project',
    project_access: 'Client Access',
    project_branding: 'Branding',
    project_schedule_events: 'Schedule',
    tasks: 'Task Tracker',
    timeline_items: 'Timeline',
    reports: 'Report',
    backup: 'Backup & Export'
  };
  return map[tableName] || String(tableName || '-').replace(/_/g, ' ');
}
function activityDetailsText(row){
  const details = row?.details && typeof row.details === 'object' ? row.details : {};
  const parts = [];
  if(details.legacy_id) parts.push(details.legacy_id);
  if(details.project_code) parts.push(details.project_code);
  if(details.project_status) parts.push(`Status: ${details.project_status}`);
  if(details.title) parts.push(details.title);
  if(details.event_date) parts.push(formatDate(details.event_date));
  if(details.guest_email) parts.push(details.guest_email);
  if(details.report_type) parts.push(details.report_type);
  if(details.export_type) parts.push(details.export_type);
  if(details.scope) parts.push(`Scope: ${details.scope}`);
  if(details.rows) parts.push(`Rows: ${details.rows}`);
  if(details.total_projects) parts.push(`Projects: ${details.total_projects}`);
  if(details.updated_sections) parts.push(`Updated: ${Array.isArray(details.updated_sections) ? details.updated_sections.join(', ') : details.updated_sections}`);
  const text = parts.filter(Boolean).join(' · ');
  if(text) return text;
  try{ return JSON.stringify(details).slice(0, 180); }catch(_){ return '-'; }
}
function activityChangedBy(row){
  const details = row?.details && typeof row.details === 'object' ? row.details : {};
  return details.changed_by_email || details.actor_email || state.session?.email || '-';
}
async function logActivity(action, project = null, tableName = 'projects', recordId = null, details = {}){
  if(!canViewActivityLog()) return;
  try{
    const client = getSupabaseClient();
    const payload = {
      user_id: state.session.userId || null,
      project_id: project?.supabaseId || null,
      action,
      table_name: tableName,
      record_id: recordId || project?.supabaseId || null,
      details: {
        ...details,
        legacy_id: project?.id || details.legacy_id || null,
        project_code: project?.code || details.project_code || null,
        changed_by_email: state.session.email || details.changed_by_email || null
      }
    };
    const { error } = await client.from('audit_logs').insert(payload);
    if(error) throw error;
    state.activityLogs = null;
  }catch(err){
    console.warn('Activity log tidak berhasil dicatat:', err?.message || err);
  }
}
async function loadActivityLogs(silent = false){
  if(!canViewActivityLog()) return;
  state.activityLogBusy = true;
  if(!silent) state.activityLogMessage = { type:'info', text:'Memuat activity log...' };
  render();
  try{
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('audit_logs')
      .select('id,user_id,project_id,action,table_name,record_id,details,created_at')
      .order('created_at', { ascending:false })
      .limit(250);
    if(error) throw error;
    state.activityLogs = data || [];
    state.activityLogMessage = { type:'success', text:`${state.activityLogs.length} aktivitas terakhir dimuat.` };
  }catch(err){
    state.activityLogMessage = { type:'error', text: err?.message || 'Activity log gagal dimuat.' };
  }finally{
    state.activityLogBusy = false;
    render();
  }
}
function setActivityLogFilter(field, value){
  if(field === 'project') state.activityLogProjectFilter = value || 'all';
  if(field === 'action') state.activityLogActionFilter = value || 'all';
  if(field === 'search') state.activityLogSearch = value || '';
  render();
}
function activityRows(){
  const rows = state.activityLogs || [];
  const q = normalize(state.activityLogSearch);
  return rows.filter(row => {
    const project = activityProjectByUuid(row.project_id);
    const details = activityDetailsText(row);
    if(state.activityLogProjectFilter && state.activityLogProjectFilter !== 'all' && row.project_id !== state.activityLogProjectFilter) return false;
    if(state.activityLogActionFilter && state.activityLogActionFilter !== 'all' && row.action !== state.activityLogActionFilter) return false;
    if(q){
      const haystack = normalize(`${row.action} ${row.table_name} ${details} ${project?.code || ''} ${project?.name || ''} ${activityChangedBy(row)}`);
      if(!haystack.includes(q)) return false;
    }
    return true;
  });
}
function renderActivityLogPage(){
  if(!canViewActivityLog()) return renderPmHomePage();
  const rows = activityRows();
  const rawRows = state.activityLogs || [];
  const projects = commandProjects().filter(project => rawRows.some(row => row.project_id === project.supabaseId));
  const actions = [...new Set(rawRows.map(row => row.action).filter(Boolean))].sort();
  const message = state.activityLogMessage ? `<div class="inline-message ${esc(state.activityLogMessage.type)}">${esc(state.activityLogMessage.text)}</div>` : '';
  return `<main class="main command-main activity-main"><div class="topbar premium-topbar compact-topbar"><div class="title"><h1>Activity Log</h1><p>Riwayat perubahan operasional. Halaman ini hanya tersedia untuk Project Manager.</p></div><div class="actions"><button class="ghost-btn" onclick="setCommandPage('home')">Kembali ke Beranda</button><button class="primary-btn" onclick="loadActivityLogs()" ${state.activityLogBusy ? 'disabled' : ''}>${state.activityLogBusy ? 'Memuat...' : 'Refresh Log'}</button></div></div>
    <section class="activity-summary-grid"><div><span>Total Aktivitas</span><strong>${rawRows.length}</strong><small>250 aktivitas terbaru</small></div><div><span>Ditampilkan</span><strong>${rows.length}</strong><small>Setelah filter</small></div><div><span>Project Terkait</span><strong>${projects.length}</strong><small>Berdasarkan log terbaru</small></div></section>
    <section class="section-card activity-card"><div class="activity-toolbar"><input placeholder="Cari aktivitas, project, user..." value="${esc(state.activityLogSearch || '')}" oninput="setActivityLogFilter('search', this.value)"><select onchange="setActivityLogFilter('project', this.value)"><option value="all">Semua Project</option>${projects.map(project => `<option value="${esc(project.supabaseId)}" ${state.activityLogProjectFilter === project.supabaseId ? 'selected' : ''}>${esc(project.code)} — ${esc(project.name)}</option>`).join('')}</select><select onchange="setActivityLogFilter('action', this.value)"><option value="all">Semua Action</option>${actions.map(action => `<option value="${esc(action)}" ${state.activityLogActionFilter === action ? 'selected' : ''}>${esc(activityActionLabel(action))}</option>`).join('')}</select></div>${message}<div class="activity-timeline">${rows.length ? rows.map(row => {
      const project = activityProjectByUuid(row.project_id);
      return `<article class="activity-row"><div class="activity-dot"></div><div class="activity-content"><div class="activity-title"><strong>${esc(activityActionLabel(row.action))}</strong><em>${esc(activityModuleLabel(row.table_name))}</em></div><p>${esc(activityDetailsText(row) || '-')}</p><small>${esc(formatDate(row.created_at))} · ${esc(activityChangedBy(row))} · ${esc(project ? `${project.code} — ${project.name}` : 'General')}</small></div></article>`;
    }).join('') : `<div class="tiny-empty">Belum ada aktivitas yang sesuai filter.</div>`}</div></section></main>`;
}

/* =========================================================
   PM-only Data Backup and Pilihan Export
   ========================================================= */
function exportIsoStamp(){
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}
function csvEscape(value){
  const text = String(value ?? '');
  if(/[",\n\r;]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}
function rowsToCsv(rows, headers){
  const head = headers.map(h => csvEscape(h.label)).join(',');
  const body = rows.map(row => headers.map(h => csvEscape(typeof h.value === 'function' ? h.value(row) : row[h.value])).join(',')).join('\n');
  return [head, body].filter(Boolean).join('\n');
}
function backupProjectPayload(project){
  if(!project) return null;
  const metrics = metricSummary(project);
  return {
    exportMeta: {
      exportedAt: new Date().toISOString(),
      exportedBy: state.session?.label || '',
      exportedByEmail: state.session?.email || '',
      source: state.session?.dataSource || 'local',
      version: 'Project Backup Snapshot v1'
    },
    project: {
      legacyId: project.id,
      supabaseId: project.supabaseId || null,
      code: project.code || '',
      name: project.name || '',
      clientName: project.clientName || '',
      projectStatus: project.projectStatus || '',
      isActive: project.isActive !== false,
      startDate: project.startDate || '',
      endDate: project.endDate || '',
      currentPhaseTask: project.currentPhaseTask || '',
      nextMilestoneTask: project.nextMilestoneTask || '',
      picCywa: project.picCywa || '',
      picClient: project.picClient || ''
    },
    metrics,
    branding: brandingForProject(project),
    members: deepClone(project.members || []),
    timelinePlan: deepClone(project.timelinePlan || []),
    tasks: deepClone(project.tasks || []),
    documents: deepClone(project.documents || []),
    documentOutputs: deepClone(project.documentOutputs || []),
    projectUpdates: deepClone(project.meetings || []),
    scheduleEvents: deepClone(project.scheduleEvents || [])
  };
}
function selectedBackupProject(){
  const projects = commandProjects();
  const pickedId = state.backupExportProjectId || state.selectedProjectId || projects[0]?.id || '';
  return projects.find(project => project.id === pickedId) || projects[0] || null;
}
function setBackupExportProject(value){
  state.backupExportProjectId = value || '';
  state.backupExportMessage = null;
  render();
}
function setBackupExportMessage(type, text){
  state.backupExportMessage = {type, text};
  render();
}
async function exportProjectBackup(projectId){
  if(!canManageProjects()) return;
  const project = commandProjects().find(item => item.id === projectId) || selectedBackupProject();
  if(!project){ setBackupExportMessage('error', 'Belum ada project yang dapat diexport.'); return; }
  const payload = backupProjectPayload(project);
  const filename = `PPD_Backup_${safeFilename(project.code || project.id)}_${exportIsoStamp()}.json`;
  downloadTextFile(filename, JSON.stringify(payload, null, 2), 'application/json;charset=utf-8');
  await logActivity('export_project_backup', project, 'backup', project.supabaseId || null, { export_type: 'Project JSON Backup' });
  setBackupExportMessage('success', `Backup project ${project.code} berhasil dibuat.`);
}
async function exportAllProjectsBackup(){
  if(!canManageProjects()) return;
  const projects = commandProjects();
  const payload = {
    exportMeta: {
      exportedAt: new Date().toISOString(),
      exportedBy: state.session?.label || '',
      exportedByEmail: state.session?.email || '',
      source: state.session?.dataSource || 'local',
      version: 'All Projects Backup Snapshot v1'
    },
    totalProjects: projects.length,
    projects: projects.map(backupProjectPayload)
  };
  downloadTextFile(`PPD_All_Projects_Backup_${exportIsoStamp()}.json`, JSON.stringify(payload, null, 2), 'application/json;charset=utf-8');
  await logActivity('export_all_projects_backup', null, 'backup', null, { export_type: 'All Projects JSON Backup', total_projects: projects.length });
  setBackupExportMessage('success', 'Backup semua project berhasil dibuat.');
}
function projectTaskRows(project){
  return (project?.tasks || []).map((task, index) => ({
    no: index + 1,
    project_code: project.code || '',
    project_name: project.name || '',
    task: task.task || '',
    status: task.status || '',
    start_date_actual: task.startDate || '',
    end_date_actual: task.endDate || '',
    assigned_to: task.assignedTo || '',
    progress: task.progress ?? 0,
    notes: task.notes || ''
  }));
}
async function exportTaskTrackerCsv(projectId){
  if(!canManageProjects()) return;
  const project = commandProjects().find(item => item.id === projectId) || selectedBackupProject();
  if(!project){ setBackupExportMessage('error', 'Belum ada project yang dapat diexport.'); return; }
  const headers = [
    {label:'No', value:'no'}, {label:'Kode Project', value:'project_code'}, {label:'Nama Project', value:'project_name'},
    {label:'Task', value:'task'}, {label:'Status', value:'status'}, {label:'Tanggal Mulai Aktual', value:'start_date_actual'},
    {label:'Tanggal Selesai Aktual', value:'end_date_actual'}, {label:'Assigned To', value:'assigned_to'}, {label:'Progress', value:'progress'}, {label:'Notes', value:'notes'}
  ];
  const csv = rowsToCsv(projectTaskRows(project), headers);
  downloadTextFile(`PPD_Task_Tracker_${safeFilename(project.code || project.id)}_${exportIsoStamp()}.csv`, csv, 'text/csv;charset=utf-8');
  await logActivity('export_task_tracker_csv', project, 'backup', project.supabaseId || null, { export_type: 'Task Tracker CSV' });
  setBackupExportMessage('success', `Task Tracker ${project.code} berhasil diexport.`);
}
function scheduleExportRows(projectFilter = 'all'){
  return scheduleEventsFlat()
    .filter(event => projectFilter === 'all' || event.projectId === projectFilter)
    .sort((a,b) => `${a.date || ''} ${a.startTime || ''}`.localeCompare(`${b.date || ''} ${b.startTime || ''}`))
    .map((event, index) => ({
      no: index + 1,
      project_code: event.projectCode || '',
      project_name: event.projectName || '',
      date: event.date || '',
      start_time: event.startTime || '',
      end_time: event.endTime || '',
      title: event.title || '',
      type: event.type || '',
      delivery_mode: event.deliveryMode || '',
      location: event.location || '',
      description: event.description || '',
      internal: event.isInternal ? 'Yes' : 'No'
    }));
}
async function exportScheduleCsv(projectId = 'all'){
  if(!canManageProjects()) return;
  const headers = [
    {label:'No', value:'no'}, {label:'Kode Project', value:'project_code'}, {label:'Nama Project', value:'project_name'},
    {label:'Date', value:'date'}, {label:'Start Time', value:'start_time'}, {label:'End Time', value:'end_time'},
    {label:'Title', value:'title'}, {label:'Type', value:'type'}, {label:'Mode', value:'delivery_mode'},
    {label:'Location / Link', value:'location'}, {label:'Description', value:'description'}, {label:'Internal', value:'internal'}
  ];
  const project = commandProjects().find(item => item.id === projectId);
  const csv = rowsToCsv(scheduleExportRows(projectId || 'all'), headers);
  const suffix = project ? safeFilename(project.code || project.id) : 'All_Projects';
  downloadTextFile(`PPD_Schedule_${suffix}_${exportIsoStamp()}.csv`, csv, 'text/csv;charset=utf-8');
  await logActivity('export_schedule_csv', project || null, 'backup', project?.supabaseId || null, { export_type: 'Schedule CSV', scope: project ? project.code : 'all' });
  setBackupExportMessage('success', `Schedule ${project ? project.code : 'semua project'} berhasil diexport.`);
}
async function fetchActivityLogRows(limit = 500){
  const client = getSupabaseClient();
  if(!client) return state.activityLogs || [];
  const { data, error } = await client
    .from('audit_logs')
    .select('id,user_id,project_id,action,table_name,record_id,details,created_at')
    .order('created_at', { ascending:false })
    .limit(limit);
  if(error) throw error;
  return data || [];
}
async function exportActivityLogCsv(){
  if(!canManageProjects()) return;
  state.backupExportBusy = true;
  state.backupExportMessage = {type:'info', text:'Menyiapkan Activity Log CSV...'};
  render();
  try{
    const rows = await fetchActivityLogRows(500);
    const mapped = rows.map((row, index) => {
      const project = activityProjectByUuid(row.project_id);
      return {
        no: index + 1,
        created_at: row.created_at || '',
        action: activityActionLabel(row.action),
        raw_action: row.action || '',
        module: activityModuleLabel(row.table_name),
        project: project ? `${project.code} — ${project.name}` : 'General',
        changed_by: activityChangedBy(row),
        details: activityDetailsText(row)
      };
    });
    const headers = [
      {label:'No', value:'no'}, {label:'Created At', value:'created_at'}, {label:'Action', value:'action'},
      {label:'Raw Action', value:'raw_action'}, {label:'Module', value:'module'}, {label:'Project', value:'project'},
      {label:'Changed By', value:'changed_by'}, {label:'Details', value:'details'}
    ];
    downloadTextFile(`PPD_Activity_Log_${exportIsoStamp()}.csv`, rowsToCsv(mapped, headers), 'text/csv;charset=utf-8');
    await logActivity('export_activity_log_csv', null, 'backup', null, { export_type: 'Activity Log CSV', rows: mapped.length });
    state.backupExportMessage = {type:'success', text:'Activity Log berhasil diunduh.'};
  }catch(err){
    state.backupExportMessage = {type:'error', text: err?.message || 'Activity Log gagal diunduh.'};
  }finally{
    state.backupExportBusy = false;
    render();
  }
}
function renderDataBackupPage(){
  if(!canManageProjects()) return renderPmHomePage();
  const projects = commandProjects();
  const selected = selectedBackupProject();
  const message = state.backupExportMessage ? `<div class="inline-message ${esc(state.backupExportMessage.type)}">${esc(state.backupExportMessage.text)}</div>` : '';
  const taskCount = selected?.tasks?.length || 0;
  const scheduleCount = selected?.scheduleEvents?.length || 0;
  const docCount = (selected?.documents?.length || 0) + (selected?.documentOutputs?.length || 0);
  return `<main class="main command-main backup-main"><div class="topbar premium-topbar compact-topbar"><div class="title"><h1>Backup Data</h1><p>Unduh snapshot project dan data operasional. Halaman ini hanya tersedia untuk Project Manager.</p></div><div class="actions"><button class="ghost-btn" onclick="setCommandPage('home')">Kembali ke Beranda</button><button class="primary-btn" onclick="exportAllProjectsBackup()">Backup Semua Project</button></div></div>
    <section class="backup-hero"><div class="backup-hero-copy"><span>Pusat Export PM</span><h2>Backup snapshot dan export data operasional</h2><p>Pilih project, tinjau ringkasan data, lalu unduh file backup atau CSV untuk kebutuhan dokumentasi internal.</p></div><div class="backup-project-picker"><label for="backupProjectSelect">Pilih Project</label><select id="backupProjectSelect" onchange="setBackupExportProject(this.value)">${projects.map(project => `<option value="${esc(project.id)}" ${selected?.id === project.id ? 'selected' : ''}>${esc(project.code)} — ${esc(project.name)}</option>`).join('')}</select><small>Data yang diunduh mengikuti project yang dipilih.</small></div></section>
    ${message}
    <section class="backup-section"><div class="backup-section-heading"><span>Ringkasan Data</span><h3>Ringkasan Data</h3></div><div class="backup-stats-grid"><div><span>Project</span><strong>${projects.length}</strong><small>Tersedia untuk backup</small></div><div><span>Task</span><strong>${taskCount}</strong><small>Project terpilih</small></div><div><span>Dokumen</span><strong>${docCount}</strong><small>List dan output</small></div><div><span>Schedule</span><strong>${scheduleCount}</strong><small>Agenda project</small></div></div></section>
    <section class="backup-section"><div class="backup-section-heading"><span>Pilihan Export</span><h3>Pilih Jenis File</h3></div><div class="backup-action-grid">
      <article class="backup-action-card primary"><span>Snapshot Project</span><h3>Backup Project Terpilih</h3><p>Snapshot lengkap berisi profil project, metrik, branding, timeline, task, dokumen, update, dan schedule.</p><button class="primary-btn" onclick="exportProjectBackup('${esc(selected?.id || '')}')">Unduh JSON</button></article>
      <article class="backup-action-card"><span>CSV Export</span><h3>Task Tracker</h3><p>Unduh data realisasi task untuk analisis, review, atau dokumentasi internal.</p><button class="ghost-btn" onclick="exportTaskTrackerCsv('${esc(selected?.id || '')}')">Unduh CSV</button></article>
      <article class="backup-action-card"><span>CSV Export</span><h3>Schedule</h3><p>Unduh agenda untuk project terpilih atau seluruh project yang tersedia.</p><div class="split-actions"><button class="ghost-btn" onclick="exportScheduleCsv('${esc(selected?.id || '')}')">Project Ini</button><button class="ghost-btn" onclick="exportScheduleCsv('all')">Semua</button></div></article>
      <article class="backup-action-card"><span>Audit</span><h3>Activity Log</h3><p>Unduh 500 aktivitas terbaru untuk kebutuhan audit internal Project Manager.</p><button class="ghost-btn" onclick="exportActivityLogCsv()" ${state.backupExportBusy ? 'disabled' : ''}>${state.backupExportBusy ? 'Menyiapkan...' : 'Unduh CSV'}</button></article>
    </div></section>
    <section class="backup-security-note"><div><strong>Catatan keamanan</strong><p>Backup bersifat read-only dan tidak melakukan restore otomatis. Simpan file di lokasi internal yang aman karena dapat berisi informasi operasional project.</p></div></section>
  </main>`;
}

function renderNotificationStatCard(){
  const counts = notificationCounts();
  return `<button class="home-stat-card notification ${counts.high ? 'urgent' : ''}" onclick="setCommandPage('notifications')"><span>Notifikasi</span><strong>${counts.total}</strong><small>${counts.high ? `${counts.high} perlu perhatian segera.` : counts.total ? 'Agenda dan tindak lanjut aktif.' : 'Tidak ada notifikasi penting.'}</small></button>`;
}
function renderNotificationItem(item){
  const dateText = item.date ? formatDate(item.date) : '-';
  return `<article class="notification-row ${esc(item.severity)}">
    <div class="notification-marker"></div>
    <div class="notification-body"><div class="notification-title"><strong>${esc(item.title)}</strong><em>${esc(item.category)}</em></div><p>${esc(item.detail)}</p><small>${esc(item.projectCode || 'Project')} · ${esc(dateText)}</small></div>
    <button type="button" class="ghost-btn" onclick="openNotificationTarget('${esc(item.actionType)}','${esc(item.projectId || '')}','${esc(item.eventId || '')}')">${esc(item.actionLabel || 'Buka')}</button>
  </article>`;
}
function renderNotificationCenterPage(){
  const allItems = notificationItems();
  const filter = state.notificationFilter || 'all';
  const items = allItems.filter(item => filter === 'all' || item.severity === filter || item.category === filter);
  const counts = notificationCounts();
  const filters = [
    ['all', `Semua (${counts.total})`],
    ['high', `Prioritas Tinggi (${counts.high})`],
    ['medium', `Perlu Review (${counts.medium})`],
    ['Agenda Hari Ini', `Hari Ini (${counts.today})`],
    ['Agenda 7 Hari', `7 Hari (${counts.upcoming})`]
  ];
  return `<main class="main command-main notification-main"><div class="topbar premium-topbar compact-topbar"><div class="title"><h1>Notifikasi</h1><p>Ringkasan prioritas, agenda, dan tindak lanjut operasional.</p></div><div class="actions"><button class="ghost-btn" onclick="setCommandPage('home')">Kembali ke Beranda</button><button class="primary-btn" onclick="setCommandPage('schedule')">Buka Schedule</button></div></div>
    <section class="notification-summary-grid"><div><span>Prioritas Tinggi</span><strong>${counts.high}</strong><small>Task yang melewati jadwal atau perlu perhatian.</small></div><div><span>Perlu Review</span><strong>${counts.medium}</strong><small>Task dalam status hold/blocked atau project yang perlu keputusan.</small></div><div><span>Agenda Hari Ini</span><strong>${counts.today}</strong><small>Agenda yang berjalan hari ini.</small></div><div><span>Agenda 7 Hari</span><strong>${counts.upcoming}</strong><small>Agenda mendatang.</small></div></section>
    <section class="section-card command-card notification-panel"><div class="section-head premium-section-head"><div><h2>Pusat Notifikasi</h2><p class="section-subtitle">Klik tombol aksi untuk membuka project, agenda, atau halaman pengelolaan terkait.</p></div></div><div class="notification-filters">${filters.map(([value,label]) => `<button class="${filter === value ? 'active' : ''}" onclick="setNotificationFilter('${esc(value)}')">${esc(label)}</button>`).join('')}</div><div class="notification-list">${items.length ? items.map(renderNotificationItem).join('') : '<div class="tiny-empty">Tidak ada notifikasi pada filter ini.</div>'}</div></section>
  </main>`;
}

function documentReadinessForProjects(projects){
  const total = projects.reduce((sum, project) => sum + (project.documents || []).length + (project.documentOutputs || []).length, 0);
  const completed = projects.reduce((sum, project) => sum
    + (project.documents || []).filter(doc => isCompletedStatus(doc.status) || normalize(doc.reviewStatus).includes('approved')).length
    + (project.documentOutputs || []).filter(doc => isCompletedStatus(doc.status)).length, 0);
  return { total, completed, percent: total ? Math.round((completed / total) * 100) : 0 };
}
function visibleClientUpdates(projects){
  return projects.flatMap(project => (project.meetings || [])
    .filter(meetingVisibleToCurrentUser)
    .map(update => ({...update, projectId: project.id, projectCode: project.code, projectName: project.name})))
    .sort((a,b) => String(b.date || '').localeCompare(String(a.date || '')));
}
function clientScheduleEventsForProjects(projects){
  const ids = new Set((projects || []).map(project => project.id));
  return scheduleEventsFlat().filter(event => ids.has(event.projectId));
}
function renderClientProjectSelector(){
  const allProjects = clientPortalProjects();
  if(allProjects.length <= 1){
    const project = allProjects[0];
    return `<div class="client-project-pill"><span>Project</span><strong>${esc(project ? `${project.code} — ${project.name}` : '-')}</strong></div>`;
  }
  return `<label class="client-project-filter"><span>Pilih Project</span><select onchange="setClientProjectFilter(this.value)"><option value="all" ${state.clientProjectFilter === 'all' ? 'selected' : ''}>Semua Project Saya</option>${allProjects.map(project => `<option value="${esc(project.id)}" ${state.clientProjectFilter === project.id ? 'selected' : ''}>${esc(project.code)} — ${esc(project.name)}</option>`).join('')}</select></label>`;
}
function renderClientAgendaSection(events){
  const today = todayISO();
  const upcoming = events.filter(event => String(event.date || '') >= today).sort((a,b) => `${a.date || ''} ${a.startTime || ''}`.localeCompare(`${b.date || ''} ${b.startTime || ''}`)).slice(0,8);
  return `<section class="section-card command-card client-portal-panel"><div class="section-head premium-section-head"><div><h2>Agenda Project</h2><p class="section-subtitle">Agenda project yang dapat Anda pantau secara langsung.</p></div><button class="ghost-btn" onclick="setCommandPage('schedule')">Lihat Schedule</button></div><div class="client-agenda-list">${upcoming.length ? upcoming.map(event => `<button type="button" class="agenda-event-row ${scheduleDeliveryModeClass(event)}" onclick="openScheduleAgenda('${esc(event.projectId)}','${esc(event.id)}')"><b>${esc(formatDate(event.date))}</b><span>${esc(event.title || '-')}</span><small>${esc(timeRangeLabel(event))} · ${esc(event.projectCode || '')} · ${esc(scheduleDeliveryModeLabel(event.deliveryMode))}</small></button>`).join('') : '<div class="empty-schedule">Belum ada agenda project terdekat.</div>'}</div></section>`;
}
function renderClientLatestUpdates(projects){
  const updates = visibleClientUpdates(projects).slice(0,5);
  return `<section class="section-card command-card client-portal-panel"><div class="section-head premium-section-head"><div><h2>Update Terbaru</h2><p class="section-subtitle">Ringkasan perkembangan terbaru project Anda.</p></div></div><div class="client-update-list">${updates.length ? updates.map(update => `<article><span>${esc(formatDate(update.date))}</span><strong>${esc(update.projectCode || 'Project')}</strong><p>${esc(meetingDisplayNote(update) || meetingDisplayAction(update) || 'Update project tersedia.')}</p>${meetingDisplayAction(update) ? `<small>${esc(meetingDisplayAction(update))}</small>` : ''}</article>`).join('') : '<div class="empty-schedule">Belum ada update terbaru untuk ditampilkan.</div>'}</div></section>`;
}
function clientProjectStatusSummary(projects){
  if(!projects.length) return { value: '-', tone: '', note: 'Belum ada project yang tersedia.' };
  if(projects.length === 1){
    const project = projects[0];
    return {
      value: projectStatusLabel(project),
      tone: projectIsCompleted(project) ? 'completed' : 'running',
      note: `${project.code || 'Project'} · ${project.name || 'Project yang dipilih.'}`
    };
  }
  const running = projects.filter(projectIsRunning).length;
  const completed = projects.filter(projectIsCompleted).length;
  return {
    value: `${running}/${projects.length}`,
    tone: running ? 'running' : 'completed',
    note: `${running} berjalan · ${completed} selesai.`
  };
}
function clientNextAgendaSummary(nextEvent){
  if(!nextEvent) return { value: '-', note: 'Belum ada agenda terdekat.' };
  return {
    value: formatDate(nextEvent.date),
    note: `${timeRangeLabel(nextEvent)} · ${nextEvent.title || 'Agenda project'}`
  };
}
function renderClientHomePage(){
  const projects = clientFilteredProjects();
  const events = clientScheduleEventsForProjects(projects);
  const todayEvents = events.filter(event => event.date === todayISO()).sort((a,b) => `${a.startTime || ''}`.localeCompare(`${b.startTime || ''}`));
  const nextEvent = events.filter(event => String(event.date || '') >= todayISO()).sort((a,b) => `${a.date || ''} ${a.startTime || ''}`.localeCompare(`${b.date || ''} ${b.startTime || ''}`))[0];
  const avgProgress = projects.length ? Math.round(projects.reduce((sum, project) => sum + projectProgressValue(project), 0) / projects.length) : 0;
  const docs = documentReadinessForProjects(projects);
  const status = clientProjectStatusSummary(projects);
  const nextAgenda = clientNextAgendaSummary(nextEvent);
  const updateCount = visibleClientUpdates(projects).length;
  return `<main class="main command-main client-portal-main"><div class="topbar premium-topbar compact-topbar client-home-hero"><div class="title"><h1>Beranda</h1><p>Ringkasan project, dokumen, dan agenda yang tersedia untuk Anda.</p></div><div class="actions client-home-actions">${renderClientProjectSelector()}<button class="primary-btn" onclick="setCommandPage('schedule')">Lihat Schedule</button></div></div><section class="home-stats-grid client-stats-grid"><div class="home-stat-card ${esc(status.tone)} client-status-card"><span>Status Project</span><strong class="stat-word">${esc(status.value)}</strong><small>${esc(status.note)}</small></div><div class="home-stat-card average"><span>Progress Project</span><strong>${avgProgress}%</strong><small>Progress berdasarkan pembaruan project.</small></div><div class="home-stat-card"><span>Kesiapan Dokumen</span><strong>${docs.percent}%</strong><small>${docs.completed}/${docs.total || 0} dokumen telah selesai/disetujui.</small></div>${renderTodayScheduleCard(todayEvents)}<div class="home-stat-card"><span>Agenda Terdekat</span><strong class="stat-word">${esc(nextAgenda.value)}</strong><small>${esc(nextAgenda.note)}</small></div><div class="home-stat-card"><span>Update Terbaru</span><strong>${updateCount}</strong><small>${updateCount ? 'Update project yang tersedia untuk Anda.' : 'Belum ada update terbaru.'}</small></div></section>${renderClientAgendaSection(events)}${renderClientLatestUpdates(projects)}</main>`;
}

function renderPmHomePage(){
  const projects = commandProjects();
  const running = projects.filter(projectIsRunning);
  const completed = projects.filter(projectIsCompleted);
  const todayEvents = scheduleEventsFlat().filter(event => event.date === todayISO()).sort((a,b) => `${a.startTime || ''}`.localeCompare(`${b.startTime || ''}`));
  const avgProgress = projects.length ? Math.round(projects.reduce((sum, project) => sum + projectProgressValue(project), 0) / projects.length) : 0;
  return `<main class="main command-main"><div class="topbar premium-topbar compact-topbar"><div class="title"><h1>Beranda</h1><p>Pusat kendali harian untuk Project Manager dan Admin.</p></div><div class="actions"><button class="ghost-btn" onclick="setCommandPage('notifications')">Notifikasi</button><button class="ghost-btn" onclick="setCommandPage('project-management')">Kelola <em>Project</em></button><button class="primary-btn" onclick="setCommandPage('schedule')">Buka Schedule</button></div></div><section class="home-stats-grid"><button class="home-stat-card" onclick="openHomePanel('all')"><span>Total Project</span><strong>${projects.length}</strong><small>Semua project aktif yang siap dipantau.</small></button><button class="home-stat-card running" onclick="openHomePanel('running')"><span>Total Project Berjalan</span><strong>${running.length}</strong><small>Klik untuk melihat progress setiap project.</small></button><button class="home-stat-card completed" onclick="openHomePanel('completed')"><span>Total Project Selesai</span><strong>${completed.length}</strong><small>Project dengan progress 100%.</small></button>${renderTodayScheduleCard(todayEvents)}${renderNotificationStatCard()}<div class="home-stat-card average"><span>Rata-rata Progress</span><strong>${avgProgress}%</strong><small>Rata-rata dari seluruh project aktif.</small></div></section>${renderProjectAgendaToday(todayEvents)}${renderHomePanel()}</main>`;
}
function renderScheduleEventChip(event, compact = false){
  const title = `${timeRangeLabel(event)} · ${event.title}`;
  const action = canManageProjects()
    ? `editScheduleEvent('${esc(event.projectId)}','${esc(event.id)}')`
    : `selectScheduleDate('${esc(event.date)}')`;
  const modeClass = scheduleDeliveryModeClass(event);
  const modeLabel = scheduleDeliveryModeLabel(event.deliveryMode);
  return `<button type="button" class="schedule-event-chip ${modeClass} ${compact ? 'compact' : ''}" title="${esc(title)}" onclick="event.stopPropagation(); ${action}"><span>${esc(timeRangeLabel(event))}</span><strong>${esc(event.title)}</strong><small>${esc(modeLabel)} · ${esc(event.projectCode || '')}</small></button>`;
}
function renderScheduleCalendar(){
  ensureScheduleState();
  const monthStart = dateValue(state.scheduleMonth) || new Date();
  const first = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1);
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - first.getDay());
  const cells = Array.from({length: 42}, (_, index) => addDays(gridStart, index));
  const currentMonth = first.getMonth();
  const today = todayISO();
  return `<div class="schedule-calendar"><div class="schedule-weekdays">${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map(day => `<span>${day}</span>`).join('')}</div><div class="schedule-grid">${cells.map(day => {
    const iso = toISODate(day);
    const events = scheduleEventsForDate(iso);
    const muted = day.getMonth() !== currentMonth;
    const selected = state.scheduleSelectedDate === iso;
    return `<div role="button" tabindex="0" class="schedule-day ${muted ? 'muted' : ''} ${today === iso ? 'today' : ''} ${selected ? 'selected' : ''}" onclick="selectScheduleDate('${iso}')" onkeydown="if(event.key==='Enter'){selectScheduleDate('${iso}')}"><span class="schedule-day-number">${day.getDate()}</span><div class="schedule-day-events">${events.slice(0,3).map(event => renderScheduleEventChip(event, true)).join('')}${events.length > 3 ? `<em>+${events.length - 3} agenda</em>` : ''}</div></div>`;
  }).join('')}</div></div>`;
}
function renderScheduleSidePanel(){
  ensureScheduleState();
  const selectedEvents = scheduleEventsForDate(state.scheduleSelectedDate);
  const draft = state.scheduleDraft || {};
  const projects = commandProjects();
  const message = state.scheduleMessage ? `<div class="project-admin-alert ${esc(state.scheduleMessage.type)}">${esc(state.scheduleMessage.text)}</div>` : '';
  const form = canManageProjects() ? `<form class="schedule-form" data-schedule-form="true" onsubmit="saveScheduleEvent(event)">
    <div class="schedule-form-head">
      <div><h3>${draft.id ? 'Edit Agenda' : 'Tambah Agenda'}</h3><p>${draft.id ? 'Perbarui agenda yang dipilih, lalu simpan.' : 'PM dapat mengisi agenda harian project.'}</p></div>
      ${draft.id ? `<button type="button" class="ghost-btn" onclick="resetScheduleDraft();focusScheduleForm()">Agenda Baru</button>` : ''}
    </div>
    <label>Project<select onchange="updateScheduleDraft('projectId', this.value)">${projects.map(project => `<option value="${esc(project.id)}" ${project.id === draft.projectId ? 'selected' : ''}>${esc(project.code)} — ${esc(project.name)}</option>`).join('')}</select></label>
    <label>Judul Agenda<input data-schedule-title="true" value="${esc(draft.title || '')}" oninput="updateScheduleDraft('title', this.value)" placeholder="Contoh: Project Sync"></label>
    <div class="form-grid two"><label>Tanggal<input type="date" value="${esc(draft.date || '')}" onchange="updateScheduleDraft('date', this.value)"></label><label>Tipe<select onchange="updateScheduleDraft('type', this.value)">${SCHEDULE_EVENT_TYPES.map(type => `<option value="${esc(type)}" ${type === draft.type ? 'selected' : ''}>${esc(type)}</option>`).join('')}</select></label></div>
    <div class="form-grid two"><label>Start Time<input type="time" value="${esc(draft.startTime || '')}" onchange="updateScheduleDraft('startTime', this.value)"></label><label>End Time<input type="time" value="${esc(draft.endTime || '')}" onchange="updateScheduleDraft('endTime', this.value)"></label></div>
    <label>Mode Pelaksanaan<select onchange="updateScheduleDraft('deliveryMode', this.value)">${SCHEDULE_DELIVERY_MODES.map(mode => `<option value="${esc(mode)}" ${mode === scheduleDeliveryModeLabel(draft.deliveryMode) ? 'selected' : ''}>${esc(mode)}</option>`).join('')}</select><small class="field-hint">Warna agenda di kalender mengikuti mode Online atau Onsite.</small></label>
    <label>${esc(scheduleLocationLabel())}<input value="${esc(draft.location || '')}" oninput="updateScheduleDraft('location', this.value)" placeholder="${esc(scheduleLocationPlaceholder())}"></label>
    <label>Description<textarea oninput="updateScheduleDraft('description', this.value)" placeholder="Catatan agenda singkat">${esc(draft.description || '')}</textarea></label>
    <label class="checkbox-row"><input type="checkbox" ${draft.isInternal ? 'checked' : ''} onchange="updateScheduleDraft('isInternal', this.checked)"> Internal agenda</label>
    <div class="schedule-actions"><button type="submit" class="primary-btn" ${state.scheduleBusy ? 'disabled' : ''}>${state.scheduleBusy ? 'Menyimpan...' : 'Simpan Agenda'}</button>${draft.id ? `<button type="button" class="danger-btn" onclick="deleteScheduleEvent('${esc(draft.id)}')">Hapus</button>` : ''}</div>
  </form>` : `<div class="schedule-readonly-note">${isClientPortalSession() ? 'Anda dapat memantau agenda project yang tersedia.' : 'Admin dapat melihat schedule. Pengisian agenda hanya untuk Project Manager.'}</div>`;
  return `<aside class="schedule-side">
    ${message}
    <section class="schedule-date-card"><div class="schedule-card-title"><div><h3>${formatDate(state.scheduleSelectedDate)}</h3><p>${selectedEvents.length} agenda pada tanggal ini.</p></div>${canManageProjects() ? `<button type="button" class="small-btn" onclick="resetScheduleDraft('${esc(state.scheduleSelectedDate)}');focusScheduleForm()">+ Agenda</button>` : ''}</div><div class="schedule-selected-list">${selectedEvents.length ? selectedEvents.map(event => {
      const active = draft.id && (draft.id === event.id || draft.id === event.supabaseId);
      const mode = scheduleDeliveryModeLabel(event.deliveryMode);
      const modeClass = scheduleDeliveryModeClass(event);
      const locationText = String(event.location || '').trim();
      const locationHtml = locationText ? (/^https?:\/\//i.test(locationText) ? `<a href="${esc(locationText)}" target="_blank" rel="noopener">${esc(locationText)}</a>` : `<span>${esc(locationText)}</span>`) : '<span>-</span>';
      return `<article class="schedule-selected-item ${active ? 'active' : ''}">
        <div class="schedule-item-title"><strong>${esc(event.title)}</strong><em class="${modeClass}">${esc(mode)}</em></div>
        <div class="schedule-item-meta"><span>${esc(timeRangeLabel(event))}</span><span>${esc(event.projectCode || '')}</span><span>${esc(scheduleTypeLabel(event.type))}</span></div>
        <div class="schedule-item-location"><b>${mode.toLowerCase() === 'onsite' ? 'Location' : 'Meeting Link'}</b>${locationHtml}</div>
        ${event.description ? `<p>${esc(event.description)}</p>` : ''}
        ${canManageProjects() ? `<button type="button" class="ghost-btn" onclick="editScheduleEvent('${esc(event.projectId)}','${esc(event.id)}')">${active ? 'Sedang Diedit' : 'Edit Agenda'}</button>` : ''}
      </article>`;
    }).join('') : `<div class="tiny-empty">Tidak ada agenda di tanggal ini.</div>`}</div></section>
    ${form}
  </aside>`;
}
function renderSchedulePage(){
  ensureScheduleState();
  const projects = commandProjects();
  const ym = state.scheduleMonth.slice(0,7);
  const isClient = isClientPortalSession();
  const title = isClient ? 'Schedule Project' : 'Schedule';
  const subtitle = isClient ? 'Kalender agenda project yang tersedia untuk Anda.' : 'Kalender agenda operasional. Pengisian agenda hanya dapat dilakukan oleh Project Manager.';
  const allLabel = isClient ? 'Semua Project Saya' : 'Semua Project';
  return `<main class="main command-main schedule-main ${isClient ? 'client-schedule-main' : ''}"><div class="topbar premium-topbar compact-topbar schedule-hero"><div class="title"><h1>${esc(title)}</h1><p>${esc(subtitle)}</p></div><div class="actions schedule-top-actions"><button type="button" class="ghost-btn icon" onclick="setScheduleMonth(-1)">‹</button><input type="month" value="${esc(ym)}" onchange="setScheduleMonthValue(this.value)"><button type="button" class="ghost-btn icon" onclick="setScheduleMonth(1)">›</button><button type="button" class="ghost-btn" onclick="state.scheduleMonth=monthISO(new Date()); state.scheduleSelectedDate=todayISO(); render()">Today</button><select aria-label="Filter Project" onchange="setScheduleProjectFilter(this.value)"><option value="all">${esc(allLabel)}</option>${projects.map(project => `<option value="${esc(project.id)}" ${state.scheduleProjectFilter === project.id ? 'selected' : ''}>${esc(project.code)}</option>`).join('')}</select></div></div>${scheduleModeLegend()}<div class="schedule-layout">${renderScheduleCalendar()}${renderScheduleSidePanel()}</div></main>`;
}

function renderMain(){
  if(state.page === 'home' && canAccessCommandCenter()) return renderPmHomePage();
  if(state.page === 'home' && canAccessClientPortal()) return renderClientHomePage();
  if(state.page === 'schedule' && canAccessSchedulePage()) return renderSchedulePage();
  if(state.page === 'notifications' && canAccessCommandCenter()) return renderNotificationCenterPage();
  if(state.page === 'activity-log' && canViewActivityLog()) return renderActivityLogPage();
  if(state.page === 'backup-tools' && canManageProjects()) return renderDataBackupPage();
  if(state.page === 'pm-settings' && canManagePasswords()) return renderPmPengaturansPage();
  if(state.page === 'project-management' && canManageProjects()) return renderProjectManagementPage();
  if(state.page === 'input-data' && state.session?.canEdit) return renderInputDataPage();
  if(state.page === 'edit-project' && state.session?.canEdit) return renderEditProjectPage();
  if(state.page === 'new-project' && state.session?.canEdit) return renderNewProjectIntro();
  return renderDashboardMain();
}

function render(){
  app.innerHTML = `<div class="app-shell">${renderSidebar()}${renderMain()}</div>`;
}

Object.assign(window, {
  state,
  render,
  logout,
  setProject,
  resetLocalChanges,
  exportChanges,
  saveProjectManual,
  deleteCurrentProject,
  resetAccessPassword,
  loadPasswordAuditLog,
  openActivityLogPage,
  loadActivityLogs,
  setActivityLogFilter,
  setBackupExportProject,
  exportProjectBackup,
  exportAllProjectsBackup,
  exportTaskTrackerCsv,
  exportScheduleCsv,
  exportActivityLogCsv,
  exportTimelinePdf,
  updateProjectMeta,
  updateMembers,
  updateMember,
  addMember,
  deleteMember,
  startNewProject,
  updateNewProjectField,
  addDraftRow,
  updateDraftRow,
  deleteDraftRow,
  toggleDraftNone,
  createProjectFromDraft,
  updateTimelinePlan,
  syncTasksFromTimeline,
  updateTimelinePlanType,
  addTimelinePlan,
  addTimelinePhase,
  updateTimelinePhase,
  deleteTimelinePhase,
  deleteTimelinePlan,
  updateTask,
  addTask,
  deleteTask,
  updateDocument,
  addDocument,
  deleteDocument,
  updateDocumentOutput,
  addDocumentOutput,
  deleteDocumentOutput,
  updateMeeting,
  addMeeting,
  deleteMeeting
});

/* bootApp dipanggil di bagian akhir file setelah fitur premium siap. */

/* =========================================================
   Premium dashboard upgrade — executive, interactive, report-ready.
   Added without external dependency so the prototype stays free/offline.
   ========================================================= */
function ensurePremiumState(){
  if(!state.taskView) state.taskView = 'table';
  if(!state.taskFilterStatus) state.taskFilterStatus = 'all';
  if(!state.taskFilterOwner) state.taskFilterOwner = 'all';
  if(!state.documentFilterStatus) state.documentFilterStatus = 'all';
  if(!state.meetingFilter) state.meetingFilter = 'all';
  if(!state.timelineFilter) state.timelineFilter = 'all';
  if(!state.timelineZoom) state.timelineZoom = 'month';
  if(typeof state.presentationMode !== 'boolean') state.presentationMode = false;
  if(typeof state.commandOpen !== 'boolean') state.commandOpen = false;
  if(state.commandQuery === undefined) state.commandQuery = '';
  if(state.drawer === undefined) state.drawer = null;
  if(state.tourStep === undefined) state.tourStep = null;
}
function jsValue(v){ return JSON.stringify(v ?? ''); }
function startOfDay(date = new Date()){
  const d = new Date(date);
  d.setHours(0,0,0,0);
  return d;
}
function addDays(date, days){
  const d = startOfDay(date);
  d.setDate(d.getDate() + days);
  return d;
}
function daysBetween(a,b){ return Math.round((startOfDay(b) - startOfDay(a)) / 86400000); }
function isCompletedStatus(v){ return normalize(v) === 'completed' || normalize(v).includes('completed'); }
function isHoldStatus(v){ const s = normalize(v); return s.includes('hold') || s.includes('block'); }
function getAllTimelinePhases(project){
  return normalizeTimelineItems(project?.timelinePlan || []).flatMap((item, itemIndex) => {
    const phases = (item.phases && item.phases.length) ? item.phases : [{label:'Timeline', type:item.type || 'assessment', startDate:item.startDate, endDate:item.endDate}];
    return phases.map((phase, phaseIndex) => ({
      task: item.task,
      itemIndex,
      phaseIndex,
      label: phase.label || item.task || 'Timeline',
      type: phase.type || item.type || 'assessment',
      startDate: toISODate(phase.startDate || item.startDate),
      endDate: toISODate(phase.endDate || item.endDate),
      start: dateValue(phase.startDate || item.startDate),
      end: dateValue(phase.endDate || item.endDate)
    })).filter(phase => phase.start || phase.end || phase.task);
  });
}
function getLatestDate(project){
  const values = [project?.startDate, project?.endDate];
  (project?.tasks || []).forEach(t => values.push(t.startDate, t.endDate));
  (project?.documents || []).forEach(d => values.push(d.date));
  (project?.documentOutputs || []).forEach(d => values.push(d.date));
  (project?.meetings || []).forEach(m => values.push(m.date));
  const dates = values.map(dateValue).filter(Boolean).sort((a,b) => b - a);
  return dates[0] || null;
}
function getLeadMember(project, keywords){
  const members = normalizeMembers(project?.members || []);
  const found = members.find(member => keywords.some(k => normalize(member.role).includes(k) || normalize(member.name).includes(k)));
  return found?.name || members[0]?.name || '-';
}
function getCurrentPhase(project){
  const manualValue = String(project?.currentPhaseTask || '').trim();
  const manual = normalize(manualValue);
  const phases = getAllTimelinePhases(project).filter(phase => phase.start && phase.end);
  if(manual){
    const picked = phases.find(phase => normalize(phase.task) === manual || normalize(phase.label) === manual);
    if(picked){
      const genericLabel = !picked.label || normalize(picked.label) === 'timeline' || normalize(picked.label) === normalize(picked.type);
      return {
        ...picked,
        label: genericLabel ? (picked.task || manualValue) : picked.label,
        displayLabel: manualValue || picked.task || picked.label,
        manual: true
      };
    }
    return {
      task: manualValue,
      label: manualValue,
      displayLabel: manualValue,
      startDate: '',
      endDate: '',
      manual: true
    };
  }
  const today = startOfDay();
  const current = phases.find(phase => startOfDay(phase.start) <= today && startOfDay(phase.end) >= today);
  if(current){
    const genericLabel = !current.label || normalize(current.label) === 'timeline' || normalize(current.label) === normalize(current.type);
    return {...current, label: genericLabel ? (current.task || current.label) : current.label};
  }
  const next = phases.filter(phase => phase.start && startOfDay(phase.start) > today).sort((a,b) => a.start - b.start)[0];
  if(next){
    const genericLabel = !next.label || normalize(next.label) === 'timeline' || normalize(next.label) === normalize(next.type);
    return {...next, label: genericLabel ? (next.task || next.label) : next.label, upcoming:true};
  }
  return null;
}
function getNextMilestone(project){
  const manual = normalize(project?.nextMilestoneTask || '');
  if(manual){
    const task = (project?.tasks || []).find(item => normalize(item.task) === manual);
    const timeline = findTimelineReference(project, task?.task || project.nextMilestoneTask);
    const date = dateValue(task?.endDate || task?.startDate || timeline?.endDate || timeline?.startDate);
    return {
      label: task?.task || project.nextMilestoneTask,
      date,
      type: 'manual',
      manual: true
    };
  }
  const today = startOfDay();
  const candidates = [
    ...getAllTimelinePhases(project).filter(phase => phase.start && startOfDay(phase.start) >= today).map(phase => ({label: phase.label || phase.task, date: phase.start, type: phase.type})),
    ...(project?.tasks || []).filter(task => dateValue(task.endDate) && startOfDay(dateValue(task.endDate)) >= today && !isCompletedStatus(task.status)).map(task => ({label: task.task, date: dateValue(task.endDate), type: 'task'}))
  ].sort((a,b) => a.date - b.date);
  return candidates[0] || null;
}
function getProjectHealth(project){
  const tasks = project?.tasks || [];
  const atRiskItems = getOverdueTasks(project);
  const overdue = atRiskItems.length;
  const hold = metricSummary(project).hold;
  const blocked = tasks.filter(task => normalize(task.status).includes('block')).length;
  const progress = metricSummary(project).projectProgress;
  let score = 100 - (overdue * 12) - (hold * 8) - (blocked * 8);
  if(progress < 20 && tasks.length) score -= 8;
  score = Math.max(0, Math.min(100, Math.round(score)));
  let label = 'Healthy';
  let tone = 'healthy';
  if(!tasks.length && !(project?.timelinePlan || []).length){ label = 'Setup Needed'; tone = 'setup'; score = 0; }
  else if(score < 60){ label = 'Critical'; tone = 'critical'; }
  else if(score < 82){ label = 'Attention'; tone = 'attention'; }
  return {score, label, tone, overdue, hold, blocked};
}
function getUpcomingItems(project, days = 7){
  const today = startOfDay();
  const limit = addDays(today, days);
  const items = [];
  (project?.tasks || []).forEach((task, index) => {
    const d = dateValue(task.endDate || task.startDate);
    if(d && startOfDay(d) >= today && startOfDay(d) <= limit){
      items.push({type:'task', index, label: task.task, date: d, meta: task.status || 'Task'});
    }
  });
  getAllTimelinePhases(project).forEach(phase => {
    const d = phase.start || phase.end;
    if(d && startOfDay(d) >= today && startOfDay(d) <= limit){
      items.push({type:'timeline', index: phase.task, label: phase.label || phase.task, date: d, meta: phase.type});
    }
  });
  return items.sort((a,b) => a.date - b.date).slice(0, 8);
}
function getOverdueTasks(project){
  return (project?.tasks || []).map((task, index) => {
    const schedule = getTaskScheduleState(project, task);
    return {task, index, schedule};
  }).filter(item => item.schedule.isAtRisk)
    .sort((a,b) => (b.schedule.sortDate || 0) - (a.schedule.sortDate || 0));
}
function getScheduleVarianceTasks(project){
  return (project?.tasks || []).map((task, index) => {
    const schedule = getTaskScheduleState(project, task);
    return {task, index, schedule};
  }).filter(item => item.schedule.isClosedVariance)
    .sort((a,b) => (b.schedule.sortDate || 0) - (a.schedule.sortDate || 0));
}
function getPendingFromClient(project){
  const docItems = [...(project?.documents || []), ...(project?.documentOutputs || [])]
    .map((doc, index) => ({doc, index}))
    .filter(({doc}) => !isCompletedStatus(doc.status));
  const taskItems = (project?.tasks || []).map((task, index) => ({task, index}))
    .filter(({task}) => /client|nasabah|bank|user|approval|approve|konfirmasi|confirm/i.test(`${task.task} ${task.notes} ${task.assignedTo}`) && !isCompletedStatus(task.status));
  return {docs: docItems, tasks: taskItems, total: docItems.length + taskItems.length};
}
function getDecisionRequired(project){
  const explicit = /decision|keputusan|approval|approve|konfirmasi final|final approval|sign[-\s]?off|persetujuan/i;
  const meetings = (project?.meetings || []).map((meeting, index) => ({meeting, index})).filter(({meeting}) => meetingVisibleToCurrentUser(meeting)).filter(({meeting}) => normalize(meetingCategory(meeting)) === 'decision' || explicit.test(`${meetingDisplayNote(meeting)} ${meetingDisplayAction(meeting)}`));
  const tasks = (project?.tasks || []).map((task, index) => ({task, index})).filter(({task}) => explicit.test(`${task.task} ${task.notes}`) && !isCompletedStatus(task.status));
  return {meetings, tasks, total: meetings.length + tasks.length};
}
function getCompletedThisPeriod(project, days = 30){
  const anchor = startOfDay(getLatestDate(project) || new Date());
  const since = addDays(anchor, -days);
  const tasks = (project?.tasks || []).filter(task => isCompletedStatus(task.status) && dateValue(task.endDate) && startOfDay(dateValue(task.endDate)) >= since && startOfDay(dateValue(task.endDate)) <= anchor);
  const docs = [...(project?.documents || []), ...(project?.documentOutputs || [])].filter(doc => isCompletedStatus(doc.status) && dateValue(doc.date) && startOfDay(dateValue(doc.date)) >= since && startOfDay(dateValue(doc.date)) <= anchor);
  return {tasks, docs, total: tasks.length + docs.length, anchor};
}
function isDocumentInReview(doc){
  return normalize(doc?.reviewStatus).includes('review') || doc?.inReview === true;
}
function getDocumentMetrics(docs){
  const total = docs.length;
  const completed = docs.filter(d => isCompletedStatus(d.status)).length;
  const inReview = docs.filter(isDocumentInReview).length;
  const inProgress = docs.filter(d => normalize(d.status).includes('progress')).length;
  const hold = docs.filter(d => isHoldStatus(d.status)).length;
  const notStarted = docs.filter(d => normalize(d.status).includes('not started') || !d.status).length;
  const rate = total ? Math.round((completed / total) * 100) : 0;
  return {total, completed, inReview, inProgress, hold, notStarted, rate};
}
function meetingCategory(row){
  const manual = String(row?.type || '').trim();
  if(manual) return manual;
  const text = normalize(`${meetingDisplayNote(row)} ${meetingDisplayAction(row)}`);
  if(/risk|risiko|kendala|issue|block|hambat|problem/.test(text)) return 'Risk / Issue';
  if(/decision|keputusan|approval|approve|persetujuan|sign/.test(text)) return 'Decision';
  if(/action|tindak|follow|next|todo|pic/.test(text)) return 'Action Item';
  return 'Update';
}
function renderTinyList(items, emptyText, mapper){
  if(!items.length) return `<div class="tiny-empty">${esc(emptyText)}</div>`;
  return `<div class="tiny-list">${items.slice(0,4).map(mapper).join('')}</div>`;
}
function renderExecutiveHeader(project){
  const m = metricSummary(project);
  const health = getProjectHealth(project);
  const branding = brandingForProject(project);
  const brandLogo = branding.clientLogoUrl && branding.showClientLogo !== false ? `<img src="${esc(branding.clientLogoUrl)}" alt="Client logo" onerror="this.style.display='none'">` : '';
  const brandMeta = branding.preparedFor ? `<div class="hero-branding" style="--brand-accent:${esc(branding.brandAccentColor)}">${brandLogo}<div><span>Prepared for</span><strong>${esc(branding.preparedFor)}</strong><small>${esc(branding.confidentialityLabel)}</small></div></div>` : '';
  const period = getProjectPeriod(project);
  const phase = getCurrentPhase(project);
  const next = getNextMilestone(project);
  const latest = getLatestDate(project);
  const pm = project.picCywa || getLeadMember(project, ['project manager','pm','lead']);
  const clientPic = project.picClient || getLeadMember(project, ['client','customer','bank','user']);
  return `<section class="executive-hero" data-tour="hero">
    <div class="hero-copy">
      <div class="hero-kicker"><span>${esc(project.code || 'Project')}</span><span>Dashboard Project</span></div>${brandMeta}
      <h1>${esc(project.name || project.code || 'Untitled Project')}</h1>
      <div class="hero-meta">
        <button class="health-badge ${health.tone} inline-action" onclick="openDrawer('insight','health')">● ${esc(health.label)} · ${health.score}%</button>
        <span>Progress ${m.projectProgress}%</span>
        <span>${formatDate(period.startDate)} → ${formatDate(period.endDate)}</span>
        <span>Update Terakhir ${latest ? formatDate(latest) : '-'}</span>
      </div>
      <div class="hero-progress-track"><b style="width:${Math.max(0, Math.min(100, m.projectProgress))}%"></b></div>
    </div>
    <div class="hero-side">
      <div class="hero-side-card"><span>Current Phase</span><strong>${phase ? esc(`${phase.upcoming ? 'Next: ' : ''}${phase.displayLabel || phase.label || phase.task}`) : '-'}</strong><small>${phase ? `${formatDate(phase.startDate)} → ${formatDate(phase.endDate)}${phase.manual ? ' · Dipilih manual' : ''}` : 'Timeline aktif belum tersedia.'}</small></div>
      <div class="hero-side-card"><span>Next Milestone</span><strong>${next ? esc(next.label) : '-'}</strong><small>${next ? `${formatDate(next.date)}${next.manual ? ' · Dipilih manual' : ''}` : 'Milestone berikutnya belum tersedia.'}</small></div>
      <div class="hero-side-grid"><div><span>Project Lead</span><strong>${esc(pm)}</strong></div><div><span>PIC Client</span><strong>${esc(clientPic)}</strong></div></div>
    </div>
  </section>`;
}
function renderClientIntelligence(project){
  const pending = getPendingFromClient(project);
  const decisions = getDecisionRequired(project);
  const upcoming = getUpcomingItems(project, 7);
  const overdue = getOverdueTasks(project);
  const done = getCompletedThisPeriod(project, 30);
  const overdueText = overdue[0] ? `${esc(overdue[0].task.task)} · ${esc(overdue[0].schedule.primaryReason || 'Perlu perhatian')}` : 'Tidak ada task yang melewati jadwal atau berisiko.';
  return `<section class="premium-insights" data-tour="insights">
    <button class="insight-card pending" onclick="openDrawer('insight','pending')"><span>Pending dari Client</span><strong>${pending.total}</strong><small>Dokumen atau task yang masih membutuhkan input client.</small></button>
    <button class="insight-card decision" onclick="openDrawer('insight','decision')"><span>Keputusan Dibutuhkan</span><strong>${decisions.total}</strong><small>Hal yang membutuhkan persetujuan, keputusan, atau sign-off.</small></button>
    <button class="insight-card upcoming" onclick="openDrawer('insight','upcoming')"><span>Agenda 7 Hari</span><strong>${upcoming.length}</strong><small>${upcoming[0] ? `${esc(upcoming[0].label)} · ${formatDate(upcoming[0].date)}` : 'Tidak ada agenda dekat.'}</small></button>
    <button class="insight-card risk" onclick="openDrawer('insight','risk')"><span>Risiko Aktif</span><strong>${overdue.length}</strong><small>${overdueText}</small></button>
    <button class="insight-card done" onclick="openDrawer('insight','done')"><span>Selesai Terbaru</span><strong>${done.total}</strong><small>Task atau dokumen yang selesai dalam 30 hari terakhir.</small></button>
  </section>`;
}

function cleanGuestProjectDisplayName(label, fallbackProject){
  const raw = String(label || '').trim();
  const cleaned = raw
    .replace(/^guest\s+project\s+\d+\s*[-—–:]\s*/i, '')
    .replace(/^guest\s*[-—–:]\s*/i, '')
    .replace(/^client\s*[-—–:]\s*/i, '')
    .trim();
  const fallback = fallbackProject ? (fallbackProject.code || fallbackProject.name || 'Project') : 'Project';
  return cleaned || fallback;
}
function getSessionRoleBadgeLabel(isClientPortal = false){
  if(!state.session) return '● Guest';
  if(state.session.canEdit) return `● Project Manager · ${state.session.label}`;
  if(state.session.role === 'admin') return `● Admin · ${state.session.label}`;
  if(isClientPortal || state.session.role === 'guest'){
    const allowed = getAllowedProjects();
    const activeProject = allowed.find(project => project.id === state.selectedProjectId) || allowed[0] || null;
    return `● Guest - ${cleanGuestProjectDisplayName(state.session.label, activeProject)}`;
  }
  return `● View Only · ${state.session.label}`;
}

function renderSidebar(){
  ensurePremiumState();
  const allowed = getAllowedProjects();
  const projects = allowed.filter(p => `${p.code} ${p.name}`.toLowerCase().includes(state.sidebarSearch.toLowerCase()));
  const command = canAccessCommandCenter();
  const clientPortal = canAccessClientPortal();
  const projectNav = projects.map(p => {
      const health = getProjectHealth(p);
      const progress = metricSummary(p).projectProgress;
      return `<button class="project-link ${p.id === state.selectedProjectId && state.page === 'dashboard' ? 'active' : ''}" onclick="setProject('${p.id}')"><strong>${esc(p.code)}</strong><small>${esc(p.name)}</small><em class="sidebar-health ${health.tone}">${health.label} · ${health.score}%</em><em class="sidebar-progress">Progress · ${progress}%</em></button>`;
    }).join('');
  const singleClientProject = projects[0] || allowed[0] || null;
  const clientProjectNav = clientPortal
    ? (projects.length <= 1
      ? `<button class="command-nav-item ${state.page === 'dashboard' ? 'active' : ''}" type="button" onclick="${singleClientProject ? `setProject('${esc(singleClientProject.id)}')` : `setCommandPage('home')`}"><span>Project</span><small>${singleClientProject ? esc(singleClientProject.name || singleClientProject.code || 'Project tersedia') : 'Tidak ada project'}</small></button>`
      : `<details class="command-project-nav" ${state.page === 'dashboard' ? 'open' : ''}><summary class="command-nav-item ${state.page === 'dashboard' ? 'active' : ''}"><span>Project</span><small>${projects.length} project tersedia</small></summary><div class="command-project-list">${allowed.length > 1 ? `<input class="search small" placeholder="Cari project..." value="${esc(state.sidebarSearch)}" oninput="state.sidebarSearch=this.value;render()">` : ''}${projectNav || '<div class="tiny-empty">Tidak ada project.</div>'}</div></details>`)
    : '';
  const clientNav = clientPortal ? `<nav class="command-nav client-portal-nav">
      <button class="command-nav-item ${state.page === 'home' ? 'active' : ''}" onclick="setCommandPage('home')"><span>Beranda</span><small>Ringkasan project</small></button>
      ${clientProjectNav}
      <button class="command-nav-item ${state.page === 'schedule' ? 'active' : ''}" onclick="setCommandPage('schedule')"><span>Schedule</span><small>Agenda project</small></button>
    </nav>` : '';
  const roleBadgeLabel = getSessionRoleBadgeLabel(clientPortal);
  return `<aside class="sidebar">
    <div class="brand"><img src="assets/professional-dashboard-logo.png" alt="Professional Project Dashboard"><div class="brand-title">Professional Dashboard<span>${command ? 'Command Center' : clientPortal ? 'Client Portal' : 'Project Dashboard'}</span></div></div>
    <button class="command-trigger" onclick="openCommandPalette()">⌘K <span>Cari project, task, dokumen</span></button>
    <div class="session-card">
      <span class="role-badge ${state.session.canEdit ? 'edit' : ''}">${esc(roleBadgeLabel)}</span>
      <button class="logout" onclick="logout()">Keluar</button>
    </div>
    ${command ? `<nav class="command-nav">
      <button class="command-nav-item ${state.page === 'home' ? 'active' : ''}" onclick="setCommandPage('home')"><span>Beranda</span><small>Overview semua project</small></button>
      <button class="command-nav-item ${state.page === 'notifications' ? 'active' : ''}" onclick="setCommandPage('notifications')"><span>Notifikasi</span><small>Prioritas & reminder</small></button>
      ${canViewActivityLog() ? `<button class="command-nav-item ${state.page === 'activity-log' ? 'active' : ''}" onclick="openActivityLogPage()"><span>Activity Log</span><small>Khusus Project Manager</small></button>` : ''}
      ${canManageProjects() ? `<button class="command-nav-item ${state.page === 'backup-tools' ? 'active' : ''}" onclick="setCommandPage('backup-tools')"><span>Backup Data</span><small>Export & snapshot</small></button>` : ''}
      <details class="command-project-nav" ${state.page === 'dashboard' ? 'open' : ''}><summary class="command-nav-item ${state.page === 'dashboard' ? 'active' : ''}"><span>Project</span><small>${projects.length} project tersedia</small></summary><div class="command-project-list">${allowed.length > 1 ? `<input class="search small" placeholder="Cari project..." value="${esc(state.sidebarSearch)}" oninput="state.sidebarSearch=this.value;render()">` : ''}${projectNav || '<div class="tiny-empty">Tidak ada project.</div>'}</div></details>
      <button class="command-nav-item ${state.page === 'schedule' ? 'active' : ''}" onclick="setCommandPage('schedule')"><span>Schedule</span><small>Kalender agenda operasional</small></button>
      ${canManageProjects() ? `<button class="command-nav-item ${state.page === 'project-management' ? 'active' : ''}" onclick="setCommandPage('project-management')"><span>Kelola Project</span><small>Client, akses, branding</small></button>` : ''}
    </nav>` : clientPortal ? clientNav : `${allowed.length > 1 ? `<input class="search" placeholder="Cari project..." value="${esc(state.sidebarSearch)}" oninput="state.sidebarSearch=this.value;render()">` : ''}<nav class="project-list">${projectNav}</nav>`}
  </aside>`;
}
function setTaskStatusFilter(value){ state.taskFilterStatus = value; render(); }
function setTaskOwnerFilter(value){ state.taskFilterOwner = value; render(); }
function setTaskView(value){ state.taskView = value; render(); }
function taskRows(project){
  ensurePremiumState();
  let rows = (project.tasks || []).map((row, index) => ({row, index}));
  if(state.tableSearch){
    const q = state.tableSearch.toLowerCase();
    rows = rows.filter(({row}) => [row.task, row.status, row.startDate, row.endDate, row.assignedTo, row.notes, row.progress].some(val => String(val ?? '').toLowerCase().includes(q)));
  }
  if(state.taskFilterStatus && state.taskFilterStatus !== 'all'){
    rows = rows.filter(({row}) => {
      if(state.taskFilterStatus === 'risk') return getTaskScheduleState(project, row).isAtRisk;
      return normalize(row.status || 'not started').includes(state.taskFilterStatus);
    });
  }
  if(state.taskFilterOwner && state.taskFilterOwner !== 'all'){
    rows = rows.filter(({row}) => normalize(row.assignedTo) === normalize(state.taskFilterOwner));
  }
  return rows;
}
function renderTaskKanban(project, rows){
  const groups = [
    {key:'not started', label:'Not Started'},
    {key:'progress', label:'In Progress'},
    {key:'completed', label:'Completed'},
    {key:'hold', label:'Hold'},
    {key:'block', label:'Blocked'}
  ];
  return `<div class="kanban-board">${groups.map(group => {
    const cards = rows.filter(({row}) => normalize(row.status || 'not started').includes(group.key));
    return `<div class="kanban-col"><div class="kanban-head"><span>${group.label}</span><b>${cards.length}</b></div>${cards.length ? cards.map(({row,index}) => `<button class="kanban-card" onclick="openDrawer('task', ${index})"><strong>${esc(row.task || 'Untitled Task')}</strong><small>${esc(row.assignedTo || 'Unassigned')}</small>${renderProgressBar(row.progress)}</button>`).join('') : `<div class="tiny-empty">Kosong</div>`}</div>`;
  }).join('')}</div>`;
}
function renderTaskTracker(project){
  ensurePremiumState();
  const rows = taskRows(project);
  const owners = getMemberNames(project).filter(Boolean);
  return `<section class="section-card" data-tour="tasks">
    <div class="section-head premium-section-head"><div><h2><em>Task Tracker</em></h2></div>
      <div class="table-tools premium-tools">
        <input placeholder="Cari task..." value="${esc(state.tableSearch)}" oninput="state.tableSearch=this.value;render()">
        <select onchange="setTaskStatusFilter(this.value)"><option value="all">All Status</option><option value="not started" ${state.taskFilterStatus === 'not started' ? 'selected' : ''}>Not Started</option><option value="progress" ${state.taskFilterStatus === 'progress' ? 'selected' : ''}>In Progress</option><option value="completed" ${state.taskFilterStatus === 'completed' ? 'selected' : ''}>Completed</option><option value="hold" ${state.taskFilterStatus === 'hold' ? 'selected' : ''}>Hold</option><option value="risk" ${state.taskFilterStatus === 'risk' ? 'selected' : ''}>Risiko Aktif</option></select>
        <select onchange="setTaskOwnerFilter(this.value)"><option value="all">All Owner</option>${owners.map(name => `<option value="${esc(name)}" ${normalize(state.taskFilterOwner) === normalize(name) ? 'selected' : ''}>${esc(name)}</option>`).join('')}</select>
        <div class="segmented"><button class="${state.taskView === 'table' ? 'active' : ''}" onclick="setTaskView('table')">Table</button><button class="${state.taskView === 'kanban' ? 'active' : ''}" onclick="setTaskView('kanban')">Kanban</button></div>
      </div>
    </div>
    ${state.taskView === 'kanban' ? renderTaskKanban(project, rows) : `<div class="table-wrap"><table class="excel modern-table task-table"><thead><tr>
      <th class="w-no narrow">No</th><th class="w-task">Task</th><th class="w-status">Status</th><th class="w-date">Tanggal Mulai Aktual</th><th class="w-date">Tanggal Selesai Aktual</th><th class="w-assigned">Assigned To</th><th class="w-progress">Progress</th><th class="w-notes">Notes</th>
    </tr></thead><tbody>
    ${rows.length ? rows.map(({row,index}, rowNo) => `<tr class="clickable-row" onclick="openDrawer('task', ${index})"><td class="col-no">${rowNo + 1}</td><td>${esc(row.task)}</td><td><span class="status ${statusClass(row.status)}">${esc(row.status || 'Not started')}</span></td><td><span class="date-pill ${compareDateClass(row.startDate, project, 'start', row.task)}">${formatDate(row.startDate)}</span></td><td><span class="date-pill ${compareDateClass(row.endDate, project, 'end', row.task)}">${formatDate(row.endDate)}</span></td><td>${esc(row.assignedTo || '-')}</td><td>${renderProgressBar(row.progress)}</td><td>${esc(row.notes || '-')}</td></tr>`).join('') : `<tr><td colspan="8" class="center-muted">Tidak ada data task.</td></tr>`}
    </tbody></table></div>`}
  </section>`;
}
function setDocumentFilter(value){ state.documentFilterStatus = value; render(); }
function renderDocumentControlStats(docs, title){
  const m = getDocumentMetrics(docs);
  return `<div class="doc-control-strip"><div><span>Total</span><strong>${m.total}</strong></div><div><span>Completed</span><strong>${m.completed}</strong></div><div><span>In Review</span><strong>${m.inReview}</strong></div><div><span>In Progress</span><strong>${m.inProgress}</strong></div><div><span>Pending / Hold</span><strong>${m.hold + m.notStarted}</strong></div><div class="wide"><span>${esc(title)} Completion</span><strong>${m.rate}%</strong><div class="progress-line slim">${m.rate > 0 ? `<b style="width:${m.rate}%"></b>` : ''}</div></div></div>`;
}
function renderDocumentTable(project, type){
  ensurePremiumState();
  const isOutput = type === 'output';
  const allRows = isOutput ? (project.documentOutputs || []) : (project.documents || []);
  let rows = allRows.map((row, index) => ({row, index}));
  if(state.tableSearch){
    const q = state.tableSearch.toLowerCase();
    rows = rows.filter(({row}) => [row.name, row.description, row.status, row.reviewStatus, row.date].some(val => String(val ?? '').toLowerCase().includes(q)));
  }
  if(state.documentFilterStatus && state.documentFilterStatus !== 'all'){
    rows = rows.filter(({row}) => normalize(row.status || 'not started').includes(state.documentFilterStatus));
  }
  const title = isOutput ? '<em>Document Output</em>' : '<em>Document List</em>';
  const plainTitle = isOutput ? 'Document Output' : 'Document List';
  const emptyText = isOutput ? 'Tidak ada dokumen output.' : 'Tidak ada dokumen.';
  return `<section class="section-card" data-tour="docs"><div class="section-head premium-section-head"><div><h2>${title}</h2></div><div class="table-tools premium-tools"><input placeholder="Cari dokumen..." value="${esc(state.tableSearch)}" oninput="state.tableSearch=this.value;render()"><select onchange="setDocumentFilter(this.value)"><option value="all">All Status</option><option value="completed" ${state.documentFilterStatus === 'completed' ? 'selected' : ''}>Completed</option><option value="progress" ${state.documentFilterStatus === 'progress' ? 'selected' : ''}>In Progress</option><option value="hold" ${state.documentFilterStatus === 'hold' ? 'selected' : ''}>Hold</option><option value="not started" ${state.documentFilterStatus === 'not started' ? 'selected' : ''}>Not Started</option></select></div></div>${renderDocumentControlStats(allRows, plainTitle)}<div class="table-wrap"><table class="excel modern-table"><thead><tr><th class="w-no narrow">No</th><th class="w-date">Tanggal</th><th class="w-doc">Nama Dokumen</th><th>Deskripsi</th><th class="w-status">Status</th></tr></thead><tbody>${rows.length ? rows.map(({row,index}) => `<tr class="clickable-row" onclick="openDrawer('${isOutput ? 'output' : 'document'}', ${index})"><td class="col-no">${index + 1}</td><td>${formatDate(row.date)}</td><td>${esc(row.name)}</td><td>${esc(row.description || '-')}</td><td><span class="status ${statusClass(row.status)}">${esc(row.status || 'Not started')}</span>${isDocumentInReview(row) ? '<span class="status s-progress mini-status">In Review</span>' : ''}</td></tr>`).join('') : `<tr><td colspan="5" class="center-muted">${emptyText}</td></tr>`}</tbody></table></div></section>`;
}
function setTimelineFilter(value){ state.timelineFilter = value; render(); }
function setTimelineZoom(value){ state.timelineZoom = value; render(); }
function renderTimelineProject(project){
  ensurePremiumState();
  const model = buildGanttModel(project);
  if(!model) return renderEmpty('Timeline belum siap.', 'Isi data Timeline Project agar jadwal yang disepakati bisa ditampilkan.');
  const dayWidth = state.timelineZoom === 'year' ? 8 : (state.timelineZoom === 'quarter' ? 16 : 34);
  const headerWidth = model.totalDays * dayWidth;
  const filter = state.timelineFilter || 'all';
  const filteredTasks = model.tasks.map(task => {
    const phases = (task.phases || []).filter(phase => {
      const type = normalize(phase.type || 'assessment');
      const okType = filter === 'all' || type === filter || (filter === 'hold' && type.includes('hold'));
      const okSearch = !state.tableSearch || task.task.toLowerCase().includes(state.tableSearch.toLowerCase()) || (phase.label || '').toLowerCase().includes(state.tableSearch.toLowerCase());
      return okType && okSearch;
    });
    return {...task, phases};
  }).filter(task => task.phases.length);
  const phaseTypes = new Set();
  filteredTasks.forEach(task => task.phases.forEach(phase => phaseTypes.add(normalize(phase.type || 'assessment'))));
  const legendDefs = [{ type: 'assessment', label: 'Assessment / Timeline' },{ type: 'reporting', label: 'Reporting' },{ type: 'hold', label: 'Hold' },{ type: 'hold-reporting', label: 'Reporting (Hold)' }];
  const legend = legendDefs.filter(item => phaseTypes.has(item.type) || (item.type === 'hold' && phaseTypes.has('hold-reporting'))).map(item => `<span class="legend-item"><i class="${item.type}"></i>${esc(item.label)}</span>`).join('');
  const today = startOfDay();
  const todayIndex = today >= startOfDay(model.start) && today <= startOfDay(model.end) ? Math.max(0, daysBetween(model.start, today)) : -1;
  const ganttTaskColumnWidth = 300;
  const todayLeft = todayIndex >= 0 ? ganttTaskColumnWidth + (todayIndex * dayWidth) + (dayWidth / 2) : -1;
  return `<section class="section-card" data-tour="timeline"><div class="section-head timeline-head premium-section-head"><div><h2><em>Timeline Project</em></h2>${legend ? `<div class="gantt-legend">${legend}</div>` : ''}</div><div class="table-tools premium-tools timeline-tools"><button class="ghost-btn timeline-export-btn" onclick="exportTimelinePdf()">Unduh <em>Timeline</em> PDF</button><input placeholder="Cari timeline..." value="${esc(state.tableSearch)}" oninput="state.tableSearch=this.value;render()"><select onchange="setTimelineFilter(this.value)"><option value="all">Semua Phase</option><option value="assessment" ${filter === 'assessment' ? 'selected' : ''}>Assessment</option><option value="reporting" ${filter === 'reporting' ? 'selected' : ''}>Reporting</option><option value="hold" ${filter === 'hold' ? 'selected' : ''}>Hold</option></select><div class="segmented"><button class="${state.timelineZoom === 'month' ? 'active' : ''}" onclick="setTimelineZoom('month')">Bulan</button><button class="${state.timelineZoom === 'quarter' ? 'active' : ''}" onclick="setTimelineZoom('quarter')">Kuartal</button><button class="${state.timelineZoom === 'year' ? 'active' : ''}" onclick="setTimelineZoom('year')">Tahun</button></div></div></div><div class="gantt-wrap zoom-${state.timelineZoom}"><div class="gantt-board"><div class="gantt-left sticky-head gantt-task-head"><span class="gantt-row-no head">No</span><em>Task</em></div><div class="gantt-right sticky-head" style="width:${headerWidth}px"><div class="gantt-months">${model.months.map(m => `<div class="month-block" style="width:${m.span * dayWidth}px">${esc(m.label)}</div>`).join('')}</div><div class="gantt-days">${model.days.map(d => `<div class="day-block" style="width:${dayWidth}px">${d.getDate()}</div>`).join('')}</div></div>${todayIndex >= 0 ? `<div class="gantt-today-rail" style="left:${todayLeft}px"><em>Today</em></div>` : ''}${filteredTasks.map((task, rowNo) => `<div class="gantt-left row-label clickable-row gantt-task-label" onclick="openDrawer('timeline', ${jsValue(task.task)})"><span class="gantt-row-no">${rowNo + 1}</span><span>${esc(task.task)}</span></div><div class="gantt-right gantt-row-canvas" style="width:${headerWidth}px"><div class="gantt-gridline">${model.days.map(() => `<span style="width:${dayWidth}px"></span>`).join('')}</div>${task.phases.map(phase => { const start = phase._start < model.start ? model.start : phase._start; const end = phase._end > model.end ? model.end : phase._end; const startIndex = Math.max(0, daysBetween(model.start, start)); const endIndex = Math.max(startIndex, daysBetween(model.start, end)); const barLeft = startIndex * dayWidth; const barWidth = Math.max(dayWidth, ((endIndex - startIndex) + 1) * dayWidth); const typeClass = normalize(phase.type || 'assessment').replace(/[^a-z0-9-]+/g, '-'); const title = `${phase.label || 'Timeline'}: ${formatDate(phase.startDate)} - ${formatDate(phase.endDate)}`; return `<button class="gantt-bar-shell ${typeClass}" title="${esc(title)}" onclick="openDrawer('timeline', ${jsValue(task.task)})" style="left:${barLeft}px;width:${barWidth}px"></button>`; }).join('')}</div>`).join('')}</div></div></section>`;
}
function setMeetingFilter(value){ state.meetingFilter = value; render(); }
function meetingRows(project){
  ensurePremiumState();
  let rows = (project.meetings || []).map((row, index) => ({row, index, category: meetingCategory(row)})).filter(({row}) => meetingVisibleToCurrentUser(row));
  if(state.tableSearch){ const q = state.tableSearch.toLowerCase(); rows = rows.filter(({row}) => [row.date, meetingDisplayNote(row), meetingDisplayAction(row), row.type].some(val => String(val ?? '').toLowerCase().includes(q))); }
  if(state.meetingFilter && state.meetingFilter !== 'all') rows = rows.filter(item => normalize(item.category) === normalize(state.meetingFilter));
  return rows;
}
function renderMeetingInsights(project){
  const rows = (project.meetings || []).filter(meetingVisibleToCurrentUser).map(row => meetingCategory(row));
  const count = type => rows.filter(v => v === type).length;
  return `<div class="doc-control-strip action-log-strip"><div><span>Updates</span><strong>${rows.length}</strong></div><div><span>Action Items</span><strong>${count('Action Item')}</strong></div><div><span>Decisions</span><strong>${count('Decision')}</strong></div><div><span>Risks / Issues</span><strong>${count('Risk / Issue')}</strong></div></div>`;
}
function renderMeetingNotes(project){
  ensurePremiumState();
  const rows = meetingRows(project);
  return `<section class="section-card" data-tour="meetings"><div class="section-head premium-section-head"><div><h2><em>Project Updates</em></h2><p class="section-subtitle">Ringkasan komunikasi yang siap ditampilkan kepada client.</p></div><div class="table-tools premium-tools"><input placeholder="Cari update..." value="${esc(state.tableSearch)}" oninput="state.tableSearch=this.value;render()"><select onchange="setMeetingFilter(this.value)"><option value="all">Semua Type</option><option value="Update" ${state.meetingFilter === 'Update' ? 'selected' : ''}>Update</option><option value="Action Item" ${state.meetingFilter === 'Action Item' ? 'selected' : ''}>Action Item</option><option value="Decision" ${state.meetingFilter === 'Decision' ? 'selected' : ''}>Decision</option><option value="Risk / Issue" ${state.meetingFilter === 'Risk / Issue' ? 'selected' : ''}>Risk / Issue</option></select></div></div>${renderMeetingInsights(project)}<div class="table-wrap"><table class="excel modern-table task-table"><thead><tr><th class="w-no narrow">No</th><th class="w-date">Tanggal</th><th class="w-status">Type</th><th>Update</th><th>Next Step</th></tr></thead><tbody>${rows.length ? rows.map(({row,index,category}) => `<tr class="clickable-row" onclick="openDrawer('meeting', ${index})"><td class="col-no">${index + 1}</td><td>${formatDate(row.date)}</td><td><span class="status ${category === 'Risk / Issue' ? 's-blocked' : category === 'Decision' ? 's-hold' : category === 'Action Item' ? 's-progress' : 's-started'}">${esc(category)}</span></td><td>${esc(meetingDisplayNote(row) || '-')}</td><td>${esc(meetingDisplayAction(row) || '-')}</td></tr>`).join('') : `<tr><td colspan="5" class="center-muted">Tidak ada update yang ditampilkan untuk client.</td></tr>`}</tbody></table></div></section>`;
}

function reportExportCopy(lang = getReportExportLanguage()){
  const isEn = lang === 'en';
  return {
    languageTitle: isEn ? 'Report Language' : 'Bahasa Report',
    languageHint: isEn ? 'Select the language before downloading.' : 'Pilih bahasa sebelum mengunduh.',
    panelTitle: isEn ? 'Report Center' : 'Pusat Report',
    panelHint: isEn ? 'Download a project report based on the selected language.' : 'Unduh report project sesuai bahasa yang dipilih.',
    executiveTitle: isEn ? 'Executive Summary' : 'Ringkasan Eksekutif',
    executiveHint: isEn ? 'Concise management snapshot.' : 'Ringkasan singkat untuk manajemen.',
    fullTitle: isEn ? 'Full Report Pack' : 'Paket Laporan Lengkap',
    fullHint: isEn ? 'Complete project documentation pack.' : 'Dokumentasi progress project lengkap.',
    timelineTitle: isEn ? 'Project Timeline' : 'Timeline Project',
    timelineHint: isEn ? 'Schedule and milestone overview.' : 'Jadwal dan milestone project.',
    exportTag: isEn ? 'Download' : 'Unduh'
  };
}
function renderReportExportActions(){
  const lang = getReportExportLanguage();
  const copy = reportExportCopy(lang);
  const languageOptions = REPORT_LANGUAGE_OPTIONS.map(option => `<option value="${esc(option.value)}" ${option.value === lang ? 'selected' : ''}>${esc(option.label)}</option>`).join('');
  return `<div class="report-export-panel report-export-polished" aria-label="Commercial report exports">
    <div class="report-export-header"><span>${esc(copy.panelTitle)}</span><small>${esc(copy.panelHint)}</small></div>
    <label class="report-language-picker"><span>${esc(copy.languageTitle)}</span><select onchange="setReportExportLanguage(this.value)">${languageOptions}</select><small>${esc(copy.languageHint)}</small></label>
    <div class="report-export-actions report-export-actions-three">
      <button type="button" class="report-export-option executive-summary" onclick="exportClientReport()" title="${esc(copy.executiveHint)}"><span><strong>${esc(copy.executiveTitle)}</strong><small>${esc(copy.executiveHint)} · ${esc(reportExportLanguageLabel(lang))}</small></span><em>PDF</em></button>
      <button type="button" class="report-export-option full-pack" onclick="exportCommercialReportPack()" title="${esc(copy.fullHint)}"><span><strong>${esc(copy.fullTitle)}</strong><small>${esc(copy.fullHint)} · ${esc(reportExportLanguageLabel(lang))}</small></span><em>Full</em></button>
      <button type="button" class="report-export-option timeline-pack" onclick="exportTimelinePdf()" title="${esc(copy.timelineHint)}"><span><strong>${esc(copy.timelineTitle)}</strong><small>${esc(copy.timelineHint)} · ${esc(reportExportLanguageLabel(lang))}</small></span><em>PDF</em></button>
    </div>
  </div>`;
}
function renderDashboardMain(){
  ensurePremiumState();
  const project = selectedProject();
  if(!project) return `<main class="main">${renderEmpty('Belum ada project yang tersedia.', 'Pastikan akun ini sudah diberikan akses ke project yang sesuai.')}</main>`;
  let content = '';
  if(state.activeTab === 'summary') content = renderSummaryTimeline(project);
  if(state.activeTab === 'task') content = renderTaskTracker(project);
  if(state.activeTab === 'document') content = renderDocumentList(project);
  if(state.activeTab === 'output') content = renderDocumentOutput(project);
  if(state.activeTab === 'timeline') content = renderTimelineProject(project);
  if(state.activeTab === 'meeting') content = renderMeetingNotes(project);
  const devTools = shouldShowLocalDevTools() ? `<button class="ghost-btn" onclick="exportChanges()">Unduh JSON</button><button class="ghost-btn" onclick="resetLocalChanges()">Reset Data</button>` : '';
  const quickActions = `<div class="project-quick-actions"><button class="ghost-btn" onclick="openCommandPalette()">Pencarian ⌘K</button><button class="ghost-btn" onclick="togglePresentationMode()">${state.presentationMode ? 'Keluar dari <em>Presentation Mode</em>' : '<em>Presentation Mode</em>'}</button>${canManageProjects() ? `<button class="ghost-btn" onclick="state.page='project-management';render()">Kelola <em>Project</em></button>` : ''}${state.session.canEdit ? `<button class="ghost-btn" onclick="state.page='input-data';render()"><em>Edit Project</em></button>` : ''}${canManagePasswords() ? `<button class="ghost-btn" onclick="state.page='pm-settings';render()">Pengaturan</button>` : ''}${devTools}</div>`;
  return `<main class="main"><div class="topbar premium-topbar compact-topbar project-detail-topbar"><div class="title"><h1>Pusat Kendali <em>Project</em></h1><p>Ringkasan project untuk pemantauan progress, dokumen, timeline, dan update utama.</p></div><div class="actions project-header-actions">${quickActions}<div class="project-report-actions">${renderReportExportActions()}</div></div></div>${renderExecutiveHeader(project)}${renderKpis(project)}${renderClientIntelligence(project)}${renderTabs()}${content}</main>`;
}
function openDrawer(type, ref){ state.drawer = {type, ref}; render(); }
function closeDrawer(){ state.drawer = null; render(); }
function renderDrawerContent(project){
  if(!state.drawer || !project) return '';
  const {type, ref} = state.drawer;
  if(type === 'task'){
    const item = project.tasks?.[Number(ref)]; if(!item) return '<p>Task tidak ditemukan.</p>';
    const schedule = getTaskScheduleState(project, item);
    return `<h3>${esc(item.task || 'Untitled Task')}</h3><div class="drawer-grid"><span>Status</span><strong><span class="status ${statusClass(item.status)}">${esc(item.status || 'Not started')}</span></strong><span>Owner</span><strong>${esc(item.assignedTo || '-')}</strong><span>Start Aktual</span><strong><span class="date-pill ${compareDateClass(item.startDate, project, 'start', item.task)}">${formatDate(item.startDate)}</span></strong><span>End Aktual</span><strong><span class="date-pill ${compareDateClass(item.endDate, project, 'end', item.task)}">${formatDate(item.endDate)}</span></strong><span>Timeline</span><strong>${schedule.timelineRef ? `${formatDate(schedule.timelineRef.startDate)} → ${formatDate(schedule.timelineRef.endDate)}` : '-'}</strong><span>Progress</span><strong>${renderProgressBar(item.progress, true)}</strong></div>${schedule.reasons.length ? `<div class="drawer-note"><span>Schedule Insight</span><p>${esc(schedule.primaryReason || schedule.reasons.join(' • '))}</p></div>` : ''}<div class="drawer-note"><span>PM Notes / Reason</span><p>${esc(item.notes || (schedule.isAtRisk ? 'Belum ada catatan penyebab. PM dapat mengisi Notes di Task Tracker.' : '-'))}</p></div>`;
  }
  if(type === 'document' || type === 'output'){
    const source = type === 'output' ? project.documentOutputs : project.documents;
    const item = source?.[Number(ref)]; if(!item) return '<p>Dokumen tidak ditemukan.</p>';
    return `<h3>${esc(item.name || 'Untitled Document')}</h3><div class="drawer-grid"><span>Tanggal</span><strong>${formatDate(item.date)}</strong><span>Status</span><strong><span class="status ${statusClass(item.status)}">${esc(item.status || 'Not started')}</span>${isDocumentInReview(item) ? '<span class="status s-progress mini-status">In Review</span>' : ''}</strong><span>Jenis</span><strong>${type === 'output' ? 'Document Output' : 'Document List'}</strong></div><div class="drawer-note"><span>Deskripsi</span><p>${esc(item.description || '-')}</p></div>`;
  }
  if(type === 'meeting'){
    const item = project.meetings?.[Number(ref)]; if(!item) return '<p>Meeting log tidak ditemukan.</p>';
    const category = meetingCategory(item);
    const internalBlock = !isGuestSession() && ((item.note && item.note !== meetingDisplayNote(item)) || (item.action && item.action !== meetingDisplayAction(item))) ? `<div class="drawer-note"><span>Internal Note</span><p>${esc(item.note || '-')}</p></div><div class="drawer-note"><span>Internal Action</span><p>${esc(item.action || '-')}</p></div>` : '';
    return `<h3>${esc(category)}</h3><div class="drawer-grid"><span>Tanggal</span><strong>${formatDate(item.date)}</strong><span>Type</span><strong>${esc(category)}</strong></div><div class="drawer-note"><span>Update</span><p>${esc(meetingDisplayNote(item) || '-')}</p></div><div class="drawer-note"><span>Next Step</span><p>${esc(meetingDisplayAction(item) || '-')}</p></div>${internalBlock}`;
  }
  if(type === 'timeline'){
    const phases = getAllTimelinePhases(project).filter(phase => normalize(phase.task) === normalize(ref));
    return `<h3>${esc(ref || 'Timeline Detail')}</h3>${phases.length ? phases.map(phase => `<div class="timeline-detail-row"><span class="legend-item"><i class="${normalize(phase.type).replace(/[^a-z0-9-]+/g,'-')}"></i>${esc(phase.label || phase.type)}</span><strong>${formatDate(phase.startDate)} → ${formatDate(phase.endDate)}</strong></div>`).join('') : '<p>Timeline detail tidak ditemukan.</p>'}`;
  }
  if(type === 'insight'){
    if(ref === 'health'){
      const health = getProjectHealth(project);
      const activeRisk = getOverdueTasks(project);
      const variance = getScheduleVarianceTasks(project);
      const m = metricSummary(project);
      return `<h3>Health Breakdown</h3><div class="drawer-grid"><span>Health</span><strong><span class="health-badge ${health.tone}">● ${esc(health.label)} · ${health.score}%</span></strong><span>Progress</span><strong>${m.projectProgress}%</strong><span>Risiko Aktif</span><strong>${activeRisk.length}</strong><span>Hold</span><strong>${m.hold}</strong><span>Closed Late</span><strong>${variance.length}</strong></div><div class="drawer-note"><span>Cara baca</span><p>Health menunjukkan risiko operasional project saat ini. Progress menunjukkan persentase penyelesaian task. Task yang selesai tetapi terlambat dicatat sebagai Closed Late, bukan Risiko Aktif.</p></div>`;
    }
    if(ref === 'decision'){
      const data = getDecisionRequired(project);
      const list = [
        ...data.meetings.filter(({meeting}) => meetingVisibleToCurrentUser(meeting)).map(({meeting}) => `<div class="timeline-detail-row"><span class="legend-item"><i class="hold"></i>Update</span><strong>${formatDate(meeting.date)}</strong></div><div class="drawer-note compact"><p>${esc(meetingDisplayNote(meeting) || '-')}</p><p>${esc(meetingDisplayAction(meeting) || '-')}</p></div>`),
        ...data.tasks.map(({task}) => `<div class="timeline-detail-row"><span class="legend-item"><i class="reporting"></i>Task</span><strong>${esc(task.task || '-')}</strong></div><div class="drawer-note compact"><p>${esc(task.notes || 'Membutuhkan approval/keputusan')}</p></div>`)
      ];
      return `<h3>Keputusan Dibutuhkan</h3>${list.length ? list.join('') : '<p>Tidak ada item decision saat ini.</p>'}`;
    }
    if(ref === 'risk'){
      const data = getOverdueTasks(project);
      const closedLate = getScheduleVarianceTasks(project);
      const activeList = data.length ? data.map(({task,schedule}) => `<div class="timeline-detail-row"><span class="legend-item"><i class="hold"></i>${esc(task.task || '-')}</span><strong>${esc(task.status || 'Not started')}</strong></div><div class="drawer-note compact"><span>Schedule Trigger</span><p>${esc(schedule.primaryReason || schedule.reasons.join(' • '))}</p></div><div class="drawer-note compact"><span>PM Notes / Reason</span><p>${esc(task.notes || 'Belum ada catatan penyebab. PM dapat mengisi kolom Notes / Reason / Next Action di Task Tracker.')}</p></div>`).join('') : '<p>Tidak ada active risk.</p>';
      const closedList = closedLate.length ? `<div class="drawer-note"><span>Closed Late / Schedule Variance</span>${closedLate.slice(0,6).map(({task,schedule}) => `<p>${esc(task.task || '-')} — ${esc(schedule.primaryReason || schedule.reasons[0] || 'Melewati timeline')}</p>`).join('')}</div>` : '';
      return `<h3>Risiko Aktif</h3>${activeList}${closedList}`;
    }
    if(ref === 'pending'){
      const data = getPendingFromClient(project);
      const list = [
        ...data.docs.map(({doc}) => `<div class="timeline-detail-row"><span class="legend-item"><i class="assessment"></i>Dokumen</span><strong>${esc(doc.name || '-')}</strong></div><div class="drawer-note compact"><p>${esc(doc.status || 'Open')}</p></div>`),
        ...data.tasks.map(({task}) => `<div class="timeline-detail-row"><span class="legend-item"><i class="reporting"></i>Task</span><strong>${esc(task.task || '-')}</strong></div><div class="drawer-note compact"><p>${esc(task.notes || task.status || 'Pending client')}</p></div>`)
      ];
      return `<h3>Pending dari Client</h3>${list.length ? list.join('') : '<p>Tidak ada pending dari client.</p>'}`;
    }
    if(ref === 'upcoming'){
      const data = getUpcomingItems(project, 7);
      return `<h3>Agenda 7 Hari</h3>${data.length ? data.map(item => `<div class="timeline-detail-row"><span class="legend-item"><i class="assessment"></i>${esc(item.type === 'timeline' ? 'Timeline' : 'Task')}</span><strong>${esc(item.label)} · ${formatDate(item.date)}</strong></div>`).join('') : '<p>Tidak ada agenda dekat.</p>'}`;
    }
    if(ref === 'done'){
      const data = getCompletedThisPeriod(project, 30);
      const list = [
        ...data.tasks.map(task => `<div class="timeline-detail-row"><span class="legend-item"><i class="assessment"></i>Task</span><strong>${esc(task.task)} · ${formatDate(task.endDate)}</strong></div>`),
        ...data.docs.map(doc => `<div class="timeline-detail-row"><span class="legend-item"><i class="reporting"></i>Dokumen</span><strong>${esc(doc.name)} · ${formatDate(doc.date)}</strong></div>`)
      ];
      return `<h3>Selesai Terbaru</h3>${list.length ? list.join('') : '<p>Tidak ada item selesai dalam 30 hari dari update terakhir.</p>'}`;
    }
  }
  return '';
}
function renderDrawer(){
  ensurePremiumState();
  if(!state.drawer) return '';
  const project = selectedProject();
  return `<div class="drawer-backdrop" onclick="closeDrawer()"></div><aside class="detail-drawer"><button class="drawer-close" onclick="closeDrawer()">×</button><div class="drawer-eyebrow">Detail</div>${renderDrawerContent(project)}</aside>`;
}
function getCommandItems(){
  const items = [];
  getAllowedProjects().forEach(project => {
    items.push({type:'project', projectId: project.id, title: project.code, subtitle: project.name});
    (project.tasks || []).forEach((task, index) => items.push({type:'task', projectId: project.id, index, title: task.task || 'Task', subtitle: `${project.code} · ${task.status || 'Task'}`}));
    (project.documents || []).forEach((doc, index) => items.push({type:'document', projectId: project.id, index, title: doc.name || 'Document', subtitle: `${project.code} · Document List`}));
    (project.documentOutputs || []).forEach((doc, index) => items.push({type:'output', projectId: project.id, index, title: doc.name || 'Document Output', subtitle: `${project.code} · Document Output`}));
    (project.meetings || []).filter(meetingVisibleToCurrentUser).forEach((meeting, index) => items.push({type:'meeting', projectId: project.id, index, title: meetingDisplayNote(meeting) || 'Project Update', subtitle: `${project.code} · ${formatDate(meeting.date)}`}));
  });
  return items;
}
function getFilteredCommandItems(){
  const q = normalize(state.commandQuery || '');
  return getCommandItems().filter(item => !q || normalize(`${item.title} ${item.subtitle} ${item.type}`).includes(q)).slice(0, 30);
}
function openCommandPalette(){ state.commandOpen = true; state.commandQuery = ''; render(); setTimeout(() => document.getElementById('commandSearch')?.focus(), 60); }
function closeCommandPalette(){ state.commandOpen = false; state.commandQuery = ''; render(); }
function activateCommandItem(index){
  const item = getFilteredCommandItems()[index]; if(!item) return;
  state.selectedProjectId = item.projectId;
  state.commandOpen = false;
  state.commandQuery = '';
  if(item.type === 'project'){ state.activeTab = 'summary'; state.drawer = null; }
  if(item.type === 'task'){ state.activeTab = 'task'; state.drawer = {type:'task', ref:item.index}; }
  if(item.type === 'document'){ state.activeTab = 'document'; state.drawer = {type:'document', ref:item.index}; }
  if(item.type === 'output'){ state.activeTab = 'output'; state.drawer = {type:'output', ref:item.index}; }
  if(item.type === 'meeting'){ state.activeTab = 'meeting'; state.drawer = {type:'meeting', ref:item.index}; }
  state.page = 'dashboard';
  render();
}
function renderCommandPalette(){
  ensurePremiumState();
  if(!state.commandOpen) return '';
  const items = getFilteredCommandItems();
  return `<div class="command-backdrop" onclick="closeCommandPalette()"><section class="command-palette" onclick="event.stopPropagation()"><div class="command-head"><strong>Pencarian Global</strong><button onclick="closeCommandPalette()">×</button></div><input id="commandSearch" placeholder="Cari project, task, dokumen, catatan meeting..." value="${esc(state.commandQuery)}" oninput="state.commandQuery=this.value;render();setTimeout(()=>document.getElementById('commandSearch')?.focus(),20)"><div class="command-results">${items.length ? items.map((item,index) => `<button onclick="activateCommandItem(${index})"><span>${esc(item.type)}</span><strong>${esc(item.title)}</strong><small>${esc(item.subtitle)}</small></button>`).join('') : `<div class="tiny-empty">Tidak ada hasil.</div>`}</div><div class="command-footer">Pintasan: Ctrl/⌘ + K · Esc untuk tutup</div></section></div>`;
}
function togglePresentationMode(){ state.presentationMode = !state.presentationMode; render(); }


function getReportExportLanguage(){
  const value = String(state.reportExportLanguage || '').toLowerCase();
  return ['id','en'].includes(value) ? value : 'id';
}
function setReportExportLanguage(value){
  const next = ['id','en'].includes(String(value || '').toLowerCase()) ? String(value).toLowerCase() : 'id';
  state.reportExportLanguage = next;
  try{
    sessionStorage.setItem(REPORT_LANGUAGE_KEY, next);
    localStorage.setItem(REPORT_LANGUAGE_KEY, next);
  }catch(_err){}
  render();
}
function reportExportLanguageLabel(value = getReportExportLanguage()){
  const option = REPORT_LANGUAGE_OPTIONS.find(item => item.value === value) || REPORT_LANGUAGE_OPTIONS[0];
  return option.label;
}
function reportDateLocale(){
  return getReportExportLanguage() === 'en' ? 'en-US' : 'id-ID';
}

function showExportStatus(message, type = 'info'){
  const existing = document.getElementById('exportStatusToast');
  if(existing) existing.remove();
  const toast = document.createElement('div');
  toast.id = 'exportStatusToast';
  toast.className = `export-status-toast ${type}`;
  toast.innerHTML = `<strong>${esc(type === 'error' ? 'Export Gagal' : 'Report Sedang Diproses')}</strong><span>${esc(message)}</span>`;
  document.body.appendChild(toast);
  if(type !== 'loading'){
    setTimeout(() => toast.remove(), 5200);
  }
}

function hideExportStatus(){
  document.getElementById('exportStatusToast')?.remove();
}

function buildClientReportPayload(project){
  const metrics = metricSummary(project);
  const health = getProjectHealth(project);
  const currentPhase = getCurrentPhase(project);
  const nextMilestone = getNextMilestone(project);
  const docMetrics = getDocumentMetrics(project.documents || []);
  const activeRisks = getOverdueTasks(project).map(({task, schedule}) => ({
    task: task.task || '-',
    status: task.status || '-',
    reason: schedule.primaryReason || (schedule.reasons || []).join(' • ') || '-',
    notes: task.notes || 'Belum ada catatan PM / next action.'
  }));
  const closedLate = getScheduleVarianceTasks(project).map(({task, schedule}) => ({
    task: task.task || '-',
    reason: schedule.primaryReason || (schedule.reasons || []).join(' • ') || '-'
  }));
  const timeline = getAllTimelinePhases(project)
    .filter(item => item.task || item.label || item.startDate || item.endDate)
    .sort((a,b) => (a.start || 0) - (b.start || 0))
    .map(item => ({
      name: item.label && normalize(item.label) !== normalize(item.task) ? `${item.task} — ${item.label}` : (item.task || item.label || 'Timeline'),
      startDate: formatDate(item.startDate),
      endDate: formatDate(item.endDate),
      type: item.type || 'timeline'
    }));
  const tasks = (project.tasks || []).map(task => ({
    task: task.task || '-',
    status: task.status || '-',
    startDate: formatDate(task.startDate),
    endDate: formatDate(task.endDate),
    progress: `${pct(task.progress)}%`,
    notes: task.notes || '-'
  }));
  const outputs = (project.documentOutputs || []).map(item => ({
    name: item.name || '-',
    date: formatDate(item.date),
    status: item.status || '-'
  }));
  const documents = (project.documents || []).map(item => ({
    no: item.no || item.docNo || item.number || '-',
    name: item.name || '-',
    description: item.description || '-',
    date: formatDate(item.date),
    status: item.status || '-',
    reviewStatus: item.reviewStatus || '-'
  }));
  const meetings = (project.meetings || [])
    .filter(meetingVisibleToCurrentUser)
    .slice()
    .sort((a,b) => (dateValue(b.date) || 0) - (dateValue(a.date) || 0))
    .map(item => ({
      date: formatDate(item.date),
      type: meetingCategory(item),
      note: meetingDisplayNote(item) || '-',
      action: meetingDisplayAction(item) || '-'
    }));
  const schedules = (project.scheduleEvents || [])
    .filter(scheduleEventVisibleToCurrentUser)
    .slice()
    .sort((a,b) => `${a.date || ''} ${a.startTime || ''}`.localeCompare(`${b.date || ''} ${b.startTime || ''}`))
    .map(item => ({
      date: formatDate(item.date),
      title: item.title || '-',
      type: scheduleTypeLabel(item.type),
      mode: scheduleDeliveryModeLabel(item.deliveryMode),
      time: timeRangeLabel(item),
      location: item.location || '-',
      description: item.description || '-'
    }));
  const pm = project.picCywa || getLeadMember(project, ['project manager','pm','lead']);
  const clientPic = project.picClient || getLeadMember(project, ['client','customer','bank','user']);
  return {
    project,
    reportLanguage: getReportExportLanguage(),
    branding: { ...brandingForProject(project), reportLanguage: getReportExportLanguage() },
    metrics,
    health,
    currentPhase: currentPhase ? {
      label: currentPhase.label || currentPhase.task || '-',
      task: currentPhase.task || '-',
      startDate: formatDate(currentPhase.startDate),
      endDate: formatDate(currentPhase.endDate),
      manual: !!currentPhase.manual
    } : null,
    nextMilestone: nextMilestone ? {
      label: nextMilestone.label || '-',
      date: formatDate(nextMilestone.date),
      manual: !!nextMilestone.manual
    } : null,
    documentMetrics: docMetrics,
    activeRisks,
    closedLate,
    timeline,
    tasks,
    outputs,
    documents,
    meetings,
    schedules,
    picCywa: pm,
    picClient: clientPic,
    reportDate: new Date().toLocaleDateString(reportDateLocale(), {day:'2-digit', month:'long', year:'numeric'})
  };
}


async function exportTimelinePdf(){
  const project = selectedProject();
  if(!project){
    alert('Belum ada project yang dapat diunduh.');
    return;
  }
  try{
    showExportStatus(`Menyiapkan PDF Timeline (${reportExportLanguageLabel()})...`, 'loading');
    if(!window.PPDReportExporter || !window.PPDReportExporter.generateTimeline){
      throw new Error('Fitur PDF Timeline belum siap. Muat ulang halaman lalu coba kembali.');
    }
    const payload = buildClientReportPayload(project);
    await window.PPDReportExporter.generateTimeline(payload);
    await logActivity('export_timeline_pdf', project, 'reports', project.supabaseId, { report_type: 'Timeline PDF', language: getReportExportLanguage() });
    showExportStatus('PDF Timeline berhasil dibuat. Periksa folder Downloads jika file belum terlihat.', 'success');
  }catch(err){
    console.error('[Timeline Export]', err);
    showExportStatus(err?.message || 'PDF Timeline tidak berhasil dibuat.', 'error');
    alert(`Gagal membuat PDF Timeline.\n\n${err?.message || 'Terjadi kesalahan yang belum diketahui.'}`);
  }
}

async function exportClientReport(){
  const project = selectedProject();
  if(!project){
    alert('Belum ada project yang dapat diexport.');
    return;
  }
  try{
    showExportStatus(`Menyiapkan Ringkasan Eksekutif PDF (${reportExportLanguageLabel()})...`, 'loading');
    if(!window.PPDReportExporter){
      throw new Error('Fitur PDF belum siap. Muat ulang halaman lalu coba kembali.');
    }
    const payload = buildClientReportPayload(project);
    await window.PPDReportExporter.generate(payload);
    await logActivity('export_executive_summary', project, 'reports', project.supabaseId, { report_type: 'Executive Summary PDF', language: getReportExportLanguage() });
    showExportStatus('Ringkasan Eksekutif berhasil dibuat. Periksa folder Downloads jika file belum terlihat.', 'success');
  }catch(err){
    console.error('[Executive Summary Export]', err);
    showExportStatus(err?.message || 'Ringkasan Eksekutif tidak berhasil dibuat. Silakan muat ulang halaman dan coba kembali.', 'error');
    alert(`Gagal membuat Ringkasan Eksekutif.\n\n${err?.message || 'Terjadi kesalahan yang belum diketahui.'}\n\nMuat ulang halaman lalu coba kembali.`);
  }
}

async function exportCommercialReportPack(){
  const project = selectedProject();
  if(!project){
    alert('Belum ada project yang dapat diexport.');
    return;
  }
  try{
    showExportStatus(`Menyiapkan Paket Laporan Lengkap (${reportExportLanguageLabel()})...`, 'loading');
    if(!window.PPDReportExporter || !window.PPDReportExporter.generateCommercialPack){
      throw new Error('Fitur Report Pack belum siap. Muat ulang halaman lalu coba kembali.');
    }
    const payload = buildClientReportPayload(project);
    await window.PPDReportExporter.generateCommercialPack(payload);
    await logActivity('export_report_pack', project, 'reports', project.supabaseId, { report_type: 'Full Report Pack', language: getReportExportLanguage() });
    showExportStatus('Paket Laporan Lengkap berhasil dibuat. Periksa folder Downloads jika file belum terlihat.', 'success');
  }catch(err){
    console.error('[Report Pack Export]', err);
    showExportStatus(err?.message || 'Paket Laporan Lengkap tidak berhasil dibuat. Silakan muat ulang halaman dan coba kembali.', 'error');
    alert(`Gagal membuat Paket Laporan Lengkap.\n\n${err?.message || 'Terjadi kesalahan yang belum diketahui.'}\n\nMuat ulang halaman lalu coba kembali.`);
  }
}

const TOUR_STEPS = [
  {title:'Header Eksekutif', body:'Ringkasan premium untuk client: health, progress, current phase, milestone, PIC, dan update terakhir.'},
  {title:'Kartu Insight Klien', body:'Kartu ini menyorot pending dari client, keputusan yang dibutuhkan, agenda terdekat, risiko aktif, dan item selesai terbaru.'},
  {title:'Task Tracker Interaktif', body:'Gunakan pencarian, filter status/owner, tampilan tabel, dan kanban. Klik baris untuk membuka detail.'},
  {title:'Timeline Premium', body:'Timeline mendukung filter fase, zoom bulan/kuartal/tahun, marker hari ini, hover detail, dan panel detail.'},
  {title:'Pencarian Global', body:'Tekan Ctrl/⌘ + K untuk mencari lintas project, task, dokumen, dan catatan meeting.'}
];
function startGuidedTour(){ state.tourStep = 0; render(); }
function nextTourStep(){ if(state.tourStep === null) return; state.tourStep += 1; if(state.tourStep >= TOUR_STEPS.length) state.tourStep = null; render(); }
function prevTourStep(){ if(state.tourStep === null) return; state.tourStep = Math.max(0, state.tourStep - 1); render(); }
function closeGuidedTour(){ state.tourStep = null; render(); }
function renderTourOverlay(){
  ensurePremiumState();
  if(state.tourStep === null) return '';
  const step = TOUR_STEPS[state.tourStep];
  return `<div class="tour-backdrop"><section class="tour-card"><div class="drawer-eyebrow">Panduan ${state.tourStep + 1}/${TOUR_STEPS.length}</div><h3>${esc(step.title)}</h3><p>${esc(step.body)}</p><div class="tour-actions"><button class="ghost-btn" onclick="prevTourStep()" ${state.tourStep === 0 ? 'disabled' : ''}>Sebelumnya</button><button class="primary-btn" onclick="nextTourStep()">${state.tourStep === TOUR_STEPS.length - 1 ? 'Selesai' : 'Lanjut'}</button><button class="ghost-btn" onclick="closeGuidedTour()">Tutup</button></div></section></div>`;
}
function render(){
  ensurePremiumState();
  app.innerHTML = `<div class="app-shell ${state.presentationMode ? 'presentation-mode' : ''}">${state.presentationMode ? '<button class="presentation-back-btn" onclick="togglePresentationMode()">← Kembali</button>' : ''}${renderSidebar()}${renderMain()}${renderDrawer()}${renderCommandPalette()}${renderTourOverlay()}</div>`;
}
Object.assign(window, {
  ensurePremiumState,
  openDrawer,
  closeDrawer,
  setTaskStatusFilter,
  setTaskOwnerFilter,
  setTaskView,
  setDocumentFilter,
  setTimelineFilter,
  setTimelineZoom,
  setMeetingFilter,
  togglePresentationMode,
  exportClientReport,
  exportCommercialReportPack,
  setReportExportLanguage,
  exportTimelinePdf,
  openCommandPalette,
  closeCommandPalette,
  activateCommandItem,
  startGuidedTour,
  nextTourStep,
  prevTourStep,
  closeGuidedTour,
  canManageProjects,
  updateProjectAdminDraft,
  generateProjectGuestPassword,
  submitProjectAdminCreate,
  archiveProjectFromConsole,
  restoreProjectFromConsole,
  completeProjectFromConsole,
  reactivateProjectFromConsole,
  loadClientAccess,
  generateClientAccessPassword,
  resetClientAccessPassword,
  setBrandingProject,
  updateBrandingDraft,
  saveProjectBranding,
  uploadBrandingLogo,
  clearBrandingLogo,
  setClientAccessEnabled,
  copyClientOnboardingText,
  canAccessCommandCenter,
  canAccessClientPortal,
  canAccessSchedulePage,
  setClientProjectFilter,
  setCommandPage,
  setNotificationFilter,
  openNotificationTarget,
  openHomePanel,
  closeHomePanel,
  toggleHomeAgendaProject,
  setScheduleMonth,
  setScheduleMonthValue,
  setScheduleProjectFilter,
  selectScheduleDate,
  updateScheduleDraft,
  resetScheduleDraft,
  focusScheduleForm,
  editScheduleEvent,
  openScheduleAgenda,
  saveScheduleEvent,
  deleteScheduleEvent,
  monthISO,
  todayISO
});
document.addEventListener('keydown', (event) => {
  if((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k'){
    event.preventDefault();
    if(state.session) openCommandPalette();
  }
  if(event.key === 'Escape'){
    if(state.commandOpen) return closeCommandPalette();
    if(state.drawer) return closeDrawer();
    if(state.tourStep !== null) return closeGuidedTour();
    if(state.presentationMode) return togglePresentationMode();
  }
});


bootApp().catch((err) => {
  console.error('Professional Project Dashboard boot failed:', err);
  try {
    renderLogin();
  } catch (renderErr) {
    console.error('Professional Project Dashboard render failed:', renderErr);
    app.innerHTML = `
      <main class="login-shell">
        <section class="login-card">
          <img class="login-logo" src="assets/professional-dashboard-logo.png" alt="Professional Project Dashboard Logo">
          <div class="eyebrow">Project Dashboard</div>
          <h1>Dashboard belum berhasil dimuat</h1>
          <p>Terjadi error saat memuat aplikasi. Silakan muat ulang halaman dan coba kembali.</p>
        </section>
      </main>
    `;
  }
});
