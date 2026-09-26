import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addTextLayer,
  createDefaultSceneState,
  selectCharacter,
  updateBackdropFilters,
  updateCameraFraming,
  updatePedestalCount,
  type SceneState,
} from './sceneDocument';
import {
  BUILTIN_PRESET_DEVIL_DEAL,
  BUILTIN_PRESET_EDEN_RUN,
  CURRENT_SCHEMA_VERSION,
  deleteCustomPreset,
  listPresets,
  loadWorkspaceScene,
  PRESETS_STORAGE_KEY,
  saveCustomPreset,
  saveWorkspaceScene,
  WORKSPACE_STORAGE_KEY,
} from './templatePersistenceStore';

describe('TemplatePersistenceStore', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('loadWorkspaceScene & saveWorkspaceScene (Auto-Save)', () => {
    it('returns the built-in "Eden Run Default" preset when localStorage is empty', () => {
      const scene = loadWorkspaceScene();
      expect(scene).toBeDefined();
      expect(scene.presetName).toBe('Eden Run Default');
      expect(scene.character.id).toBe('eden');
      expect(scene.stageId).toBe('burning-basement');
      expect(scene.pedestals).toHaveLength(4);
      expect(scene.textLayers).toHaveLength(1);
    });

    it('round-trips a modified SceneState losslessly through localStorage', () => {
      let original: SceneState = createDefaultSceneState();
      original = selectCharacter(original, 'judas');
      original = updatePedestalCount(original, 6);
      original = updateCameraFraming(original, { zoom: 2.8, panX: 45, panY: -30 });
      original = updateBackdropFilters(original, {
        vignetteIntensity: 90,
        backdropDimming: 60,
        depthBlur: 4.5,
      });
      original = addTextLayer(original, {
        text: 'SECOND BANNER LAYER',
        fontSize: 72,
        rotationDeg: -15,
        swatch: 'soul-blue',
      });

      saveWorkspaceScene(original);

      // Verify the raw stored JSON contains the schema version and updatedAt timestamp
      const rawStored = localStorage.getItem(WORKSPACE_STORAGE_KEY);
      expect(rawStored).toBeTruthy();
      const parsed = JSON.parse(rawStored!);
      expect(parsed.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
      expect(typeof parsed.updatedAt).toBe('number');
      expect(parsed.scene.character.id).toBe('judas');

      // Verify loadWorkspaceScene restores every property cleanly
      const loaded = loadWorkspaceScene();
      expect(loaded).toEqual(original);
    });

    it('gracefully falls back to "Eden Run Default" without throwing on corrupt or invalid JSON', () => {
      localStorage.setItem(WORKSPACE_STORAGE_KEY, '{{corrupted json syntax;;');
      expect(() => {
        const fallback = loadWorkspaceScene();
        expect(fallback.presetName).toBe('Eden Run Default');
        expect(fallback.character.id).toBe('eden');
      }).not.toThrow();
    });

    it('gracefully falls back to "Eden Run Default" on null, non-object, or empty JSON payload', () => {
      localStorage.setItem(WORKSPACE_STORAGE_KEY, 'null');
      expect(loadWorkspaceScene().presetName).toBe('Eden Run Default');

      localStorage.setItem(WORKSPACE_STORAGE_KEY, '"just a string"');
      expect(loadWorkspaceScene().presetName).toBe('Eden Run Default');

      localStorage.setItem(WORKSPACE_STORAGE_KEY, '[]');
      expect(loadWorkspaceScene().presetName).toBe('Eden Run Default');
    });

    it('gracefully falls back to "Eden Run Default" when schemaVersion is incompatible or missing', () => {
      const incompatiblePayload = {
        schemaVersion: 999, // Future / incompatible version
        updatedAt: Date.now(),
        scene: createDefaultSceneState(),
      };
      localStorage.setItem(
        WORKSPACE_STORAGE_KEY,
        JSON.stringify(incompatiblePayload)
      );

      const fallback = loadWorkspaceScene();
      expect(fallback.presetName).toBe('Eden Run Default');
    });

    it('gracefully falls back to "Eden Run Default" when scene object structure is corrupt or incomplete', () => {
      const incompletePayload = {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        updatedAt: Date.now(),
        scene: {
          character: null, // missing required character properties
        },
      };
      localStorage.setItem(
        WORKSPACE_STORAGE_KEY,
        JSON.stringify(incompletePayload)
      );

      const fallback = loadWorkspaceScene();
      expect(fallback.presetName).toBe('Eden Run Default');
      expect(fallback.character.id).toBe('eden');

      // Corrupt pedestals element array
      const corruptPedestalsPayload = {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        updatedAt: Date.now(),
        scene: {
          ...createDefaultSceneState(),
          pedestals: [null],
        },
      };
      localStorage.setItem(
        WORKSPACE_STORAGE_KEY,
        JSON.stringify(corruptPedestalsPayload)
      );
      expect(loadWorkspaceScene().pedestals).toHaveLength(4);

      // Corrupt textLayers element array
      const corruptTextPayload = {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        updatedAt: Date.now(),
        scene: {
          ...createDefaultSceneState(),
          textLayers: [{ invalid: true }],
        },
      };
      localStorage.setItem(
        WORKSPACE_STORAGE_KEY,
        JSON.stringify(corruptTextPayload)
      );
      expect(loadWorkspaceScene().textLayers).toHaveLength(1);
    });

    it('handles localStorage exceptions safely without crashing', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      expect(() => {
        saveWorkspaceScene(createDefaultSceneState());
      }).not.toThrow();

      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('SecurityError: Access Denied');
      });

      expect(() => {
        const fallback = loadWorkspaceScene();
        expect(fallback.presetName).toBe('Eden Run Default');
      }).not.toThrow();
    });
  });

  describe('Template Presets (Built-in and Custom CRUD)', () => {
    it('returns built-in presets ("Eden Run Default" and "Devil Deal Showcase") by default', () => {
      const presets = listPresets();
      expect(presets.length).toBeGreaterThanOrEqual(2);

      const edenPreset = presets.find((p) => p.id === BUILTIN_PRESET_EDEN_RUN);
      expect(edenPreset).toBeDefined();
      expect(edenPreset?.name).toBe('Eden Run Default');
      expect(edenPreset?.isBuiltIn).toBe(true);
      expect(edenPreset?.scene.character.id).toBe('eden');

      const devilPreset = presets.find((p) => p.id === BUILTIN_PRESET_DEVIL_DEAL);
      expect(devilPreset).toBeDefined();
      expect(devilPreset?.name).toBe('Devil Deal Showcase');
      expect(devilPreset?.isBuiltIn).toBe(true);
      expect(devilPreset?.scene.stageId).toBe('devil-room');
    });

    it('saves a custom preset to localStorage and includes it in listPresets', () => {
      let customScene = createDefaultSceneState();
      customScene = selectCharacter(customScene, 'azazel');
      customScene = updatePedestalCount(customScene, 3);

      const saved = saveCustomPreset('Azazel 3-Pedestal Rush', customScene);
      expect(saved.id).toBeTruthy();
      expect(saved.name).toBe('Azazel 3-Pedestal Rush');
      expect(saved.isBuiltIn).toBe(false);
      expect(saved.scene.presetName).toBe('Azazel 3-Pedestal Rush');
      expect(saved.scene.character.id).toBe('azazel');

      const allPresets = listPresets();
      expect(allPresets.some((p) => p.id === saved.id)).toBe(true);

      const found = allPresets.find((p) => p.id === saved.id);
      expect(found?.name).toBe('Azazel 3-Pedestal Rush');
      expect(found?.isBuiltIn).toBe(false);
      expect(found?.scene.pedestals).toHaveLength(3);
    });

    it('trims whitespace and defaults to "Untitled Preset" if name is empty', () => {
      const saved = saveCustomPreset('   ', createDefaultSceneState());
      expect(saved.name).toBe('Untitled Preset');
    });

    it('supports deleting a custom preset while keeping built-in presets protected', () => {
      const saved1 = saveCustomPreset('Custom Preset 1', createDefaultSceneState());
      const saved2 = saveCustomPreset('Custom Preset 2', createDefaultSceneState());

      expect(listPresets().some((p) => p.id === saved1.id)).toBe(true);
      expect(listPresets().some((p) => p.id === saved2.id)).toBe(true);

      // Deleting custom preset 1 removes only custom preset 1
      deleteCustomPreset(saved1.id);
      const afterDelete1 = listPresets();
      expect(afterDelete1.some((p) => p.id === saved1.id)).toBe(false);
      expect(afterDelete1.some((p) => p.id === saved2.id)).toBe(true);

      // Attempting to delete a built-in preset is protected / ignored
      deleteCustomPreset(BUILTIN_PRESET_EDEN_RUN);
      deleteCustomPreset(BUILTIN_PRESET_DEVIL_DEAL);

      const afterProtectedAttempt = listPresets();
      expect(
        afterProtectedAttempt.some((p) => p.id === BUILTIN_PRESET_EDEN_RUN)
      ).toBe(true);
      expect(
        afterProtectedAttempt.some((p) => p.id === BUILTIN_PRESET_DEVIL_DEAL)
      ).toBe(true);
    });

    it('recovers cleanly if custom presets localStorage item contains corrupted JSON', () => {
      localStorage.setItem(PRESETS_STORAGE_KEY, '{malformed json;');
      const presets = listPresets();
      expect(presets.length).toBe(2);
      expect(presets[0].name).toBe('Eden Run Default');
      expect(presets[1].name).toBe('Devil Deal Showcase');
    });
  });
});
