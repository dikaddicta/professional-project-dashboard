# Demo Rev02.2 — Seed Health Status Fix

This patch updates the demo seed data so every `projects.health_override` value follows the final schema constraint.

Allowed values in `projects.health_override` are:

- Healthy
- Attention
- Critical
- Setup Needed

The previous seed used `On Watch` for two active demo projects. Those values are now replaced with `Attention`.

Run `supabase/seed.demo.sql` again in the Supabase SQL Editor, then run `supabase/seed.demo.checks.sql`.
