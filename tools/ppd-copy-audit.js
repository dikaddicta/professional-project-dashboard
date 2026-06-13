#!/usr/bin/env node
/*
  Professional Project Dashboard — Copy Audit Tool
  Rev03.7: Business Language & Copy Consistency Polish

  Usage:
    node tools/ppd-copy-audit.js .

  Notes:
    - This script scans text-based files for user-facing copy that should be reviewed.
    - It does not modify files automatically.
    - Review findings manually before changing strings in source code.
*/

const fs = require('fs');
const path = require('path');

const root = path.resolve(process.argv[2] || process.cwd());

const allowedExtensions = new Set([
  '.html', '.js', '.css', '.md', '.json', '.sql', '.txt'
]);

const ignoredDirectories = new Set([
  '.git', 'node_modules', 'dist', 'build', '.vercel', '.next', 'coverage'
]);

const rules = [
  { level: 'HIGH', pattern: /\bdummy\b/ig, suggestion: 'Use "demo data" or "sample data" for user-facing copy.' },
  { level: 'HIGH', pattern: /AI\s*Generated|Generated\s*AI/ig, suggestion: 'Remove AI-related wording from user-facing copy.' },
  { level: 'MEDIUM', pattern: /\bTotal Project\b/g, suggestion: 'Use "Total Proyek" in Indonesian or "Total Projects" in English.' },
  { level: 'MEDIUM', pattern: /\bProject Berjalan\b/g, suggestion: 'Use "Proyek Aktif" in Indonesian or "Active Projects" in English.' },
  { level: 'MEDIUM', pattern: /\bProject Selesai\b/g, suggestion: 'Use "Proyek Selesai" in Indonesian or "Completed Projects" in English.' },
  { level: 'MEDIUM', pattern: /\bRata-Rata Progress\b/g, suggestion: 'Use "Rata-rata Progres" in Indonesian or "Average Progress" in English.' },
  { level: 'MEDIUM', pattern: /\bSchedule Hari Ini\b/g, suggestion: 'Use "Jadwal Hari Ini" in Indonesian or "Today’s Schedule" in English.' },
  { level: 'MEDIUM', pattern: /\bRingkasan Timeline\b/g, suggestion: 'Use "Ringkasan Linimasa" in Indonesian or "Timeline Summary" in English.' },
  { level: 'MEDIUM', pattern: /\bTimeline Project\b/g, suggestion: 'Use "Linimasa Proyek" in Indonesian or "Project Timeline" in English.' },
  { level: 'MEDIUM', pattern: /\bTask Tracker\b/g, suggestion: 'Use "Pemantauan Tugas" in Indonesian or "Task Monitoring" in English.' },
  { level: 'MEDIUM', pattern: /\bExport PDF\b/g, suggestion: 'Use "Unduh Laporan" or "Download Report".' },
  { level: 'MEDIUM', pattern: /\bFull Report Pack PDF\b/g, suggestion: 'Use "Unduh Laporan Lengkap" or "Download Complete Report".' },
  { level: 'MEDIUM', pattern: /\bExecutive Summary PDF\b/g, suggestion: 'Use "Unduh Ringkasan Eksekutif" or "Download Executive Summary".' },
  { level: 'MEDIUM', pattern: /\bTimeline PDF\b/g, suggestion: 'Use "Unduh Linimasa Proyek" or "Download Project Timeline".' },
  { level: 'LOW', pattern: /\bbug\b/ig, suggestion: 'Use "issue" or "finding" in user-facing copy.' },
  { level: 'LOW', pattern: /\bfix\b/ig, suggestion: 'Use "improvement", "resolution", or "updated" in user-facing copy.' },
  { level: 'LOW', pattern: /\bdone\b/ig, suggestion: 'Use "completed", "applied", or "finalized" in user-facing copy.' },
  { level: 'LOW', pattern: /\bcek\b/ig, suggestion: 'Use "tinjau", "validasi", or "review" depending on context.' }
];

function walk(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        walk(fullPath, files);
      }
      continue;
    }

    if (entry.isFile() && allowedExtensions.has(path.extname(entry.name).toLowerCase())) {
      files.push(fullPath);
    }
  }

  return files;
}

function lineNumberAt(text, index) {
  return text.slice(0, index).split('\n').length;
}

const files = walk(root);
const findings = [];

for (const file of files) {
  const relativePath = path.relative(root, file);
  const content = fs.readFileSync(file, 'utf8');

  for (const rule of rules) {
    rule.pattern.lastIndex = 0;
    let match;

    while ((match = rule.pattern.exec(content)) !== null) {
      findings.push({
        level: rule.level,
        file: relativePath,
        line: lineNumberAt(content, match.index),
        match: match[0],
        suggestion: rule.suggestion
      });
    }
  }
}

if (!findings.length) {
  console.log('Copy audit passed. No flagged wording found.');
  process.exit(0);
}

console.log(`Copy audit found ${findings.length} item(s) to review:\n`);

for (const item of findings) {
  console.log(`[${item.level}] ${item.file}:${item.line}`);
  console.log(`  Found     : ${item.match}`);
  console.log(`  Suggestion: ${item.suggestion}\n`);
}

const highCount = findings.filter((item) => item.level === 'HIGH').length;
process.exit(highCount > 0 ? 1 : 0);
