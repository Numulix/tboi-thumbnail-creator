import { describe, expect, it } from 'vitest';
import {
  createDefaultSceneState,
  DEFAULT_CHARACTER_SCALE,
  randomizeEdenHair,
  resetCharacterScale,
  resolveSceneLayout,
  selectCharacter,
  selectEdenHair,
  toggleEditorOverlay,
  updateBackdropFilters,
  updateCameraFraming,
  updateCharacterPose,
  updateCharacterScale,
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

  it('updates character identity, pose, scale (1.0x-2.5x with reset), and Eden hairstyle selection/randomization', () => {
    const initial = createDefaultSceneState();
    expect(initial.character.id).toBe('eden');
    expect(initial.character.edenHairId).toBe(12);
    expect(initial.character.scale).toBe(DEFAULT_CHARACTER_SCALE);

    // Switch to non-Eden character omits edenHairId
    const asIsaac = selectCharacter(initial, 'isaac');
    expect(asIsaac.character.id).toBe('isaac');
    expect(asIsaac.character.name).toBe('Isaac');
    expect(asIsaac.character.edenHairId).toBeUndefined();

    // Switch to Tainted Eden restores default Eden hair
    const asTaintedEden = selectCharacter(asIsaac, 'tainted-eden');
    expect(asTaintedEden.character.id).toBe('tainted-eden');
    expect(asTaintedEden.character.edenHairId).toBe(21);

    // Switch poses across Front Idle, Happy Pickup, and Crying
    const inCrying = updateCharacterPose(asTaintedEden, 'crying');
    expect(inCrying.character.pose).toBe('crying');

    // Scrub character scale between 1.0x and 2.5x and reset
    const scaledUp = updateCharacterScale(inCrying, 2.35);
    expect(scaledUp.character.scale).toBe(2.35);
    const clampedHigh = updateCharacterScale(scaledUp, 5.0);
    expect(clampedHigh.character.scale).toBe(2.5);
    const clampedLow = updateCharacterScale(scaledUp, 0.4);
    expect(clampedLow.character.scale).toBe(1.0);
    const resetScaled = resetCharacterScale(clampedLow);
    expect(resetScaled.character.scale).toBe(DEFAULT_CHARACTER_SCALE);

    // Select & randomize Eden hairstyle
    const withHair7 = selectEdenHair(resetScaled, 7);
    expect(withHair7.character.edenHairId).toBe(7);
    const randomized = randomizeEdenHair(withHair7, () => 0.5);
    expect(randomized.character.edenHairId).not.toBe(7);
    expect(randomized.character.edenHairId).toBeGreaterThanOrEqual(1);
    expect(randomized.character.edenHairId).toBeLessThanOrEqual(54);
  });

  it('computes symmetric within-bounds coordinates for 3, 4, 5, and 6 pedestals across all 4 formation presets, blends manualOffset, resets positions, and depth-sorts sprites by floor Y coordinate', async () => {
    const sceneMod = await import('./sceneDocument');
    const presets = ['arc', 'row', 'grid-2x2', 'flank'] as const;
    const counts = [3, 4, 5, 6] as const;

    for (const count of counts) {
      const withCount = sceneMod.updatePedestalCount(createDefaultSceneState(), count);
      expect(withCount.pedestals).toHaveLength(count);

      for (const preset of presets) {
        const formatted = sceneMod.applyFormationPreset(withCount, preset);
        expect(formatted.formationPreset).toBe(preset);

        const resolved = sceneMod.resolveSceneLayout(formatted);
        const pedestalNodes = resolved.filter((n) => n.kind === 'pedestal');
        expect(pedestalNodes).toHaveLength(count);

        // Within-bounds (1280x720) check
        for (const node of pedestalNodes) {
          expect(node.x).toBeGreaterThanOrEqual(40);
          expect(node.x).toBeLessThanOrEqual(1240);
          expect(node.y).toBeGreaterThanOrEqual(80);
          expect(node.y).toBeLessThanOrEqual(680);
        }

        // Verify horizontal symmetry around the formation center axis
        const xs = pedestalNodes.map((n) => n.x);
        const avgX = xs.reduce((sum, x) => sum + x, 0) / count;
        const expectedAxis = preset === 'flank' ? 640 : 780;
        expect(Math.abs(avgX - expectedAxis)).toBeLessThanOrEqual(1);
      }
    }

    // Applying manualOffset to pedestal-2 shifts only pedestal-2 while preserving all other pedestals
    const baseScene = sceneMod.applyFormationPreset(createDefaultSceneState(), 'row');
    const beforeLayout = sceneMod.resolveSceneLayout(baseScene);
    const ped1Before = beforeLayout.find((n) => n.id === 'pedestal-1')!;
    const ped2Before = beforeLayout.find((n) => n.id === 'pedestal-2')!;

    const draggedPedestalScene = sceneMod.updateNodeDragOffset(baseScene, 'pedestal-2', {
      x: 45,
      y: 70,
    });
    const afterLayout = sceneMod.resolveSceneLayout(draggedPedestalScene);
    const ped1After = afterLayout.find((n) => n.id === 'pedestal-1')!;
    const ped2After = afterLayout.find((n) => n.id === 'pedestal-2')!;

    expect(ped1After.x).toBe(ped1Before.x);
    expect(ped1After.y).toBe(ped1Before.y);
    expect(ped2After.x).toBe(ped2Before.x + 45);
    expect(ped2After.y).toBe(ped2Before.y + 70);

    // Dragging character shifts character coordinates and updates Y-depth sort order
    const draggedCharScene = sceneMod.updateNodeDragOffset(draggedPedestalScene, 'character', {
      x: 100,
      y: 120, // moves character from y=505 to y=625 (in front of all pedestals)
    });
    const sortedLayout = sceneMod.resolveSceneLayout(draggedCharScene);
    const spriteNodes = sortedLayout.filter((n) => n.kind !== 'text');
    const textNodes = sortedLayout.filter((n) => n.kind === 'text');

    for (let i = 1; i < spriteNodes.length; i++) {
      expect(spriteNodes[i].y).toBeGreaterThanOrEqual(spriteNodes[i - 1].y);
      expect(spriteNodes[i].zIndex).toBeGreaterThanOrEqual(spriteNodes[i - 1].zIndex);
    }
    // Character at y=625 is the lowest sprite on the floor so it renders last among sprites
    expect(spriteNodes[spriteNodes.length - 1].kind).toBe('character');
    expect(spriteNodes[spriteNodes.length - 1].y).toBe(625);

    // Text layers always sort above all sprite layers
    for (const textNode of textNodes) {
      expect(textNode.zIndex).toBeGreaterThan(spriteNodes[spriteNodes.length - 1].zIndex);
    }

    // Switching formation preset or calling resetNodePositions clears all manual drag offsets
    const resetScene = sceneMod.resetNodePositions(draggedCharScene);
    const resetLayout = sceneMod.resolveSceneLayout(resetScene);
    expect(resetLayout.find((n) => n.id === 'pedestal-2')!.x).toBe(ped2Before.x);
    expect(resetLayout.find((n) => n.id === 'pedestal-2')!.y).toBe(ped2Before.y);
    expect(resetLayout.find((n) => n.kind === 'character')!.x).toBe(280);
    expect(resetLayout.find((n) => n.kind === 'character')!.y).toBe(505);

    // Updating pedestal scale and assigning collectible item to slot
    const scaledPedestals = sceneMod.updatePedestalScale(resetScene, 2.0);
    expect(scaledPedestals.pedestalScale).toBe(2.0);
    const scaledNodes = sceneMod.resolveSceneLayout(scaledPedestals);
    expect(scaledNodes.find((n) => n.kind === 'pedestal')!.scale).toBe(2.0);

    const assignedScene = sceneMod.assignCollectibleToPedestal(scaledPedestals, 'pedestal-4', 182);
    const slot4 = assignedScene.pedestals.find((p) => p.id === 'pedestal-4')!;
    expect(slot4.itemId).toBe(182);
    expect(slot4.itemName).toBe('Sacred Heart');
    expect(slot4.quality).toBe(4);
    expect(slot4.priceTag).toBe('none');
  });
});


