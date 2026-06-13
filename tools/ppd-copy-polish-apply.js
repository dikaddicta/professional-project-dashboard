#!/usr/bin/env node
/**
 * Professional Project Dashboard — Rev03.7.1 Copy Polish Apply
 *
 * Purpose:
 * - Apply controlled business-language replacements to user-facing source files only.
 * - Avoid replacing technical status values such as "done", CSS class names, or old revision notes.
 *
 * Usage:
 *   node tools/ppd-copy-polish-apply.js --dry-run
 *   node tools/ppd-copy-polish-apply.js --apply
 */

const fs = require('fs');
const path = require('path');

const mode = process.argv.includes('--apply') ? 'apply' : 'dry-run';
const root = process.cwd();

const sourceFiles = [
  'index.html',
  'app.js',
  'report-export.js'
];

const optionalDocs = [
  'docs/DEMO_ACCESS_GUIDE.md',
  'docs/DEMO_LIVE_SCENARIO.md',
  'docs/DEMO_ACCOUNT_MATRIX.md',
  'docs/USER_GUIDE_ADMIN.md',
  'docs/USER_GUIDE_CLIENT.md',
  'docs/USER_GUIDE_PM.md',
  'docs/SOP_REPORT_EXPORT.md'
];

const replacements = [
  // Indonesian UI standardization
  ['Total Project', 'Total Proyek'],
  ['Project Berjalan', 'Proyek Aktif'],
  ['Project Selesai', 'Proyek Selesai'],
  ['Rata-Rata Progress', 'Rata-rata Progres'],
  ['Schedule Hari Ini', 'Jadwal Hari Ini'],
  ['Project Agenda', 'Agenda Proyek'],
  ['Ringkasan Timeline', 'Ringkasan Linimasa'],
  ['Timeline Project', 'Linimasa Proyek'],
  ['Task Tracker', 'Pemantauan Tugas'],

  // PDF CTA polish
  ['Export PDF', 'Unduh Laporan'],
  ['Executive Summary PDF', 'Unduh Ringkasan Eksekutif'],
  ['Full Report Pack PDF', 'Unduh Laporan Lengkap'],
  ['Timeline PDF', 'Unduh Linimasa Proyek'],

  // Common user-facing empty/error/success copy
  ['No data available', 'Belum ada data yang tersedia'],
  ['Data updated successfully', 'Perubahan berhasil disimpan'],
  ['Unable to export report', 'Laporan belum dapat diunduh'],
  ['PDF export was unsuccessful', 'Laporan belum dapat diunduh'],
  ['The report could not be downloaded', 'Laporan belum dapat diunduh'],

  // Replace only visible demo terminology, not SQL comments or old internal docs by default
  ['Dummy Data', 'Demo Data'],
  ['dummy data', 'demo data'],
  ['Sample Portfolio Data', 'Demo Portfolio Data']
];

function countOccurrences(text, needle) {
  if (!needle) return 0;
  return text.split(needle).length - 1;
}

function applyToFile(relPath) {
  const absPath = path.join(root, relPath);
  if (!fs.existsSync(absPath)) return { file: relPath, exists: false, changes: [] };

  let before = fs.readFileSync(absPath, 'utf8');
  let after = before;
  const changes = [];

  for (const [from, to] of replacements) {
    const count = countOccurrences(after, from);
    if (count > 0) {
      after = after.split(from).join(to);
      changes.push({ from, to, count });
    }
  }

  if (mode === 'apply' && after !== before) {
    const backupPath = `${absPath}.rev03_7_1.bak`;
    if (!fs.existsSync(backupPath)) fs.writeFileSync(backupPath, before, 'utf8');
    fs.writeFileSync(absPath, after, 'utf8');
  }

  return { file: relPath, exists: true, changes };
}

const targets = [...sourceFiles, ...optionalDocs];
const results = targets.map(applyToFile);

console.log(`PPD Rev03.7.1 Copy Polish — ${mode === 'apply' ? 'APPLY MODE' : 'DRY RUN'}`);
console.log('Scope: user-facing source files and selected user guides only.');
console.log('Note: technical values such as status="done" are intentionally not changed.\n');

let total = 0;
for (const result of results) {
  if (!result.exists) continue;
  if (result.changes.length === 0) continue;

  console.log(`\n${result.file}`);
  for (const change of result.changes) {
    total += change.count;
    console.log(`  ${change.count}x  ${change.from}  →  ${change.to}`);
  }
}

if (total === 0) {
  console.log('No matching copy replacements found.');
} else if (mode !== 'apply') {
  console.log(`\n${total} replacement(s) would be applied.`);
  console.log('Run with --apply to update the files.');
} else {
  console.log(`\n${total} replacement(s) applied.`);
  console.log('Backup files were created with suffix: .rev03_7_1.bak');
}
