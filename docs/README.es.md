<div align="center">

# 🖼️ Omnigen Vault

**Un motor de imágenes infinito y sin texto + una galería que se cura a sí misma, construido para funcionar para siempre.**

Genera todo tipo de imagen del mundo, en todos los estilos artísticos jamás creados, con
**cero texto** en el encuadre — organizadas por categoría y resolución, con miniaturas,
indexadas por texto completo y explorables en una elegante galería multilingüe que puedes compartir
con el mundo.

[English](../README.md) · [한국어](README.ko.md) · [日本語](README.ja.md) · [中文](README.zh.md) · **Español**

`Node ≥22` · **cero dependencias de npm** · app de barra de menús para macOS · MIT

</div>

---

## ✨ Por qué es especial

- **Infinito por diseño.** Un motor de prompts determinista y reanudable combina **60
  categorías del mundo real** × **270+ estilos artísticos investigados** × iluminación × paleta ×
  composición × ambiente — más de **1.600 millones** de combinaciones base antes siquiera
  de empezar a reciclar. Detente y reanuda cuando quieras; nunca se repite.
- **Todos los estilos de la Tierra.** Más de 270 estilos visuales sin texto que abarcan la fotografía
  (analógica y digital), la pintura clásica → contemporánea, las tradiciones del mundo/folclóricas/indígenas,
  la ilustración/3D/CGI, el grabado y la artesanía, y las estéticas modernas —
  dispersos para que *cada* lote sea visualmente diverso, no una tirada monótona.
- **Realmente sin texto.** Cada prompt prohíbe el texto, y cada imagen se **verifica con OCR**
  (filtrado por confianza para ignorar el ruido de textura); cualquier cosa con letras reales se
  regenera automáticamente o se pone en cuarentena.
- **Bóveda que se organiza sola.** Guarda en `images/<category>/<resolution>/`, genera
  **miniaturas** e indexa todo en **SQLite con búsqueda de texto completo FTS5** +
  valoraciones + deduplicación por hash perceptual.
- **Dos galerías.** Una `gallery.html` estática y autónoma, y un **servidor web
  multilingüe en vivo** (búsqueda, filtros, scroll infinito, lightbox, valoraciones en el navegador)
  que puedes exponer al mundo mediante Cloudflare Tunnel.
- **No bloqueará tu Mac.** Límite estricto de uso de disco + protección del volumen del SO + umbral mínimo
  de espacio libre. Concurrente, de baja memoria, con cancelación instantánea.
- **App nativa de barra de menús.** Iniciar/detener, elegir opciones, cambiar la carpeta de guardado, abrir al
  iniciar sesión, construir galerías — todo desde un menú limpio y basado en iconos. Firmada digitalmente.
- **Nativa para IA.** Una API de consulta legible por máquina para que un agente pueda encontrar y usar la
  imagen perfecta al instante (ver más abajo).

## 🚀 Inicio rápido

```bash
git clone <your-repo-url> omnigen-vault && cd omnigen-vault
node bin/omnigen doctor          # checks auth, disk, OCR, thumbnails, sqlite
node bin/omnigen generate        # infinite, resumable generation (Ctrl-C to stop)
node bin/omnigen gallery && open "$(node bin/omnigen stats >/dev/null; echo)"  # build a gallery
```

Requisitos: **Node 22+** (usa los módulos integrados `node:sqlite` + `fetch` — sin `npm install`),
una sesión de Codex/ChatGPT con sesión iniciada, `tesseract` para OCR (`brew install tesseract`),
y un disco externo/de datos montado para la bóveda.

## 🤖 Instalación y uso súper sencillos para IA

Esta herramienta está hecha para ser manejada por un agente de IA. Cero dependencias, un solo clon:

```bash
git clone <your-repo-url> omnigen-vault && cd omnigen-vault   # no npm install needed
```

Luego un agente encuentra y usa imágenes con **un solo comando legible por máquina**:

```bash
# returns absolute paths + metadata as JSON — pipe straight into a tool call
node bin/omnigen query "misty mountain at golden hour" --json --limit 5
```

```json
[{ "path": "/Volumes/ezBackup/omnigen-vault/images/mountains-peaks/landscape/...png",
   "category": "mountains-peaks", "style": "impressionist painting, broken color",
   "size": "1536x1024", "prompt": "…", "tags": ["…"] }]
```

O consulta la API JSON del servidor en vivo:

```bash
node bin/omnigen serve --port 8787
curl 'localhost:8787/api/search?q=neon%20city&minRating=4&limit=10'
```

Programáticamente (Node):

```js
import { resolveConfig, queryVault } from './src/index.js';
const hits = queryVault(resolveConfig(), { query: 'a red fox in snow', limit: 3 });
```

## 🔌 Úsalo desde cualquier app de IA (MCP + Skill)

**Servidor MCP** — expone `generate_image`, `search_images`, `get_image` y
devuelve el PNG **en línea**. Añádelo a cualquier cliente MCP (Claude Desktop, Codex, Cursor,
Antigravity, …):

```json
{
  "mcpServers": {
    "omnigen": { "command": "node", "args": ["/ABSOLUTE/PATH/omnigen-vault/bin/omnigen-mcp"] }
  }
}
```

Luego basta con pedirle a tu agente *"generate a watercolor fox"* — llama a la herramienta y
recupera la imagen. (Codex CLI: `codex mcp add omnigen -- node …/bin/omnigen-mcp`.)

**Agent Skill** — para agentes compatibles con skills, copia `skills/omnigen/` en tu directorio
de skills (`~/.claude/skills/`, `~/.codex/skills/`, o el `.agents/skills/` del proyecto). Maneja
la CLI y te devuelve rutas de archivo listas para usar.

## 🪟 Multiplataforma y Windows

La **CLI, el servidor MCP y el servidor web son Node puro** → se ejecutan en macOS, Linux
y Windows. En lugar de la app de barra de menús de macOS, configura todo desde la CLI:

```bash
omnigen config setup          # guided settings (save folder, size, concurrency, OCR, disk limit)
omnigen config set size fhd   # or set individual keys
omnigen config show           # view saved + effective settings
```

Los ajustes persisten en `~/.omnigen-vault.json` (sobrescribe la ruta con `$OMNIGEN_CONFIG`)
y se aplican a cada comando. En Windows: instala Node ≥22; las miniaturas (`sips` de macOS)
se omiten de forma elegante (la galería recurre a las imágenes completas); para OCR instala
Tesseract y apunta `OMNIGEN_TESSERACT` a `tesseract.exe`, o ejecuta `--no-ocr`.
La **app** nativa de barra de menús es solo para macOS.

## 🖥️ App de barra de menús (macOS)

```bash
bash app/build.sh                       # compiles, embeds icon, code-signs
ditto app/OmnigenVault.app /Applications/OmnigenVault.app
open /Applications/OmnigenVault.app
```

Un menú de barra de menús limpio (iconos SF Symbol, sin desorden): conmutador de iniciar/detener, generar
por palabra, vista previa reciente, construir galería, abrir carpeta, y una ventana de **Ajustes**
(ubicación de guardado · concurrencia · resolución · OCR · límite de disco · abrir al iniciar sesión ·
inicio automático). Recuento en vivo + % de disco en el menú. Al salir siempre se detiene el worker.

## 🌐 Compártelo con el mundo (de forma segura)

```bash
node bin/omnigen serve --public --port 8787     # read-only, hardened
cloudflared tunnel --url http://localhost:8787  # public HTTPS, no open port
```

El modo público es de **solo lectura** (la escritura de valoraciones es opcional), sirve imágenes únicamente por
id con validación de rutas confinada por realpath, limita la tasa de peticiones, acota el tamaño de las solicitudes, establece
cabeceras de seguridad estrictas y admite un `--token` opcional. Consulta
[SECURITY.md](../SECURITY.md). La interfaz de la galería es multilingüe (EN/KO/JA/ZH/ES) y
detecta automáticamente el idioma del visitante.

## 🧭 Comandos

| comando | qué hace |
|---|---|
| `generate` | generación infinita, reanudable y sin texto (por categoría o `--theme "word"`) |
| `query "…" --json` | búsqueda de texto completo → rutas + metadatos para uso por IA |
| `gallery` / `preview [N]` | construir una galería estática / página de vista previa de las N recientes |
| `serve` | galería multilingüe en vivo + API JSON (+ `--public` para el mundo) |
| `dedupe` | detección de casi-duplicados por hash perceptual |
| `export --rating 4 --out DIR` | copiar un conjunto curado + hoja de contactos |
| `retag` · `stats` · `doctor` · `init` | mantenimiento y diagnóstico |

Ejecuta `node bin/omnigen` para la referencia completa de opciones.

## 🏗️ Arquitectura

```
prompt taxonomy ─▶ Codex image backend ─▶ stream PNG ─▶ OCR text check
   60 cats ×                                                  │ clean → save
   270+ styles                                                ▼
        images/<category>/<resolution>/*.png  +  thumbs/  +  index.sqlite (FTS5)
                                                                  │
                          query · gallery · serve (live, i18n) ◀──┘
```

Cero dependencias en tiempo de ejecución — `node:sqlite`, `node:http`, `fetch`, y las herramientas de macOS
`sips`/`tesseract` hacen todo el trabajo.

## 🧪 Pruebas

```bash
node --test
```

## Licencia

MIT — consulta [LICENSE](../LICENSE).
