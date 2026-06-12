# Demo Rev02.1 — Seed Date Format Fix

This update fixes the demo seed file so that project start and end dates use PostgreSQL-compatible ISO date values.

## What changed

The demo project seed previously contained Excel serial date values in the project master section. PostgreSQL expects date values in a valid date format, so the project dates have been converted to `YYYY-MM-DD`.

## How to apply

1. Replace `supabase/seed.demo.sql` with the updated file.
2. Run the seed again in Supabase SQL Editor.
3. Run `supabase/seed.demo.checks.sql` to verify the imported data.

If the previous run failed with a date parsing error, the transaction should not have inserted partial project data. Running the fixed seed again is safe because the seed is written to refresh the demo project rows.
