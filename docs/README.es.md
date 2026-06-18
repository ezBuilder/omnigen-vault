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

## 🤖 Para agentes de IA — leer, instalar y usar

Todo lo necesario para ir de cero a resultados, en orden. **Cero `npm install`** — el CLI, el servidor MCP y el servidor web son Node puro. La generación reutiliza tu **autenticación local de ChatGPT/Codex** (`~/.codex/auth.json`); inicia sesión una vez (CLI Codex / app ChatGPT) y `doctor` lo verifica.

**1. Requisitos previos** — instala solo lo que falta:

```bash
node --version             # need ≥ 22   → else: brew install node   (o https://nodejs.org)
brew install tesseract     # OCR text-check (opcional — o ejecuta generate con --no-ocr)
brew install cloudflared   # solo si expondrás una URL pública (opcional)
```

**2. Instalar y generar:**

```bash
git clone https://github.com/ezBuilder/omnigen-vault.git && cd omnigen-vault
node bin/omnigen doctor                 # checks auth, disk, OCR, sqlite — fix what it flags
node bin/omnigen generate               # infinite, resumable, text-free (Ctrl-C to stop)
```

**3. Busca y reutiliza una imagen — un comando legible por máquina:**

```bash
node bin/omnigen query "misty mountain at golden hour" --json --limit 5
```

```json
[{ "path": "~/.omnigen-vault/images/mountains-peaks/landscape/...png",
   "category": "mountains-peaks", "style": "impressionist painting, broken color",
   "size": "1536x1024", "prompt": "…", "tags": ["…"] }]
```

…o consulta la API JSON del servidor en vivo, o llámalo desde Node:

```bash
node bin/omnigen serve --port 8787
curl 'localhost:8787/api/search?q=neon%20city&minRating=4&limit=10'
```

```js
import { resolveConfig, queryVault } from './src/index.js';
const hits = queryVault(resolveConfig(), { query: 'a red fox in snow', limit: 3 });
```

**4. O conéctalo directamente a tu agente sobre MCP** — un comando, y tu IA busca en la bóveda y obtiene imágenes de vuelta en línea (detalles abajo):

```bash
claude mcp add omnigen --env OMNIGEN_VAULT_ROOT=~/.omnigen-vault -- npx -y github:ezBuilder/omnigen-vault omnigen-mcp
```

## 🔌 Úsalo desde cualquier app de IA (MCP)

Omnigen envía un **servidor MCP** para que tu IA busque en la bóveda, **vea imágenes en línea**, explore categorías y genere nuevas — todo **localmente, en tu propia máquina y tu propia cuota**. La búsqueda funciona en **coreano / japonés / chino / español** también, y los resultados vienen con **asunto y prompt localizados**.

**Herramientas:** `search_images` (localizada; filtra por categoría / orientación / clasificación) · `get_image` (por id o ruta) · `list_categories` (etiquetas localizadas + recuentos) · `generate_image`.

Agrégalo a Claude Code / Codex / Cursor / Claude Desktop:

```bash
# directamente desde GitHub — no necesita npm publish; funciona en cuanto el repo es público:
claude mcp add omnigen --env OMNIGEN_VAULT_ROOT=~/.omnigen-vault -- npx -y github:ezBuilder/omnigen-vault omnigen-mcp

# o desde un clon local (más confiable, completamente sin conexión):
claude mcp add omnigen --env OMNIGEN_VAULT_ROOT=~/.omnigen-vault -- node /ABSOLUTE/PATH/omnigen-vault/bin/omnigen-mcp
```

…o un bloque de configuración JSON para cualquier cliente MCP (Cursor, Claude Desktop, Antigravity):

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

Una vez publicado en npm, también funciona el más corto `npx -y omnigen-vault omnigen-mcp`.

Luego pide a tu agente *"encuentra una montaña brumosa a la hora dorada"* o *"genera un zorro acuarela"* — llama la herramienta y obtiene la imagen de vuelta **en línea**.

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

## 🌐 Hazlo público — tu propia URL (opcional)

La galería es un servidor HTTP local normal, así que **cualquier** túnel la convierte en una URL HTTPS pública — **sin necesidad de dominio o cuenta propia**. Inicia el servidor, luego elige un túnel:

```bash
node bin/omnigen serve --public --port 8787        # read-only, hardened

# expónla con UNO de estos (cada uno imprime una URL pública):
cloudflared tunnel --url http://localhost:8787     # Cloudflare — gratis, sin cuenta (*.trycloudflare.com)
npx localtunnel --port 8787                         # localtunnel — gratis, sin cuenta
ngrok http 8787                                     # ngrok — tier gratuito (requiere registro)
tailscale funnel 8787                               # Tailscale — si ya lo usas
```

¿Prefieres **sin** URL pública? Sáltate el túnel completamente — simplemente sirve en `http://localhost:8787` (más tu LAN).

### Cloudflare Tunnel, en detalle

Instala una vez — `brew install cloudflared` (macOS) · `winget install Cloudflare.cloudflared` (Windows) · o un binario desde [descargas de Cloudflare](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/). Luego elige **A** (instantáneo, anónimo) o **B** (tu propio dominio):

```bash
# A) Rápido y anónimo — una URL pública desechable, sin iniciar sesión, sin dominio:
cloudflared tunnel --url http://localhost:8787      # → https://<random>.trycloudflare.com

# B) Tu propio dominio — una URL estable vía un túnel NOMBRADO (iniciar sesión interactivo una sola vez):
cloudflared tunnel login                            # abre un navegador; autoriza tu dominio
cloudflared tunnel create omnigen                   # crea el túnel + credenciales
cloudflared tunnel route dns omnigen gallery.example.com
cloudflared tunnel run --url http://localhost:8787 omnigen
```

Con **B**, `https://gallery.example.com` sigue apuntando a tu máquina incluso cuando su IP cambia — exactamente cómo funciona la demo en vivo del autor `gallery.ezbuilder.app`. Ejecutas la tuya; nada en el repositorio dirige a nadie a la URL del autor.

### Seguridad

El modo público es **solo lectura** (la escritura de clasificaciones es opcional), sirve imágenes solo por id con validación de ruta confinada realpath, límites de velocidad, límites de tamaño de solicitud, establece encabezados de seguridad estrictos, y soporta un `--token` opcional. Ver [SECURITY.md](SECURITY.md). La interfaz de usuario de la galería es multilingüe (EN/KO/JA/ZH/ES) y detecta automáticamente el idioma del visitante.

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
