#!/usr/bin/env node
/**
 * Professional Project Dashboard — Rev04 Final QA
 * Performs lightweight checks for portfolio readiness.
 */
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const issues = [];
const warnings = [];

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function scanFile(rel, patterns, severity = 'issue') {
  if (!exists(rel)) return;
  const content = read(rel);
  const lines = content.split(/\r?\n/);
  lines.forEach((line, index) => {
    patterns.forEach((pattern) => {
      if (pattern.regex.test(line)) {
        const item = `${rel}:${index + 1} — ${pattern.label}`;
        if (severity === 'warning') warnings.push(item);
        else issues.push(item);
      }
    });
  });
}

console.log('PPD Rev04 Final QA');
console.log('Scope: portfolio readiness checks');

[
  'index.html',
  'app.js',
  'report-export.js',
  'styles.ppd-tone.css',
  'styles.ppd-portfolio.css',
  'docs/DEMO_PORTFOLIO_CASE_STUDY.md',
  'docs/DEMO_LIVE_DEMO_SCRIPT.md',
  'docs/DEMO_SCREENSHOT_SHOTLIST.md',
  'docs/DEMO_FINAL_QA_CHECKLIST.md'
].forEach((rel) => {
  if (!exists(rel)) issues.push(`Missing required file: ${rel}`);
});

if (exists('index.html')) {
  const indexHtml = read('index.html');
  if (!indexHtml.includes('styles.ppd-portfolio.css')) issues.push('index.html does not link styles.ppd-portfolio.css');
}

const userFacingFiles = [
  'index.html',
  'app.js',
  'report-export.js',
  'docs/USER_GUIDE_ADMIN.md',
  'docs/USER_GUIDE_CLIENT.md',
  'docs/USER_GUIDE_PM.md',
  'docs/SOP_REPORT_EXPORT.md'
];

const banned = [
  { regex: /\bDummy\b|\bdummy\b/g, label: 'Use Demo Data or Sample Data instead of dummy.' },
  { regex: /Generated AI|AI Generated/gi, label: 'Remove AI-related wording from user-facing copy.' },
  { regex: /Export PDF/g, label: 'Use Download Report / Unduh Laporan wording.' },
  { regex: /Timeline Project/g, label: 'Use Project Timeline / Linimasa Proyek wording.' },
  { regex: /Task Tracker/g, label: 'Use Task Monitoring / Pemantauan Tugas wording.' }
];

userFacingFiles.forEach((rel) => scanFile(rel, banned));

function findBakFiles(dir) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    const full = path.join(dir, entry.name);
    const rel = path.relative(root, full);
    if (entry.isDirectory()) {
      if (!['node_modules', '.git', '.vercel', '.supabase'].includes(entry.name)) findBakFiles(full);
    } else if (/\.bak$/.test(entry.name)) {
      warnings.push(`Backup file still exists: ${rel}`);
    }
  });
}
findBakFiles(root);

if (issues.length) {
  console.log('\nIssues found:');
  issues.forEach((item) => console.log(`- ${item}`));
} else {
  console.log('\nNo blocking Rev04 QA issues detected.');
}

if (warnings.length) {
  console.log('\nWarnings:');
  warnings.forEach((item) => console.log(`- ${item}`));
}

if (!issues.length) {
  console.log('\nRev04 readiness: PASS');
  process.exit(0);
}

console.log('\nRev04 readiness: REVIEW REQUIRED');
process.exit(1);
