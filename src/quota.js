// Pure quota/scheduling helpers for the generation worker.
//
// These functions let the worker (a) skip categories that have already hit a
// per-category cap of active images, and (b) stop generating once a scheduled
// local wall-clock time is reached. They are intentionally side-effect free
// (no Date.now, no file writes) so they are trivial to unit-test: the caller
// supplies the current time.

/**
 * Parse a comma-separated cap spec into a Map of category -> cap.
 *
 * Format: "food-and-drink=2000,birds=500". Whitespace around entries, keys,
 * and values is tolerated. Entries that are malformed (missing '=', empty key,
 * non-positive or non-integer value) are silently ignored so a typo in one
 * entry never discards the whole spec. A later duplicate key wins.
 *
 * @param {string|null|undefined} str Raw cap spec (e.g. from --category-caps).
 * @returns {Map<string, number>} Map of category name -> positive integer cap.
 */
export function parseCaps(str) {
  /** @type {Map<string, number>} */
  const caps = new Map();
  if (typeof str !== 'string') return caps;
  for (const rawEntry of str.split(',')) {
    const entry = rawEntry.trim();
    if (!entry) continue;
    const eq = entry.indexOf('=');
    if (eq <= 0) continue; // no '=' or empty key
    const key = entry.slice(0, eq).trim();
    const valStr = entry.slice(eq + 1).trim();
    if (!key || !valStr) continue;
    // Require a clean non-negative integer (no "10px", no "1.5").
    if (!/^\d+$/.test(valStr)) continue;
    const val = Number(valStr);
    if (!Number.isInteger(val) || val <= 0) continue;
    caps.set(key, val);
  }
  return caps;
}

/**
 * Determine which categories are at or over their cap of active images.
 *
 * Runs a single grouped count over the images table and compares each
 * category's active count against its cap. Categories without a cap are never
 * included. A category is "over cap" when its active count is >= the cap.
 *
 * Defensive: if `caps` is empty, returns an empty Set without querying. If the
 * query throws (e.g. db unavailable), returns an empty Set so the worker can
 * continue rather than crash.
 *
 * @param {{ db: { prepare: (sql: string) => { all: (...a: any[]) => any[] } } }} vault
 *   An open vault (from openVault); only vault.db is used.
 * @param {Map<string, number>} caps Map of category -> positive integer cap.
 * @returns {Set<string>} Set of category names whose active count >= cap.
 */
export function overCapCategories(vault, caps) {
  /** @type {Set<string>} */
  const over = new Set();
  if (!caps || caps.size === 0) return over;
  if (!vault || !vault.db) return over;
  let rows;
  try {
    rows = vault.db
      .prepare(
        "SELECT category, COUNT(*) c FROM images WHERE status='active' GROUP BY category"
      )
      .all();
  } catch {
    return over; // graceful: treat as nothing over cap
  }
  for (const row of rows) {
    const cap = caps.get(row.category);
    if (cap === undefined) continue;
    const count = Number(row.c) || 0;
    if (count >= cap) over.add(row.category);
  }
  return over;
}

/**
 * Build a predicate that reports whether a scheduled local time has been
 * reached for "today" (relative to the supplied current time).
 *
 * Given "HH:MM" (24-hour, local wall-clock), returns a `reached(nowMs)`
 * function. The cutoff is computed from the local date of the Date built from
 * `nowMs`, so the comparison uses the same calendar day as the caller's clock.
 * `reached` returns true once now is at/after that cutoff.
 *
 * The cutoff is recomputed on every call from the passed-in time, so a worker
 * looping for many hours always compares against today's HH:MM in the local
 * zone. This function never reads the system clock itself — the caller passes
 * `nowMs` (typically Date.now()).
 *
 * If `hhmm` is malformed (not "HH:MM", out-of-range hour/minute), the returned
 * predicate always returns false (i.e. "no scheduled stop").
 *
 * @param {string|null|undefined} hhmm Target local time as "HH:MM" (e.g. "23:30").
 * @returns {(nowMs: number) => boolean} Predicate true once now >= today's HH:MM.
 */
export function parseUntil(hhmm) {
  const never = () => false;
  if (typeof hhmm !== 'string') return never;
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return never;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return never;
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) return never;

  /**
   * @param {number} nowMs Current time in epoch milliseconds.
   * @returns {boolean} True once the local clock is at/after today's HH:MM.
   */
  return function reached(nowMs) {
    if (typeof nowMs !== 'number' || !Number.isFinite(nowMs)) return false;
    const now = new Date(nowMs);
    const cutoff = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      hour,
      minute,
      0,
      0
    );
    return nowMs >= cutoff.getTime();
  };
}
