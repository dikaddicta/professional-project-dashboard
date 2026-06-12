# Access Review Test Plan

This checklist is used to confirm that each role can only access the information and actions intended for that role.

## Roles to Test

- Project Manager
- Admin
- Client / Guest

## Project Manager

Expected access:

- Beranda
- Notifikasi
- Activity Log
- Backup Data
- Project
- Schedule
- Kelola Project

Test points:

1. Project Manager can open all internal menus.
2. Project Manager can create, update, complete, archive, and restore projects.
3. Project Manager can create, edit, and delete schedule entries.
4. Project Manager can mark an agenda as internal.
5. Project Manager can export report, backup, schedule, and activity data.
6. Project Manager can manage client access.

## Admin

Expected access:

- Beranda
- Notifikasi
- Project
- Schedule
- Kelola Project

Restricted access:

- Activity Log
- Backup Data

Test points:

1. Admin can open operational menus.
2. Admin cannot see Activity Log.
3. Admin cannot see Backup Data.
4. Admin cannot access Project Manager-only actions through direct navigation.

## Client / Guest

Expected access:

- Beranda
- Project
- Schedule

Restricted access:

- Notifikasi
- Activity Log
- Backup Data
- Kelola Project
- Internal agenda
- Internal notes
- Other client projects

Test points:

1. Client only sees assigned projects.
2. Client schedule is read-only.
3. Internal agenda does not appear in Beranda, Schedule, or report export.
4. Client cannot access internal menu routes.
5. Client report export only includes client-visible information.

## Evidence to Capture

For each role, capture:

- Login screen
- Sidebar menu
- Beranda
- Project detail
- Schedule
- Report export access
- Any restricted menu confirmation

## Review Result

Record the test result with this format:

| Role | Test Area | Expected Result | Actual Result | Status |
|---|---|---|---|---|
| Project Manager | Menu Access | All internal menus available |  |  |
| Admin | Restricted Menu | Activity Log and Backup Data hidden |  |  |
| Client | Project Visibility | Only assigned projects visible |  |  |
