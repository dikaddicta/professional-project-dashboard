# Security Notes

This project uses Supabase Authentication and Row Level Security to separate Project Manager, Admin, and Client/Guest access.

## Important Rules

- Never commit Supabase service role keys.
- Only use the Supabase anon key in `supabase-config.js`.
- Keep demo data separate from production or real client data.
- Client/Guest users must only access projects assigned through the access mapping table.
- Internal schedule items must not appear in the Client/Guest portal.
- Demo passwords are allowed in the Demo Guide only because this repository is intended for portfolio demonstration.

## Recommended Review Before Public Demo

- Check `supabase-config.js` before pushing.
- Verify RLS policies in the demo Supabase project.
- Confirm that all project data is dummy data.
- Test PM, Admin, and Client/Guest login from the deployed Vercel URL.
