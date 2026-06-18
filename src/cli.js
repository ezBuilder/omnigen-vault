// omnigen-vault CLI: generate | query | stats | categories | doctor | init
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { resolveConfig, UNSUPPORTED_WARNING } from './config.js';
import { runWorker } from './worker.js';
import { recheckQuarantine } from './maintenance.js';
import { buildGallery } from './gallery/build.js';
import { diskLimitStatus, isOnSystemVolume } from './storage/disk.js';
import { thumbnailAvailable } from './media/thumbnail.js';
import { queryVault } from './query.js';
import { openVault } from './storage/db.js';
import { createCodexProvider } from './codex/provider.js';
import { createPromptStream } from './prompts/promptStream.js';
import { CATEGORY_NAMES } from './prompts/taxonomy.js';
import { buildPrompt, NO_TEXT_INSTRUCTIONS } from './prompts/negative.js';
import { ocrAvailable } from './text/ocr.js';
import { retagVault } from './retag.js';
import { exportSet } from './export.js';
import { dedupeVault } from './media/phash.js';
import { serveVault } from './server/serve.js';
import { configFilePath, loadConfigFile, setConfigKey, SETTINGS } from './configFile.js';

/** Expand a leading ~ to the user's home dir (path.resolve does not). */
function expandTilde(p) {
  if (p === '~') return os.homedir();
  if (p.startsWith('~/')) return path.join(os.homedir(), p.slice(2));
  return p;
}

function parseFlags(argv) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < argv.length; i += 1) {
    const tok = argv[i];
    if (tok.startsWith('--')) {
      const key = tok.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) {
        flags[key] = true;
      } else {
        flags[key] = next;
        i += 1;
      }
    } else {
      positional.push(tok);
    }
  }
  return { flags, positional };
}

function configFromFlags(flags) {
  const overrides = {};
  if (flags.vault) overrides.vaultRoot = flags.vault;
  if (flags.size) overrides.size = flags.size;
  if (flags.limit) overrides.limit = Number(flags.limit);
  if (flags.categories) overrides.categories = String(flags.categories);
  if (flags.theme) overrides.theme = String(flags.theme);
  if (flags.concurrency) overrides.concurrency = Number(flags.concurrency);
  if (flags['min-delay']) overrides.minDelayMs = Number(flags['min-delay']);
  if (flags['no-ocr']) overrides.ocrEnabled = false;
  if (flags['no-thumbs']) overrides.thumbnails = false;
  if (flags['max-disk']) overrides.maxDiskPercent = Number(flags['max-disk']);
  if (flags['min-free']) overrides.minFreeGb = Number(flags['min-free']);
  if (flags['allow-system']) overrides.allowSystemVolume = true;
  if (flags.model) overrides.model = flags.model;
  if (flags['category-caps']) overrides.categoryCaps = String(flags['category-caps']);
  if (flags.until) overrides.until = String(flags.until);
  if (flags.port) overrides.servePort = Number(flags.port);
  return resolveConfig(overrides);
}

const HELP = `omnigen-vault — infinite text-free image generator + SQLite vault

Usage:
  omnigen generate [options]      Run the (resumable) generation loop
  omnigen query "<text>" [opts]   Find images for an AI to use
  omnigen stats                   Show vault statistics (incl. disk usage)
  omnigen gallery [--all]         Build a static HTML gallery (thumbnails + prompts)
  omnigen recheck                 Re-OCR quarantined images, promote text-free ones
  omnigen retag                   Backfill tags from taxonomy fields to enrich full-text search
  omnigen dedupe [--threshold 5]  Hash images (perceptual) + mark near-duplicates (status='duplicate')
  omnigen export --out <dir> [..] Copy active images (rated >= n) + a self-contained contact sheet
  omnigen serve [--port 8787]     Live local gallery with in-browser star rating (write-back)
  omnigen categories              List prompt categories
  omnigen doctor                  Check auth, disk, OCR, sqlite, dry-run a request
  omnigen init                    Create vault folders + database
  omnigen upgrade [--dry-run]     Update to the latest version (git pull / npx)
  omnigen config [setup|show|set <k> <v>|path]   Persistent settings (cross-platform)
  omnigen serve [--public]        Live multilingual gallery + JSON API (see serve options)

generate options:
  --limit N            Stop after N images (0/omit = infinite)
  --categories a,b     Restrict to these categories (comma-separated)
  --theme "word(s)"    Generate around a specific word/phrase instead of the taxonomy
                       (comma-separate several). Saved under images/theme-<word>/
  --size NAME          auto-category (default) | rotate | auto | square | square-xl |
                       landscape | portrait | hd | fhd | qhd | uhd/4k | wuhd |
                       uhd-portrait | <WxH>. Images foldered by resolution tier.
  --min-delay MS       Delay between images (default 0)
  --no-ocr             Disable OCR text verification (prompt-only)
  --no-thumbs          Skip thumbnail generation
  --max-disk PCT       Stop when the disk is this % full (default 90)
  --min-free GB        Stop when free space drops below this many GB (default 5)
  --allow-system       Permit generating onto the OS/boot volume (unsafe; off by default)
  --category-caps STR  Skip categories at/over a cap, e.g. "birds=500,cats=200"
  --until HH:MM        Stop generating at this local clock time
  --vault PATH         Override vault root (default ~/.omnigen-vault, or $OMNIGEN_VAULT_ROOT)
  --dry-run            Build one request and print it; generate nothing

export options:
  --out DIR            Output directory (required); copies into <dir>/images + thumbs
  --rating N           Only images rated >= N (default 0)
  --category X         Restrict to one category
  --limit N            Max images, newest-first (0 = all)

serve options:
  --port N             Listen port (default 8787)
  --host ADDR          Bind address (default 127.0.0.1; use 0.0.0.0 for LAN)
  --public             Public read-only mode (rating write-back OFF unless --allow-rating)
  --allow-rating       Permit in-browser star rating write-back
  --no-download        Disable original-image downloads
  --token SECRET       Require ?k=SECRET (or X-Access-Token header) on every request
                       Multilingual UI (ko/en/ja/zh/es). For internet access pair with:
                       cloudflared tunnel --url http://localhost:8787

dedupe options:
  --threshold N        Max Hamming distance to treat as duplicate (default 5)

gallery options:
  --all                Include every active image (default: most recent 5000)
  --limit N            Max images to include (default 5000)
  --out PATH           Output HTML path (default <vault>/gallery.html)

  Note: the private backend caps output near ~1.5MP, so hi-res names mainly set
  aspect ratio/intent; actual pixels are recorded per image.

query options:
  --category X         Restrict search to one category
  --limit N            Max results (default 20)
  --json               Print raw JSON (default: human table)

${UNSUPPORTED_WARNING}
`;

async function cmdDoctor(config) {
  const ok = (b) => (b ? 'OK ' : 'FAIL');
  console.log('omnigen-vault doctor\n');

  // 1. auth
  let authOk = false;
  let session = null;
  try {
    const provider = createCodexProvider(config);
    session = await provider.ensureSession();
    authOk = true;
    console.log(`[${ok(true)}] codex auth loaded (auth_mode present, token present: ${Boolean(session.accessToken)})`);
    for (const w of provider.warnings) console.log(`        warning: ${w}`);
  } catch (error) {
    console.log(`[${ok(false)}] codex auth — ${error.message}`);
  }

  // 2. disk
  const mount = path.parse(config.vaultRoot).dir;
  const mountOk = fs.existsSync(mount);
  console.log(`[${ok(mountOk)}] backup disk mounted: ${mount}`);
  if (mountOk) {
    const disk = diskLimitStatus(config);
    const onSys = isOnSystemVolume(config.vaultRoot);
    console.log(`[${ok(!onSys || config.allowSystemVolume)}] not on OS/boot volume (system volume: ${onSys})`);
    console.log(`        disk ${disk.usedPercent.toFixed(1)}% used · ${(disk.freeBytes / 1e9).toFixed(0)}GB free · limit ${config.maxDiskPercent}% / floor ${config.minFreeGb}GB · ${disk.ok ? 'within limits' : 'OVER LIMIT'}`);
  }

  // 3. ocr + thumbnails
  const ocrOk = config.ocrEnabled ? await ocrAvailable(config.ocrBinary) : true;
  console.log(`[${ok(ocrOk)}] OCR (${config.ocrEnabled ? config.ocrBinary : 'disabled'})`);
  const thumbOk = config.thumbnails ? await thumbnailAvailable(config.thumbBinary) : true;
  console.log(`[${ok(thumbOk)}] thumbnails (${config.thumbnails ? config.thumbBinary : 'disabled'})`);

  // 4. sqlite
  let dbOk = false;
  try {
    const v = openVault(path.join(mountOk ? config.vaultRoot : process.cwd(), '.doctor-test.sqlite'));
    v.close();
    fs.rmSync(path.join(mountOk ? config.vaultRoot : process.cwd(), '.doctor-test.sqlite'), { force: true });
    fs.rmSync(path.join(mountOk ? config.vaultRoot : process.cwd(), '.doctor-test.sqlite-wal'), { force: true });
    fs.rmSync(path.join(mountOk ? config.vaultRoot : process.cwd(), '.doctor-test.sqlite-shm'), { force: true });
    dbOk = true;
  } catch (error) {
    console.log(`        sqlite error: ${error.message}`);
  }
  console.log(`[${ok(dbOk)}] node:sqlite vault open/close`);

  // 5. dry-run request
  if (authOk) {
    try {
      const provider = createCodexProvider(config);
      const stream = createPromptStream({ categories: config.categories });
      const spec = stream.at(0);
      const prompt = buildPrompt(spec.basePrompt, 0);
      await provider.generateImage({ prompt, instructions: NO_TEXT_INSTRUCTIONS, size: spec.defaultSize, dryRun: true });
      console.log(`[${ok(true)}] dry-run request built`);
      console.log(`        sample category: ${spec.category} · size ${spec.defaultSize}`);
      console.log(`        sample prompt: ${prompt.slice(0, 100)}...`);
    } catch (error) {
      console.log(`[${ok(false)}] dry-run request — ${error.message}`);
    }
  }

  console.log(`\nvault root: ${config.vaultRoot}`);
  console.log(`db path:    ${config.dbPath}`);
  console.log(`model:      ${config.model}`);
}

function cmdInit(config) {
  fs.mkdirSync(config.imagesDir, { recursive: true });
  fs.mkdirSync(config.thumbsDir, { recursive: true });
  fs.mkdirSync(config.quarantineDir, { recursive: true });
  const v = openVault(config.dbPath);
  v.close();
  console.log(`initialized vault at ${config.vaultRoot}`);
  console.log(`  images:     ${config.imagesDir}`);
  console.log(`  thumbs:     ${config.thumbsDir}`);
  console.log(`  quarantine: ${config.quarantineDir}`);
  console.log(`  database:   ${config.dbPath}`);
}

function cmdStats(config) {
  if (!fs.existsSync(config.dbPath)) {
    console.log(`No vault yet at ${config.dbPath}. Run "omnigen init" or "omnigen generate".`);
    return;
  }
  const v = openVault(config.dbPath);
  const s = v.stats();
  v.close();
  const disk = diskLimitStatus(config);
  console.log(`vault: ${config.vaultRoot}`);
  console.log(`active images: ${s.total}`);
  console.log(`quarantined (text detected): ${s.quarantined}`);
  console.log(`vault size: ${(s.bytes / 1e6).toFixed(1)} MB`);
  console.log(`disk: ${disk.usedPercent.toFixed(1)}% used · ${(disk.freeBytes / 1e9).toFixed(0)}GB free · limit ${config.maxDiskPercent}%\n`);
  console.log('by category:');
  for (const row of s.byCategory) {
    console.log(`  ${row.category.padEnd(24)} ${row.c}`);
  }
}

function cmdGallery(config, flags) {
  if (!fs.existsSync(config.dbPath)) {
    console.log(`No vault yet at ${config.dbPath}.`);
    return;
  }
  const res = buildGallery(config, {
    all: Boolean(flags.all),
    limit: flags.limit ? Number(flags.limit) : 5000,
    out: flags.out ? path.resolve(flags.out) : null
  });
  console.log(`gallery written: ${res.outPath}`);
  console.log(`  ${res.count} of ${res.total} images included`);
  console.log(`  open it directly, or host the vault folder to publish.`);
}


function cmdQuery(config, positional, flags) {
  const query = positional.join(' ');
  const results = queryVault(config, {
    query,
    category: flags.category || null,
    limit: flags.limit ? Number(flags.limit) : 20
  });
  if (flags.json) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }
  if (!results.length) {
    console.log(`No matches for "${query}".`);
    return;
  }
  console.log(`${results.length} match(es) for "${query}":\n`);
  for (const r of results) {
    console.log(`• ${r.category} · ${r.size} · ${r.subject}`);
    console.log(`  ${r.path}`);
  }
}

async function cmdDryRun(config) {
  const provider = createCodexProvider(config);
  const stream = createPromptStream({ categories: config.categories });
  const spec = stream.at(0);
  const prompt = buildPrompt(spec.basePrompt, 0);
  const res = await provider.generateImage({
    prompt,
    instructions: NO_TEXT_INSTRUCTIONS,
    size: spec.defaultSize,
    dryRun: true
  });
  console.log(JSON.stringify({
    mode: res.mode,
    category: spec.category,
    size: spec.defaultSize,
    model: config.model,
    promptPreview: prompt.slice(0, 160),
    warnings: res.warnings
  }, null, 2));
}

async function cmdConfig(positional, flags) {
  const [sub, key, ...rest] = positional;
  if (sub === 'set') {
    if (!key || rest.length === 0) { console.log('usage: omnigen config set <key> <value>'); return; }
    const p = setConfigKey(key, rest.join(' '));
    console.log(`set ${key} = ${rest.join(' ')}  →  ${p}`);
    return;
  }
  if (sub === 'path') { console.log(configFilePath()); return; }
  if (sub === 'setup') {
    const rl = (await import('node:readline/promises')).createInterface({ input: process.stdin, output: process.stdout });
    const cur = loadConfigFile();
    console.log(`Editing ${configFilePath()} — press Enter to keep each value.\n`);
    for (const fk of ['vault', 'size', 'concurrency', 'ocr', 'thumbnails', 'max-disk', 'min-free', 'model']) {
      const def = SETTINGS[fk];
      const hint = def.hint ? ` [${def.hint}]` : '';
      const ans = (await rl.question(`${def.label}${hint} (current: ${cur[def.cfg] ?? 'default'}; blank=keep): `)).trim();
      if (ans) setConfigKey(fk, ans);
    }
    rl.close();
    console.log('');
  }
  // default / show
  const f = loadConfigFile();
  console.log(`config file: ${configFilePath()}`);
  const keys = Object.keys(f);
  console.log(keys.length ? '\nsaved:' : '\n(no saved settings — run "omnigen config setup")');
  for (const k of keys) console.log(`  ${k} = ${JSON.stringify(f[k])}`);
  const c = configFromFlags(flags);
  console.log('\neffective:');
  for (const k of ['vaultRoot', 'size', 'concurrency', 'ocrEnabled', 'thumbnails', 'maxDiskPercent', 'minFreeGb', 'model']) {
    console.log(`  ${k} = ${JSON.stringify(c[k])}`);
  }
  if (!sub) console.log('\ntip: "config setup" (guided) · "config set <key> <value>" · keys: ' + Object.keys(SETTINGS).join(', '));
}

export async function main(argv) {
  const [command, ...rest] = argv;
  const { flags, positional } = parseFlags(rest);

  if (!command || command === 'help' || flags.help) {
    console.log(HELP);
    return;
  }

  const config = configFromFlags(flags);

  switch (command) {
    case 'generate':
      if (flags['dry-run']) return cmdDryRun(config);
      await runWorker(config);
      return;
    case 'query':
      cmdQuery(config, positional, flags);
      return;
    case 'stats':
      cmdStats(config);
      return;
    case 'gallery':
      cmdGallery(config, flags);
      return;
    case 'recheck':
      await recheckQuarantine(config);
      return;
    case 'retag': {
      if (!fs.existsSync(config.dbPath)) {
        console.log(`No vault yet at ${config.dbPath}.`);
        return;
      }
      const res = retagVault(config, { log: console.log });
      console.log(`Retagged ${res.updated} of ${res.scanned} image(s).`);
      return;
    }
    case 'dedupe': {
      if (!fs.existsSync(config.dbPath)) {
        console.log(`No vault yet at ${config.dbPath}.`);
        return;
      }
      const threshold = flags.threshold ? Number(flags.threshold) : 5;
      const res = await dedupeVault(config, { threshold });
      console.log(`dedupe: hashed ${res.hashed} new, marked ${res.duplicates} duplicate(s).`);
      return;
    }
    case 'export': {
      if (!flags.out) {
        console.error('export requires --out <dir>.\n');
        console.log('Usage: omnigen export --out <dir> [--rating N] [--category X] [--limit N]');
        process.exitCode = 1;
        return;
      }
      const res = await exportSet(config, {
        rating: Number(flags.rating) || 0,
        category: flags.category || null,
        limit: Number(flags.limit) || 0,
        out: expandTilde(String(flags.out))
      });
      console.log(`exported ${res.copied} image(s) -> ${res.htmlPath}`);
      return;
    }
    case 'serve': {
      if (!fs.existsSync(config.dbPath)) {
        console.log(`No vault yet at ${config.dbPath}. Run "omnigen init" or "omnigen generate".`);
        return;
      }
      const server = await serveVault(config, {
        port: config.servePort,
        host: flags.host ? String(flags.host) : '127.0.0.1',
        public: Boolean(flags.public),
        allowRating: flags['allow-rating'] ? true : undefined,
        allowDownload: flags['no-download'] ? false : undefined,
        token: flags.token ? String(flags.token) : null,
        log: (m) => console.log(m)
      });
      const { port: bound } = server.address();
      const url = `http://127.0.0.1:${bound}/`;
      console.log(`Serving vault gallery — open ${url} (Ctrl-C to stop)`);
      if (!flags.public) import('node:child_process').then(({ spawn }) => spawn('open', [url])).catch(() => {});
      const stop = () => server.close(() => process.exit(0));
      process.on('SIGINT', stop);
      process.on('SIGTERM', stop);
      await new Promise(() => {});
      return;
    }
    case 'config':
      await cmdConfig(positional, flags);
      return;
    case 'categories':
      console.log(CATEGORY_NAMES.join('\n'));
      return;
    case 'doctor':
      await cmdDoctor(config);
      return;
    case 'init':
      cmdInit(config);
      return;
    case 'upgrade': {
      const { runUpgrade } = await import('./upgrade.js');
      await runUpgrade({ dryRun: Boolean(flags['dry-run']) });
      return;
    }
    default:
      console.error(`Unknown command: ${command}\n`);
      console.log(HELP);
      process.exitCode = 1;
  }
}
