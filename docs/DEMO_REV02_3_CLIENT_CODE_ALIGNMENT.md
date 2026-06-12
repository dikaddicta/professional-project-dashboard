# Demo Rev02.3 — Client Code Alignment

This update aligns the visible project code with the demo client name.

## Change

Project display codes now use the client/company name:

- Asteria Bank
- Merapi Retail Group
- Sagara Logistics
- Vantara Insurance
- Arunika Healthcare
- Zenith Finance
- Borealis Energy
- Lumina Telco
- Kaldera Manufacturing
- Nova Public Services

The project title remains the engagement name, such as `ISO 27001:2022 Certification Readiness`.

## Database

Re-run `supabase/seed.demo.sql` after applying this patch. The seed is idempotent and updates existing demo rows by `legacy_id`.

Then run `supabase/seed.demo.checks.sql` and confirm:

- `internal_code_rows = 0`
- `code_matches_client_name = 10`
