// Load + validate the local Codex/ChatGPT session.
// We only ever read these files; tokens are never logged or persisted by us.
import fs from 'node:fs/promises';

function clean(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/**
 * Read Codex auth + installation id from disk.
 * @param {{ authFile: string, installationIdFile: string }} cfg
 */
export async function loadCodexSession({ authFile, installationIdFile }) {
  let authJson;
  try {
    authJson = JSON.parse(await fs.readFile(authFile, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') {
      const e = new Error(`Codex auth not found at ${authFile}. Log in with the Codex CLI first.`);
      e.code = 'AUTH_MISSING';
      throw e;
    }
    throw error;
  }

  const tokens = authJson?.tokens ?? {};
  let installationId = null;
  try {
    installationId = clean(await fs.readFile(installationIdFile, 'utf8'));
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }

  return {
    authMode: clean(authJson?.auth_mode),
    accessToken: clean(tokens?.access_token),
    accountId: clean(tokens?.account_id),
    installationId
  };
}

/**
 * Ensure the session carries everything the private backend needs.
 * @param {Awaited<ReturnType<typeof loadCodexSession>>} session
 */
export function validateCodexSession(session) {
  const missing = [];
  if (!session.accessToken) missing.push('tokens.access_token');
  if (!session.accountId) missing.push('tokens.account_id');
  if (missing.length) {
    const e = new Error(`Codex session is missing required fields: ${missing.join(', ')}.`);
    e.code = 'AUTH_INCOMPLETE';
    throw e;
  }

  const warnings = [];
  if (session.authMode && session.authMode !== 'chatgpt') {
    warnings.push(`auth_mode is "${session.authMode}"; the image backend expects "chatgpt".`);
  }
  if (!session.installationId) {
    warnings.push('installation_id not found; continuing without x-codex-installation-id.');
  }
  return { warnings };
}
