import { describe, expect, it, vi } from 'vitest';
import {
  createDefaultSceneState,
  resolveSceneLayout,
  toggleEditorOverlay,
} from '../domain/sceneDocument';
import {
  copyCanvasToClipboard,
  exportCanvasToPngBlob,
  renderThumbnail,
} from './thumbnailRenderer';

interface MockCtxWithOps extends CanvasRenderingContext2D {
  __ops: Array<{
    type: string;
    args: unknown[];
    smoothing: boolean;
    filter: string;
  }>;
}

describe('thumbnailRenderer', () => {
  it('renders room backdrop with nearest-neighbor scaling (imageSmoothingEnabled = false) and excludes editor overlays when includeEditorOverlays is false', () => {
    const baseScene = toggleEditorOverlay(createDefaultSceneState(), 'snapGrid'); // both safeZone and snapGrid ON
    const resolvedNodes = resolveSceneLayout(baseScene);

    const stageCanvas = document.createElement('canvas');
    stageCanvas.width = 1280;
    stageCanvas.height = 720;
    const stageCtx = stageCanvas.getContext('2d') as MockCtxWithOps;

    renderThumbnail(stageCtx, baseScene, resolvedNodes, new Map(), {
      includeEditorOverlays: true,
    });

    const stageTexts = stageCtx.__ops
      .filter((op) => op.type === 'fillText')
      .map((op) => String(op.args[0]));
    expect(stageTexts).toContain('19:42 YT SAFE ZONE');

    // Verify nearest-neighbor pixel scaling was enforced during room backdrop & sprite drawing
    const pixelOps = stageCtx.__ops.filter(
      (op) => op.type === 'drawImage' || op.type === 'fillRect'
    );
    expect(pixelOps.some((op) => op.smoothing === false)).toBe(true);

    // Now render preview/export pass with includeEditorOverlays: false
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = 1280;
    exportCanvas.height = 720;
    const exportCtx = exportCanvas.getContext('2d') as MockCtxWithOps;

    renderThumbnail(exportCtx, baseScene, resolvedNodes, new Map(), {
      includeEditorOverlays: false,
    });

    const exportTexts = exportCtx.__ops
      .filter((op) => op.type === 'fillText')
      .map((op) => String(op.args[0]));
    expect(exportTexts).not.toContain('19:42 YT SAFE ZONE');
    expect(exportTexts).toContain('GOD TIER EDEN START?!');
  });

  it('exports a 1280x720 PNG blob (<2MB) and copies PNG blob to system clipboard', async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;

    const blob = await exportCanvasToPngBlob(canvas);
    expect(blob.type).toBe('image/png');
    expect(blob.size).toBeGreaterThan(0);
    expect(blob.size).toBeLessThan(2 * 1024 * 1024);

    const writeSpy = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { write: writeSpy },
      configurable: true,
    });
    if (typeof globalThis.ClipboardItem === 'undefined') {
      globalThis.ClipboardItem = class MockClipboardItem {
        items: Record<string, Blob>;
        constructor(items: Record<string, Blob>) {
          this.items = items;
        }
      } as unknown as typeof ClipboardItem;
    }

    await copyCanvasToClipboard(canvas);
    expect(writeSpy).toHaveBeenCalledTimes(1);
  });

  it('draws authentic room backdrop, character pose, Eden hairstyle, pedestal altar, and collectible atlas frames when loaded in AssetBitmapCache', () => {
    const scene = createDefaultSceneState();
    const resolvedNodes = resolveSceneLayout(scene);

    const cache = new Map<string, CanvasImageSource>();
    const mockSurface = document.createElement('canvas');
    cache.set('/assets/rooms/burning-basement.png', mockSurface);
    cache.set('/assets/collectibles/collectibles-atlas.png', mockSurface);
    cache.set('/assets/altars/levelitem_001_itemaltar.png', mockSurface);
    cache.set('/assets/characters/characters-atlas.png', mockSurface);
    cache.set('/assets/characters/eden-hairs-atlas.png', mockSurface);

    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d') as MockCtxWithOps;

    renderThumbnail(ctx, scene, resolvedNodes, cache, {
      includeEditorOverlays: false,
    });

    const drawImageOps = ctx.__ops.filter((op) => op.type === 'drawImage');
    // 1 room backdrop + (1 character body + 1 character head + 1 Eden hair) + 4 pedestals * (1 shadow + 1 altar + 1 collectible) = 16 drawImage calls
    expect(drawImageOps.length).toBeGreaterThanOrEqual(14);
    for (const op of drawImageOps) {
      expect(op.smoothing).toBe(false);
    }
  });

  it('renders character via composeCharacterStack with pose-aligned Eden hair and omits hair drawImage when a non-Eden character is selected', () => {
    const edenIdle = {
      ...createDefaultSceneState(),
      character: {
        id: 'eden',
        name: 'Eden',
        pose: 'idle' as const,
        edenHairId: 12,
        scale: 1.85,
        x: 280,
        y: 505,
      },
      pedestals: [],
    };
    const edenPickup = {
      ...edenIdle,
      character: { ...edenIdle.character, pose: 'pickup' as const },
    };
    const isaacPickup = {
      ...edenIdle,
      character: {
        ...edenIdle.character,
        id: 'isaac',
        name: 'Isaac',
        pose: 'pickup' as const,
        edenHairId: undefined,
      },
    };

    const cache = new Map<string, CanvasImageSource>();
    const roomSurface = document.createElement('canvas');
    const charAtlasSurface = document.createElement('canvas');
    const hairAtlasSurface = document.createElement('canvas');
    cache.set('/assets/rooms/burning-basement.png', roomSurface);
    cache.set('/assets/characters/characters-atlas.png', charAtlasSurface);
    cache.set('/assets/characters/eden-hairs-atlas.png', hairAtlasSurface);

    const runRender = (sceneState: ReturnType<typeof createDefaultSceneState>) => {
      const c = document.createElement('canvas');
      c.width = 1280;
      c.height = 720;
      const context = c.getContext('2d') as MockCtxWithOps;
      renderThumbnail(context, sceneState, resolveSceneLayout(sceneState), cache, {
        includeEditorOverlays: false,
      });
      return context.__ops;
    };

    const idleOps = runRender(edenIdle);
    const pickupOps = runRender(edenPickup);
    const isaacOps = runRender(isaacPickup);

    // Eden draws body + head from charactersAtlas and hair from edenHairsAtlas
    const idleCharDraws = idleOps.filter(
      (op) => op.type === 'drawImage' && op.args[0] === charAtlasSurface
    );
    const idleHairDraws = idleOps.filter(
      (op) => op.type === 'drawImage' && op.args[0] === hairAtlasSurface
    );
    expect(idleCharDraws).toHaveLength(2); // body + head
    expect(idleHairDraws).toHaveLength(1); // edenHair

    const pickupHairDraws = pickupOps.filter(
      (op) => op.type === 'drawImage' && op.args[0] === hairAtlasSurface
    );
    expect(pickupHairDraws).toHaveLength(1);

    // Switching from Idle to Pickup shifts the drawn Y coordinate of Eden's hair downward
    const idleHairDy = Number(idleHairDraws[0].args[6]);
    const pickupHairDy = Number(pickupHairDraws[0].args[6]);
    expect(pickupHairDy).toBeGreaterThan(idleHairDy);

    // Non-Eden character draws body + head (2 draws) and 0 draws from edenHairsAtlas
    const isaacCharDraws = isaacOps.filter(
      (op) => op.type === 'drawImage' && op.args[0] === charAtlasSurface
    );
    const isaacHairDraws = isaacOps.filter(
      (op) => op.type === 'drawImage' && op.args[0] === hairAtlasSurface
    );
    expect(isaacCharDraws).toHaveLength(2);
    expect(isaacHairDraws).toHaveLength(0);
  });

  it('renders multi-layer typography with Upheaval TT / Team Meat fonts, vertical gradient swatches, rotation, alignment, drop shadow, ink-streak banner underlay, and draws the cyan transform gizmo ONLY when includeEditorOverlays is true', () => {
    const baseScene = createDefaultSceneState();
    const sceneWithTwoTexts = {
      ...baseScene,
      textLayers: [
        baseScene.textLayers[0], // Upheaval TT, gold-orange (#FFF089 -> #FF7A00), center, inkBanner: true
        {
          id: 'text-layer-2',
          text: 'BOSS RUSH STREAK!',
          x: 640,
          y: 175,
          fontFamily: 'team-meat' as const,
          fontSize: 54,
          rotationDeg: -18,
          align: 'right' as const,
          swatch: 'soul-blue' as const,
          strokeWidth: 7,
          dropShadow: 8,
          inkBanner: false,
        },
      ],
    };
    const resolved = resolveSceneLayout(sceneWithTwoTexts);

    // 1. Render Interactive Stage Canvas (includeEditorOverlays: true, selectedNodeId: 'text-layer-2')
    const stageCanvas = document.createElement('canvas');
    stageCanvas.width = 1280;
    stageCanvas.height = 720;
    const stageCtx = stageCanvas.getContext('2d') as MockCtxWithOps;

    renderThumbnail(stageCtx, sceneWithTwoTexts, resolved, new Map(), {
      includeEditorOverlays: true,
      selectedNodeId: 'text-layer-2',
    });

    // Verify both text layers were rendered with their respective fonts & alignments
    const fillTextOps = stageCtx.__ops.filter(
      (op) => op.type === 'fillText'
    ) as Array<{ args: unknown[]; font?: string; textAlign?: string }>;
    const upheavalOp = fillTextOps.find(
      (op) => op.args[0] === 'GOD TIER EDEN START?!'
    );
    const teamMeatOp = fillTextOps.find(
      (op) => op.args[0] === 'BOSS RUSH STREAK!'
    );
    expect(upheavalOp?.font).toContain('Upheaval TT');
    expect(upheavalOp?.textAlign).toBe('center');
    expect(teamMeatOp?.font).toContain('Team Meat');
    expect(teamMeatOp?.textAlign).toBe('right');

    // Verify vertical gradient stops for gold-orange (#FFF089 -> #FF7A00) and soul-blue (#B8E8FF -> #255C99)
    const gradientStopColors = stageCtx.__ops
      .filter((op) => op.type === 'linearGradientStop')
      .map((op) => String(op.args[1]));
    expect(gradientStopColors).toContain('#FFF089');
    expect(gradientStopColors).toContain('#FF7A00');
    expect(gradientStopColors).toContain('#B8E8FF');
    expect(gradientStopColors).toContain('#255C99');

    // Verify canvas rotation was applied for the -18 deg tilted text layer
    const rotateAngles = stageCtx.__ops
      .filter((op) => op.type === 'rotate')
      .map((op) => Number(op.args[0]));
    expect(
      rotateAngles.some((r) => Math.abs(r - (-18 * Math.PI) / 180) < 0.001)
    ).toBe(true);

    // Verify cyan transform gizmo (#22D3EE) is drawn on the interactive stage canvas
    const stageCyanGizmoOps = stageCtx.__ops.filter(
      (op) =>
        (op.type === 'strokeRect' || op.type === 'stroke') &&
        op.args.includes('#22D3EE')
    );
    expect(stageCyanGizmoOps.length).toBeGreaterThan(0);

    // 2. Render 180x101 YouTube Feed Preview / Export Canvas (includeEditorOverlays: false)
    const previewCanvas = document.createElement('canvas');
    previewCanvas.width = 180;
    previewCanvas.height = 101;
    const previewCtx = previewCanvas.getContext('2d') as MockCtxWithOps;

    renderThumbnail(previewCtx, sceneWithTwoTexts, resolved, new Map(), {
      includeEditorOverlays: false,
      selectedNodeId: 'text-layer-2',
    });

    const previewCyanGizmoOps = previewCtx.__ops.filter(
      (op) =>
        (op.type === 'strokeRect' || op.type === 'stroke') &&
        op.args.includes('#22D3EE')
    );
    expect(previewCyanGizmoOps).toHaveLength(0);
  });
});


