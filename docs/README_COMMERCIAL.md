# Professional Project Dashboard

Professional Project Dashboard is a role-based project monitoring dashboard designed for project governance, certification tracking, client visibility, schedule management, reporting, and controlled operational export.

## Core Features

- Project command center for Project Manager and Admin
- Client portal with restricted project visibility
- Project timeline and task tracking
- Schedule calendar with Online and Onsite mode
- Internal agenda control
- Activity Log for Project Manager
- Backup Data for Project Manager
- Report Center with Bahasa Indonesia and English export
- Project branding and client logo support

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Backend Services | Supabase |
| Database | PostgreSQL |
| Authentication | Supabase Auth |
| Authorization | Row Level Security |
| File Assets | Supabase file storage |
| Serverless Logic | Supabase Edge Functions |
| Hosting | Vercel |
| Version Control | Git and GitHub |

## Role Access

| Role | Purpose | Main Access |
|---|---|---|
| Project Manager | Full project governance | All internal modules |
| Admin | Operational monitoring | Dashboard, project, schedule, project management |
| Client / Guest | Project visibility | Beranda, Project, Schedule |

## Security Model

The application uses role-based UI controls and database-level Row Level Security. Client users only see projects assigned to their account, and internal agenda records are not displayed in the client portal or client report export.

## Deployment

The frontend is deployed through Vercel. Supabase provides authentication, database, file assets, policies, and Edge Functions.

Deployment flow:

1. Commit local changes.
2. Push to GitHub.
3. Vercel deploys the frontend.
4. Supabase remains the backend service for data and access control.

## Review Notes

This repository is structured for production review. Historical development artifacts are not required for runtime operation and are intentionally excluded from the final repository structure.
