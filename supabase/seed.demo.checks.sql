
-- Professional Project Dashboard demo seed validation.
select 'projects' as section, count(*) as total from public.projects where legacy_id between 'project-01' and 'project-10'
union all select 'completed_projects', count(*) from public.projects where legacy_id between 'project-01' and 'project-10' and project_status = 'completed'
union all select 'active_projects', count(*) from public.projects where legacy_id between 'project-01' and 'project-10' and project_status = 'active'
union all select 'tasks', count(*) from public.tasks where project_id in (select id from public.projects where legacy_id between 'project-01' and 'project-10')
union all select 'timeline_items', count(*) from public.timeline_items where project_id in (select id from public.projects where legacy_id between 'project-01' and 'project-10')
union all select 'documents', count(*) from public.documents where project_id in (select id from public.projects where legacy_id between 'project-01' and 'project-10')
union all select 'document_outputs', count(*) from public.document_outputs where project_id in (select id from public.projects where legacy_id between 'project-01' and 'project-10')
union all select 'project_updates', count(*) from public.meeting_logs where project_id in (select id from public.projects where legacy_id between 'project-01' and 'project-10')
union all select 'schedule_events', count(*) from public.project_schedule_events where project_id in (select id from public.projects where legacy_id between 'project-01' and 'project-10')
union all select 'internal_schedule_events', count(*) from public.project_schedule_events where is_internal = true and project_id in (select id from public.projects where legacy_id between 'project-01' and 'project-10')
union all select 'profiles', count(*) from public.profiles where email like '%@professional-demo.local'
union all select 'project_access', count(*) from public.project_access where project_id in (select id from public.projects where legacy_id between 'project-01' and 'project-10');

select email, role
from public.profiles
where email like '%@professional-demo.local'
order by role, email;

select p.code, p.name, p.project_status, count(t.id) as task_count, count(distinct se.id) as schedule_count
from public.projects p
left join public.tasks t on t.project_id = p.id
left join public.project_schedule_events se on se.project_id = p.id
where p.legacy_id between 'project-01' and 'project-10'
group by p.code, p.name, p.project_status
order by p.code;

-- Project display codes should use client names, not internal numeric demo codes.
select
  count(*) filter (where code ~ '^PPD-[0-9]{3}$') as internal_code_rows,
  count(*) filter (where code = client_name) as code_matches_client_name
from public.projects
where legacy_id between 'project-01' and 'project-10';
