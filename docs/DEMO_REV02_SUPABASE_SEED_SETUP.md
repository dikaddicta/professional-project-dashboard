# Demo Rev02 — Supabase Demo Seed Setup

This step loads the Professional Project Dashboard demo content into the new Supabase project.

## Prerequisites

1. `supabase/schema.sql` has been executed successfully.
2. `supabase-config.js` points to the Supabase demo project.
3. Demo Auth users have been created in Supabase Authentication.

## Demo data included

- 10 projects
- 5 completed projects
- 5 active projects
- 103 tasks
- 103 timeline items
- 113 document list entries
- 50 document outputs
- 40 project updates
- 650 schedule events from 12 Jun 2026 to 31 Dec 2027

## Run order

1. Create demo Auth users from `docs/DEMO_ACCOUNT_MATRIX.md`.
2. Open Supabase SQL Editor.
3. Run `supabase/seed.demo.sql`.
4. Run `supabase/seed.demo.checks.sql`.
5. Login from the Vercel demo URL using PM/Admin/Client accounts.

## Expected result

- PM sees 10 projects.
- Admin sees 10 projects but not PM-only tools.
- Each client sees only one assigned project.
- Schedule has daily demo agenda coverage through 31 Dec 2027.
- Internal schedule entries are visible to PM/Admin and hidden from Client.
