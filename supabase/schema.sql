-- Professional Project Dashboard database schema
-- Use this file for a fresh Supabase project or as the final reference schema.
-- For an existing production database, review changes before running the full script.

begin;

create extension if not exists "pgcrypto";

-- Shared timestamp helper.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- User profile mapped to Supabase Auth users.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  role text not null check (role in ('project_manager', 'admin', 'guest')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Project master data.
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  code text not null,
  name text not null,
  client_name text,
  start_date date,
  end_date date,
  health_override text check (health_override in ('Healthy', 'Attention', 'Critical', 'Setup Needed')),
  health_reason text,
  next_milestone_task text,
  current_phase_task text,
  pic_cywa text,
  pic_client text,
  project_status text not null default 'active' check (project_status in ('active', 'completed', 'archived')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Project access mapping for PM, Admin, and Guest users.
create table if not exists public.project_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  access_role text not null check (access_role in ('project_manager', 'admin', 'guest')),
  can_edit boolean not null default false,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique(user_id, project_id)
);

create table if not exists public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  name text not null,
  role text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.timeline_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  name text not null,
  start_date date,
  end_date date,
  type text not null default 'assessment',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.timeline_phases (
  id uuid primary key default gen_random_uuid(),
  timeline_item_id uuid references public.timeline_items(id) on delete cascade,
  label text,
  type text not null default 'assessment',
  start_date date,
  end_date date,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  task text not null,
  status text not null default 'Not started',
  start_date_actual date,
  end_date_actual date,
  assigned_to text,
  progress int not null default 0 check (progress >= 0 and progress <= 100),
  notes text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  doc_no int,
  date date,
  name text not null,
  description text,
  status text not null default 'Not started',
  review_status text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.document_outputs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  output_no int,
  date date,
  name text not null,
  description text,
  status text not null default 'Not started',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.meeting_logs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  date date,
  type text not null default 'Update' check (type in ('Update', 'Action Item', 'Decision', 'Risk / Issue')),
  note text,
  action text,
  client_note text,
  client_action text,
  is_client_visible boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_branding (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  client_logo_url text,
  brand_accent_color text not null default '#0f2747' check (brand_accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  prepared_for text,
  prepared_by text not null default 'Professional Project Team',
  confidentiality_label text,
  report_footer_text text,
  show_client_logo boolean not null default true,
  show_cywa_logo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id)
);

create table if not exists public.project_schedule_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  event_date date not null,
  start_time time,
  end_time time,
  event_type text not null default 'Meeting' check (event_type in ('Audit','Discussion','Meeting','Presentation','Technical Onsite','Project Sync')),
  delivery_mode text not null default 'Online' check (delivery_mode in ('Online', 'Onsite')),
  location text,
  description text,
  is_internal boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  action text not null,
  table_name text,
  record_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.auth_password_admin_log (
  id uuid primary key default gen_random_uuid(),
  target_key text,
  target_email text not null,
  target_label text not null,
  changed_by uuid references public.profiles(id) on delete set null,
  changed_by_email text,
  changed_at timestamptz not null default now(),
  status text not null default 'success',
  note text
);

-- Existing database compatibility: ensure final columns exist when this file is used as an upgrade reference.
alter table public.projects add column if not exists next_milestone_task text;
alter table public.projects add column if not exists current_phase_task text;
alter table public.projects add column if not exists pic_cywa text;
alter table public.projects add column if not exists pic_client text;
alter table public.projects add column if not exists project_status text not null default 'active';
alter table public.project_access add column if not exists is_enabled boolean not null default true;
alter table public.meeting_logs add column if not exists client_note text;
alter table public.meeting_logs add column if not exists client_action text;
alter table public.meeting_logs add column if not exists is_client_visible boolean not null default true;
alter table public.project_schedule_events add column if not exists delivery_mode text not null default 'Online';

-- Remove sensitive accidental columns if they were ever created in password administration logs.
alter table public.auth_password_admin_log drop column if exists password;
alter table public.auth_password_admin_log drop column if exists plain_password;
alter table public.auth_password_admin_log drop column if exists new_password;
alter table public.auth_password_admin_log drop column if exists password_value;
alter table public.auth_password_admin_log drop column if exists secret;

-- Indexes.
create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_projects_legacy_id on public.projects(legacy_id);
create index if not exists idx_projects_status_active on public.projects(project_status, is_active);
create index if not exists idx_project_access_user_project on public.project_access(user_id, project_id);
create index if not exists idx_project_access_enabled on public.project_access(user_id, project_id, is_enabled);
create index if not exists idx_project_members_project_id on public.project_members(project_id, sort_order);
create index if not exists idx_timeline_items_project_id on public.timeline_items(project_id, sort_order);
create index if not exists idx_timeline_phases_timeline_item_id on public.timeline_phases(timeline_item_id, sort_order);
create index if not exists idx_tasks_project_id on public.tasks(project_id, sort_order);
create index if not exists idx_documents_project_id on public.documents(project_id, sort_order, doc_no);
create index if not exists idx_document_outputs_project_id on public.document_outputs(project_id, sort_order, output_no);
create index if not exists idx_meeting_logs_project_id on public.meeting_logs(project_id, date desc, sort_order);
create index if not exists idx_meeting_logs_client_visible on public.meeting_logs(project_id, is_client_visible, date desc);
create index if not exists idx_project_branding_project_id on public.project_branding(project_id);
create index if not exists idx_project_schedule_events_project_date on public.project_schedule_events(project_id, event_date, start_time);
create index if not exists idx_project_schedule_events_date on public.project_schedule_events(event_date, start_time);
create index if not exists idx_project_schedule_events_mode_date on public.project_schedule_events(delivery_mode, event_date);
create index if not exists idx_project_schedule_events_client_visible on public.project_schedule_events(project_id, event_date, start_time) where is_internal = false;
create index if not exists idx_audit_logs_created_at_desc on public.audit_logs(created_at desc);
create index if not exists idx_audit_logs_project_id on public.audit_logs(project_id);
create index if not exists idx_audit_logs_action on public.audit_logs(action);
create index if not exists idx_auth_password_admin_log_changed_at on public.auth_password_admin_log(changed_at desc);
create index if not exists idx_auth_password_admin_log_target_email on public.auth_password_admin_log(target_email);

-- Updated-at triggers.
drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists set_projects_updated_at on public.projects;
create trigger set_projects_updated_at before update on public.projects for each row execute function public.set_updated_at();
drop trigger if exists set_tasks_updated_at on public.tasks;
create trigger set_tasks_updated_at before update on public.tasks for each row execute function public.set_updated_at();
drop trigger if exists set_documents_updated_at on public.documents;
create trigger set_documents_updated_at before update on public.documents for each row execute function public.set_updated_at();
drop trigger if exists set_document_outputs_updated_at on public.document_outputs;
create trigger set_document_outputs_updated_at before update on public.document_outputs for each row execute function public.set_updated_at();
drop trigger if exists set_meeting_logs_updated_at on public.meeting_logs;
create trigger set_meeting_logs_updated_at before update on public.meeting_logs for each row execute function public.set_updated_at();
drop trigger if exists set_project_branding_updated_at on public.project_branding;
create trigger set_project_branding_updated_at before update on public.project_branding for each row execute function public.set_updated_at();
drop trigger if exists set_project_schedule_events_updated_at on public.project_schedule_events;
create trigger set_project_schedule_events_updated_at before update on public.project_schedule_events for each row execute function public.set_updated_at();

-- Role helpers.
create or replace function public.current_app_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role
  from public.profiles
  where id = auth.uid()
$$;

create or replace function public.can_read_project(target_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    public.current_app_role() in ('project_manager', 'admin')
    or exists (
      select 1
      from public.project_access pa
      where pa.project_id = target_project_id
        and pa.user_id = auth.uid()
        and coalesce(pa.is_enabled, true) = true
    )
$$;

create or replace function public.can_edit_project(target_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    public.current_app_role() = 'project_manager'
    or exists (
      select 1
      from public.project_access pa
      where pa.project_id = target_project_id
        and pa.user_id = auth.uid()
        and pa.can_edit = true
        and coalesce(pa.is_enabled, true) = true
    )
$$;

-- Enable RLS.
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_access enable row level security;
alter table public.project_members enable row level security;
alter table public.timeline_items enable row level security;
alter table public.timeline_phases enable row level security;
alter table public.tasks enable row level security;
alter table public.documents enable row level security;
alter table public.document_outputs enable row level security;
alter table public.meeting_logs enable row level security;
alter table public.project_branding enable row level security;
alter table public.project_schedule_events enable row level security;
alter table public.audit_logs enable row level security;
alter table public.auth_password_admin_log enable row level security;

-- Base grants. Table-level grants are still filtered by RLS policies.
revoke all on table public.audit_logs from anon;
revoke all on table public.auth_password_admin_log from anon;
grant select on all tables in schema public to authenticated;
grant insert, update, delete on public.projects to authenticated;
grant insert, update, delete on public.project_access to authenticated;
grant insert, update, delete on public.project_members to authenticated;
grant insert, update, delete on public.timeline_items to authenticated;
grant insert, update, delete on public.timeline_phases to authenticated;
grant insert, update, delete on public.tasks to authenticated;
grant insert, update, delete on public.documents to authenticated;
grant insert, update, delete on public.document_outputs to authenticated;
grant insert, update, delete on public.meeting_logs to authenticated;
grant insert, update, delete on public.project_branding to authenticated;
grant insert, update, delete on public.project_schedule_events to authenticated;
grant insert on public.audit_logs to authenticated;

-- Policies: profiles.
drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Project managers can read all profiles" on public.profiles;
drop policy if exists "Project managers can manage profiles" on public.profiles;

create policy "Users can read own profile"
on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy "Project managers can read all profiles"
on public.profiles
for select
to authenticated
using (public.current_app_role() = 'project_manager');

create policy "Project managers can manage profiles"
on public.profiles
for all
to authenticated
using (public.current_app_role() = 'project_manager')
with check (public.current_app_role() = 'project_manager');

-- Policies: projects.
drop policy if exists "Users can read allowed projects" on public.projects;
drop policy if exists "Project managers can manage projects" on public.projects;

create policy "Users can read allowed projects"
on public.projects
for select
to authenticated
using (public.can_read_project(id));

create policy "Project managers can manage projects"
on public.projects
for all
to authenticated
using (public.current_app_role() = 'project_manager')
with check (public.current_app_role() = 'project_manager');

-- Policies: project access.
drop policy if exists "Users can read own project access" on public.project_access;
drop policy if exists "Project managers can manage project access" on public.project_access;

create policy "Users can read own project access"
on public.project_access
for select
to authenticated
using (user_id = auth.uid() or public.current_app_role() in ('project_manager', 'admin'));

create policy "Project managers can manage project access"
on public.project_access
for all
to authenticated
using (public.current_app_role() = 'project_manager')
with check (public.current_app_role() = 'project_manager');

-- Generic project-scoped read/manage policies.
drop policy if exists "Users can read allowed project members" on public.project_members;
drop policy if exists "Project managers can manage project members" on public.project_members;
create policy "Users can read allowed project members" on public.project_members for select to authenticated using (public.can_read_project(project_id));
create policy "Project managers can manage project members" on public.project_members for all to authenticated using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));

drop policy if exists "Users can read allowed timeline items" on public.timeline_items;
drop policy if exists "Project managers can manage timeline items" on public.timeline_items;
create policy "Users can read allowed timeline items" on public.timeline_items for select to authenticated using (public.can_read_project(project_id));
create policy "Project managers can manage timeline items" on public.timeline_items for all to authenticated using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));

drop policy if exists "Users can read allowed timeline phases" on public.timeline_phases;
drop policy if exists "Project managers can manage timeline phases" on public.timeline_phases;
create policy "Users can read allowed timeline phases" on public.timeline_phases for select to authenticated using (
  exists (select 1 from public.timeline_items ti where ti.id = timeline_item_id and public.can_read_project(ti.project_id))
);
create policy "Project managers can manage timeline phases" on public.timeline_phases for all to authenticated using (
  exists (select 1 from public.timeline_items ti where ti.id = timeline_item_id and public.can_edit_project(ti.project_id))
) with check (
  exists (select 1 from public.timeline_items ti where ti.id = timeline_item_id and public.can_edit_project(ti.project_id))
);

drop policy if exists "Users can read allowed tasks" on public.tasks;
drop policy if exists "Project managers can manage tasks" on public.tasks;
create policy "Users can read allowed tasks" on public.tasks for select to authenticated using (public.can_read_project(project_id));
create policy "Project managers can manage tasks" on public.tasks for all to authenticated using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));

drop policy if exists "Users can read allowed documents" on public.documents;
drop policy if exists "Project managers can manage documents" on public.documents;
create policy "Users can read allowed documents" on public.documents for select to authenticated using (public.can_read_project(project_id));
create policy "Project managers can manage documents" on public.documents for all to authenticated using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));

drop policy if exists "Users can read allowed document outputs" on public.document_outputs;
drop policy if exists "Project managers can manage document outputs" on public.document_outputs;
create policy "Users can read allowed document outputs" on public.document_outputs for select to authenticated using (public.can_read_project(project_id));
create policy "Project managers can manage document outputs" on public.document_outputs for all to authenticated using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));

drop policy if exists "Users can read allowed meeting logs" on public.meeting_logs;
drop policy if exists "Project managers can manage meeting logs" on public.meeting_logs;
create policy "Users can read allowed meeting logs" on public.meeting_logs for select to authenticated using (
  public.current_app_role() in ('project_manager', 'admin')
  or (public.can_read_project(project_id) and coalesce(is_client_visible, true) = true)
);
create policy "Project managers can manage meeting logs" on public.meeting_logs for all to authenticated using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));

-- Policies: branding.
drop policy if exists "Users can read allowed project branding" on public.project_branding;
drop policy if exists "Project managers can manage project branding" on public.project_branding;
create policy "Users can read allowed project branding" on public.project_branding for select to authenticated using (public.can_read_project(project_id));
create policy "Project managers can manage project branding" on public.project_branding for all to authenticated using (public.current_app_role() = 'project_manager') with check (public.current_app_role() = 'project_manager');

-- Policies: schedule.
drop policy if exists "PM and Admin can read project schedule" on public.project_schedule_events;
drop policy if exists "Client can read published project schedule" on public.project_schedule_events;
drop policy if exists "Project managers can create project schedule" on public.project_schedule_events;
drop policy if exists "Project managers can update project schedule" on public.project_schedule_events;
drop policy if exists "Project managers can delete project schedule" on public.project_schedule_events;

create policy "PM and Admin can read project schedule"
on public.project_schedule_events
for select
to authenticated
using (public.current_app_role() in ('project_manager', 'admin'));

create policy "Client can read published project schedule"
on public.project_schedule_events
for select
to authenticated
using (
  public.current_app_role() = 'guest'
  and is_internal = false
  and exists (
    select 1
    from public.project_access pa
    where pa.project_id = project_schedule_events.project_id
      and pa.user_id = auth.uid()
      and coalesce(pa.is_enabled, true) = true
  )
);

create policy "Project managers can create project schedule"
on public.project_schedule_events
for insert
to authenticated
with check (public.current_app_role() = 'project_manager' and public.can_edit_project(project_id));

create policy "Project managers can update project schedule"
on public.project_schedule_events
for update
to authenticated
using (public.current_app_role() = 'project_manager' and public.can_edit_project(project_id))
with check (public.current_app_role() = 'project_manager' and public.can_edit_project(project_id));

create policy "Project managers can delete project schedule"
on public.project_schedule_events
for delete
to authenticated
using (public.current_app_role() = 'project_manager' and public.can_edit_project(project_id));

-- Policies: PM-only audit log.
drop policy if exists "Project managers can read audit logs" on public.audit_logs;
drop policy if exists "Project managers can insert audit logs" on public.audit_logs;
drop policy if exists "pm_only_can_read_audit_logs" on public.audit_logs;
drop policy if exists "pm_only_can_insert_audit_logs" on public.audit_logs;

create policy "pm_only_can_read_audit_logs"
on public.audit_logs
for select
to authenticated
using (public.current_app_role() = 'project_manager');

create policy "pm_only_can_insert_audit_logs"
on public.audit_logs
for insert
to authenticated
with check (public.current_app_role() = 'project_manager');

-- Policies: password administration metadata log.
drop policy if exists "pm_admin_can_view_password_admin_log" on public.auth_password_admin_log;
create policy "pm_admin_can_view_password_admin_log"
on public.auth_password_admin_log
for select
to authenticated
using (public.current_app_role() in ('project_manager', 'admin'));

-- Storage bucket for client logos used in dashboard and PDF reports.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-brand-assets',
  'project-brand-assets',
  true,
  2097152,
  array['image/png','image/jpeg','image/jpg','image/webp','image/svg+xml']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Project brand assets public read" on storage.objects;
create policy "Project brand assets public read"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'project-brand-assets');

drop policy if exists "Project managers can upload project brand assets" on storage.objects;
create policy "Project managers can upload project brand assets"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'project-brand-assets' and public.current_app_role() = 'project_manager');

drop policy if exists "Project managers can update project brand assets" on storage.objects;
create policy "Project managers can update project brand assets"
on storage.objects
for update
to authenticated
using (bucket_id = 'project-brand-assets' and public.current_app_role() = 'project_manager')
with check (bucket_id = 'project-brand-assets' and public.current_app_role() = 'project_manager');

drop policy if exists "Project managers can delete project brand assets" on storage.objects;
create policy "Project managers can delete project brand assets"
on storage.objects
for delete
to authenticated
using (bucket_id = 'project-brand-assets' and public.current_app_role() = 'project_manager');

comment on table public.projects is 'Project master data for Professional Project Dashboard.';
comment on column public.projects.project_status is 'Project lifecycle: active, completed, archived. Completed remains visible; archived is hidden from the active dashboard.';
comment on table public.project_access is 'User-to-project access mapping used by RLS.';
comment on table public.project_schedule_events is 'Project schedule and agenda items. Internal events are hidden from client/guest users.';
comment on table public.audit_logs is 'PM-only activity log for important dashboard actions.';
comment on table public.auth_password_admin_log is 'Metadata log for password administration. This table must never store plaintext passwords.';

commit;
