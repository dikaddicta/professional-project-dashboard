-- Example seed data for a fresh Professional Project Dashboard database.
-- Create the matching users in Supabase Auth first, then run this file.
-- Replace names and emails before using this outside a demo environment.

begin;

-- Profiles. These rows only insert/update when the Auth users already exist.
insert into public.profiles (id, email, full_name, role)
select id, email, 'Project Manager', 'project_manager'
from auth.users
where email = 'pm@example.local'
on conflict (id) do update
set email = excluded.email,
    full_name = excluded.full_name,
    role = excluded.role;

insert into public.profiles (id, email, full_name, role)
select id, email, 'Admin', 'admin'
from auth.users
where email = 'admin@example.local'
on conflict (id) do update
set email = excluded.email,
    full_name = excluded.full_name,
    role = excluded.role;

insert into public.profiles (id, email, full_name, role)
select id, email, 'Guest - Example Project', 'guest'
from auth.users
where email = 'guest-project-1@example.local'
on conflict (id) do update
set email = excluded.email,
    full_name = excluded.full_name,
    role = excluded.role;

-- Project master.
insert into public.projects (
  legacy_id,
  code,
  name,
  client_name,
  start_date,
  end_date,
  project_status,
  is_active,
  pic_cywa,
  pic_client
)
values (
  'project-1',
  'Example Client',
  'Security Assessment Project',
  'Example Client',
  current_date,
  current_date + 30,
  'active',
  true,
  'Professional Project Team',
  'Client PIC'
)
on conflict (legacy_id) do update
set code = excluded.code,
    name = excluded.name,
    client_name = excluded.client_name,
    start_date = excluded.start_date,
    end_date = excluded.end_date,
    project_status = excluded.project_status,
    is_active = excluded.is_active,
    pic_cywa = excluded.pic_cywa,
    pic_client = excluded.pic_client,
    updated_at = now();

-- Access mapping.
insert into public.project_access (user_id, project_id, access_role, can_edit, is_enabled)
select u.id, p.id, 'project_manager', true, true
from auth.users u
cross join public.projects p
where u.email = 'pm@example.local'
  and p.legacy_id = 'project-1'
on conflict (user_id, project_id) do update
set access_role = excluded.access_role,
    can_edit = excluded.can_edit,
    is_enabled = excluded.is_enabled;

insert into public.project_access (user_id, project_id, access_role, can_edit, is_enabled)
select u.id, p.id, 'admin', false, true
from auth.users u
cross join public.projects p
where u.email = 'admin@example.local'
  and p.legacy_id = 'project-1'
on conflict (user_id, project_id) do update
set access_role = excluded.access_role,
    can_edit = excluded.can_edit,
    is_enabled = excluded.is_enabled;

insert into public.project_access (user_id, project_id, access_role, can_edit, is_enabled)
select u.id, p.id, 'guest', false, true
from auth.users u
cross join public.projects p
where u.email = 'guest-project-1@example.local'
  and p.legacy_id = 'project-1'
on conflict (user_id, project_id) do update
set access_role = excluded.access_role,
    can_edit = excluded.can_edit,
    is_enabled = excluded.is_enabled;

-- Project members.
insert into public.project_members (project_id, name, role, sort_order)
select p.id, member.name, member.role, member.sort_order
from public.projects p
cross join (values
  ('Project Manager', 'Project Lead', 1),
  ('Security Consultant', 'Assessment Team', 2),
  ('Client PIC', 'Client Representative', 3)
) as member(name, role, sort_order)
where p.legacy_id = 'project-1'
on conflict do nothing;

-- Timeline and task examples.
insert into public.timeline_items (project_id, name, start_date, end_date, type, sort_order)
select p.id, item.name, item.start_date, item.end_date, item.type, item.sort_order
from public.projects p
cross join (values
  ('Kick-off Meeting', current_date, current_date, 'assessment', 1),
  ('Assessment Execution', current_date + 1, current_date + 14, 'assessment', 2),
  ('Report Preparation', current_date + 15, current_date + 21, 'reporting', 3),
  ('Final Presentation', current_date + 22, current_date + 22, 'handover', 4)
) as item(name, start_date, end_date, type, sort_order)
where p.legacy_id = 'project-1'
on conflict do nothing;

insert into public.tasks (project_id, task, status, start_date_actual, end_date_actual, assigned_to, progress, notes, sort_order)
select p.id, item.task, item.status, item.start_date_actual, item.end_date_actual, item.assigned_to, item.progress, item.notes, item.sort_order
from public.projects p
cross join (values
  ('Kick-off Meeting', 'Completed', current_date, current_date, 'Project Manager', 100, 'Initial alignment completed.', 1),
  ('Assessment Execution', 'In progress', current_date + 1, null::date, 'Assessment Team', 45, 'Execution in progress.', 2),
  ('Report Preparation', 'Not started', null::date, null::date, 'Project Manager', 0, '', 3)
) as item(task, status, start_date_actual, end_date_actual, assigned_to, progress, notes, sort_order)
where p.legacy_id = 'project-1'
on conflict do nothing;

-- Document examples.
insert into public.documents (project_id, doc_no, date, name, description, status, review_status, sort_order)
select p.id, item.doc_no, current_date, item.name, item.description, item.status, item.review_status, item.sort_order
from public.projects p
cross join (values
  (1, 'Project Charter', 'Project initiation document.', 'Completed', 'Approved', 1),
  (2, 'Assessment Report', 'Assessment result document.', 'In progress', 'Under Review', 2)
) as item(doc_no, name, description, status, review_status, sort_order)
where p.legacy_id = 'project-1'
on conflict do nothing;

insert into public.document_outputs (project_id, output_no, date, name, description, status, sort_order)
select p.id, item.output_no, current_date, item.name, item.description, item.status, item.sort_order
from public.projects p
cross join (values
  (1, 'Executive Summary', 'Management-level summary report.', 'Not started', 1),
  (2, 'Full Report Pack', 'Complete project report pack.', 'Not started', 2)
) as item(output_no, name, description, status, sort_order)
where p.legacy_id = 'project-1'
on conflict do nothing;

-- Client-visible update.
insert into public.meeting_logs (project_id, date, type, note, action, client_note, client_action, is_client_visible, sort_order)
select p.id,
       current_date,
       'Update',
       'Project has been initiated and assessment activities are in progress.',
       'Continue assessment execution.',
       'Project has been initiated and assessment activities are in progress.',
       'Continue assessment execution.',
       true,
       1
from public.projects p
where p.legacy_id = 'project-1'
on conflict do nothing;

-- Schedule examples.
insert into public.project_schedule_events (project_id, title, event_date, start_time, end_time, event_type, delivery_mode, location, description, is_internal)
select p.id,
       'Project Sync',
       current_date + 3,
       '10:00'::time,
       '11:00'::time,
       'Project Sync',
       'Online',
       'Meeting link',
       'Weekly project alignment.',
       false
from public.projects p
where p.legacy_id = 'project-1'
on conflict do nothing;

insert into public.project_schedule_events (project_id, title, event_date, start_time, end_time, event_type, delivery_mode, location, description, is_internal)
select p.id,
       'Internal Preparation',
       current_date + 2,
       '09:00'::time,
       '10:00'::time,
       'Discussion',
       'Online',
       'Internal call',
       'Internal preparation agenda hidden from client portal.',
       true
from public.projects p
where p.legacy_id = 'project-1'
on conflict do nothing;

-- Branding example.
insert into public.project_branding (project_id, prepared_for, prepared_by, confidentiality_label, report_footer_text, brand_accent_color, show_client_logo, show_cywa_logo)
select p.id,
       'Example Client',
       'Professional Project Team',
       'Confidential — Prepared for Example Client',
       'This report is intended solely for authorized stakeholders.',
       '#0f2747',
       true,
       true
from public.projects p
where p.legacy_id = 'project-1'
on conflict (project_id) do update
set prepared_for = excluded.prepared_for,
    prepared_by = excluded.prepared_by,
    confidentiality_label = excluded.confidentiality_label,
    report_footer_text = excluded.report_footer_text,
    brand_accent_color = excluded.brand_accent_color,
    show_client_logo = excluded.show_client_logo,
    show_cywa_logo = excluded.show_cywa_logo,
    updated_at = now();

commit;
