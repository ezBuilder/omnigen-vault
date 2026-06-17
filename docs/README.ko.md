<div align="center">

# 🖼️ Omnigen Vault

**무한하고 텍스트 없는 이미지 엔진 + 스스로 큐레이팅하는 갤러리 — 영원히 돌아가도록 설계되었습니다.**

세상의 모든 종류의 이미지를, 지금까지 만들어진 모든 예술 양식으로,
프레임 안에 **텍스트 없이** 생성합니다 — 카테고리와 해상도별로 정리되고,
썸네일이 생성되며, 전문(full-text) 색인이 만들어지고, 세상과 공유할 수 있는
세련된 다국어 갤러리에서 둘러볼 수 있습니다.

[English](../README.md) · **한국어** · [日本語](README.ja.md) · [中文](README.zh.md) · [Español](README.es.md)

`Node ≥22` · **npm 의존성 제로** · macOS 메뉴 막대 앱 · MIT

</div>

---

## ✨ 무엇이 특별한가

- **설계부터 무한합니다.** 결정론적이고 재개 가능한 프롬프트 엔진이 **실세계 60개
  카테고리** × **연구로 정리된 270여 개 예술 양식** × 조명 × 팔레트 × 구도 ×
  분위기를 교차합니다 — 재활용을 시작하기도 전에 **16억 개가 넘는** 기본 조합을
  만들어냅니다. 언제든 멈췄다가 다시 시작할 수 있으며, 절대 반복하지 않습니다.
- **지구상의 모든 양식.** 사진(아날로그 & 디지털), 고전 → 현대 회화,
  세계/민속/토착 전통, 일러스트레이션/3D/CGI, 판화 & 공예, 그리고 현대적 미감을
  아우르는 텍스트 없는 270여 개의 시각 양식 — *모든* 배치가 단조로운 연속이 아니라
  시각적으로 다채롭도록 흩뿌려집니다.
- **진정으로 텍스트 없음.** 모든 프롬프트가 텍스트를 금지하며, 각 이미지는
  **OCR로 검증됩니다**(질감 노이즈를 무시하도록 신뢰도 필터링됨). 실제 글자가 있는
  것은 자동으로 재생성되거나 격리됩니다.
- **스스로 정리하는 보관소.** `images/<category>/<resolution>/`에 저장하고
  **썸네일**을 생성하며, **FTS5를 갖춘 SQLite**에 전문 검색 + 평점 +
  지각 해시 기반 중복 제거로 모든 것을 색인합니다.
- **두 가지 갤러리.** 독립 실행형 정적 `gallery.html`, 그리고 Cloudflare Tunnel로
  세상에 공개할 수 있는 **실시간 다국어 웹 서버**(검색, 필터, 무한 스크롤, 라이트박스,
  브라우저 내 평점).
- **당신의 Mac을 멈추게 하지 않습니다.** 디스크 사용량 상한 + OS 볼륨 보호 + 여유
  공간 하한. 동시 실행, 저메모리, 즉시 취소.
- **네이티브 메뉴 막대 앱.** 시작/정지, 옵션 선택, 저장 폴더 변경, 로그인 시 실행,
  갤러리 빌드 — 모두 깔끔하고 아이콘 중심의 메뉴에서 처리합니다. 코드 서명됨.
- **AI 네이티브.** 에이전트가 완벽한 이미지를 즉시 찾아 사용할 수 있도록 기계가 읽을
  수 있는 쿼리 API를 제공합니다(아래 참조).

## 🚀 빠른 시작

```bash
git clone <your-repo-url> omnigen-vault && cd omnigen-vault
node bin/omnigen doctor          # checks auth, disk, OCR, thumbnails, sqlite
node bin/omnigen generate        # infinite, resumable generation (Ctrl-C to stop)
node bin/omnigen gallery && open "$(node bin/omnigen stats >/dev/null; echo)"  # build a gallery
```

요구 사항: **Node 22+**(내장 `node:sqlite` + `fetch` 사용 — `npm install` 불필요),
로그인된 Codex/ChatGPT 세션, OCR용 `tesseract`(`brew install tesseract`),
그리고 보관소를 위한 마운트된 외장/데이터 디스크.

## 🤖 AI를 위한 초간단 설치 & 사용

이 도구는 AI 에이전트가 구동하도록 만들어졌습니다. 의존성 제로, 클론 한 번:

```bash
git clone <your-repo-url> omnigen-vault && cd omnigen-vault   # no npm install needed
```

그러면 에이전트는 **기계가 읽을 수 있는 명령 하나**로 이미지를 찾아 사용합니다:

```bash
# returns absolute paths + metadata as JSON — pipe straight into a tool call
node bin/omnigen query "misty mountain at golden hour" --json --limit 5
```

```json
[{ "path": "/Volumes/ezBackup/omnigen-vault/images/mountains-peaks/landscape/...png",
   "category": "mountains-peaks", "style": "impressionist painting, broken color",
   "size": "1536x1024", "prompt": "…", "tags": ["…"] }]
```

또는 실시간 서버의 JSON API를 쿼리합니다:

```bash
node bin/omnigen serve --port 8787
curl 'localhost:8787/api/search?q=neon%20city&minRating=4&limit=10'
```

프로그래밍 방식(Node):

```js
import { resolveConfig, queryVault } from './src/index.js';
const hits = queryVault(resolveConfig(), { query: 'a red fox in snow', limit: 3 });
```

## 🔌 어떤 AI 앱에서든 사용하기 (MCP + Skill)

**MCP 서버** — `generate_image`, `search_images`, `get_image`를 노출하고 PNG를
**인라인으로** 반환합니다. 어떤 MCP 클라이언트(Claude Desktop, Codex, Cursor,
Antigravity, …)에든 추가하세요:

```json
{
  "mcpServers": {
    "omnigen": { "command": "node", "args": ["/ABSOLUTE/PATH/omnigen-vault/bin/omnigen-mcp"] }
  }
}
```

그런 다음 에이전트에게 *"watercolor fox 하나 생성해줘"*라고 요청하기만 하면 —
도구를 호출해 이미지를 받아옵니다. (Codex CLI: `codex mcp add omnigen -- node …/bin/omnigen-mcp`.)

**Agent Skill** — 스킬을 인식하는 에이전트라면 `skills/omnigen/`을 스킬 디렉터리
(`~/.claude/skills/`, `~/.codex/skills/`, 또는 프로젝트의 `.agents/skills/`)에
복사하세요. CLI를 구동하고 바로 사용할 수 있는 파일 경로를 돌려줍니다.

## 🪟 크로스 플랫폼 & Windows

**CLI, MCP 서버, 웹 서버는 순수 Node**입니다 → macOS, Linux, Windows에서 모두
실행됩니다. macOS 메뉴 막대 앱 대신, CLI에서 모든 것을 설정하세요:

```bash
omnigen config setup          # guided settings (save folder, size, concurrency, OCR, disk limit)
omnigen config set size fhd   # or set individual keys
omnigen config show           # view saved + effective settings
```

설정은 `~/.omnigen-vault.json`에 저장되며(`$OMNIGEN_CONFIG`로 경로 재정의 가능)
모든 명령에 적용됩니다. Windows에서는: Node ≥22를 설치하세요. 썸네일(macOS `sips`)은
자연스럽게 건너뛰어집니다(갤러리는 전체 이미지로 대체됩니다). OCR을 쓰려면
Tesseract를 설치하고 `OMNIGEN_TESSERACT`를 `tesseract.exe`로 지정하거나
`--no-ocr`로 실행하세요. 네이티브 메뉴 막대 **앱**은 macOS 전용입니다.

## 🖥️ 메뉴 막대 앱 (macOS)

```bash
bash app/build.sh                       # compiles, embeds icon, code-signs
ditto app/OmnigenVault.app /Applications/OmnigenVault.app
open /Applications/OmnigenVault.app
```

깔끔한 메뉴 막대 메뉴(SF Symbol 아이콘, 잡다함 없음): 시작/정지 토글, 단어별 생성,
최근 미리보기, 갤러리 빌드, 폴더 열기, 그리고 **설정** 창
(저장 위치 · 동시 실행 수 · 해상도 · OCR · 디스크 상한 · 로그인 시 실행 ·
자동 시작). 메뉴에 실시간 개수 + 디스크 %가 표시됩니다. 종료하면 언제나 워커가 멈춥니다.

## 🌐 세상과 공유하기 (안전하게)

```bash
node bin/omnigen serve --public --port 8787     # read-only, hardened
cloudflared tunnel --url http://localhost:8787  # public HTTPS, no open port
```

공개 모드는 **읽기 전용**이며(평점 기록 반영은 옵트인), id로만 이미지를 제공하고
realpath로 제한된 경로 검증을 거치며, 요청 속도를 제한하고, 요청 크기에 상한을 두고,
엄격한 보안 헤더를 설정하며, 선택적 `--token`을 지원합니다.
[SECURITY.md](SECURITY.md)를 참조하세요. 갤러리 UI는 다국어(EN/KO/JA/ZH/ES)이며
방문자의 언어를 자동으로 감지합니다.

## 🧭 명령어

| command | 하는 일 |
|---|---|
| `generate` | 무한하고 재개 가능한 텍스트 없는 생성(카테고리별 또는 `--theme "word"`) |
| `query "…" --json` | 전문 검색 → AI 활용을 위한 경로 + 메타데이터 |
| `gallery` / `preview [N]` | 정적 갤러리 빌드 / 최근 N개 미리보기 페이지 |
| `serve` | 실시간 다국어 갤러리 + JSON API(세상에 공개하려면 `--public`) |
| `dedupe` | 지각 해시 기반 근접 중복 탐지 |
| `export --rating 4 --out DIR` | 큐레이팅된 세트 + 컨택트 시트 복사 |
| `retag` · `stats` · `doctor` · `init` | 유지 관리 & 진단 |

전체 옵션 레퍼런스는 `node bin/omnigen`을 실행하세요.

## 🏗️ 아키텍처

```
prompt taxonomy ─▶ Codex image backend ─▶ stream PNG ─▶ OCR text check
   60 cats ×                                                  │ clean → save
   270+ styles                                                ▼
        images/<category>/<resolution>/*.png  +  thumbs/  +  index.sqlite (FTS5)
                                                                  │
                          query · gallery · serve (live, i18n) ◀──┘
```

런타임 의존성 제로 — `node:sqlite`, `node:http`, `fetch`, 그리고 macOS의
`sips`/`tesseract`가 모든 일을 처리합니다.

## 🧪 테스트

```bash
node --test
```

## 라이선스

MIT — [LICENSE](LICENSE)를 참조하세요.
