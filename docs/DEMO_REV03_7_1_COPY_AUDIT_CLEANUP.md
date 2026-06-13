# Demo Rev03.7.1 — Copy Audit Cleanup

## Purpose

This patch refines the Rev03.7 language audit workflow by separating actual user-facing copy findings from internal documentation and dictionary self-detection.

## Why this patch is needed

The previous audit correctly identified mixed-language labels, but it also scanned its own dictionary and revision notes. This caused expected self-findings such as `Dummy`, `Generated AI`, `Fix`, and other terms inside documentation that explains what to avoid.

## Included files

```text
tools/ppd-copy-polish-apply.js
tools/ppd-copy-audit-v2.js
docs/DEMO_REV03_7_1_COPY_AUDIT_CLEANUP.md
```

## Recommended workflow

Run dry-run first:

```powershell
node .\tools\ppd-copy-polish-apply.js --dry-run
```

Apply controlled replacements:

```powershell
node .\tools\ppd-copy-polish-apply.js --apply
```

Run focused audit:

```powershell
node .\tools\ppd-copy-audit-v2.js
```

Optional selected documentation audit:

```powershell
node .\tools\ppd-copy-audit-v2.js --docs
```

## Notes

- The script updates only controlled user-facing labels.
- Technical values such as `done`, CSS class names, or internal revision notes are intentionally not changed.
- Backup files are created with the suffix `.rev03_7_1.bak` before changes are applied.

## Acceptance criteria

```text
1. Source audit no longer reports mixed Indonesian-English labels.
2. PDF CTA labels use professional report wording.
3. No user-facing occurrence of dummy or AI-generated wording remains.
4. Dashboard, schedule, and PDF export continue working after replacements.
```
