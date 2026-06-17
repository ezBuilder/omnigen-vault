<div align="center">

# 🖼️ Omnigen Vault

**無限・テキストフリーの画像エンジン + 自動キュレーション型ギャラリー — 永続稼働を前提に設計。**

世界のあらゆる種類の画像を、これまで生み出されたあらゆる芸術スタイルで、フレーム内に
**テキストを一切含めず**生成。カテゴリと解像度で整理し、サムネイル化、全文インデックス化して、
世界に共有できる洗練された多言語ギャラリーで閲覧できます。

[English](../README.md) · [한국어](README.ko.md) · **日本語** · [中文](README.zh.md) · [Español](README.es.md)

`Node ≥22` · **npm 依存ゼロ** · macOS メニューバーアプリ · MIT

</div>

---

## ✨ 何が特別なのか

- **設計レベルで無限。** 決定論的かつ再開可能なプロンプトエンジンが、**60 の実世界カテゴリ**
  × **270 以上の徹底調査された芸術スタイル** × ライティング × パレット ×
  構図 × ムードを掛け合わせ、循環に入る前の段階で **16 億** を超える基本組み合わせを生み出します。
  いつでも停止・再開でき、決して繰り返しません。
- **地球上のあらゆるスタイル。** 写真（アナログ & デジタル）、古典 → 現代の絵画、世界各地・
  民俗・先住民の伝統、イラストレーション / 3D / CGI、版画 & クラフト、現代的美学にわたる
  270 以上のテキストフリーのビジュアルスタイルを、*あらゆる*バッチが単調な連続ではなく
  視覚的に多様になるよう散りばめます。
- **真にテキストフリー。** すべてのプロンプトがテキストを禁止し、各画像は **OCR で検証**
  （テクスチャノイズを無視する信頼度フィルタ付き）。実際の文字が含まれるものは
  自動的に再生成、または隔離されます。
- **自己整理型のヴォルト。** `images/<category>/<resolution>/` に保存し、**サムネイル**を
  生成。**FTS5 を備えた SQLite** ですべてを全文検索 + 評価 + 知覚ハッシュによる重複排除で
  インデックス化します。
- **2 つのギャラリー。** 自己完結型の静的な `gallery.html` と、**ライブの多言語 Web サーバー**
  （検索、フィルタ、無限スクロール、ライトボックス、ブラウザ内評価）。Cloudflare Tunnel
  経由で世界に公開できます。
- **Mac をクラッシュさせない。** ディスク使用量の上限 + OS ボリュームガード + 空き容量の
  下限。並行処理・低メモリ・即時キャンセル対応。
- **ネイティブメニューバーアプリ。** 開始 / 停止、オプション選択、保存フォルダの変更、
  ログイン時起動、ギャラリー構築 — すべてをクリーンでアイコン主導のメニューから。
  コード署名済み。
- **AI ネイティブ。** 機械可読のクエリ API により、エージェントが完璧な画像を即座に
  見つけて利用できます（下記参照）。

## 🚀 クイックスタート

```bash
git clone <your-repo-url> omnigen-vault && cd omnigen-vault
node bin/omnigen doctor          # checks auth, disk, OCR, thumbnails, sqlite
node bin/omnigen generate        # infinite, resumable generation (Ctrl-C to stop)
node bin/omnigen gallery && open "$(node bin/omnigen stats >/dev/null; echo)"  # build a gallery
```

必要要件: **Node 22+**（組み込みの `node:sqlite` + `fetch` を使用 — `npm install` 不要）、
ログイン済みの Codex/ChatGPT セッション、OCR 用の `tesseract`（`brew install tesseract`）、
そしてヴォルト用にマウントされた外部 / データディスク。

## 🤖 AI による超シンプルなインストールと利用

このツールは AI エージェントによる操作を前提に作られています。依存ゼロ、クローン 1 回:

```bash
git clone <your-repo-url> omnigen-vault && cd omnigen-vault   # no npm install needed
```

あとはエージェントが **1 つの機械可読コマンド**で画像を見つけて利用します:

```bash
# returns absolute paths + metadata as JSON — pipe straight into a tool call
node bin/omnigen query "misty mountain at golden hour" --json --limit 5
```

```json
[{ "path": "/Volumes/ezBackup/omnigen-vault/images/mountains-peaks/landscape/...png",
   "category": "mountains-peaks", "style": "impressionist painting, broken color",
   "size": "1536x1024", "prompt": "…", "tags": ["…"] }]
```

あるいはライブサーバーの JSON API にクエリを送ることもできます:

```bash
node bin/omnigen serve --port 8787
curl 'localhost:8787/api/search?q=neon%20city&minRating=4&limit=10'
```

プログラムから（Node）:

```js
import { resolveConfig, queryVault } from './src/index.js';
const hits = queryVault(resolveConfig(), { query: 'a red fox in snow', limit: 3 });
```

## 🖥️ メニューバーアプリ（macOS）

```bash
bash app/build.sh                       # compiles, embeds icon, code-signs
ditto app/OmnigenVault.app /Applications/OmnigenVault.app
open /Applications/OmnigenVault.app
```

クリーンなメニューバーメニュー（SF Symbol アイコン、雑然としない）: 開始 / 停止トグル、
ワード指定の生成、最近のプレビュー、ギャラリー構築、フォルダを開く、そして **設定** ウィンドウ
（保存場所 · 並行数 · 解像度 · OCR · ディスク上限 · ログイン時起動 ·
自動開始）。メニューにはライブの件数 + ディスク使用率を表示。終了時には常にワーカーを停止します。

## 🌐 世界に共有する（安全に）

```bash
node bin/omnigen serve --public --port 8787     # read-only, hardened
cloudflared tunnel --url http://localhost:8787  # public HTTPS, no open port
```

パブリックモードは **読み取り専用**（評価の書き戻しはオプトイン）で、画像は id 経由かつ
realpath で限定したパス検証でのみ配信。レート制限、リクエストサイズの上限、厳格な
セキュリティヘッダーを設定し、オプションの `--token` にも対応します。
[SECURITY.md](../SECURITY.md) を参照してください。ギャラリー UI は多言語対応（EN/KO/JA/ZH/ES）で、
訪問者の言語を自動検出します。

## 🧭 コマンド

| command | what it does |
|---|---|
| `generate` | 無限・再開可能・テキストフリーの生成（カテゴリ別または `--theme "word"`） |
| `query "…" --json` | 全文検索 → AI 利用向けのパス + メタデータ |
| `gallery` / `preview [N]` | 静的ギャラリーを構築 / 直近 N 件のプレビューページ |
| `serve` | ライブの多言語ギャラリー + JSON API（世界に公開する `--public` 付き） |
| `dedupe` | 知覚ハッシュによる準重複の検出 |
| `export --rating 4 --out DIR` | キュレーションしたセット + コンタクトシートをコピー |
| `retag` · `stats` · `doctor` · `init` | メンテナンス & 診断 |

オプションの完全なリファレンスは `node bin/omnigen` を実行してください。

## 🏗️ アーキテクチャ

```
prompt taxonomy ─▶ Codex image backend ─▶ stream PNG ─▶ OCR text check
   60 cats ×                                                  │ clean → save
   270+ styles                                                ▼
        images/<category>/<resolution>/*.png  +  thumbs/  +  index.sqlite (FTS5)
                                                                  │
                          query · gallery · serve (live, i18n) ◀──┘
```

ランタイム依存ゼロ — `node:sqlite`、`node:http`、`fetch`、そして macOS の
`sips`/`tesseract` がすべての処理を担います。

## 🧪 テスト

```bash
node --test
```

## ライセンス

MIT — [LICENSE](../LICENSE) を参照してください。
