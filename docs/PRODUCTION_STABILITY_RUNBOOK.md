# Production Stability Runbook

This runbook provides a practical sequence for validating the dashboard after each production deployment.

## 1. Before Deployment

Run local validation from the project root:

```powershell
node --check app.js
node --check report-export.js
node --check data.js
```

Confirm Git status:

```powershell
git status
```

The working tree should be clean before the production link is shared.

## 2. After Deployment

Open the production URL from a clean browser session. Confirm that the login page appears and no blank screen occurs.

Recommended browser checks:

- Chrome desktop
- Edge desktop
- Chrome mobile
- Incognito or private window

## 3. Role Validation Sequence

Validate the roles in this order:

1. Project Manager
2. Admin
3. Client or Guest

This order makes it easier to compare internal and client views.

## 4. Project Manager Checks

Confirm that the Project Manager can access operational features:

- Command Center
- Notification Center
- Activity Log
- Backup Data
- Project detail
- Schedule
- Project Management

Then test one agenda update, one report export, and one project detail view.

## 5. Admin Checks

Confirm that Admin can access operational views without PM-only tools.

Admin should not see:

- Activity Log
- Backup Data

## 6. Client / Guest Checks

Confirm that Client Portal is limited to assigned project data.

Client or Guest should only see:

- Beranda
- Project
- Schedule

Client or Guest should not see internal agenda, PM-only tools, or other project data.

## 7. Mobile Checks

Use a real mobile browser where possible. If using desktop DevTools, test these widths:

- 390 px
- 768 px
- 1024 px
- 1366 px

Confirm that navigation, cards, schedule, and report actions remain usable.

## 8. Console Review

Open browser developer tools and check the Console tab.

Blocking errors should be resolved before sharing the production URL.

Non-blocking warnings from browser extensions can be ignored when they do not affect dashboard behavior.

## 9. Final Release Note

Once the dashboard passes the smoke test, tag the release or document the deployment commit used for review.
