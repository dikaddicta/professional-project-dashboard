# Demo Rev04 — Final Portfolio Polish

## Objective
Rev04 prepares the Professional Project Dashboard demo for portfolio presentation, recruiter review, and live walkthrough usage.

This revision is intentionally lightweight. It does not change the database, authentication, project access, schedule logic, PDF generation logic, or Supabase configuration.

## Scope

1. Add final portfolio-grade visual refinement through `styles.ppd-portfolio.css`.
2. Add a live demo script for structured presentation.
3. Add a portfolio case study narrative.
4. Add a screenshot shot list for LinkedIn, CV, GitHub README, or portfolio website.
5. Add final QA checks for presentation readiness.

## Files Added

```text
styles.ppd-portfolio.css
tools/ppd-rev04-apply.js
tools/ppd-rev04-final-qa.js
docs/DEMO_REV04_FINAL_PORTFOLIO_POLISH.md
docs/DEMO_PORTFOLIO_CASE_STUDY.md
docs/DEMO_LIVE_DEMO_SCRIPT.md
docs/DEMO_SCREENSHOT_SHOTLIST.md
docs/DEMO_FINAL_QA_CHECKLIST.md
copy/ppd-portfolio-summary.json
```

## Implementation Notes

`styles.ppd-portfolio.css` must be loaded after `styles.ppd-tone.css` so it can act as a final presentation layer.

Use:

```powershell
node .\tools\ppd-rev04-apply.js --dry-run
node .\tools\ppd-rev04-apply.js --apply
node .\tools\ppd-rev04-final-qa.js
```

## Acceptance Criteria

Rev04 is accepted when:

1. Dashboard remains functional for PM, Admin, and Client access.
2. No blank page or console-breaking JavaScript error appears.
3. Executive Summary, Complete Report, and Project Timeline downloads still work.
4. Schedule Online/Onsite visual distinction remains consistent.
5. The dashboard looks clean in desktop and mobile screenshots.
6. The live demo can be explained in 3–5 minutes using the provided script.
7. Final QA script returns `Rev04 readiness: PASS`.

## Rollback

If the presentation stylesheet causes an unexpected visual issue, remove this line from `index.html`:

```html
<link rel="stylesheet" href="styles.ppd-portfolio.css" />
```

The rest of Rev04 files are documentation and QA utilities, so they do not affect runtime behavior.
