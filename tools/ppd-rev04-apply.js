#!/usr/bin/env node
/**
 * Professional Project Dashboard — Rev04 Apply Helper
 * Inserts styles.ppd-portfolio.css into index.html if it is not linked yet.
 * Usage:
 *   node tools/ppd-rev04-apply.js --dry-run
 *   node tools/ppd-rev04-apply.js --apply
 */
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const indexPath = path.join(root, 'index.html');
const cssPath = path.join(root, 'styles.ppd-portfolio.css');
const isApply = process.argv.includes('--apply');
const isDryRun = process.argv.includes('--dry-run') || !isApply;
const cssLink = '<link rel="stylesheet" href="styles.ppd-portfolio.css" />';

function fail(message) {
  console.error(`\n[ERROR] ${message}`);
  process.exit(1);
}

console.log(`PPD Rev04 Apply Helper — ${isApply ? 'APPLY MODE' : 'DRY RUN'}`);

if (!fs.existsSync(indexPath)) fail('index.html was not found. Run this command from the project root.');
if (!fs.existsSync(cssPath)) fail('styles.ppd-portfolio.css was not found. Extract the Rev04 patch into the project root first.');

let indexHtml = fs.readFileSync(indexPath, 'utf8');

if (indexHtml.includes('styles.ppd-portfolio.css')) {
  console.log('styles.ppd-portfolio.css is already linked in index.html. No change required.');
  process.exit(0);
}

let updated = '';
if (indexHtml.includes('styles.ppd-tone.css')) {
  updated = indexHtml.replace(/(<link[^>]+styles\.ppd-tone\.css[^>]*>)/i, `$1\n    ${cssLink}`);
} else if (indexHtml.includes('</head>')) {
  updated = indexHtml.replace('</head>', `    ${cssLink}\n</head>`);
} else {
  fail('Could not find a safe insertion point in index.html. Add the stylesheet link manually inside <head>.');
}

if (updated === indexHtml) fail('No change was produced. Please add the stylesheet link manually.');

console.log('Planned change: link styles.ppd-portfolio.css in index.html.');

if (isDryRun) {
  console.log('Dry run completed. Re-run with --apply to update index.html.');
  process.exit(0);
}

const backupPath = `${indexPath}.rev04.bak`;
fs.copyFileSync(indexPath, backupPath);
fs.writeFileSync(indexPath, updated, 'utf8');
console.log(`Applied. Backup created: ${path.basename(backupPath)}`);
console.log('Next: run node tools/ppd-rev04-final-qa.js');
