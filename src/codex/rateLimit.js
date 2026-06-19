// Parse the private Codex backend's usage-limit headers and decide when to resume.
//
// Every backend response (200 or 429) carries the account's usage windows:
//   primary   = 5-hour rolling window  (x-codex-<codename>-primary-*,  window-minutes 300)
//   secondary = weekly window          (x-codex-<codename>-secondary-*, window-minutes 10080)
// Each exposes `*-used-percent` and `*-reset-at` (epoch SECONDS). The codename
// segment (e.g. "bengalfox") varies by model/account, so headers are matched by
// pattern, not literal name.

/**
 * Extract the primary (5h) and secondary (weekly) usage windows from response
 * headers. Accepts a fetch `Headers` object or a plain `{name: value}` map.
 * Missing fields come back as null (never throws).
 *
 * @param {Headers | Record<string,string> | null | undefined} headers
 * @returns {{ primary: Window, secondary: Window }}
 * @typedef {{ usedPercent: number|null, resetAtMs: number|null, windowMinutes: number|null }} Window
 */
export function parseRateLimits(headers) {
  const map = {};
  if (headers) {
    const entries =
      typeof headers.entries === 'function' ? headers.entries() : Object.entries(headers);
    for (const [k, v] of entries) map[String(k).toLowerCase()] = v;
  }
  const num = (v) => {
    if (v == null || v === '') return null; // missing header → unknown, NOT 0
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  // The backend reports each window TWICE: an account-wide set (x-codex-<kind>-*)
  // and a per-model set (x-codex-<codename>-<kind>-*, e.g. "bengalfox"). They can
  // differ a lot, so take the MORE-used of the two — that's the binding limit, the
  // one that actually triggers a 429 — for both the meter and the pre-emptive pause.
  const win = (kind) => {
    const prefixes = new Set();
    for (const k of Object.keys(map)) {
      const m = k.match(new RegExp(`^(x-codex-(?:.+-)?)${kind}-used-percent$`));
      if (m) prefixes.add(m[1]);
    }
    let best = { usedPercent: null, resetAtMs: null, windowMinutes: null };
    for (const p of prefixes) {
      const up = num(map[`${p}${kind}-used-percent`]);
      if (up == null) continue;
      if (best.usedPercent == null || up > best.usedPercent) {
        const ra = num(map[`${p}${kind}-reset-at`]);
        best = {
          usedPercent: up,
          resetAtMs: ra != null ? ra * 1000 : null,
          windowMinutes: num(map[`${p}${kind}-window-minutes`])
        };
      }
    }
    return best;
  };
  return { primary: win('primary'), secondary: win('secondary') };
}

/**
 * Decide whether generation must pause and until when, from parsed limits.
 *
 * A window is "exhausted" when its used-percent is >= 100. If both the 5h and the
 * weekly windows are exhausted, we wait for the LATER reset (the binding one —
 * clearing the 5h window does nothing while the weekly cap still blocks). When a
 * 429 was received but no window clearly reports 100% (timing skew), `force429`
 * still returns a pause, honoring Retry-After, then the nearest reset, then +5min.
 *
 * Returns null when nothing is exhausted (and not forced).
 *
 * @param {{primary: Window, secondary: Window}} limits
 * @param {{ retryAfterSec?: number|null, nowMs?: number, force429?: boolean }} [opts]
 * @returns {{ resetAtMs: number, scope: '5h'|'weekly'|'rate' } | null}
 */
export function pickPause(limits, { retryAfterSec = null, nowMs = 0, force429 = false } = {}) {
  const exhausted = [];
  if (limits?.primary?.resetAtMs && (limits.primary.usedPercent ?? 0) >= 100) {
    exhausted.push({ scope: '5h', resetAtMs: limits.primary.resetAtMs });
  }
  if (limits?.secondary?.resetAtMs && (limits.secondary.usedPercent ?? 0) >= 100) {
    exhausted.push({ scope: 'weekly', resetAtMs: limits.secondary.resetAtMs });
  }
  if (exhausted.length) {
    return exhausted.sort((a, b) => a.resetAtMs - b.resetAtMs).pop(); // wait for the later reset
  }
  if (!force429) return null;
  if (Number.isFinite(retryAfterSec)) {
    return { scope: 'rate', resetAtMs: nowMs + retryAfterSec * 1000 };
  }
  const resets = [limits?.primary?.resetAtMs, limits?.secondary?.resetAtMs].filter((x) => x != null);
  if (resets.length) return { scope: '5h', resetAtMs: Math.min(...resets) };
  return { scope: 'rate', resetAtMs: nowMs + 5 * 60 * 1000 };
}

/** Human label for a pause scope. */
export function scopeLabel(scope) {
  return scope === 'weekly' ? '주간 한도' : scope === '5h' ? '5시간 한도' : '요청 한도';
}
