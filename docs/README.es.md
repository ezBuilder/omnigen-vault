<div align="center">

<img src="assets/icon.png" width="104" alt="Omnigen" />

# Omnigen Vault

**Un motor de imágenes infinito, sin texto + galería multilingüe autorganizada — y un MCP que tu IA puede conducir.**

Genera todo tipo de imágenes del mundo, en todos los estilos de arte jamás realizados, con
**cero texto** en el fotograma — organizadas por categoría y resolución, en miniaturas,
**indexadas completamente en texto multilingüe** (EN · KO · JA · ZH · ES), navegables en una elegante
galería web, e instantáneamente reutilizables por cualquier IA vía **MCP**.

[**🔍 Galería en vivo →**](https://gallery.ezbuilder.app) · [**MCP para IA**](#-usa-desde-cualquier-app-de-ia-mcp) · [English](../README.md) · [한국어](README.ko.md) · [日本語](README.ja.md) · [中文](README.zh.md) · **Español**

`Node ≥22` · **cero dependencias npm** · app de barra de menú de macOS · MIT

<img src="assets/hero-backdrop.png" width="760" alt="Omnigen — bóveda de imágenes de IA sin texto" />

</div>

> ### ⚠️ Backend no soportado — úsalo bajo tu propio riesgo
> Omnigen genera imágenes llamando a un **backend privado no documentado de ChatGPT/Codex** usando tus **tokens de autenticación local de ChatGPT** — esto **no es la API oficial de OpenAI**. El contrato puede cambiar o romperse sin aviso, y **el uso intenso puede poner en riesgo tu cuenta de ChatGPT** (límites de velocidad o restricciones). Tus tokens se leen en tiempo de ejecución y **nunca se almacenan** por Omnigen, pero lo usas **bajo tu propio riesgo**. Para cargas de trabajo en producción usa la [API oficial de OpenAI](https://platform.openai.com/). Recomendado para uso personal.

---

## ✨ Por qué es especial

- **Infinito por diseño.** Un motor de prompts determinista y reanudable cruza **67
  categorías del mundo real** × **270+ estilos de arte investigados** × iluminación × paleta ×
  composición × estado de ánimo — más de **1,6 mil millones** de combinaciones base antes de que siquiera
  comience a reciclarse. Detente y reanuda en cualquier momento; nunca se repite.
- **Cada estilo de la Tierra.** 270+ estilos visuales sin texto que abarcan fotografía
  (analógica y digital), pintura clásica → contemporánea, tradiciones mundiales/folclóricas/indígenas,
  ilustración/3D/CGI, grabado y artesanía, y estéticas modernas —
  dispersos para que *cada* lote sea visualmente diverso, no una carrera monótona.
- **Verdaderamente sin texto.** Cada prompt prohíbe texto, y cada imagen está **verificada por OCR**
  (filtrada por confianza para ignorar ruido de textura); cualquier cosa con letras reales es
  regenerada automáticamente o puesta en cuarentena.
- **Bóveda autorganizada.** Guarda en `images/<category>/<resolution>/`, genera
  **miniaturas**, e indexa todo en **SQLite con búsqueda de texto completo FTS5** +
  clasificaciones + deduplicación por hash perceptual.
- **Dos galerías.** Una `gallery.html` estática e independiente, y un **servidor web
  multilingüe en vivo** (búsqueda, filtro, desplazamiento infinito, caja de luz, clasificaciones en el navegador) que puedes exponer al mundo vía Cloudflare Tunnel.
- **No romperá tu Mac.** Límite de uso de disco duro + protección de volumen del SO + piso de espacio libre. Concurrente, bajo en memoria, cancelación instantánea.
- **App nativa de barra de menú.** Inicia/detén, elige opciones, cambia carpeta de guardado, lanza al iniciar sesión, construye galerías — todo desde un menú limpio basado en iconos. Firmado por código.
- **Nativo para IA.** Una API de consulta legible por máquina para que un agente encuentre y use
  la imagen perfecta al instante (ver más abajo).

<div align="center">
<img src="assets/showcase-1.png" width="384" alt="" />&nbsp;<img src="assets/showcase-2.png" width="256" alt="" />
<br><sub>Cada imagen es 100% sin texto y verificada por OCR.</sub>
</div>

## 🚀 Inicio rápido

```bash
git clone <your-repo-url> omnigen-vault && cd omnigen-vault
node bin/omnigen doctor          # checks auth, disk, OCR, thumbnails, sqlite
node bin/omnigen generate        # infinite, resumable generation (Ctrl-C to stop)
node bin/omnigen gallery && open "$(node bin/omnigen stats >/dev/null; echo)"  # build a gallery
```

Requisitos: **Node 22+** (usa `node:sqlite` integrado + `fetch` — sin `npm install`),
una sesión Codex/ChatGPT con inicio de sesión, `tesseract` para OCR (`brew install tesseract`),
y un disco externo/de datos montado para la bóveda.

## 🤖 Instalación y uso super simple para IA

Esta herramienta está construida para ser conducida por un agente de IA. Cero dependencias, un clon:

```bash
git clone <your-repo-url> omnigen-vault && cd omnigen-vault   # no npm install needed
```

Luego un agente encuentra y usa imágenes con **un comando legible por máquina**:

```bash
# returns absolute paths + metadata as JSON — pipe straight into a tool call
node bin/omnigen query "misty mountain at golden hour" --json --limit 5
```

```json
[{ "path": "~/.omnigen-vault/images/mountains-peaks/landscape/...png",
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

## 🔌 Usa desde cualquier app de IA (MCP)

Omnigen envía un **servidor MCP** para que tu IA pueda buscar en la bóveda, **ver imágenes
en línea**, examinar categorías y generar nuevas — todo **localmente, en tu propia máquina y tu propia cuota**. La búsqueda funciona en **coreano / japonés / chino /
español** también, y los resultados vuelven con **asunto y prompt localizados**.

**Herramientas:** `search_images` (localizada; filtra por categoría / orientación / clasificación) ·
`get_image` (por id o ruta) · `list_categories` (etiquetas localizadas + recuentos) ·
`generate_image`.

Agrégalo a Claude Code / Codex / Cursor / Claude Desktop:

```bash
# zero-clone via npx (works once the repo is public / published):
claude mcp add omnigen --env OMNIGEN_VAULT_ROOT=~/.omnigen-vault -- npx -y omnigen-vault omnigen-mcp

# or from a local clone:
claude mcp add omnigen --env OMNIGEN_VAULT_ROOT=~/.omnigen-vault -- node /ABSOLUTE/PATH/omnigen-vault/bin/omnigen-mcp
```

…o un bloque de configuración JSON para cualquier cliente MCP (Cursor, Claude Desktop, Antigravity):

```json
{
  "mcpServers": {
    "omnigen": {
      "command": "npx",
      "args": ["-y", "omnigen-vault", "omnigen-mcp"],
      "env": { "OMNIGEN_VAULT_ROOT": "~/.omnigen-vault" }
    }
  }
}
```

Luego pide a tu agente *"encontrar una montaña brumosa a la hora dorada"* o *"generar un zorro acuarela"* — llama la herramienta y obtiene la imagen de vuelta **en línea**.

**Agent Skill** — para agentes conscientes de habilidades, copia `skills/omnigen/` en tu directorio de habilidades (`~/.claude/skills/`, `~/.codex/skills/`, o `.agents/skills/` del proyecto).

**Mantente al día:** `omnigen upgrade` (git pull / npx) actualiza a la última versión.

## 🪟 Multiplataforma y Windows

El **CLI, servidor MCP y servidor web son Node puro** → se ejecutan en macOS, Linux,
y Windows. En lugar de la app de barra de menú de macOS, configura todo desde el CLI:

```bash
omnigen config setup          # guided settings (save folder, size, concurrency, OCR, disk limit)
omnigen config set size fhd   # or set individual keys
omnigen config show           # view saved + effective settings
```

Los ajustes persisten en `~/.omnigen-vault.json` (anula la ruta con `$OMNIGEN_CONFIG`)
y se aplican a cada comando. En Windows: instala Node ≥22; las miniaturas (macOS `sips`)
se omiten elegantemente (la galería vuelve a imágenes completas); para OCR instala
Tesseract y apunta `OMNIGEN_TESSERACT` a `tesseract.exe`, o ejecuta `--no-ocr`.
La **app** nativa de barra de menú es solo macOS.

## 🖥️ App de barra de menú (macOS)

```bash
bash app/build.sh                       # compiles, embeds icon, code-signs
ditto app/OmnigenVault.app /Applications/OmnigenVault.app
open /Applications/OmnigenVault.app
```

Un menú limpio de barra de menú (iconos de símbolo SF, sin desorden): alternancia de inicio/parada, generación
por palabra, galería de construcción, carpeta abierta, y una ventana de **Configuración**
(ubicación de guardado · concurrencia · resolución · OCR · límite de disco · lanzar al iniciar sesión ·
inicio automático). Recuento en vivo + % de disco en el menú. Salir siempre detiene el trabajador.

## 🌐 Compártelo con el mundo (seguro)

```bash
node bin/omnigen serve --public --port 8787     # read-only, hardened
cloudflared tunnel --url http://localhost:8787  # public HTTPS, no open port
```

El modo público es **solo lectura** (la escritura de clasificaciones es opcional), sirve imágenes solo por
id con validación de ruta confinada realpath, límites de velocidad, límites de tamaño de solicitud, establece
encabezados de seguridad estrictos, y soporta un `--token` opcional. Ver
[SECURITY.md](../SECURITY.md). La interfaz de usuario de la galería es multilingüe (EN/KO/JA/ZH/ES) y
detecta automáticamente el idioma del visitante.

## 🧭 Comandos

| comando | qué hace |
|---|---|
| `generate` | generación infinita, reanudable, sin texto (por categoría o `--theme "word"`) |
| `query "…" --json` | búsqueda de texto completo → rutas + metadatos para uso de IA |
| `gallery` | construir una galería estática (lo más reciente primero, búsqueda + filtro + caja de luz) |
| `serve` | galería multilingüe en vivo + API JSON (+ `--public` para el mundo) |
| `dedupe` | detección de casi duplicados por hash perceptual |
| `export --rating 4 --out DIR` | copia un conjunto curado + hoja de contacto |
| `retag` · `stats` · `doctor` · `init` | mantenimiento y diagnósticos |
| `upgrade [--dry-run]` | actualizar a la última versión (git pull / npx) |

Ejecuta `node bin/omnigen` para la referencia completa de opciones.

## 🏗️ Arquitectura

```
prompt taxonomy ─▶ Codex image backend ─▶ stream PNG ─▶ OCR text check
   67 cats ×                                                  │ clean → save
   270+ styles                                                ▼
        images/<category>/<resolution>/*.png  +  thumbs/  +  index.sqlite (FTS5)
                                                                  │
                          query · gallery · serve (live, i18n) ◀──┘
```

Cero dependencias en tiempo de ejecución — `node:sqlite`, `node:http`, `fetch`, y
`sips`/`tesseract` de macOS hacen todo el trabajo.

## 🧪 Pruebas

```bash
node --test
```

## Licencia

MIT — ver [LICENSE](../LICENSE).
