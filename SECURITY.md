# Security

## Reporting

Found a vulnerability? Open a private security advisory on the GitHub repo, or
email the maintainer. Please do not file public issues for exploitable bugs.

## Threat model of the public gallery server (`omnigen serve`)

The server can expose your image vault for browsing/searching/downloading. It is
built to minimize attack surface, but **no internet-facing service is risk-free**.
Hardening applied:

- **Read-only by default when public.** `--public` implies no write endpoints:
  the rating write-back API is disabled unless you also pass `--allow-rating`.
- **No arbitrary file access.** Images are served only by numeric DB id; the
  resolved real path is canonicalized (`realpath`) and must live inside the vault
  root, rejecting path traversal and symlink escapes. The SQLite file, source,
  and system paths are never served.
- **Input limits.** JSON bodies are size-capped; search `limit` is clamped;
  unknown routes/methods return 404; per-IP rate limiting throttles floods.
- **Security headers** (`X-Content-Type-Options`, `Referrer-Policy`,
  `Content-Security-Policy`, no directory listing).
- **Optional token gate.** `--token <secret>` requires `?k=<secret>` (or an
  `X-Access-Token` header) for every request.

## Recommended exposure: Cloudflare Tunnel (no open inbound port)

Do **not** port-forward your machine directly. Use a tunnel so there is no open
inbound port, and you get TLS + DDoS protection for free:

```bash
brew install cloudflared
node bin/omnigen serve --public --port 8787      # read-only public mode
cloudflared tunnel --url http://localhost:8787    # prints a public https URL
```

For a stable hostname, set up a named tunnel under your Cloudflare account.
Stop the tunnel (and the server) to take it offline instantly.

## Generation backend

The generator authenticates with your local Codex/ChatGPT session. Those tokens
are read locally and never logged, transmitted to third parties, or committed.
