<div align="center">

# Isaac Thumbnail Studio

<img width="1719" height="853" alt="image" src="https://github.com/user-attachments/assets/7a066d1c-779c-4004-8c61-37a714f8671e" />

**A studio workbench for authentic *The Binding of Isaac: Repentance* YouTube thumbnails.**<br>
Compose pixel-accurate room backdrops, modular character stacks, pedestal formations, and multi-layer vector typography in seconds.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vite.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/tests-67%20passing-brightgreen?style=flat-square)](https://vitest.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

</div>

---

**Isaac Thumbnail Studio** is a focused, browser-based composition workbench created for Isaac YouTubers and content creators. Instead of manually cutting sprites, fighting layers in Photoshop, or guessing whether text will be legible on mobile, the studio provides an interactive, pixel-perfect 1280×720 canvas with direct access to pre-baked Repentance game assets, structured pedestal formations, and a live YouTube feed preview.

[Features](#features) · [Quick Start](#quick-start) · [Workbench Architecture](#workbench-architecture) · [Asset Pipeline](#asset-pipeline) · [Development](#development)

---

## Features

### Authentic Repentance Asset Catalog
- **34 Playable Characters**: Full roster coverage across 17 Normal and 17 Tainted characters with multiple poses (*Front Idle*, *★ Happy Pickup*, *Crying / Agony*) and live scaling (1.0× to 2.5×).
- **62 Eden Hairstyles**: Visual 6-column Eden hairstyle picker with a 🎲 *Randomize Hair* button for unpredictable Eden run thumbnails.
- **700+ Collectibles**: Complete searchable item catalog extracted directly from Repentance game files, complete with Quality 0–4 glow rings and optional shop price tags.
- **30+ Room Backdrops**: Authentic room quadrant backdrops across all chapters (Basement, Caves, Depths, Womb, Cathedral, Sheol, Chest, Dark Room, Void, Planetarium, and Repentance alt-paths like Downpour, Mines, Mausoleum, and Corpse).

### Structured Pedestal Formations
- **Geometric Presets**: Arrange 3 to 6 item altars instantly in balanced geometric formations (**Arc**, **Horizontal Row**, **2×2 Grid**, or **Flank**).
- **Per-Slot Customization**: Assign any collectible, cycle quality aura levels, and adjust global formation scale.
- **Direct Manipulation**: Grab, reposition, and nudge individual pedestals directly on the canvas without breaking the overall scene structure.

### Multi-Layer Vector Typography
- **Game-Accurate Fonts**: Built-in support for *Upheaval TT* and *Team Meat* pixel fonts.
- **High-Contrast Gradient Swatches**: One-click styling with Isaac-themed palettes: **Brimstone Red**, **Godhead Gold**, **Holy Blue**, and **Guppy Purple**.
- **Visual Polish**: Configurable text tilt (-45° to +45°), heavy dark outlines, drop shadows, and authentic Ink-Streak banner underlays.

### Real-World Stage & Feed Testing
- **1280×720 Canonical Stage**: Pixel-crisp artboard (`imageSmoothingEnabled = false`) with cyan interactive transform gizmos for selecting, dragging, and tilting nodes.
- **Docked 180×101 Feed Preview**: Real-time downscaled preview simulating exactly how your thumbnail appears in desktop and mobile YouTube subscription feeds.
- **YouTube Safe-Zone Guide**: Toggleable overlay indicating the bottom-right timestamp badge area to guarantee critical items and text never get obscured.

### Zero-Friction Export & Persistence
- **1-Click Clean PNG**: Export an unadorned 1280×720 PNG with all editor gizmos, safe-zone boxes, and guidelines cleanly stripped.
- **Instant Clipboard Transfer**: Copy the rendered thumbnail directly to your system clipboard (`Cmd+C` / `Ctrl+C`) to paste straight into YouTube Studio.
- **Workspace Auto-Save & Presets**: Automatic `localStorage` session state persistence plus custom template presets (*Eden Run Default*, *Devil Deal Showcase*).

---

## Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher recommended)
- `npm` (included with Node.js)

### Installation & Launch

```bash
# 1. Clone the repository
git clone https://github.com/Numulix/tboi-thumbnail-creator.git
cd tboi-thumbnail-creator

# 2. Install dependencies
npm install

# 3. Start the local development server
npm run dev
```

Open your browser to `http://localhost:5173` to launch the studio workbench.

---

## Workbench Architecture

The studio follows the single-context domain architecture documented in [CONTEXT.md](CONTEXT.md):

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       WORKBENCH HEADER                                      │
│  Preset Selector • Safe-Zone Guides • Copy to Clipboard • Export 1280×720 PNG              │
├──────────────────────────────┬──────────────────────────────────────────────┬───────────────┤
│         ASSET DRAWER         │                STAGE VIEWPORT                │   INSPECTOR   │
│                              │                                              │               │
│  [Character] [Altars] [Rooms]│         1280×720 Interactive Stage          │  Typography   │
│                              │       (Pointer Gizmos & Hit Testing)         │   • Text & font│
│  • 34 Normal/Tainted Roster  │                                              │   • Gradients │
│  • Poses & 1.0x-2.5x Scale   │                                              │   • Tilt & banner│
│  • 62 Eden Hair Grid         ├──────────────────────────────────────────────┤               │
│  • 3-6 Pedestal Formations   │              YOUTUBE FEED DOCK               │  Camera/Room  │
│  • Quality 0-4 Glow Rings    │       180×101 Scaled Feed Simulation         │   • Pan & Zoom│
│  • 30+ Chapter Backdrops     │      + Bottom-Right Safe Zone Overlay        │   • Vignette  │
└──────────────────────────────┴──────────────────────────────────────────────┴───────────────┘
```

### Core Domain Modules

- **Stage Coordinates (`1280×720`)**: The canonical coordinate space in which all character sprites, pedestals, and typography layers are resolved, transformed, and hit-tested.
- **Canvas Interaction Engine ([`src/canvas/canvasInteractionEngine.ts`](src/canvas/canvasInteractionEngine.ts))**: Translates stage-space pointer events into smooth node selection, translation, rotation, and scaling updates.
- **Stage Render Pipeline ([`src/canvas/thumbnailRenderer.ts`](src/canvas/thumbnailRenderer.ts))**: Multi-pass HTML5 Canvas rasterizer executing room backdrop, pedestal altars, character stack, vector typography, and editor overlay passes.
- **Export Pipeline ([`src/canvas/exportPipeline.ts`](src/canvas/exportPipeline.ts))**: Offscreen rasterizer generating clean 1280×720 PNG blobs for file download and clipboard transfer.
- **Scene Mutation Engine ([`src/domain/sceneMutations.ts`](src/domain/sceneMutations.ts))**: Immutable scene state transitions and formation geometry layout calculations.

---

## Asset Pipeline

The repository includes pre-baked sprite atlases and catalogs located in `public/assets/`. If you are developing or wish to re-bake assets from an unpacked copy of *The Binding of Isaac: Repentance*, helper scripts are provided in `scripts/`:

<details>
<summary><strong>Baking Assets from Unpacked Game Resources</strong></summary>

1. Place or symlink your unpacked game assets into `raw-assets/` according to [`raw-assets/README.md`](raw-assets/README.md):
   - `raw-assets/gfx/backdrop/` — Room quadrant sheets
   - `raw-assets/gfx/grid/` — Altar and door sheets (`grid_altar.png`, etc.)
   - `raw-assets/gfx/characters/costumes/` — Character sheets and Eden hairstyles
   - `raw-assets/gfx/items/collectibles/` — Collectible sprites
   - `raw-assets/items.xml` & `items_metadata.xml` — Item metadata

2. Run the baking scripts (uses zero external dependencies, leveraging Node.js built-ins):
   ```bash
   # Bake room backdrop sheets into public/assets/rooms/
   node scripts/bake-rooms.mjs

   # Bake collectible sprites and metadata into public/assets/collectibles/
   node scripts/bake-collectibles.mjs

   # Bake character body/head and Eden hair atlases into public/assets/characters/
   node scripts/bake-characters.mjs
   ```

</details>

---

## Development

### Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Starts the Vite local development server with hot-reload |
| `npm test` | Runs the full Vitest suite (16 test suites, 67 tests) |
| `npm run test:watch` | Runs Vitest in interactive watch mode |
| `npm run typecheck` | Type-checks all TypeScript files without emitting code (`tsc --noEmit`) |
| `npm run build` | Compiles TypeScript and creates optimized production assets in `dist/` |
| `npm run preview` | Locally serves the production build from `dist/` |

---

## License & Disclaimer

This project is an open-source, non-profit community tool released under the [MIT License](LICENSE). It is not affiliated with, endorsed by, or monetized in any way.

All *The Binding of Isaac: Repentance* game assets, sprites, characters, logos, and fonts remain the intellectual property of Edmund McMillen and Nicalis, Inc. This workbench is intended strictly for personal, non-commercial use by content creators and community fans to compose video thumbnails and fan art.
