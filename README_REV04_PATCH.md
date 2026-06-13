# Professional Project Dashboard — Rev04 Patch

## Install

Extract the ZIP into the project root:

```powershell
cd "D:\PRIBADI\4. WEBSITE\professional_project_dashboard"
```

Run:

```powershell
node .\tools\ppd-rev04-apply.js --dry-run
node .\tools\ppd-rev04-apply.js --apply
node .\tools\ppd-rev04-final-qa.js
```

## Commit

```powershell
git status
git diff --stat
git add index.html styles.ppd-portfolio.css tools/ppd-rev04-apply.js tools/ppd-rev04-final-qa.js docs/DEMO_REV04_FINAL_PORTFOLIO_POLISH.md docs/DEMO_PORTFOLIO_CASE_STUDY.md docs/DEMO_LIVE_DEMO_SCRIPT.md docs/DEMO_SCREENSHOT_SHOTLIST.md docs/DEMO_FINAL_QA_CHECKLIST.md copy/ppd-portfolio-summary.json
git commit -m "Prepare final portfolio polish"
git push origin main
```
