<div align="center">

<img src="assets/icon.png" width="104" alt="Omnigen" />

# Omnigen Vault

**무한한 텍스트 없는 이미지 엔진 + 자가 큐레이션 다국어 갤러리 — 그리고 AI가 구동하는 MCP입니다.**

세상의 모든 종류의 이미지를 모든 예술 스타일로 생성하되, **화면에 텍스트 없이** — 카테고리와 해상도로 정렬되고, 썸네일로 표시되며,
**다국어 전체 텍스트 색인화되고** (EN · KO · JA · ZH · ES), 세련된
웹 갤러리에서 탐색 가능하며, **MCP**를 통해 모든 AI에서 즉시 재사용할 수 있습니다.

[**🔍 라이브 갤러리 →**](https://gallery.ezbuilder.app) · [**AI용 MCP**](#-모든-ai-앱에서-사용하기-mcp) · [English](../README.md) · **한국어** · [日本語](README.ja.md) · [中文](README.zh.md) · [Español](README.es.md)

`Node ≥22` · **npm 의존성 없음** · macOS 메뉴바 앱 · MIT

<img src="assets/hero-backdrop.png" width="760" alt="Omnigen — 텍스트 없는 AI 이미지 보관소" />

</div>

> ### ⚠️ 지원되지 않는 백엔드 — 직접 사용하시기 바랍니다
> Omnigen은 **문서화되지 않은 비공식 ChatGPT/Codex 백엔드**를 호출하여 **로컬 ChatGPT 인증 토큰**을 사용하여 이미지를 생성합니다 — 이것은 **공식 OpenAI API가 아닙니다**. 계약이 예고 없이 변경되거나 중단될 수 있으며, **과도한 사용으로 ChatGPT 계정이 위험해질 수 있습니다** (요청 제한 또는 제한). 토큰은 런타임에 읽혀지며 **Omnigen에 의해 저장되지 않지만**, 이를 **직접 책임하에** 사용합니다. 프로덕션 워크로드의 경우 공식 [OpenAI API](https://platform.openai.com/)를 사용하세요. 개인 용도 권장입니다.

---

## ✨ 특별한 이유

- **설계상 무한함.** 결정론적이고 재개 가능한 프롬프트 엔진이 **67개의
  실제 카테고리** × **270+ 연구된 예술 스타일** × 조명 × 팔레트 ×
  구성 × 분위기를 넘나들며 — **16억 개** 이상의 기본 조합이 반복을 시작하기도 전입니다. 언제든 멈추고 다시 시작할 수 있으며, 절대 반복되지 않습니다.
- **지구상의 모든 스타일.** 사진학(아날로그 및 디지털), 고전 → 현대 회화, 세계/민족/토착 전통, 일러스트레이션/3D/CGI, 목판화 및 공예, 현대 미학을 아우르는 270+ 텍스트 없는 시각적 스타일 — 모든 배치가 시각적으로 다양하고 단조로운 실행이 아니도록 흩어져 있습니다.
- **진정한 텍스트 없음.** 모든 프롬프트는 텍스트를 금지하며, 각 이미지는 **OCR 검증됨**
  (질감 잡음을 무시하도록 신뢰도 필터링됨); 실제 글자가 있는 것은
  자동으로 재생성되거나 격리됩니다.
- **자가 조직화 보관소.** `images/<category>/<resolution>/`에 저장하고, **썸네일**을 생성하며, **SQLite와 FTS5** 전체 텍스트 검색 + 평점 + 지각 해시 중복 제거로 모든 것을 색인화합니다.
- **두 가지 갤러리.** 자립형 정적 `gallery.html`, 그리고 **라이브
  다국어 웹 서버** (검색, 필터, 무한 스크롤, 라이트박스, 인브라우저
  평점)을 Cloudflare 터널을 통해 세상에 노출할 수 있습니다.
- **Mac을 충돌시키지 않습니다.** 하드 디스크 사용량 상한선 + OS 볼륨 보호 + 여유 공간
  하한선. 동시, 저메모리, 즉시 취소.
- **네이티브 메뉴바 앱.** 시작/중지, 옵션 선택, 저장 폴더 변경, 로그인 시 시작, 갤러리 빌드 — 모두 깔끔하고 아이콘 중심의 메뉴에서. 코드 서명됨.
- **AI 네이티브.** 에이전트가 완벽한 이미지를 즉시 찾고 사용할 수 있도록 하는 기계 읽기 가능 쿼리 API (아래 참조).

<div align="center">
<img src="assets/showcase-1.png" width="384" alt="" />&nbsp;<img src="assets/showcase-2.png" width="256" alt="" />
<br><sub>모든 이미지는 100% 텍스트 없고 OCR 검증됨.</sub>
</div>

## 🚀 빠른 시작

```bash
git clone <your-repo-url> omnigen-vault && cd omnigen-vault
node bin/omnigen doctor          # checks auth, disk, OCR, thumbnails, sqlite
node bin/omnigen generate        # infinite, resumable generation (Ctrl-C to stop)
node bin/omnigen gallery && open "$(node bin/omnigen stats >/dev/null; echo)"  # build a gallery
```

요구 사항: **Node 22+** (내장 `node:sqlite` + `fetch` 사용 — `npm install` 없음),
로그인한 Codex/ChatGPT 세션, OCR용 `tesseract` (`brew install tesseract`),
그리고 보관소용 탑재된 외부/데이터 디스크.

## 🤖 AI 에이전트를 위해 — 읽기, 설치, 사용

영점부터 결과까지, 순서대로 모든 것. **`npm install` 없음** — CLI, MCP 서버, 웹 서버는 순수 Node. 생성은 **로컬 ChatGPT/Codex 인증** (`~/.codex/auth.json`)을 재사용합니다; 한 번 로그인하세요 (Codex CLI / ChatGPT 앱), `doctor`가 이를 검증합니다.

**1. 사전 조건** — 없는 것만 설치하세요:

```bash
node --version             # need ≥ 22   → else: brew install node   (or https://nodejs.org)
brew install tesseract     # OCR text-check (optional — or run generate with --no-ocr)
brew install cloudflared   # only if you'll expose a public URL (optional)
```

**2. 설치 및 생성:**

```bash
git clone https://github.com/ezBuilder/omnigen-vault.git && cd omnigen-vault
node bin/omnigen doctor                 # checks auth, disk, OCR, sqlite — fix what it flags
node bin/omnigen generate               # infinite, resumable, text-free (Ctrl-C to stop)
```

**3. 이미지 찾기 및 재사용 — 하나의 기계 읽기 가능 명령:**

```bash
node bin/omnigen query "misty mountain at golden hour" --json --limit 5
```

```json
[{ "path": "~/.omnigen-vault/images/mountains-peaks/landscape/...png",
   "category": "mountains-peaks", "style": "impressionist painting, broken color",
   "size": "1536x1024", "prompt": "…", "tags": ["…"] }]
```

…또는 라이브 서버의 JSON API를 쿼리합니다:

```bash
node bin/omnigen serve --port 8787
curl 'localhost:8787/api/search?q=neon%20city&minRating=4&limit=10'
```

```js
import { resolveConfig, queryVault } from './src/index.js';
const hits = queryVault(resolveConfig(), { query: 'a red fox in snow', limit: 3 });
```

**4. 또는 MCP를 통해 에이전트에 직접 연결** — 한 가지 명령, 에이전트는 보관소를 검색하고 이미지를 인라인으로 받습니다 (아래 참조):

```bash
claude mcp add omnigen --env OMNIGEN_VAULT_ROOT=~/.omnigen-vault -- npx -y github:ezBuilder/omnigen-vault omnigen-mcp
```

## 🔌 모든 AI 앱에서 사용하기 (MCP)

Omnigen은 **MCP 서버**를 제공하여 AI가 보관소를 검색하고, **이미지를 인라인으로 볼 수 있으며**, 카테고리를 탐색하고, 새 이미지를 생성할 수 있습니다 — 모두 **로컬에서, 자신의 머신과 자신의 할당량에서**. 검색은 **한국어 / 일본어 / 중국어 / 스페인어**로도 작동하며, 결과는 **현지화된** 주제 + 프롬프트로 반환됩니다.

**도구:** `search_images` (현지화됨; 카테고리 / 방향 / 평점으로 필터링) · `get_image` (id 또는 경로로) · `list_categories` (현지화된 레이블 + 개수) · `generate_image`.

Claude Code / Codex / Cursor / Claude Desktop에 추가하세요:

```bash
# GitHub에서 직접 — npm publish 필요 없음; 레포가 공개되면 바로 작동:
claude mcp add omnigen --env OMNIGEN_VAULT_ROOT=~/.omnigen-vault -- npx -y github:ezBuilder/omnigen-vault omnigen-mcp

# or from a local clone (most reliable, fully offline):
claude mcp add omnigen --env OMNIGEN_VAULT_ROOT=~/.omnigen-vault -- node /ABSOLUTE/PATH/omnigen-vault/bin/omnigen-mcp
```

…또는 모든 MCP 클라이언트(Cursor, Claude Desktop, Antigravity)용 JSON 구성 블록:

```json
{
  "mcpServers": {
    "omnigen": {
      "command": "npx",
      "args": ["-y", "github:ezBuilder/omnigen-vault", "omnigen-mcp"],
      "env": { "OMNIGEN_VAULT_ROOT": "~/.omnigen-vault" }
    }
  }
}
```

npm에 발행되면, 더 짧은 `npx -y omnigen-vault omnigen-mcp`도 작동합니다.

그러면 에이전트에 *"find a misty mountain at golden hour"* 또는 *"generate a watercolor fox"*를 요청하세요 — 도구를 호출하고 이미지를 **인라인으로** 받습니다.

**에이전트 스킬** — 스킬을 인식하는 에이전트의 경우, `skills/omnigen/`을 스킬 디렉터리(`~/.claude/skills/`, `~/.codex/skills/`, 또는 프로젝트 `.agents/skills/`)에 복사합니다.

**최신 상태 유지:** `omnigen upgrade` (git pull / npx)는 최신 버전으로 업데이트합니다.

## 🪟 크로스 플랫폼 및 Windows

**CLI, MCP 서버 및 웹 서버는 순수 Node** → macOS, Linux,
Windows에서 실행됩니다. macOS 메뉴바 앱 대신, CLI에서 모든 것을 구성합니다:

```bash
omnigen config setup          # guided settings (save folder, size, concurrency, OCR, disk limit)
omnigen config set size fhd   # or set individual keys
omnigen config show           # view saved + effective settings
```

설정은 `~/.omnigen-vault.json`에 유지되며 (경로는 `$OMNIGEN_CONFIG`로 재정의),
모든 명령에 적용됩니다. Windows에서: Node ≥22을 설치하세요; 썸네일(macOS `sips`)
은 정상적으로 건너뛰어집니다 (갤러리는 전체 이미지로 폴백됨); OCR의 경우
Tesseract를 설치하고 `OMNIGEN_TESSERACT`를 `tesseract.exe`로 가리키거나, `--no-ocr`을 실행합니다.
네이티브 메뉴바 **앱**은 macOS 전용입니다.

## 🖥️ 메뉴바 앱 (macOS)

```bash
bash app/build.sh                       # compiles, embeds icon, code-signs
ditto app/OmnigenVault.app /Applications/OmnigenVault.app
open /Applications/OmnigenVault.app
```

깔끔한 메뉴바 메뉴 (SF 심볼 아이콘, 불필요한 항목 없음): 시작/중지 토글, 단어별 생성, 갤러리 빌드, 폴더 열기, 그리고 **설정** 창
(저장 위치 · 동시성 · 해상도 · OCR · 디스크 상한선 · 로그인 시 시작 ·
자동 시작). 메뉴의 라이브 개수 + 디스크 %. 종료하면 항상 워커를 중지합니다.

## 🌐 공개해서 사용 — 당신만의 URL (선택사항)

갤러리는 일반적인 로컬 HTTP 서버이므로, **어떤** 터널이든 이를 공개 HTTPS URL로 전환합니다 — **자신의 도메인이나 계정이 필요 없습니다**. 서버를 시작한 다음 한 가지 터널을 선택하세요:

```bash
node bin/omnigen serve --public --port 8787        # read-only, hardened

# expose it with ONE of these (each prints a public URL):
cloudflared tunnel --url http://localhost:8787     # Cloudflare — free, no account (*.trycloudflare.com)
npx localtunnel --port 8787                         # localtunnel — free, no account
ngrok http 8787                                     # ngrok — free tier (sign-up)
tailscale funnel 8787                               # Tailscale — if you already use it
```

공개 URL을 **원하지 않나요**? 터널을 전혀 건너뛰세요 — `http://localhost:8787`에서 제공될 뿐입니다 (더하기 당신의 LAN).

### Cloudflare 터널, 자세히

한 번 설치하세요 — `brew install cloudflared` (macOS) · `winget install Cloudflare.cloudflared` (Windows) · 또는 [Cloudflare 다운로드](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/)의 바이너리. 그런 다음 **A** (즉시, 익명) 또는 **B** (당신의 도메인)를 선택하세요:

```bash
# A) Quick & anonymous — a throwaway public URL, no login, no domain:
cloudflared tunnel --url http://localhost:8787      # → https://<random>.trycloudflare.com

# B) Your own domain — a stable URL via a NAMED tunnel (one-time interactive login):
cloudflared tunnel login                            # opens a browser; authorize your domain
cloudflared tunnel create omnigen                   # creates the tunnel + credentials
cloudflared tunnel route dns omnigen gallery.example.com
cloudflared tunnel run --url http://localhost:8787 omnigen
```

**B**를 사용하면, `https://gallery.example.com`은 IP가 변경되어도 계속 머신을 가리킵니다 — `gallery.ezbuilder.app`의 저자의 라이브 데모가 정확히 이렇게 실행되는 방식입니다. 당신이 당신의 것을 실행합니다; 레포의 아무것도 누구도 저자의 URL로 가리키지 않습니다.

### 안전

공개 모드는 **읽기 전용** (평점 쓰기 백은 선택적), id로만 이미지를 제공하며 realpath 제한 경로 검증, 속도 제한, 요청 크기 상한선, 엄격한 보안 헤더를 설정하고, 선택적 `--token`을 지원합니다. [SECURITY.md](SECURITY.md)를 참조하세요. 갤러리 UI는 다국어 (EN/KO/JA/ZH/ES)이며 방문자의 언어를 자동 감지합니다.

## 🧭 명령어

| 명령어 | 수행 내용 |
|---|---|
| `generate` | 무한, 재개 가능, 텍스트 없는 생성 (카테고리별 또는 `--theme "word"`) |
| `query "…" --json` | 전체 텍스트 검색 → AI 사용용 경로 + 메타데이터 |
| `gallery` | 정적 갤러리 빌드 (최신순, 검색 + 필터 + 라이트박스) |
| `serve` | 라이브 다국어 갤러리 + JSON API (+ `--public` for the world) |
| `dedupe` | 지각 해시 근처 중복 감지 |
| `export --rating 4 --out DIR` | 큐레이션된 집합 + 연락처 시트 복사 |
| `retag` · `stats` · `doctor` · `init` | 유지 보수 & 진단 |
| `upgrade [--dry-run]` | 최신 버전으로 업데이트 (git pull / npx) |

전체 옵션 참조는 `node bin/omnigen`을 실행하세요.

## 🏗️ 아키텍처

```
prompt taxonomy ─▶ Codex image backend ─▶ stream PNG ─▶ OCR text check
   67 cats ×                                                  │ clean → save
   270+ styles                                                ▼
        images/<category>/<resolution>/*.png  +  thumbs/  +  index.sqlite (FTS5)
                                                                  │
                          query · gallery · serve (live, i18n) ◀──┘
```

런타임 의존성 없음 — `node:sqlite`, `node:http`, `fetch`, macOS
`sips`/`tesseract`가 모든 작업을 합니다.

## 🧪 테스트

```bash
node --test
```

## 라이선스

MIT — [LICENSE](../LICENSE)를 참조하세요.
