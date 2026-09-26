// Validate the current tracked tree, including staged additions, without exposing secrets.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const failures = [];
const args = process.argv.slice(2);
for (const arg of args) {
  if (arg !== '--allow-internal-plans') failures.push(`Unknown argument: ${arg}`);
}
const allowInternal = args.includes('--allow-internal-plans');
let root;
let tracked = [];
try {
  root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
  tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
} catch {
  failures.push('Run check:public inside a Git checkout with Git installed.');
}

function read(path) {
  try {
    return readFileSync(join(root, path), 'utf8');
  } catch {
    failures.push(`Missing or unreadable required file: ${path}`);
    return '';
  }
}

if (root) {
  const license = read('LICENSE');
  for (const term of ['All Rights Reserved', 'ghost-ng', 'copying', 'modification', 'distribution', 'sublicensing', 'commercial use', 'prior written permission']) {
    if (!license.toLowerCase().includes(term.toLowerCase())) failures.push(`LICENSE must include ${term}.`);
  }
  const readme = read('README.md');
  for (const name of ['Tic Tac Toe', 'Four in a Row', 'Checkers', 'Chinese Checkers', 'Mancala', 'Pop & Race', 'Dots & Boxes', 'Hangman', 'Word Search', 'Crossword', 'Word Grid', 'Word Guess', 'Coin Flip', 'Dice']) {
    if (!readme.includes(name)) failures.push(`README must list ${name}.`);
  }
  if (/\b(?:boggle|wordle|trouble|connect[ -]four)\b/i.test(readme)) failures.push('README must use generic public game names.');
  let pkg = {};
  try {
    pkg = JSON.parse(read('package.json'));
  } catch {
    failures.push('package.json must be valid JSON.');
  }
  if (pkg.private !== true || pkg.license !== 'UNLICENSED') failures.push('package.json must keep private: true and license: UNLICENSED.');
  for (const match of readme.matchAll(/\bnpm run ([\w:-]+)/g)) {
    if (!Object.hasOwn(pkg.scripts ?? {}, match[1])) failures.push(`README documents missing npm script: ${match[1]}`);
  }
  for (const match of readme.matchAll(/(?:\.\/)?scripts\/wsl\/[\w.-]+\.sh/g)) {
    if (!existsSync(join(root, match[0].replace(/^\.\//, '')))) failures.push(`README documents missing WSL command: ${match[0]}`);
  }
  if (/\bnpm ci\b/.test(readme) && !existsSync(join(root, 'package-lock.json'))) failures.push('README npm ci requires package-lock.json.');
  const security = read('SECURITY.md');
  if (!security.includes('https://github.com/ghost-ng/Table-Games/security/advisories/new') || !security.includes('https://docs.github.com/') || !/private/i.test(security)) failures.push('SECURITY must link GitHub private vulnerability reporting and its documentation.');
  if (!/credential/i.test(security) || !/public/i.test(security) || !/do not|never/i.test(security)) failures.push('SECURITY must warn against public credential disclosure.');

  let deferred = 0;
  const credentialPatterns = [
    /-----BEGIN (?:[A-Z0-9]+ )?PRIVATE KEY-----/,
    /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/,
    /\bgh[pousr]_[A-Za-z0-9]{36,}\b/,
    /\bgithub_pat_[A-Za-z0-9_]{40,}\b/,
    /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{32,}\b/,
    /(?:api[_-]?key|api[_-]?secret|access[_-]?token|auth[_-]?token|client[_-]?secret|password|_authToken)["']?\s*[:=]\s*["'][A-Za-z0-9_+/.=-]{16,}["']/i,
  ];
  for (const path of tracked) {
    const parts = path.split('/');
    if (parts.some((part) => ['dist', 'web-build', 'node_modules', '.expo'].includes(part) || part.startsWith('.playwright-') || part.startsWith('.env'))) failures.push(`Forbidden tracked artifact: ${path}`);
    const internal = path === 'CLAUDE.md' || path.startsWith('docs/superpowers/') || path.startsWith('.superpowers/');
    if (internal) {
      if (allowInternal) deferred++;
      else failures.push(`Forbidden tracked internal document: ${path}`);
    }
    const planPath = /^(?:docs\/superpowers\/(?:plans|specs)\/|\.superpowers\/sdd\/)/.test(path);
    const allowPlaceholderMention = allowInternal && planPath;
    // Deleted worktree files are handled by Git staging; binary assets are not text credentials.
    if (!existsSync(join(root, path))) continue;
    const bytes = readFileSync(join(root, path));
    if (bytes.includes(0)) continue;
    const lines = bytes.toString('utf8').split(/\r?\n/);
    lines.forEach((line, index) => {
      if (!allowPlaceholderMention && /YOUR_(?:APPLE_ID|ASC_APP_ID|TEAM_ID)/.test(line)) failures.push(`Account placeholder: ${path}:${index + 1}`);
      if (credentialPatterns.some((pattern) => pattern.test(line))) failures.push(`Likely credential: ${path}:${index + 1} (value withheld)`);
    });
  }
  if (allowInternal) console.log(`Temporary exception: ${deferred} internal tracked files deferred; artifact and credential checks remain enforced.`);
}

if (failures.length) {
  console.error(`FAIL public readiness (${failures.length} findings):\n${failures.map((failure) => `- ${failure}`).join('\n')}`);
  process.exitCode = 1;
} else {
  console.log('PASS public readiness: policies, product names, commands and tracked-tree scan.');
}
