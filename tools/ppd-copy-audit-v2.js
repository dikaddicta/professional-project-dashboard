#!/usr/bin/env node
/**
 * Professional Project Dashboard — Rev03.7.1 Copy Audit v2
 *
 * This version audits only user-facing source files by default.
 * It intentionally excludes the copy dictionary and old revision documents to avoid self-detection.
 *
 * Usage:
 *   node tools/ppd-copy-audit-v2.js
 *   node tools/ppd-copy-audit-v2.js --docs
 */

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const includeDocs = process.argv.includes('--docs');

const sourceFiles = [
  'index.html',
  'app.js',
  'report-export.js'
];

const docFiles = [
  'docs/DEMO_ACCESS_GUIDE.md',
  'docs/DEMO_LIVE_SCENARIO.md',
  'docs/DEMO_ACCOUNT_MATRIX.md',
  'docs/USER_GUIDE_ADMIN.md',
  'docs/USER_GUIDE_CLIENT.md',
  'docs/USER_GUIDE_PM.md',
  'docs/SOP_REPORT_EXPORT.md'
];

const terms = [
  { severity: 'HIGH', term: 'Dummy', suggestion: 'Use "Demo Data" or "Sample Data" for user-facing copy.' },
  { severity: 'HIGH', term: 'dummy', suggestion: 'Use "demo data" or "sample data" for user-facing copy.' },
  { severity: 'HIGH', term: 'Generated AI', suggestion: 'Remove AI-related wording from user-facing copy.' },
  { severity: 'HIGH', term: 'AI Generated', suggestion: 'Remove AI-related wording from user-facing copy.' },

  { severity: 'MEDIUM', term: 'Total Project', suggestion: 'Use "Total Proyek" or "Total Projects".' },
  { severity: 'MEDIUM', term: 'Project Berjalan', suggestion: 'Use "Proyek Aktif" or "Active Projects".' },
  { severity: 'MEDIUM', term: 'Project Selesai', suggestion: 'Use "Proyek Selesai" or "Completed Projects".' },
  { severity: 'MEDIUM', term: 'Rata-Rata Progress', suggestion: 'Use "Rata-rata Progres" or "Average Progress".' },
  { severity: 'MEDIUM', term: 'Schedule Hari Ini', suggestion: 'Use "Jadwal Hari Ini" or "Today’s Schedule".' },
  { severity: 'MEDIUM', term: 'Ringkasan Timeline', suggestion: 'Use "Ringkasan Linimasa" or "Timeline Summary".' },
  { severity: 'MEDIUM', term: 'Timeline Project', suggestion: 'Use "Linimasa Proyek" or "Project Timeline".' },
  { severity: 'MEDIUM', term: 'Task Tracker', suggestion: 'Use "Pemantauan Tugas" or "Task Monitoring".' },
  { severity: 'MEDIUM', term: 'Export PDF', suggestion: 'Use "Unduh Laporan" or "Download Report".' },
  { severity: 'MEDIUM', term: 'Executive Summary PDF', suggestion: 'Use "Unduh Ringkasan Eksekutif" or "Download Executive Summary".' },
  { severity: 'MEDIUM', term: 'Full Report Pack PDF', suggestion: 'Use "Unduh Laporan Lengkap" or "Download Complete Report".' },
  { severity: 'MEDIUM', term: 'Timeline PDF', suggestion: 'Use "Unduh Linimasa Proyek" or "Download Project Timeline".' }
];

function lineNumberAt(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

function auditFile(relPath) {
  const absPath = path.join(root, relPath);
  if (!fs.existsSync(absPath)) return [];

  const text = fs.readFileSync(absPath, 'utf8');
  const findings = [];

  for (const rule of terms) {
    let index = text.indexOf(rule.term);
    while (index !== -1) {
      findings.push({
        severity: rule.severity,
        file: relPath,
        line: lineNumberAt(text, index),
        found: rule.term,
        suggestion: rule.suggestion
      });
      index = text.indexOf(rule.term, index + rule.term.length);
    }
  }

  return findings;
}

const targets = includeDocs ? [...sourceFiles, ...docFiles] : sourceFiles;
const findings = targets.flatMap(auditFile);

console.log('PPD Rev03.7.1 Copy Audit v2');
console.log(includeDocs ? 'Scope: source files + selected user docs\n' : 'Scope: source files only\n');

if (findings.length === 0) {
  console.log('No user-facing copy findings detected.');
  process.exit(0);
}

console.log(`Found ${findings.length} item(s) to review:\n`);
for (const item of findings) {
  console.log(`[${item.severity}] ${item.file}:${item.line}`);
  console.log(`  Found     : ${item.found}`);
  console.log(`  Suggestion: ${item.suggestion}\n`);
}

process.exit(findings.some((item) => item.severity === 'HIGH') ? 2 : 1);
