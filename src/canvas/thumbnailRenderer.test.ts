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
});

