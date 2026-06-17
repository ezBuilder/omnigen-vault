// Persistent, cross-platform settings (the CLI equivalent of the macOS app's
// Settings window). Stored as JSON at ~/.omnigen-vault.json (override with
// $OMNIGEN_CONFIG). resolveConfig() layers this between env and defaults, so a
// bare `omnigen generate` on any OS honors the saved settings.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export function configFilePath() {
  return process.env.OMNIGEN_CONFIG || path.join(os.homedir(), '.omnigen-vault.json');
}

export function loadConfigFile() {
  try {
    const obj = JSON.parse(fs.readFileSync(configFilePath(), 'utf8'));
    return obj && typeof obj === 'object' ? obj : {};
  } catch {
    return {};
  }
}

export function saveConfigFile(obj) {
  const p = configFilePath();
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n');
  return p;
}

const truthy = (s) => !/^(0|false|no|off)$/i.test(String(s).trim());

// friendly CLI key -> { cfg: resolveConfig override key, coerce, label, hint }
export const SETTINGS = {
  vault: { cfg: 'vaultRoot', label: 'Save folder (vault root)' },
  size: { cfg: 'size', label: 'Resolution', hint: 'auto-category|square|landscape|portrait|hd|fhd|qhd|uhd|<WxH>' },
  concurrency: { cfg: 'concurrency', coerce: Number, label: 'Concurrent generations', hint: '1-64' },
  ocr: { cfg: 'ocrEnabled', coerce: truthy, label: 'OCR text check', hint: 'on/off' },
  thumbnails: { cfg: 'thumbnails', coerce: truthy, label: 'Thumbnails', hint: 'on/off' },
  'max-disk': { cfg: 'maxDiskPercent', coerce: Number, label: 'Max disk usage %', hint: '1-100' },
  'min-free': { cfg: 'minFreeGb', coerce: Number, label: 'Min free space (GB)' },
  model: { cfg: 'model', label: 'Model' }
};

/** Apply one friendly key=value to the on-disk config; returns the saved path. */
export function setConfigKey(friendlyKey, value) {
  const def = SETTINGS[friendlyKey];
  if (!def) throw new Error(`Unknown setting "${friendlyKey}". Valid: ${Object.keys(SETTINGS).join(', ')}`);
  const cfg = loadConfigFile();
  cfg[def.cfg] = def.coerce ? def.coerce(value) : value;
  return saveConfigFile(cfg);
}
