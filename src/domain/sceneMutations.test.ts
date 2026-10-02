import { describe, expect, it, vi } from 'vitest';
import { createDefaultSceneState } from './sceneTypes';
import {
  createSceneActions,
  sceneReducer,
  type SceneAction,
} from './sceneMutations';

describe('sceneMutations & sceneReducer', () => {
  it('processes select-character and pose actions through sceneReducer', () => {
    const initial = createDefaultSceneState();

    const withIsaac = sceneReducer(initial, {
      type: 'select-character',
      characterId: 'isaac',
    });
    expect(withIsaac.character.id).toBe('isaac');
    expect(withIsaac.character.name).toBe('Isaac');
    expect(withIsaac.character.edenHairId).toBeUndefined();

    const withCrying = sceneReducer(withIsaac, {
      type: 'set-character-pose',
      pose: 'crying',
    });
    expect(withCrying.character.pose).toBe('crying');
  });

  it('processes pedestal formation, count, and scale actions through sceneReducer', () => {
    const initial = createDefaultSceneState();

    const with5 = sceneReducer(initial, {
      type: 'set-pedestal-count',
      count: 5,
    });
    expect(with5.pedestals).toHaveLength(5);

    const withRow = sceneReducer(with5, {
      type: 'apply-formation',
      preset: 'row',
    });
    expect(withRow.formationPreset).toBe('row');

    const withScale = sceneReducer(withRow, {
      type: 'set-pedestal-scale',
      scale: 2.2,
    });
    expect(withScale.pedestalScale).toBe(2.2);
  });

  it('processes text layer actions through sceneReducer', () => {
    const initial = createDefaultSceneState();

    const withText = sceneReducer(initial, {
      type: 'add-text-layer',
      partial: { text: 'CUSTOM TITLE', fontSize: 72 },
    });
    expect(withText.textLayers).toHaveLength(2);
    const customLayer = withText.textLayers[1];
    expect(customLayer.text).toBe('CUSTOM TITLE');
    expect(customLayer.fontSize).toBe(72);

    const updatedText = sceneReducer(withText, {
      type: 'update-text-layer',
      layerId: customLayer.id,
      patch: { text: 'RENAMED TITLE' },
    });
    expect(updatedText.textLayers[1].text).toBe('RENAMED TITLE');

    const deletedText = sceneReducer(updatedText, {
      type: 'delete-text-layer',
      layerId: customLayer.id,
    });
    expect(deletedText.textLayers).toHaveLength(1);
  });

  it('processes environment, camera, and overlay actions through sceneReducer', () => {
    const initial = createDefaultSceneState();

    const updated = sceneReducer(initial, {
      type: 'set-camera-framing',
      patch: { zoom: 2.8 },
    });
    expect(updated.camera.zoom).toBe(2.8);

    const toggled = sceneReducer(updated, {
      type: 'toggle-editor-overlay',
      overlay: 'snapGrid',
    });
    expect(toggled.editorOverlays.showSnapGrid).toBe(true);

    const replaced = sceneReducer(toggled, {
      type: 'replace-scene',
      scene: initial,
    });
    expect(replaced).toEqual(initial);
  });

  it('createSceneActions dispatches typed actions to provided dispatch function', () => {
    const dispatch = vi.fn();
    const actions = createSceneActions(dispatch);

    actions.selectCharacter('magdalene');
    expect(dispatch).toHaveBeenCalledWith({
      type: 'select-character',
      characterId: 'magdalene',
    } satisfies SceneAction);

    actions.setCharacterPose('thumbsUp');
    expect(dispatch).toHaveBeenCalledWith({
      type: 'set-character-pose',
      pose: 'thumbsUp',
    } satisfies SceneAction);

    actions.resetPositions();
    expect(dispatch).toHaveBeenCalledWith({
      type: 'reset-positions',
    } satisfies SceneAction);

    actions.setPedestalCount(8);
    expect(dispatch).toHaveBeenCalledWith({
      type: 'set-pedestal-count',
      count: 8,
    } satisfies SceneAction);
  });

  it('verifies STARTER_PEDESTAL_POOL has 12 distinct curated items and styled altars for slots 7-12', () => {
    const scene = createDefaultSceneState();
    const with12 = sceneReducer(scene, {
      type: 'set-pedestal-count',
      count: 12,
    });

    expect(with12.pedestals).toHaveLength(12);

    // Verify all 12 IDs are distinct
    const ids = with12.pedestals.map((p) => p.id);
    expect(new Set(ids).size).toBe(12);

    // Verify all 12 items are distinct
    const itemNames = with12.pedestals.map((p) => p.itemName);
    expect(new Set(itemNames).size).toBe(12);

    // Verify slots 7 to 12 iconic collectibles
    expect(with12.pedestals[6].itemName).toBe('C Section');
    expect(with12.pedestals[6].itemId).toBe(678);
    expect(with12.pedestals[6].altarStyle).toBe('stone');

    expect(with12.pedestals[7].itemName).toBe('Polyphemus');
    expect(with12.pedestals[7].itemId).toBe(169);
    expect(with12.pedestals[7].altarStyle).toBe('gold');

    expect(with12.pedestals[8].itemName).toBe('Spindown Dice');
    expect(with12.pedestals[8].itemId).toBe(723);
    expect(with12.pedestals[8].priceTag).toBe('15c');

    expect(with12.pedestals[9].itemName).toBe('Magic Mushroom');
    expect(with12.pedestals[9].itemId).toBe(12);
    expect(with12.pedestals[9].altarStyle).toBe('stone');

    expect(with12.pedestals[10].itemName).toBe('Revelation');
    expect(with12.pedestals[10].itemId).toBe(643);
    expect(with12.pedestals[10].altarStyle).toBe('angel');

    expect(with12.pedestals[11].itemName).toBe('Twisted Pair');
    expect(with12.pedestals[11].itemId).toBe(698);
    expect(with12.pedestals[11].altarStyle).toBe('devil');
    expect(with12.pedestals[11].priceTag).toBe('1-heart');
  });

  it('enforces stepper bounds (1 to 12) and supports incrementing/decrementing', () => {
    const scene = createDefaultSceneState();

    // Upper bound clamping at 12
    const clampedUpper = sceneReducer(scene, {
      type: 'set-pedestal-count',
      count: 20,
    });
    expect(clampedUpper.pedestals).toHaveLength(12);

    // Lower bound clamping at 1
    const clampedLower = sceneReducer(scene, {
      type: 'set-pedestal-count',
      count: 0,
    });
    expect(clampedLower.pedestals).toHaveLength(1);

    const clampedNegative = sceneReducer(scene, {
      type: 'set-pedestal-count',
      count: -5,
    });
    expect(clampedNegative.pedestals).toHaveLength(1);

    // Increments and decrements
    const inc1 = sceneReducer(clampedLower, {
      type: 'set-pedestal-count',
      count: clampedLower.pedestals.length + 1,
    });
    expect(inc1.pedestals).toHaveLength(2);

    const dec1 = sceneReducer(inc1, {
      type: 'set-pedestal-count',
      count: inc1.pedestals.length - 1,
    });
    expect(dec1.pedestals).toHaveLength(1);

    // Decrementing at bound 1 stays at 1
    const decAtMin = sceneReducer(dec1, {
      type: 'set-pedestal-count',
      count: 0,
    });
    expect(decAtMin.pedestals).toHaveLength(1);

    // Incrementing at bound 12 stays at 12
    const incAtMax = sceneReducer(clampedUpper, {
      type: 'set-pedestal-count',
      count: 13,
    });
    expect(incAtMax.pedestals).toHaveLength(12);
  });

  it('preserves existing manual drag offsets on unaffected altars during count increment and decrement, resetting only on reset-positions or preset change', () => {
    let scene = createDefaultSceneState(); // 4 pedestals
    expect(scene.pedestals).toHaveLength(4);

    // Add manual drag offsets to pedestal-1 and pedestal-3
    scene = sceneReducer(scene, {
      type: 'update-node-drag-offset',
      nodeId: 'pedestal-1',
      delta: { x: 45, y: -25 },
    });
    scene = sceneReducer(scene, {
      type: 'update-node-drag-offset',
      nodeId: 'pedestal-3',
      delta: { x: -30, y: 50 },
    });

    const offset1 = scene.pedestals[0].manualOffset;
    const offset3 = scene.pedestals[2].manualOffset;
    expect(offset1).toBeDefined();
    expect(offset3).toBeDefined();

    // 1. Increment count to 8: existing offsets must be retained
    scene = sceneReducer(scene, {
      type: 'set-pedestal-count',
      count: 8,
    });
    expect(scene.pedestals).toHaveLength(8);
    expect(scene.pedestals[0].manualOffset).toEqual(offset1);
    expect(scene.pedestals[2].manualOffset).toEqual(offset3);

    // Newly added pedestals should not have an offset
    expect(scene.pedestals[4].manualOffset).toBeUndefined();
    expect(scene.pedestals[7].manualOffset).toBeUndefined();

    // 2. Increment count all the way to 12
    scene = sceneReducer(scene, {
      type: 'set-pedestal-count',
      count: 12,
    });
    expect(scene.pedestals).toHaveLength(12);
    expect(scene.pedestals[0].manualOffset).toEqual(offset1);
    expect(scene.pedestals[2].manualOffset).toEqual(offset3);

    // 3. Decrement count down to 3: pedestal-1 and pedestal-3 still retain their offsets
    scene = sceneReducer(scene, {
      type: 'set-pedestal-count',
      count: 3,
    });
    expect(scene.pedestals).toHaveLength(3);
    expect(scene.pedestals[0].manualOffset).toEqual(offset1);
    expect(scene.pedestals[2].manualOffset).toEqual(offset3);

    // 4. Reset positions explicitly clears manual offsets
    const afterReset = sceneReducer(scene, { type: 'reset-positions' });
    expect(afterReset.pedestals[0].manualOffset).toBeUndefined();
    expect(afterReset.pedestals[2].manualOffset).toBeUndefined();

    // 5. Changing formation preset also resets manual offsets
    const afterPreset = sceneReducer(scene, {
      type: 'apply-formation',
      preset: 'flank',
    });
    expect(afterPreset.pedestals[0].manualOffset).toBeUndefined();
    expect(afterPreset.pedestals[2].manualOffset).toBeUndefined();
    expect(afterPreset.formationPreset).toBe('flank');
  });
});
