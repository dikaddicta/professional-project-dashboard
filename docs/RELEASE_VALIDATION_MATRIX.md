# Release Validation Matrix

| Module | Project Manager | Admin | Client / Guest |
|---|---|---|---|
| Beranda | Full command center | Operational overview | Assigned project overview |
| Notifikasi | Visible | Visible | Hidden |
| Activity Log | Visible | Hidden | Hidden |
| Backup Data | Visible | Hidden | Hidden |
| Project | Full project detail | Project detail | Assigned project detail |
| Schedule | Manage agenda | View agenda | Read-only agenda |
| Internal Agenda | Visible | Visible according to access | Hidden |
| Kelola Project | Visible | Visible according to rule | Hidden |
| Report Export | Available | Available | Available with client-safe content |
| Language Selector | Available | Available | Available |
| Project Access | Manageable | Limited | Assigned project only |

## Validation Notes

- Client and Guest views must never expose internal agenda, access management, activity history, or backup export.
- Project Manager tools should remain available only to Project Manager accounts.
- Report exports must follow the selected language and role visibility rule.
- Schedule must keep Online and Onsite labels clear and consistent.
