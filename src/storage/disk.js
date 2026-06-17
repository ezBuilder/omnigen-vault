// Disk safety: usage measurement, system-volume protection, and a configurable
// usage ceiling so infinite generation can never fill the boot disk and crash
// the machine.
import { statfsSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';

const GB = 1_000_000_000;

/** First existing ancestor of a (possibly not-yet-created) path. */
function existingAncestor(targetPath) {
  let p = path.resolve(targetPath);
  while (!existsSync(p)) {
    const parent = path.dirname(p);
    if (parent === p) break;
    p = parent;
  }
  return p;
}

/** Usage of the filesystem holding `targetPath`. Conservative (reserved = used). */
export function diskUsage(targetPath) {
  const s = statfsSync(existingAncestor(targetPath));
  const total = s.blocks * s.bsize;
  const free = s.bavail * s.bsize; // available to an unprivileged writer
  const used = total - free;
  return {
    totalBytes: total,
    freeBytes: free,
    usedBytes: used,
    usedPercent: total > 0 ? (used / total) * 100 : 0
  };
}

/** True if `targetPath` lives on the same volume as `/` (the OS/boot disk). */
export function isOnSystemVolume(targetPath) {
  try {
    return statSync(existingAncestor(targetPath)).dev === statSync('/').dev;
  } catch {
    return false;
  }
}

/** Evaluate the disk against the configured ceiling + free-space floor. */
export function diskLimitStatus(config) {
  const u = diskUsage(config.vaultRoot);
  const minFreeBytes = (config.minFreeGb ?? 0) * GB;
  const overPercent = u.usedPercent >= config.maxDiskPercent;
  const underFree = u.freeBytes <= minFreeBytes;
  return { ...u, minFreeBytes, overPercent, underFree, ok: !overPercent && !underFree };
}

/** A short human reason when the disk limit is hit, else null. */
export function diskLimitReason(status, config) {
  if (status.overPercent) {
    return `disk ${status.usedPercent.toFixed(1)}% used ≥ limit ${config.maxDiskPercent}%`;
  }
  if (status.underFree) {
    return `free space ${(status.freeBytes / GB).toFixed(1)}GB ≤ floor ${config.minFreeGb}GB`;
  }
  return null;
}

/**
 * Refuse to run unbounded generation onto the OS/boot volume unless explicitly
 * allowed. Filling the system volume can hang or crash the machine.
 */
export function assertSafeVolume(config) {
  if (config.allowSystemVolume) return;
  if (isOnSystemVolume(config.vaultRoot)) {
    const e = new Error(
      `Refusing to generate onto the system volume (${config.vaultRoot}). ` +
        `Point --vault at an external/data disk, or pass --allow-system to override.`
    );
    e.code = 'SYSTEM_VOLUME_BLOCKED';
    throw e;
  }
}
