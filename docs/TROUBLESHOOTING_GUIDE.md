# Troubleshooting Guide

This guide covers common issues during local testing, deployment, and role validation.

## Dashboard Shows Blank Page

Possible causes:

- Browser cache still uses an older bundle.
- JavaScript runtime error occurs during startup.
- Required configuration is missing.

Recommended actions:

1. Open the browser console and check for errors.
2. Run `node --check app.js`.
3. Run `node --check report-export.js`.
4. Run `node --check data.js`.
5. Clear browser cache or test in a private tab.
6. Confirm the latest GitHub commit has been deployed by Vercel.

## Menu Does Not Appear

Possible causes:

- User role is not assigned correctly.
- The account does not have project access.
- The browser is loading an older deployed version.

Recommended actions:

1. Confirm the user role.
2. Confirm the project assignment.
3. Refresh the browser using hard reload.
4. Re-login after deployment is complete.

## Client Cannot See Project

Check:

- Project is active.
- Client account has access to the project.
- Access is enabled.
- Row Level Security policy allows the expected read operation.

## Schedule Not Visible to Client

Check:

- The schedule belongs to the assigned project.
- The agenda is not marked as internal.
- The client account has active project access.
- The user has refreshed after deployment.

## Export Button Does Not Work

Check:

- Browser allows downloads.
- A project is selected.
- Required project data is available.
- JavaScript console does not show runtime errors.

## Deployment Not Updated

Check:

1. `git status` is clean.
2. Changes have been pushed to GitHub.
3. Vercel deployment has completed.
4. The browser cache has been refreshed.
