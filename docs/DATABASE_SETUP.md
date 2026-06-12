# Database Setup

The database schema for this dashboard is documented in `supabase/schema.sql`. The file is intended as the final setup reference for a fresh environment.

## Main Objects

The schema covers:

- Project records
- Project access mapping
- Project schedule events
- Project branding
- Project updates
- Activity log
- Row Level Security policies
- Supporting indexes
- Helper functions
- Supabase file storage policies for project assets

## Recommended Setup Flow

1. Create a Supabase project.
2. Run the schema from `supabase/schema.sql` in the SQL Editor.
3. Review Row Level Security policies before sharing access externally.
4. Deploy the Edge Functions under `supabase/functions/`.
5. Configure the frontend using the Supabase project URL and anon key.
6. Confirm the application can read and write project data based on the expected role.

## Important Notes

- Do not store service role keys in the frontend.
- The anon key is intended for browser use when Row Level Security is correctly configured.
- Use the schema file for new environments only. Do not run it against a live database without reviewing existing data.
- Access control must be validated after every database change.
