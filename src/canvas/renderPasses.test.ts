import { describe, expect, it } from 'vitest';
import {
  createDefaultSceneState,
  resolveSceneLayout,
  type SceneState,
} from '../domain/sceneDocument';
import { createAssetStore } from './assetStore';
import {
  renderEditorOverlayPass,
  renderRoomBackdropPass,
  renderSpritePass,
  renderTypographyPass,
} from './renderPasses';

interface MockCanvasCtx extends CanvasRenderingContext2D {
  __ops: Array<{
    type: string;
    args: unknown[];
    smoothing: boolean;
    filter: string;
  }>;
}

describe('renderPasses', () => {
  it('renderRoomBackdropPass applies room backdrop, dimming, and vignette onto stage', () => {
    const scene: SceneState = {
      ...createDefaultSceneState(),
      backdrop: {
        depthBlur: 4,
        backdropDimming: 40,
        vignetteIntensity: 60,
      },
    };
    const store = createAssetStore();
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d') as MockCanvasCtx;

    renderRoomBackdropPass(ctx, scene, store, 1280, 720);

    const drawOps = ctx.__ops.filter((op) => op.type === 'drawImage');
    expect(drawOps.length).toBeGreaterThanOrEqual(1);

    const fillOps = ctx.__ops.filter((op) => op.type === 'fillRect');
    expect(fillOps.length).toBeGreaterThanOrEqual(2); // base + dimming/glow
  });

  it('renderSpritePass renders character composite stack and pedestal altars', () => {
    const scene = createDefaultSceneState();
    const resolved = resolveSceneLayout(scene);
    const store = createAssetStore();
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d') as MockCanvasCtx;

    renderSpritePass(ctx, scene, resolved, store, 1);

    // Fallbacks or draws should occur without errors
    expect(ctx.__ops.length).toBeGreaterThan(0);
  });

  it('renderTypographyPass renders text layers with stroke, shadow, and ink banners', () => {
    const scene = createDefaultSceneState();
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d') as MockCanvasCtx;

    renderTypographyPass(ctx, scene, 1);

    const fillTextOps = ctx.__ops.filter((op) => op.type === 'fillText');
    expect(fillTextOps.length).toBeGreaterThanOrEqual(1);
    expect(fillTextOps.some((op) => op.args[0] === 'GOD TIER EDEN START?!')).toBe(true);
  });

  it('renderEditorOverlayPass draws snap grid and cyan gizmo when enabled', () => {
    const scene: SceneState = {
      ...createDefaultSceneState(),
      editorOverlays: {
        showSafeZoneOverlay: true,
        showSnapGrid: true,
      },
    };
    const resolved = resolveSceneLayout(scene);
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d') as MockCanvasCtx;

    renderEditorOverlayPass(ctx, scene, resolved, 1280, 720, 1, 'text-headline');

    const gizmoStrokes = ctx.__ops.filter(
      (op) => op.type === 'strokeRect' && op.args.includes('#22D3EE')
    );
    expect(gizmoStrokes.length).toBeGreaterThan(0);

    const safeZoneText = ctx.__ops.find(
      (op) => op.type === 'fillText' && op.args[0] === '19:42 YT SAFE ZONE'
    );
    expect(safeZoneText).toBeDefined();
  });
});
