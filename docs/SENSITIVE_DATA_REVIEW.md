# Sensitive Data Review

This review is used to confirm that the repository and dashboard do not expose sensitive operational information.

## Repository Review

Check the repository for:

- Service role key
- Private password
- Personal access token
- Confidential client document
- Real production credential
- Private meeting note
- Unapproved project attachment

## Frontend Configuration

The frontend may include the Supabase URL and anon key. These are acceptable for browser use when Row Level Security is correctly configured.

Do not include:

- Service role key
- Database password
- API secret
- Private token
- Personal credential

## Sample Data

Sample or fallback data should use neutral project names and should not contain confidential project information. If the dashboard is used for portfolio or public demonstration, prepare a separate demo branch or demo repository with sample projects.

## Client Data

Before sharing access externally, confirm:

- Client users can only see assigned projects.
- Internal agenda is hidden from client users.
- Internal notes are not shown in client reports.
- Backup export is limited to Project Manager.
- Activity Log is limited to Project Manager.

## Final Review Questions

1. Does any file contain a secret key?
2. Does any file contain real passwords?
3. Does any sample data expose client confidential information?
4. Can a client user view another project?
5. Can a client user view an internal agenda?
