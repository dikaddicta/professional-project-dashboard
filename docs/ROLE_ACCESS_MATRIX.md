# Role Access Matrix

This matrix defines the expected access behavior for each user role in Professional Project Dashboard.

| Feature / Page | Project Manager | Admin | Client / Guest |
| --- | --- | --- | --- |
| Beranda | Yes | Yes | Yes |
| Notifikasi | Yes | Yes | No |
| Activity Log | Yes | No | No |
| Backup Data | Yes | No | No |
| Project | Yes | Yes | Yes |
| Schedule | Yes | Yes | Yes, read-only |
| Kelola Project | Yes | Yes | No |
| Create Project | Yes | No / restricted | No |
| Archive / Restore Project | Yes | No / restricted | No |
| Update Project Status | Yes | No / restricted | No |
| Manage Client Access | Yes | No / restricted | No |
| Reset Client Password | Yes | No / restricted | No |
| Create Schedule | Yes | No / restricted | No |
| Edit Schedule | Yes | No / restricted | No |
| Delete Schedule | Yes | No / restricted | No |
| View Internal Agenda | Yes | Yes, if operationally required | No |
| Export Executive Summary | Yes | Yes | Yes, assigned project only |
| Export Full Report Pack | Yes | Yes | Yes, assigned project only |
| Export Timeline PDF | Yes | Yes | Yes, assigned project only |
| Export Backup Data | Yes | No | No |
| Export Activity Log | Yes | No | No |
| View Project Outside Assignment | Yes | Yes, if global access is intended | No |

## Notes

- Client and guest users must only access projects assigned through project access mapping.
- Internal agenda must not appear in client Beranda, Schedule, or report output.
- PM-only features should remain hidden from Admin and Client accounts.
- UI restriction should be supported by database access policies.
