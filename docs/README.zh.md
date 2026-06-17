<div align="center">

# 🖼️ Omnigen Vault

**一个无限的、无文字图像引擎 + 自我策展画廊 —— 为永久运行而生。**

生成世界上每一种图像，涵盖有史以来的每一种艺术风格，画面中
**零文字** —— 按类别与分辨率组织，自动生成缩略图、
建立全文索引，并可在一个精致的多语言画廊中浏览，随时与全世界分享。

[English](../README.md) · [한국어](README.ko.md) · [日本語](README.ja.md) · **中文** · [Español](README.es.md)

`Node ≥22` · **零 npm 依赖** · macOS 菜单栏应用 · MIT

</div>

---

## ✨ 它为何与众不同

- **天生无限。** 一个确定性、可续跑的提示词引擎，将 **60
  个真实世界类别** × **270+ 经过考据的艺术风格** × 光照 × 配色 ×
  构图 × 氛围交叉组合 —— 在开始循环复用之前已超过 **16 亿** 种基础组合。
  随时停止与续跑；它永不重复。
- **囊括地球上的每一种风格。** 270+ 种无文字视觉风格，横跨摄影
  （胶片与数码）、古典到当代绘画、世界/民俗/原住民
  传统、插画/3D/CGI、版画与工艺，以及现代美学 ——
  打散分布，让 *每一* 批次都视觉多样，而非单调乏味的连发。
- **真正无文字。** 每条提示词都禁止文字，并且每张图像都经过 **OCR 校验**
  （按置信度过滤以忽略纹理噪点）；任何带有真实字符的图像都会被
  自动重新生成或隔离。
- **自我组织的库。** 保存到 `images/<category>/<resolution>/`，生成
  **缩略图**，并将一切索引进 **带 FTS5 的 SQLite** 全文搜索 +
  评分 + 感知哈希去重。
- **两个画廊。** 一个自包含的静态 `gallery.html`，以及一个 **实时
  多语言 Web 服务器**（搜索、筛选、无限滚动、灯箱、浏览器内
  评分），你可以通过 Cloudflare Tunnel 将其暴露给全世界。
- **不会让你的 Mac 崩溃。** 硬性磁盘用量上限 + 系统卷保护 + 剩余空间
  下限。并发、低内存、可即时取消。
- **原生菜单栏应用。** 启动/停止、选择选项、更改保存文件夹、登录时启动、
  构建画廊 —— 全部通过一个简洁、图标驱动的菜单完成。已代码签名。
- **AI 原生。** 一个机器可读的查询 API，让智能体能够即刻找到并使用
  最合适的图像（见下文）。

## 🚀 快速开始

```bash
git clone <your-repo-url> omnigen-vault && cd omnigen-vault
node bin/omnigen doctor          # checks auth, disk, OCR, thumbnails, sqlite
node bin/omnigen generate        # infinite, resumable generation (Ctrl-C to stop)
node bin/omnigen gallery && open "$(node bin/omnigen stats >/dev/null; echo)"  # build a gallery
```

环境要求：**Node 22+**（使用内置的 `node:sqlite` + `fetch` —— 无需 `npm install`）、
一个已登录的 Codex/ChatGPT 会话、用于 OCR 的 `tesseract`（`brew install tesseract`），
以及一块已挂载的外置/数据磁盘用作库存储。

## 🤖 AI 超简易安装与使用

本工具专为由 AI 智能体驱动而打造。零依赖，一次克隆：

```bash
git clone <your-repo-url> omnigen-vault && cd omnigen-vault   # no npm install needed
```

随后，智能体只需 **一条机器可读命令** 即可查找并使用图像：

```bash
# returns absolute paths + metadata as JSON — pipe straight into a tool call
node bin/omnigen query "misty mountain at golden hour" --json --limit 5
```

```json
[{ "path": "/Volumes/ezBackup/omnigen-vault/images/mountains-peaks/landscape/...png",
   "category": "mountains-peaks", "style": "impressionist painting, broken color",
   "size": "1536x1024", "prompt": "…", "tags": ["…"] }]
```

或查询实时服务器的 JSON API：

```bash
node bin/omnigen serve --port 8787
curl 'localhost:8787/api/search?q=neon%20city&minRating=4&limit=10'
```

以编程方式（Node）：

```js
import { resolveConfig, queryVault } from './src/index.js';
const hits = queryVault(resolveConfig(), { query: 'a red fox in snow', limit: 3 });
```

## 🖥️ 菜单栏应用（macOS）

```bash
bash app/build.sh                       # compiles, embeds icon, code-signs
ditto app/OmnigenVault.app /Applications/OmnigenVault.app
open /Applications/OmnigenVault.app
```

一个简洁的菜单栏菜单（SF Symbol 图标，毫不杂乱）：启动/停止开关、按
单词生成、最近预览、构建画廊、打开文件夹，以及一个 **设置** 窗口
（保存位置 · 并发数 · 分辨率 · OCR · 磁盘上限 · 登录时启动 ·
自动启动）。菜单中实时显示数量 + 磁盘占用百分比。退出时始终会停止工作进程。

## 🌐 安全地与全世界分享

```bash
node bin/omnigen serve --public --port 8787     # read-only, hardened
cloudflared tunnel --url http://localhost:8787  # public HTTPS, no open port
```

公开模式为 **只读**（评分回写需主动开启），仅按 id 提供图像，
并带有 realpath 限定的路径校验、限流、请求大小上限、设置
严格的安全响应头，并支持可选的 `--token`。详见
[SECURITY.md](../SECURITY.md)。画廊 UI 支持多语言（EN/KO/JA/ZH/ES），
并自动检测访客的语言。

## 🧭 命令

| command | what it does |
|---|---|
| `generate` | 无限、可续跑、无文字的生成（按类别或 `--theme "word"`） |
| `query "…" --json` | 全文搜索 → 供 AI 使用的路径 + 元数据 |
| `gallery` / `preview [N]` | 构建静态画廊 / 最近 N 张的预览页 |
| `serve` | 实时多语言画廊 + JSON API（加 `--public` 面向全世界） |
| `dedupe` | 感知哈希近似重复检测 |
| `export --rating 4 --out DIR` | 复制一组精选图像 + 联系表 |
| `retag` · `stats` · `doctor` · `init` | 维护与诊断 |

运行 `node bin/omnigen` 查看完整选项参考。

## 🏗️ 架构

```
prompt taxonomy ─▶ Codex image backend ─▶ stream PNG ─▶ OCR text check
   60 cats ×                                                  │ clean → save
   270+ styles                                                ▼
        images/<category>/<resolution>/*.png  +  thumbs/  +  index.sqlite (FTS5)
                                                                  │
                          query · gallery · serve (live, i18n) ◀──┘
```

零运行时依赖 —— `node:sqlite`、`node:http`、`fetch`，以及 macOS
`sips`/`tesseract` 完成全部工作。

## 🧪 测试

```bash
node --test
```

## 许可证

MIT —— 见 [LICENSE](../LICENSE)。
