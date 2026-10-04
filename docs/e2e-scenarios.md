# Isaac Thumbnail Studio — End-to-End Test Scenarios

This document specifies the complete catalog of Playwright End-to-End (E2E) testing scenarios for **Isaac Thumbnail Studio**, mapped directly to the domain modules and UI components described in [CONTEXT.md](../CONTEXT.md).

---

## Architecture & Test Harness Principles

1. **State Isolation**: Every test initiates from a clean `localStorage` environment ensuring that tests execute with default scene state (`Eden Run Default`) and do not leak mutations across test runs.
2. **Deterministic Canvas Readiness**: Assertions and visual snapshots await asset store preloading (signaled by `data-asset-revision > 0`) to prevent race conditions or blank canvas artifacts.
3. **Viewport Standard**: Default desktop test viewport is fixed at `1440×900` pixels on Desktop Chromium, providing full visibility of the 3-column studio layout (Asset Drawer, Stage Viewport with 16:9 artboard and docked 180×101 YouTube preview, and Context Inspector).

---

## Domain 1: Workbench Navigation & Overlay Controls

**Spec file**: `e2e/01-workbench-navigation.spec.ts`

### Scenario 1.1: Default Workbench Initialization
- **Given** a user opens the studio workbench with a clean session
- **When** the page finishes initial render and preloading
- **Then**:
  - The top header branding logo and title (`Isaac Thumbnail Studio`) are visible.
  - Active room status badge reads `Basement` with correct accent color.
  - Active hero status badge reads `Hero: Eden`.
  - Resolution readout indicates `1280 × 720 px (16:9)`.
  - The 1280×720 interactive stage canvas (`data-testid="stage-canvas"`) and 180×101 YouTube feed preview card (`data-testid="youtube-feed-preview-card"`) are mounted and rendered.

### Scenario 1.2: Drawer Tab Navigation
- **Given** the studio workbench is loaded with the default `Character` drawer active
- **When** the user clicks the `Pedestals` tab
- **Then** the Pedestal Drawer mounts with formation options, item slots, and count controls.
- **When** the user clicks the `Rooms` tab
- **Then** the Repentance+ Stage Catalog mounts with chapter categories and room thumbnails.
- **When** the user switches back to `Character`
- **Then** the Character Builder re-mounts with current character state preserved.

### Scenario 1.3: Safe-Zone & Snap Grid Overlay Toggles
- **Given** the workbench is in the default view
- **When** the user clicks the YouTube Safe-Zone button in the header
- **Then** the safe-zone overlay toggles state and updates the active styling on the button.
- **When** the user clicks the Snap Grid button in the header
- **Then** the snap grid overlay toggles state and button styling indicates active state.

---

## Domain 2: Character Builder & Eden Hair

**Spec file**: `e2e/02-character-builder.spec.ts`

### Scenario 2.1: Character & Variant Selection
- **Given** the Character Drawer is active
- **When** the user switches between `Normal` and `Tainted` character tabs
- **Then** the character grid renders the respective 17 character options.
- **When** the user selects a different character (e.g. `Isaac` or `The Lost`)
- **Then** the top header readout and character summary card update to reflect the new selection.

### Scenario 2.2: Character Pose Switching
- **Given** an active character is displayed in the drawer
- **When** the user clicks through pose options (`Front Idle`, `Happy Pickup`, `Thumbs Up`, `Shocked`, `Agony`, `Cheer`, `Crying`)
- **Then** each clicked pose radio updates its checked/active state and dispatches a pose change to the stage canvas.

### Scenario 2.3: Eden Hairstyle Customization & Randomizer
- **Given** character `Eden` is selected
- **When** the user scrolls down to the 6-column Eden Hairstyle selector
- **Then** the hair swatches are rendered.
- **When** the user clicks a specific hair swatch or clicks the `🎲 Randomize Hair` button
- **Then** the active hairstyle ID changes and updates the preview.

### Scenario 2.4: Character Scale & Reset
- **Given** the Character Drawer scale slider is at `1.0×`
- **When** the user drags or updates the scale slider to `1.8×`
- **Then** the scale readout updates to `1.8×`.
- **When** the user clicks the `Reset` scale button
- **Then** the scale restores to `1.0×`.

---

## Domain 3: Pedestal Formations & Collectibles

**Spec file**: `e2e/03-pedestal-formations.spec.ts`

### Scenario 3.1: Formation Preset Application
- **Given** the Pedestal Drawer is open
- **When** the user clicks between formation preset buttons (`Arc`, `Row`, `2×2 Grid`, `Flank`)
- **Then** the active preset button highlights and scene layout re-calculates pedestal positions.

### Scenario 3.2: Dynamic Pedestal Count Stepper
- **Given** the pedestal count is at 3
- **When** the user clicks the increment button or drags count to 6
- **Then** the slot list expands to 6 pedestal cards.
- **When** the user decreases count down to 1
- **Then** the slot list contracts to 1 slot while retaining item configuration.

### Scenario 3.3: Collectible Search & Assignment
- **Given** a pedestal slot is selected
- **When** the user clicks the item slot to open the collectible picker
- **And** types "Brimstone" into the search field and clicks the search result
- **Then** the modal closes and the slot displays `Brimstone` with Quality 4 styling.

### Scenario 3.4: Granular Pedestal Deletion & Selection Fallback
- **Given** multiple pedestals exist in the scene and slot 2 is selected
- **When** the user clicks the delete trash icon on slot 2
- **Then** slot 2 is removed, total count decrements by 1, and selection smoothly falls back to an adjacent slot without throwing runtime errors.

---

## Domain 4: Multi-Layer Typography & Camera Framing

**Spec file**: `e2e/04-typography-camera.spec.ts`

### Scenario 4.1: Typography Text & Alignment Editing
- **Given** the Inspector panel is open on the right
- **When** the user edits the headline text layer input, changes font size, and toggles alignment to `Center`
- **Then** the layer preview and canvas render reflect the new typography properties.

### Scenario 4.2: Font Family & Gradient Swatches
- **Given** an active text layer
- **When** the user changes the font dropdown (e.g. `Upheaval TT`, `Team Meat`) and clicks a color swatch (e.g. `Isaac Gold`, `Brimstone Red`)
- **Then** the layer configuration updates with the chosen gradient swatch.

### Scenario 4.3: Add & Delete Text Layers
- **Given** the typography layer list
- **When** the user clicks `+ Add Text Layer`
- **Then** a new text layer is appended and automatically selected in the inspector.
- **When** the user clicks the delete button on an auxiliary layer
- **Then** the layer is removed and selection safely reverts to the primary layer.

### Scenario 4.4: Camera Framing & Room Depth Filters
- **Given** the Camera Inspector section
- **When** the user adjusts room zoom, pan, blur, or brightness sliders
- **Then** values update in real-time.
- **When** the user clicks `Reset Camera & Filters`
- **Then** all camera framing and backdrop filter values reset to defaults.

---

## Domain 5: Stage Canvas Gestures & Gizmo Hit-Testing

**Spec file**: `e2e/05-canvas-gestures.spec.ts`

### Scenario 5.1: Stage Pointer Hit-Testing & Selection
- **Given** the 1280×720 interactive stage canvas
- **When** the user clicks on the stage coordinate region corresponding to the character stack or pedestal altar
- **Then** the Canvas Interaction Controller hit-tests the node, activates selection, and synchronizes the active drawer tab.

### Scenario 5.2: Pointer Drag-to-Translate
- **Given** a selected node on the stage canvas
- **When** the user performs pointer down, drags by `(dx, dy)`, and releases pointer
- **Then** the node position is updated in stage coordinates and saved to scene state.

### Scenario 5.3: Snap Grid Alignment
- **Given** the Snap Grid overlay is active
- **When** a node is dragged across the canvas
- **Then** its translated position snaps to the nearest 64-unit grid coordinate.

---

## Domain 6: Preset Persistence & Export Pipeline

**Spec file**: `e2e/06-export-persistence.spec.ts`

### Scenario 6.1: Custom Preset Creation & LocalStorage Persistence
- **Given** a customized scene layout
- **When** the user clicks `Save Preset`, enters `Mega Satan Kill Run`, and clicks confirm
- **Then** the preset dropdown shows `Mega Satan Kill Run` under Custom Presets.
- **When** the browser page is reloaded
- **Then** `localStorage` preserves the custom preset in the dropdown.

### Scenario 6.2: Built-in Preset Switching
- **Given** the default scene is active
- **When** the user selects `Devil Deal Showcase` from the preset dropdown
- **Then** the scene transforms to Sheol room backdrop, Devil Deal altar configuration, and Judas character.

### Scenario 6.3: Custom Preset Deletion
- **Given** a saved custom preset
- **When** the user clicks the trash icon on the custom preset entry in the dropdown
- **Then** the preset is deleted from storage and the active scene falls back to default.

### Scenario 6.4: Clean PNG Export Trigger
- **Given** any active thumbnail composition
- **When** the user clicks `Export PNG` in the top header
- **Then** offscreen rasterization occurs and the header status displays `Exported 1280×720 PNG`.

### Scenario 6.5: Clipboard Copy Trigger
- **Given** any active composition
- **When** the user clicks `Copy` or presses `Cmd+C` / `Ctrl+C` outside input fields
- **Then** the thumbnail raster is copied and status displays `Copied 1280×720 PNG to Clipboard`.

---

## Domain 7: Visual Golden Snapshots

**Spec file**: `e2e/07-visual-regression.spec.ts`

### Scenario 7.1: Golden Canvas Snapshot — Default Composition
- **Given** the studio workbench is loaded and `data-asset-revision > 0`
- **When** the stage canvas settles
- **Then** `expect(page.locator('[data-testid="stage-canvas"]')).toHaveScreenshot('eden-run-default-canvas.png')` passes with high pixel precision.

### Scenario 7.2: Golden Feed Preview Card Snapshot
- **Given** the YouTube feed preview card
- **When** the 180×101 preview canvas renders
- **Then** `expect(page.locator('[data-testid="youtube-feed-preview-card"]')).toHaveScreenshot('youtube-feed-preview-card.png')` passes cleanly.
