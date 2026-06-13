#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const readmePath = path.join(root, 'README.md');
const docsToCheck = [
  'README.md',
  'docs/PORTFOLIO_CASE_STUDY_EN.md',
  'docs/PORTFOLIO_CASE_STUDY_ID.md',
  'docs/LINKEDIN_PORTFOLIO_CAPTION.md',
  'docs/GITHUB_REPOSITORY_SETTINGS.md'
];

const requiredReadmeSections = [
  '# Professional Project Dashboard',
  '## Overview',
  '## Key Capabilities',
  '## Tech Stack',
  '## Demo Data Coverage',
  '## Product Focus',
  '## User Roles',
  '## Case Study Summary',
  '## Repository Notes'
];

const sensitivePatterns = [
  /supabaseUrl\s*[:=]/i,
  /supabaseKey\s*[:=]/i,
  /anon[_-]?key/i,
  /service[_-]?role/i,
  /password\s*[:=]/i,
  /secret/i,
  /generated ai/i,
  /ai generated/i
];

let findings = [];

for (const rel of docsToCheck) {
  const filePath = path.join(root, rel);
  if (!fs.existsSync(filePath)) {
    findings.push(`[MISSING] ${rel}`);
    continue;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  sensitivePatterns.forEach((pattern) => {
    if (pattern.test(content)) {
      findings.push(`[REVIEW] ${rel} contains pattern: ${pattern}`);
    }
  });
}

if (!fs.existsSync(readmePath)) {
  findings.push('[MISSING] README.md');
} else {
  const readme = fs.readFileSync(readmePath, 'utf8');
  requiredReadmeSections.forEach((section) => {
    if (!readme.includes(section)) {
      findings.push(`[README] Missing section: ${section}`);
    }
  });
}

console.log('PPD Rev04.1 README QA');
console.log('Scope: public README and portfolio documentation');
console.log('');

if (findings.length) {
  console.log(`Found ${findings.length} item(s) to review:`);
  findings.forEach((item) => console.log(`- ${item}`));
  process.exit(1);
}

console.log('Rev04.1 README readiness: PASS');
