<div align="center">

# 🖼️ Omnigen Vault

**An infinite, text-free image engine + self-curating gallery — built to run forever.**

Generate every kind of image in the world, in every art style ever made, with
**zero text** in the frame — organized by category and resolution, thumbnailed,
full-text indexed, and browsable in a slick multilingual gallery you can share
with the world.

**English** · [한국어](docs/README.ko.md) · [日本語](docs/README.ja.md) · [中文](docs/README.zh.md) · [Español](docs/README.es.md)

`Node ≥22` · **zero npm dependencies** · macOS menu-bar app · MIT

</div>

---

## ✨ Why it's special

- **Infinite by design.** A deterministic, resumable prompt engine crosses **60
  real-world categories** × **270+ researched art styles** × lighting × palette ×
  composition × mood — over **1.6 billion** base combinations before it even
  starts recycling. Stop and resume anytime; it never repeats.
- **Every style on Earth.** 270+ text-free visual styles spanning photography
  (analog & digital), classical → contemporary painting, world/folk/indigenous
  traditions, illustration/3D/CGI, printmaking & craft, and modern aesthetics —
  scattered so *every* batch is visually diverse, not a monotonous run.
- **Truly text-free.** Every prompt forbids text, and each image is **OCR-verified**
  (confidence-filtered to ignore texture noise); anything with real lettering is
  auto-regenerated or quarantined.
- **Self-organizing vault.** Saves to `images/<category>/<resolution>/`, generates
  **thumbnails**, and indexes everything in **SQLite with FTS5** full-text search +
  ratings + perceptual-hash de-duplication.
- **Two galleries.** A self-contained static `gallery.html`, and a **live
  multilingual web server** (search, filter, infinite-scroll, lightbox, in-browser
  ratings) you can expose to the world via Cloudflare Tunnel.
- **Won't crash your Mac.** Hard disk-usage ceiling + OS-volume guard + free-space
  floor. Concurrent, low-memory, instant-cancel.
- **Native menu-bar app.** Start/stop, pick options, change save folder, launch at
  login, build galleries — all from a clean, icon-driven menu. Code-signed.
- **AI-native.** A machine-readable query API so an agent can find and use the
  perfect image instantly (see below).

## 🚀 Quick start

```bash
git clone <your-repo-url> omnigen-vault && cd omnigen-vault
node bin/omnigen doctor          # checks auth, disk, OCR, thumbnails, sqlite
node bin/omnigen generate        # infinite, resumable generation (Ctrl-C to stop)
node bin/omnigen gallery && open "$(node bin/omnigen stats >/dev/null; echo)"  # build a gallery
```

Requirements: **Node 22+** (uses built-in `node:sqlite` + `fetch` — no `npm install`),
a logged-in Codex/ChatGPT session, `tesseract` for OCR (`brew install tesseract`),
and a mounted external/data disk for the vault.

## 🤖 AI super-simple install & use

This tool is built to be driven by an AI agent. Zero dependencies, one clone:

```bash
git clone <your-repo-url> omnigen-vault && cd omnigen-vault   # no npm install needed
```

Then an agent finds and uses images with **one machine-readable command**:

```bash
# returns absolute paths + metadata as JSON — pipe straight into a tool call
node bin/omnigen query "misty mountain at golden hour" --json --limit 5
```

```json
[{ "path": "/Volumes/ezBackup/omnigen-vault/images/mountains-peaks/landscape/...png",
   "category": "mountains-peaks", "style": "impressionist painting, broken color",
   "size": "1536x1024", "prompt": "…", "tags": ["…"] }]
```

Or query the live server's JSON API:

```bash
node bin/omnigen serve --port 8787
curl 'localhost:8787/api/search?q=neon%20city&minRating=4&limit=10'
```

Programmatic (Node):

```js
import { resolveConfig, queryVault } from './src/index.js';
const hits = queryVault(resolveConfig(), { query: 'a red fox in snow', limit: 3 });
```

## 🔌 Use it from any AI app (MCP + Skill)

**MCP server** — exposes `generate_image`, `search_images`, `get_image` and
returns the PNG **inline**. Add to any MCP client (Claude Desktop, Codex, Cursor,
Antigravity, …):

```json
{
  "mcpServers": {
    "omnigen": { "command": "node", "args": ["/ABSOLUTE/PATH/omnigen-vault/bin/omnigen-mcp"] }
  }
}
```

Then just ask your agent *"generate a watercolor fox"* — it calls the tool and
gets the image back. (Codex CLI: `codex mcp add omnigen -- node …/bin/omnigen-mcp`.)

**Agent Skill** — for skill-aware agents, copy `skills/omnigen/` into your skills
dir (`~/.claude/skills/`, `~/.codex/skills/`, or project `.agents/skills/`). It
drives the CLI and hands back ready-to-use file paths.

## 🪟 Cross-platform & Windows

The **CLI, MCP server, and web server are pure Node** → they run on macOS, Linux,
and Windows. Instead of the macOS menu-bar app, configure everything from the CLI:

```bash
omnigen config setup          # guided settings (save folder, size, concurrency, OCR, disk limit)
omnigen config set size fhd   # or set individual keys
omnigen config show           # view saved + effective settings
```

Settings persist to `~/.omnigen-vault.json` (override path with `$OMNIGEN_CONFIG`)
and apply to every command. On Windows: install Node ≥22; thumbnails (macOS `sips`)
are skipped gracefully (the gallery falls back to full images); for OCR install
Tesseract and point `OMNIGEN_TESSERACT` at `tesseract.exe`, or run `--no-ocr`.
The native menu-bar **app** is macOS-only.

## 🖥️ Menu-bar app (macOS)

```bash
bash app/build.sh                       # compiles, embeds icon, code-signs
ditto app/OmnigenVault.app /Applications/OmnigenVault.app
open /Applications/OmnigenVault.app
```

A clean menu-bar menu (SF Symbol icons, no clutter): start/stop toggle, generate
by word, recent preview, build gallery, open folder, and a **Settings** window
(save location · concurrency · resolution · OCR · disk ceiling · launch-at-login ·
auto-start). Live count + disk % in the menu. Quitting always stops the worker.

## 🌐 Share it with the world (safely)

```bash
node bin/omnigen serve --public --port 8787     # read-only, hardened
cloudflared tunnel --url http://localhost:8787  # public HTTPS, no open port
```

Public mode is **read-only** (ratings write-back is opt-in), serves images only by
id with realpath-confined path validation, rate-limits, caps request size, sets
strict security headers, and supports an optional `--token`. See
[SECURITY.md](SECURITY.md). The gallery UI is multilingual (EN/KO/JA/ZH/ES) and
auto-detects the visitor's language.

## 🧭 Commands

| command | what it does |
|---|---|
| `generate` | infinite, resumable, text-free generation (by-category or `--theme "word"`) |
| `query "…" --json` | full-text search → paths + metadata for AI use |
| `gallery` / `preview [N]` | build a static gallery / recent-N preview page |
| `serve` | live multilingual gallery + JSON API (+ `--public` for the world) |
| `dedupe` | perceptual-hash near-duplicate detection |
| `export --rating 4 --out DIR` | copy a curated set + contact sheet |
| `retag` · `stats` · `doctor` · `init` | maintenance & diagnostics |

Run `node bin/omnigen` for the full option reference.

## 🏗️ Architecture

```
prompt taxonomy ─▶ Codex image backend ─▶ stream PNG ─▶ OCR text check
   60 cats ×                                                  │ clean → save
   270+ styles                                                ▼
        images/<category>/<resolution>/*.png  +  thumbs/  +  index.sqlite (FTS5)
                                                                  │
                          query · gallery · serve (live, i18n) ◀──┘
```

Zero runtime dependencies — `node:sqlite`, `node:http`, `fetch`, and macOS
`sips`/`tesseract` do all the work.

## 🧪 Tests

```bash
node --test
```

## License

MIT — see [LICENSE](LICENSE).
