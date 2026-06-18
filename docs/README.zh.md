<div align="center">

<img src="assets/icon.png" width="104" alt="Omnigen" />

# Omnigen Vault

**一个无限的、无文字的图像引擎 + 自动整理的多语言库 — 以及一个由 AI 驱动的 MCP。**

生成世界上任何种类的图像，采用任何艺术风格，
**零文字** 在画面中 — 按类别和分辨率组织，缩略图化，
**多语言全文索引** (EN · KO · JA · ZH · ES)，可在时尚的
网络库中浏览，并可通过 **MCP** 立即被任何 AI 重复使用。

[**🔍 实时库 →**](https://gallery.ezbuilder.app) · [**AI 的 MCP**](#-use-it-from-any-ai-app-mcp) · [English](../README.md) · [한국어](README.ko.md) · [日本語](README.ja.md) · **中文** · [Español](README.es.md)

`Node ≥22` · **零 npm 依赖** · macOS 菜单栏应用 · MIT

<img src="assets/hero-backdrop.png" width="760" alt="Omnigen — 无文字 AI 图像库" />

</div>

> ### ⚠️ 不支持的后端 — 自行承担风险
> Omnigen 通过调用**无文档、私有的 ChatGPT/Codex 后端**（使用您的**本地 ChatGPT 身份验证令牌**）来生成图像 — 这**不是官方 OpenAI API**。协议可能随时更改或中断，**大量使用可能会对您的 ChatGPT 账户造成风险**（速率限制或限制）。您的令牌在运行时读取，**从不被 Omnigen 存储**，但您使用此功能**风险自负**。对于生产工作负载，请使用官方 [OpenAI API](https://platform.openai.com/)。推荐用于个人使用。

---

## ✨ 为什么它很特殊

- **无限设计。** 确定性、可恢复的提示引擎跨越 **67 个真实世界类别** × **270+ 研究艺术风格** × 光线 × 调色板 × 构图 × 情绪 — 超过 **16 亿个**基础组合，甚至在开始循环之前。随时停止和恢复；它永远不会重复。
- **地球上的每种风格。** 270+ 无文字视觉风格，涵盖摄影（模拟和数字）、古典 → 当代绘画、世界/民间/土著传统、插图/3D/CGI、版画和工艺、以及现代美学 — 分散开来，使*每*一批都视觉上多样化，而不是单调的运行。
- **真正无文字。** 每个提示都禁止文字，每张图像都经过 **OCR 验证**（信心过滤以忽略纹理噪声）；任何带有真实字母的内容都会自动重新生成或隔离。
- **自组织库。** 保存到 `images/<category>/<resolution>/`，生成**缩略图**，并在 **SQLite with FTS5** 全文搜索 + 评分 + 感知哈希去重中索引所有内容。
- **两个库。** 一个独立的静态 `gallery.html`，以及一个**实时多语言网络服务器**（搜索、过滤、无限滚动、灯箱、浏览器评分），您可以通过 Cloudflare 隧道公开给世界。
- **不会崩溃您的 Mac。** 硬盘使用量上限 + 操作系统卷保护 + 可用空间下限。并发、低内存、即时取消。
- **原生菜单栏应用。** 启动/停止、选择选项、更改保存文件夹、启动时启动、构建库 — 所有操作都来自干净的图标驱动菜单。代码签名。
- **AI 原生。** 一个机器可读的查询 API，使代理可以立即找到并使用完美的图像（见下文）。

<div align="center">
<img src="assets/showcase-1.png" width="384" alt="" />&nbsp;<img src="assets/showcase-2.png" width="256" alt="" />
<br><sub>每张图像都是 100% 无文字和 OCR 验证的。</sub>
</div>

## 🚀 快速开始

```bash
git clone <your-repo-url> omnigen-vault && cd omnigen-vault
node bin/omnigen doctor          # checks auth, disk, OCR, thumbnails, sqlite
node bin/omnigen generate        # infinite, resumable generation (Ctrl-C to stop)
node bin/omnigen gallery && open "$(node bin/omnigen stats >/dev/null; echo)"  # build a gallery
```

要求：**Node 22+**（使用内置的 `node:sqlite` + `fetch` — 无需 `npm install`），
已登录的 Codex/ChatGPT 会话、用于 OCR 的 `tesseract`（`brew install tesseract`），
以及为库装载的外部/数据磁盘。

## 🤖 为 AI 智能体 — 读取、安装和使用

从零到成果的所有步骤，按顺序进行。**零 `npm install`** — CLI、MCP 服务器和网络服务器都是纯 Node。生成重用您的**本地 ChatGPT/Codex 身份验证**（`~/.codex/auth.json`）；登录一次（Codex CLI / ChatGPT 应用）然后 `doctor` 验证它。

**1. 前置条件** — 仅安装缺失的部分：

```bash
node --version             # need ≥ 22   → else: brew install node   (or https://nodejs.org)
brew install tesseract     # OCR text-check (optional — or run generate with --no-ocr)
brew install cloudflared   # only if you'll expose a public URL (optional)
```

**2. 安装和生成：**

```bash
git clone https://github.com/ezBuilder/omnigen-vault.git && cd omnigen-vault
node bin/omnigen doctor                 # checks auth, disk, OCR, sqlite — fix what it flags
node bin/omnigen generate               # infinite, resumable, text-free (Ctrl-C to stop)
```

**3. 查找和重用图像 — 一个机器可读的命令：**

```bash
node bin/omnigen query “misty mountain at golden hour” --json --limit 5
```

```json
[{ “path”: “~/.omnigen-vault/images/mountains-peaks/landscape/...png”,
   “category”: “mountains-peaks”, “style”: “impressionist painting, broken color”,
   “size”: “1536x1024”, “prompt”: “…”, “tags”: [“…”] }]
```

…或查询实时服务器的 JSON API，或从 Node 调用：

```bash
node bin/omnigen serve --port 8787
curl 'localhost:8787/api/search?q=neon%20city&minRating=4&limit=10'
```

```js
import { resolveConfig, queryVault } from './src/index.js';
const hits = queryVault(resolveConfig(), { query: 'a red fox in snow', limit: 3 });
```

**4. 或直接通过 MCP 将其接入您的智能体** — 一个命令，您的 AI 搜索库并获取内联图像（详见下方）：

```bash
claude mcp add omnigen --env OMNIGEN_VAULT_ROOT=~/.omnigen-vault -- npx -y github:ezBuilder/omnigen-vault omnigen-mcp
```

## 🔌 从任何 AI 应用使用它 (MCP)

Omnigen 提供一个 **MCP 服务器**，以便您的 AI 可以搜索库、**内联查看图像**、浏览类别和生成新图像 — 全部**在本地、您自己的机器和您自己的配额上**。搜索也适用于**韩语/日语/中文/西班牙语**，结果带有**本地化**主题和提示返回。

**工具：** `search_images`（本地化；按类别/方向/评分过滤）· `get_image`（按 ID 或路径）· `list_categories`（本地化标签 + 计数）· `generate_image`。

将其添加到 Claude Code / Codex / Cursor / Claude Desktop：

```bash
# straight from GitHub — no npm publish needed; works as soon as the repo is public:
claude mcp add omnigen --env OMNIGEN_VAULT_ROOT=~/.omnigen-vault -- npx -y github:ezBuilder/omnigen-vault omnigen-mcp

# or from a local clone (most reliable, fully offline):
claude mcp add omnigen --env OMNIGEN_VAULT_ROOT=~/.omnigen-vault -- node /ABSOLUTE/PATH/omnigen-vault/bin/omnigen-mcp
```

…或任何 MCP 客户端的 JSON 配置块（Cursor、Claude Desktop、Antigravity）：

```json
{
  “mcpServers”: {
    “omnigen”: {
      “command”: “npx”,
      “args”: [“-y”, “github:ezBuilder/omnigen-vault”, “omnigen-mcp”],
      “env”: { “OMNIGEN_VAULT_ROOT”: “~/.omnigen-vault” }
    }
  }
}
```

发布到 npm 后，较短的 `npx -y omnigen-vault omnigen-mcp` 也可以使用。

然后问您的智能体 *”找一个雾蒙蒙的山在金色时刻”* 或 *”生成一个水彩狐狸”* — 它调用工具并**内联**获取图像。

**智能体技能** — 对于支持技能的智能体，将 `skills/omnigen/` 复制到您的技能目录（`~/.claude/skills/`、`~/.codex/skills/` 或项目 `.agents/skills/`）。

**保持最新：** `omnigen upgrade`（git pull / npx）更新到最新版本。

## 🪟 跨平台和 Windows

**CLI、MCP 服务器和网络服务器都是纯 Node** → 它们在 macOS、Linux 和 Windows 上运行。不使用 macOS 菜单栏应用，而是从 CLI 配置所有内容：

```bash
omnigen config setup          # guided settings (save folder, size, concurrency, OCR, disk limit)
omnigen config set size fhd   # or set individual keys
omnigen config show           # view saved + effective settings
```

设置持久化到 `~/.omnigen-vault.json`（使用 `$OMNIGEN_CONFIG` 覆盖路径），并应用于每个命令。在 Windows 上：安装 Node ≥22；缩略图（macOS `sips`）会被正常跳过（库回退到完整图像）；对于 OCR，请安装 Tesseract 并将 `OMNIGEN_TESSERACT` 指向 `tesseract.exe`，或运行 `--no-ocr`。本机菜单栏**应用**仅限于 macOS。

## 🖥️ 菜单栏应用 (macOS)

```bash
bash app/build.sh                       # compiles, embeds icon, code-signs
ditto app/OmnigenVault.app /Applications/OmnigenVault.app
open /Applications/OmnigenVault.app
```

一个干净的菜单栏菜单（SF Symbol 图标，没有混乱）：启动/停止切换、按字生成、构建库、打开文件夹和一个**设置**窗口（保存位置 · 并发 · 分辨率 · OCR · 磁盘上限 · 启动时启动 · 自动启动）。菜单中的实时计数和磁盘百分比。退出始终停止工作者。

## 🌐 将其公开 — 您自己的 URL（可选）

库是一个常规的本地 HTTP 服务器，所以**任何**隧道都能将其变成一个公开的 HTTPS URL — **不需要您自己的域名或账户**。启动服务器，然后选择一个隧道：

```bash
node bin/omnigen serve --public --port 8787        # read-only, hardened

# expose it with ONE of these (each prints a public URL):
cloudflared tunnel --url http://localhost:8787     # Cloudflare — free, no account (*.trycloudflare.com)
npx localtunnel --port 8787                         # localtunnel — free, no account
ngrok http 8787                                     # ngrok — free tier (sign-up)
tailscale funnel 8787                               # Tailscale — if you already use it
```

不想要**任何**公开 URL？完全跳过隧道 — 它只在 `http://localhost:8787` 上服务（加上您的局域网）。

### Cloudflare 隧道，详细信息

安装一次 — `brew install cloudflared`（macOS）· `winget install Cloudflare.cloudflared`（Windows）· 或来自 [Cloudflare 的下载](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) 的二进制文件。然后选择 **A**（即时、匿名）或 **B**（您自己的域名）：

```bash
# A) Quick & anonymous — a throwaway public URL, no login, no domain:
cloudflared tunnel --url http://localhost:8787      # → https://<random>.trycloudflare.com

# B) Your own domain — a stable URL via a NAMED tunnel (one-time interactive login):
cloudflared tunnel login                            # opens a browser; authorize your domain
cloudflared tunnel create omnigen                   # creates the tunnel + credentials
cloudflared tunnel route dns omnigen gallery.example.com
cloudflared tunnel run --url http://localhost:8787 omnigen
```

使用 **B**，`https://gallery.example.com` 会一直指向您的机器，即使其 IP 改变 — 这正是作者的实时演示 `gallery.ezbuilder.app` 运行方式。您运行您自己的；仓库中的任何内容都不会将任何人指向作者的 URL。

### 安全性

公开模式是**只读的**（评分回写是可选的），仅按 id 提供图像，具有 realpath 限制的路径验证、速率限制、请求大小上限、严格的安全标头，并支持可选的 `--token`。见 [SECURITY.md](SECURITY.md)。库 UI 是多语言的（EN/KO/JA/ZH/ES），并自动检测访问者的语言。

## 🧭 命令

| 命令 | 作用 |
|---|---|
| `generate` | 无限的、可恢复的、无文字的生成（按类别或 `--theme "word"`） |
| `query "…" --json` | 全文搜索 → 路径 + AI 使用的元数据 |
| `gallery` | 构建静态库（最新优先、搜索 + 过滤 + 灯箱） |
| `serve` | 实时多语言库 + JSON API（+ `--public` 对全球） |
| `dedupe` | 感知哈希近似重复检测 |
| `export --rating 4 --out DIR` | 复制一个精选集 + 联系表 |
| `retag` · `stats` · `doctor` · `init` | 维护和诊断 |
| `upgrade [--dry-run]` | 更新到最新版本（git pull / npx） |

运行 `node bin/omnigen` 获取完整的选项参考。

## 🏗️ 架构

```
prompt taxonomy ─▶ Codex image backend ─▶ stream PNG ─▶ OCR text check
   67 cats ×                                                  │ clean → save
   270+ styles                                                ▼
        images/<category>/<resolution>/*.png  +  thumbs/  +  index.sqlite (FTS5)
                                                                  │
                          query · gallery · serve (live, i18n) ◀──┘
```

零运行时依赖 — `node:sqlite`、`node:http`、`fetch` 和 macOS `sips`/`tesseract` 完成所有工作。

## 🧪 测试

```bash
node --test
```

## 许可证

MIT — 见 [LICENSE](../LICENSE)。
