// `omnigen upgrade` — pull the latest version. Works for a git checkout (git pull
// --ff-only) and tells npx users the one-liner. Zero deps (uses git via child_process).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function pkgVersion() {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;
  } catch {
    return '?';
  }
}

function git(args, opts = {}) {
  return execFileSync('git', ['-C', ROOT, ...args], { encoding: 'utf8', ...opts });
}

function isGitRepo() {
  try {
    git(['rev-parse', '--is-inside-work-tree'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export async function runUpgrade({ dryRun = false } = {}) {
  const before = pkgVersion();
  console.log(`omnigen-vault v${before}`);

  if (!isGitRepo()) {
    console.log('Not a git checkout — upgrade by reinstalling the latest:');
    console.log('  npx -y omnigen-vault@latest omnigen-mcp');
    console.log('  # or: git clone <repo> && cd omnigen-vault');
    return;
  }

  if (dryRun) {
    console.log(`Git checkout at ${ROOT}. Would run: git pull --ff-only`);
    try {
      git(['fetch', '--quiet']);
      const behind = git(['rev-list', '--count', 'HEAD..@{u}']).trim();
      console.log(behind === '0' ? 'Already up to date.' : `${behind} new commit(s) available.`);
    } catch {
      console.log('(no upstream configured)');
    }
    return;
  }

  try {
    console.log(git(['pull', '--ff-only']).trim());
  } catch (e) {
    console.log('git pull failed:', String(e.message || e).split('\n')[0]);
    console.log('Resolve local changes (see `git status`) and retry.');
    return;
  }

  const after = pkgVersion();
  console.log(after === before ? `Up to date (v${after}).` : `Upgraded ${before} → ${after}.`);
  if (fs.existsSync(path.join(ROOT, 'web', 'package.json'))) {
    console.log('If the web gallery changed: `npm run build` to rebuild it.');
  }
}
