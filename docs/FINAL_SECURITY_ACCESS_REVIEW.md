# Final Security and Access Review

This document summarizes the security and access model for the Professional Project Dashboard.

## Security Principles

- Data access is controlled by role and project assignment.
- Client users only see projects assigned to their account.
- Internal agenda and internal notes are not shown to client users.
- Project Manager-only modules are not available to Admin or Client users.
- Sensitive operations are handled through Supabase Edge Functions where required.

## Role Summary

| Role | Purpose | Access Level |
|---|---|---|
| Project Manager | Full project operation and governance | Full internal access |
| Admin | Operational monitoring and project support | Limited internal access |
| Client / Guest | Project visibility and schedule monitoring | Read-only client portal |

## Restricted Areas

The following areas are limited to Project Manager:

- Activity Log
- Backup Data
- Client access administration
- Project lifecycle control

The following data is restricted from Client / Guest:

- Internal agenda
- Internal notes
- Activity history
- Backup/export data
- Other client projects

## Review Checklist

- Supabase URL and anon key are the only frontend credentials.
- No service role key is stored in the repository.
- Row Level Security is enabled for project data.
- Client portal is limited to assigned projects.
- Internal agenda is not visible in client views.
- Project Manager-only menu items are hidden from non-PM users.
- Report exports follow the same visibility rules as the dashboard.
