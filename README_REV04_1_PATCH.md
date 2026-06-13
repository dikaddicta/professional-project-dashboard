# Professional Project Dashboard — Rev04.1 Patch

## Revision

Demo Rev04.1 — Portfolio Case Study & README Finalization

## Purpose

This patch prepares the repository for public portfolio presentation by adding a polished README, portfolio case study documents, LinkedIn caption, and GitHub repository positioning notes.

## Installation

Extract this patch into the project root:

```powershell
cd "D:\PRIBADI\4. WEBSITE\professional_project_dashboard"
```

Run dry run first:

```powershell
node .\tools\ppd-rev04-1-apply.js --dry-run
```

Apply README update:

```powershell
node .\tools\ppd-rev04-1-apply.js --apply
```

Run QA:

```powershell
node .\tools\ppd-rev04-1-readme-qa.js
```

Expected result:

```text
Rev04.1 README readiness: PASS
```

## Git Commit

Remove backup file before commit if it was created:

```powershell
Remove-Item .\README.md.rev04_1.bak -Force -ErrorAction SilentlyContinue
```

Stage files:

```powershell
git add README.md README_REV04_1_PATCH.md assets/portfolio/.gitkeep copy/ppd-rev04-1-readme-metadata.json docs/GITHUB_README_FINAL.md docs/PORTFOLIO_CASE_STUDY_EN.md docs/PORTFOLIO_CASE_STUDY_ID.md docs/LINKEDIN_PORTFOLIO_CAPTION.md docs/GITHUB_REPOSITORY_SETTINGS.md docs/DEMO_REV04_1_PORTFOLIO_README_FINALIZATION.md tools/ppd-rev04-1-apply.js tools/ppd-rev04-1-readme-qa.js
```

Commit and push:

```powershell
git commit -m "Finalize portfolio README and case study"
git push origin main
```
