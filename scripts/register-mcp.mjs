// Register the omnigen MCP server into Claude Desktop + Antigravity (Roo) configs
// by merging (never clobbering existing servers). Codex is handled via its CLI.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const BIN = '/Users/ezbuilder/workspace/omnigen-vault/bin/omnigen-mcp';
const H = os.homedir();

const targets = [
  {
    name: 'Claude Desktop',
    path: path.join(H, 'Library/Application Support/Claude/claude_desktop_config.json'),
    create: true,
    entry: { command: 'node', args: [BIN] }
  },
  {
    name: 'Antigravity (Roo)',
    path: path.join(H, 'Library/Application Support/Antigravity IDE/User/globalStorage/rooveterinaryinc.roo-cline/settings/mcp_settings.json'),
    create: true,
    entry: { command: 'node', args: [BIN], disabled: false }
  }
];

for (const t of targets) {
  let j = {};
  try {
    j = JSON.parse(fs.readFileSync(t.path, 'utf8'));
  } catch (e) {
    if (!t.create) { console.log(`skip ${t.name}: ${e.message}`); continue; }
    fs.mkdirSync(path.dirname(t.path), { recursive: true });
  }
  j.mcpServers = j.mcpServers || {};
  j.mcpServers.omnigen = t.entry;
  fs.writeFileSync(t.path, JSON.stringify(j, null, 2) + '\n');
  console.log(`registered "omnigen" in ${t.name} (servers now: ${Object.keys(j.mcpServers).join(', ')})`);
}
