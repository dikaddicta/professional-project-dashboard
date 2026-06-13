#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run') || !args.has('--apply');
const apply = args.has('--apply');

const source = path.join(root, 'docs', 'GITHUB_README_FINAL.md');
const target = path.join(root, 'README.md');
const backup = path.join(root, 'README.md.rev04_1.bak');

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

if (!fs.existsSync(source)) {
  fail('docs/GITHUB_README_FINAL.md was not found. Extract the Rev04.1 patch to the project root first.');
}

const readmeContent = fs.readFileSync(source, 'utf8').trimEnd() + '\n';

console.log('PPD Rev04.1 README Finalization');
console.log(`Mode: ${dryRun ? 'DRY RUN' : 'APPLY'}`);
console.log('Scope: README.md update only. Application logic is not changed.');
console.log('');
console.log(`Source : ${path.relative(root, source)}`);
console.log(`Target : ${path.relative(root, target)}`);

if (fs.existsSync(target)) {
  console.log(`Backup : ${path.relative(root, backup)}`);
} else {
  console.log('Backup : skipped because README.md does not exist yet');
}

if (dryRun) {
  console.log('');
  console.log('Dry run completed. Use --apply to update README.md.');
  process.exit(0);
}

if (!apply) {
  fail('Use --apply to update README.md.');
}

if (fs.existsSync(target) && !fs.existsSync(backup)) {
  fs.copyFileSync(target, backup);
}

fs.writeFileSync(target, readmeContent, 'utf8');

console.log('');
console.log('README.md has been updated successfully.');
