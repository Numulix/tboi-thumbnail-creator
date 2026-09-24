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
});
