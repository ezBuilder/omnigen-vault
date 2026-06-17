---
name: omnigen
description: >-
  Generate a brand-new text-free image from a prompt, or find an existing one in
  the local Omnigen Vault, and get back a ready-to-use PNG file path. Use when
  the user wants to create or fetch an image (illustration, photo, texture,
  background, icon art, etc.) without any text in it.
---

# Omnigen — text-free image generation & retrieval

A local engine that generates text-free images in any art style and indexes them
in a searchable SQLite vault. Drive it with the `omnigen` CLI (zero npm deps;
needs Node ≥ 22 and a logged-in Codex/ChatGPT session).

Project root: the directory containing this skill's repo (has `bin/omnigen`).

## Generate a new image

```bash
node bin/omnigen generate --theme "a cozy reading nook, watercolor" --limit 1
```

- `--theme "<prompt>"` — what to depict (English works best). One image: `--limit 1`.
- `--size square|landscape|portrait|hd|fhd|qhd|uhd|<WxH>` (default per category).
- Saved under `images/theme-<slug>/<resolution>/` and indexed automatically.
- Every prompt is forced text-free and OCR-verified.

Then locate the file you just made:

```bash
node bin/omnigen query "<your prompt words>" --json --limit 1
```

## Find / reuse an existing image (preferred when possible)

```bash
node bin/omnigen query "neon city at night" --json --limit 5
```

Returns JSON with absolute `path`, `category`, `style`, `size`, `prompt`, `tags`.
Use the `path` directly (read it, attach it, copy it — it is a real PNG on disk).

## Browse / share

```bash
node bin/omnigen gallery        # static HTML gallery (search + filter + lightbox)
node bin/omnigen serve          # live local gallery + JSON API at localhost:8787
```

## Tips

- Prefer `query` first to reuse an image before generating a new one.
- For an inline image result inside an MCP-capable agent, use the bundled MCP
  server instead (`omnigen-mcp` — tools: `generate_image`, `search_images`,
  `get_image`), which returns the PNG inline.
- Run `node bin/omnigen` for the full command/option reference.
