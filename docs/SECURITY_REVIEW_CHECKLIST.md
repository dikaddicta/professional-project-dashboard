# Security Review Checklist

Use this checklist before sharing the dashboard with reviewers or stakeholders.

## Repository

- No service role key is stored in the repository.
- No private password is stored in documentation.
- No client confidential file is committed.
- No temporary files are committed.
- No old archive files are committed.
- `.env` files are excluded from the repository.

## Frontend

- Only Supabase URL and anon key are used in the browser.
- Client menu does not show internal modules.
- Admin menu does not show Project Manager-only modules.
- Error messages do not expose sensitive implementation details.

## Supabase

- Row Level Security is enabled for project data.
- Client users can only read assigned projects.
- Internal agenda is restricted from client access.
- Activity Log access is limited to Project Manager.
- Backup Data access is limited to Project Manager.

## Reports

- Client reports exclude internal agenda.
- Client reports exclude internal notes.
- Report language matches the selected export language.
- Report output does not expose configuration or database details.

## Final Sign-off

| Area | Status | Notes |
|---|---|---|
| Repository |  |  |
| Frontend |  |  |
| Supabase |  |  |
| Role Access |  |  |
| Reports |  |  |
