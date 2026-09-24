import { describe, expect, it } from 'vitest';
import {
  createDefaultSceneState,
  resolveSceneLayout,
  toggleEditorOverlay,
  updateBackdropFilters,
  updateCameraFraming,
  updateRoomStage,
} from './sceneDocument';

describe('sceneDocument', () => {
  it('initializes default scene state and immutably updates stage, camera framing, backdrop readability filters, and editor overlays', () => {
    const initial = createDefaultSceneState();

    expect(initial.stageId).toBe('burning-basement');
    expect(initial.camera).toEqual({ zoom: 2.1, panX: 0, panY: -18 });
    expect(initial.backdrop).toEqual({
      vignetteIntensity: 65,
      backdropDimming: 25,
      depthBlur: 1.5,
    });
    expect(initial.editorOverlays).toEqual({
      showSafeZoneOverlay: true,
      showSnapGrid: false,
    });

    const withStage = updateRoomStage(initial, 'planetarium');
    expect(withStage.stageId).toBe('planetarium');
    expect(initial.stageId).toBe('burning-basement');

    const withCamera = updateCameraFraming(withStage, { zoom: 2.5, panX: 24, panY: -30 });
    expect(withCamera.camera).toEqual({ zoom: 2.5, panX: 24, panY: -30 });

    const withBackdrop = updateBackdropFilters(withCamera, {
      vignetteIntensity: 80,
      backdropDimming: 40,
      depthBlur: 3.0,
    });
    expect(withBackdrop.backdrop).toEqual({
      vignetteIntensity: 80,
      backdropDimming: 40,
      depthBlur: 3.0,
    });

    const withToggledGuides = toggleEditorOverlay(
      toggleEditorOverlay(withBackdrop, 'safeZone'),
      'snapGrid'
    );
    expect(withToggledGuides.editorOverlays).toEqual({
      showSafeZoneOverlay: false,
      showSnapGrid: true,
    });

    const resolvedNodes = resolveSceneLayout(withToggledGuides);
    expect(resolvedNodes.length).toBeGreaterThan(0);
    for (const node of resolvedNodes) {
      expect(node.x).toBeGreaterThanOrEqual(0);
      expect(node.x).toBeLessThanOrEqual(1280);
      expect(node.y).toBeGreaterThanOrEqual(0);
      expect(node.y).toBeLessThanOrEqual(720);
    }
  });
});
