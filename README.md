# Professional Project Dashboard

Professional Project Dashboard is a role-based project monitoring dashboard for portfolio demonstration and live project governance scenarios. It includes Project Manager, Admin, and Client/Guest experiences with project tracking, schedule visibility, report export, client portal access, activity log, and controlled data backup.

## Tech Stack

- Frontend: HTML5, CSS3, Vanilla JavaScript
- Backend: Supabase
- Database: PostgreSQL via Supabase
- Authentication: Supabase Auth
- Authorization: Supabase Row Level Security
- Serverless functions: Supabase Edge Functions
- Hosting: Vercel
- Version control: Git and GitHub

## Demo Purpose

This repository is intended for a public demo and portfolio presentation. All project names, schedules, documents, and user accounts must use demonstration data only.

## Main Roles

- Project Manager: full dashboard access, project management, schedule management, reports, backup export, and activity log.
- Admin: operational monitoring access without backup and activity log.
- Client/Guest: limited portal access for assigned projects only.

## Local Setup

Open the project in VSCode, then use a local static server such as Live Server. Update `supabase-config.js` with the demo Supabase URL and anon key before deploying.

## Deployment Flow

1. Push this repository to GitHub.
2. Create a new Supabase project for the demo environment.
3. Run `supabase/schema.sql` on the demo Supabase project.
4. Deploy Supabase Edge Functions.
5. Import the demo seed data.
6. Import the repository into Vercel.
7. Test PM, Admin, and Client access from the Vercel production URL.

## Demo Guide

The login page includes a **Demo Guide** button. The PDF guide contains demo role descriptions, account format, and recommended walkthrough flow.
