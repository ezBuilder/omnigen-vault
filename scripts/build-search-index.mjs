// Rebuild the multilingual search_fts index for all active images.
//   node scripts/build-search-index.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveConfig } from '../src/config.js';
import { openVault } from '../src/storage/db.js';
import { buildHaystack } from '../src/storage/searchIndex.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const trPath = path.resolve(here, '../src/prompts/subjectTranslations.json');
const subjectTr = fs.existsSync(trPath) ? JSON.parse(fs.readFileSync(trPath, 'utf8')) : {};

const config = resolveConfig({});
const vault = openVault(config.dbPath);
const rows = vault.db
  .prepare("SELECT id, subject, style, mood, variant, category, tags, prompt FROM images WHERE status='active'")
  .all();
console.log(`indexing ${rows.length} active images · ${Object.keys(subjectTr).length} subject translations`);

vault.clearSearchIndex();
vault.db.exec('BEGIN');
let n = 0;
for (const row of rows) {
  vault.indexSearch(row.id, buildHaystack(row, subjectTr));
  if (++n % 5000 === 0) console.log(`  ${n}`);
}
vault.db.exec('COMMIT');
const count = vault.db.prepare('SELECT COUNT(*) c FROM search_fts').get().c;
console.log(`done. search_fts rows: ${count}`);
vault.close();
