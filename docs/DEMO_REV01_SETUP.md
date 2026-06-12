# Demo Rev01 - Clone, Rename, Logo, and Demo Guide

This document describes the first setup stage for the Professional Project Dashboard demo version.

## Objective

Create a separate demo version using the same architecture as the main dashboard:

- GitHub repository
- Supabase database, Auth, RLS, Storage, and Edge Functions
- Vercel hosting
- Same role model: Project Manager, Admin, Client/Guest

The demo version must remain separate from the main project so portfolio data, dummy accounts, and public demo access do not affect the production/review-ready dashboard.

## Local Folder Setup

From the final main dashboard repository, create a clean archive:

```powershell
cd "D:\PRIBADI\4. WEBSITE\cywa_project_dashboard_theme_clean"

git status
git archive --format=zip --output "../professional_project_dashboard_base.zip" HEAD
```

Extract it to:

```text
D:\PRIBADI\4. WEBSITE\professional_project_dashboard
```

Open the new folder in VSCode.

## Apply Demo Rev01 Patch

Extract the Demo Rev01 patch into:

```text
D:\PRIBADI\4. WEBSITE\professional_project_dashboard
```

Then run:

```powershell
cd "D:\PRIBADI\4. WEBSITE\professional_project_dashboard"

node --check app.js
node --check report-export.js
node --check data.js
```

## GitHub Repository

Create a new GitHub repository:

```text
professional-project-dashboard
```

Then initialize the local folder:

```powershell
git init
git branch -M main
git add -A
git commit -m "Initialize Professional Project Dashboard demo"
git remote add origin https://github.com/<username>/professional-project-dashboard.git
git push -u origin main
```

## Supabase Demo Project

Create a new Supabase project for the demo environment. Do not reuse the main project database.

Recommended project name:

```text
professional-project-dashboard-demo
```

In Supabase SQL Editor, run:

```text
supabase/schema.sql
```

Then update:

```text
supabase-config.js
```

Use the demo Supabase URL and anon key only. Never use a service role key in the frontend.

## Edge Functions

From the demo project folder:

```powershell
npx supabase@latest login
npx supabase@latest link --project-ref <DEMO_SUPABASE_PROJECT_REF>

npx supabase@latest functions deploy admin-password --use-api --debug
npx supabase@latest functions deploy project-admin --use-api --debug
```

Set allowed origin after Vercel deployment URL is available:

```powershell
npx supabase@latest secrets set ALLOWED_ORIGINS=https://professional-project-dashboard.vercel.app
```

Use the actual Vercel URL if the deployment URL is different.

## Vercel Deployment

1. Open Vercel.
2. Import the GitHub repository `professional-project-dashboard`.
3. Deploy as a static frontend project.
4. Confirm the login page loads.
5. Confirm the Demo Guide button downloads the PDF.

## Rev01 Scope

This revision only covers:

- rename to Professional Project Dashboard,
- new logo and favicon,
- login page Demo Guide button,
- demo guide PDF,
- initial demo setup documentation.

The 10-project demo seed data will be handled in the next revision.
