# Final Smoke Test Checklist

This checklist is used before sharing the dashboard link with reviewers or stakeholders. The goal is to confirm that the production build is stable across roles, browsers, and common user flows.

## 1. Environment Check

| Check | Expected Result | Status |
|---|---|---|
| Production URL opens successfully | Login page appears without blank screen |  |
| Desktop browser test | Dashboard loads in Chrome or Edge |  |
| Mobile browser test | Dashboard loads in Chrome mobile |  |
| Hard refresh test | Page still loads after cache refresh |  |
| Console check | No blocking JavaScript error appears |  |

## 2. Project Manager Access

| Area | Test | Expected Result | Status |
|---|---|---|---|
| Login | Sign in as Project Manager | Command Center opens |  |
| Beranda | Open Command Center | KPI cards, agenda, and notification summary load |  |
| Project | Open project detail | Project profile, task, timeline, documents, and report center load |  |
| Schedule | Create, edit, and delete agenda | Changes are saved and reflected in calendar |  |
| Internal agenda | Create an internal agenda | Visible to Project Manager only |  |
| Activity Log | Open activity history | Recent activities are visible |  |
| Backup Data | Export project data | JSON or CSV file downloads successfully |  |
| Kelola Project | Open project management | Project lifecycle and access management are available |  |

## 3. Admin Access

| Area | Test | Expected Result | Status |
|---|---|---|---|
| Login | Sign in as Admin | Admin dashboard opens |  |
| Menu | Review sidebar menu | Activity Log and Backup Data are not visible |  |
| Project | Open project detail | Project data is visible according to access rule |  |
| Schedule | Open schedule | Agenda is visible according to admin access |  |
| Internal tools | Attempt to access PM-only area from UI | PM-only tools are not available |  |

## 4. Client / Guest Access

| Area | Test | Expected Result | Status |
|---|---|---|---|
| Login | Sign in as Client or Guest | Client Portal opens |  |
| Menu | Review sidebar menu | Only Beranda, Project, and Schedule are visible |  |
| Beranda | Open client overview | Only assigned project data is displayed |  |
| Project | Open project detail | Project information is visible in read-only mode |  |
| Schedule | Open schedule | Agenda is read-only |  |
| Internal agenda | Check agenda list | Internal agenda is not shown |  |
| Other project access | Try to view other projects | Other project data is not visible |  |

## 5. Report Export Check

| Export | Expected Result | Status |
|---|---|---|
| Executive Summary - Indonesian | PDF downloads successfully |  |
| Executive Summary - English | PDF downloads successfully |  |
| Full Report Pack - Indonesian | PDF downloads successfully |  |
| Full Report Pack - English | PDF downloads successfully |  |
| Project Timeline - Indonesian | PDF downloads successfully |  |
| Project Timeline - English | PDF downloads successfully |  |

## 6. Mobile Check

| Area | Expected Result | Status |
|---|---|---|
| Login | Page fits mobile screen |  |
| Sidebar / navigation | Menu remains usable |  |
| Beranda cards | Cards are readable and not overlapping |  |
| Project menu | Project opens when tapped |  |
| Schedule | Calendar remains usable |  |
| Report buttons | Buttons are visible and tappable |  |

## 7. Final Sign-Off

| Item | Sign-Off |
|---|---|
| Role access checked |  |
| Client data isolation checked |  |
| Mobile view checked |  |
| Report export checked |  |
| No blocking console error |  |
| Ready to share for review |  |
