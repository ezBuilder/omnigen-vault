// One-off: hide already-generated tiled "seamless repeating pattern" images
// (mark them quarantined so they leave the active set / gallery). Files are kept.
import { openVault } from '../src/storage/db.js';
import { resolveConfig } from '../src/config.js';

const c = resolveConfig();
const v = openVault(c.dbPath);
const before = v.db.prepare("SELECT COUNT(*) n FROM images WHERE status='active' AND composition='seamless repeating pattern'").get().n;
const info = v.db.prepare("UPDATE images SET status='quarantined' WHERE status='active' AND composition='seamless repeating pattern'").run();
const active = v.db.prepare("SELECT COUNT(*) n FROM images WHERE status='active'").get().n;
v.close();
console.log(`hidden ${info.changes} tiled images (was ${before} active) · active now: ${active}`);
