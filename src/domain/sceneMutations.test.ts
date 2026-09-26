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
  });
});
