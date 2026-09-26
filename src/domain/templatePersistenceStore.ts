import {
  createDefaultSceneState,
  type SceneState,
} from './sceneDocument';

export const CURRENT_SCHEMA_VERSION = 1;
export const WORKSPACE_STORAGE_KEY = 'isaac-thumb-studio:workspace:v1';
export const PRESETS_STORAGE_KEY = 'isaac-thumb-studio:custom-presets:v1';

export const BUILTIN_PRESET_EDEN_RUN = 'eden-run-default';
export const BUILTIN_PRESET_DEVIL_DEAL = 'devil-deal-showcase';

export interface TemplatePreset {
  id: string;
  name: string;
  isBuiltIn: boolean;
  scene: SceneState;
}

export interface SerializedWorkspacePayload {
  schemaVersion: number;
  updatedAt: number;
  scene: SceneState;
}

export interface SerializedPresetsPayload {
  schemaVersion: number;
  presets: TemplatePreset[];
}

export function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function getSafeStorage(customStorage?: Storage): Storage | undefined {
  if (customStorage) {
    return customStorage;
  }
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  if (typeof localStorage !== 'undefined') {
    return localStorage;
  }
  return undefined;
}

export function createEdenRunDefaultScene(): SceneState {
  return createDefaultSceneState();
}

export function createDevilDealShowcaseScene(): SceneState {
  return {
    projectName: 'Devil Deal - Sheol',
    presetName: 'Devil Deal Showcase',
    stageId: 'devil-room',
    camera: {
      zoom: 2.1,
      panX: 0,
      panY: -18,
    },
    backdrop: {
      vignetteIntensity: 75,
      backdropDimming: 35,
      depthBlur: 1.5,
    },
    editorOverlays: {
      showSafeZoneOverlay: true,
      showSnapGrid: false,
    },
    formationPreset: 'arc',
    pedestalScale: 1.5,
    character: {
      id: 'judas',
      name: 'Judas',
      pose: 'pickup',
      scale: 1.85,
      x: 280,
      y: 505,
    },
    pedestals: [
      {
        id: 'pedestal-1',
        itemId: 118,
        itemName: 'Brimstone',
        quality: 4,
        altarStyle: 'devil',
        priceTag: '2-hearts',
        highlightFx: 'q4-glow',
      },
      {
        id: 'pedestal-2',
        itemId: 114,
        itemName: "Mom's Knife",
        quality: 4,
        altarStyle: 'devil',
        priceTag: '2-hearts',
        highlightFx: 'q4-glow',
      },
      {
        id: 'pedestal-3',
        itemId: 230,
        itemName: 'Abaddon',
        quality: 3,
        altarStyle: 'devil',
        priceTag: '2-hearts',
        highlightFx: 'none',
      },
      {
        id: 'pedestal-4',
        itemId: 212,
        itemName: "Guppy's Collar",
        quality: 1,
        altarStyle: 'devil',
        priceTag: '2-hearts',
        highlightFx: 'none',
      },
    ],
    textLayers: [
      {
        id: 'text-headline',
        text: 'DEVIL DEAL CARRY?!',
        x: 640,
        y: 96,
        fontFamily: 'upheaval',
        fontSize: 64,
        rotationDeg: 0,
        align: 'center',
        swatch: 'brimstone-red',
        strokeWidth: 6,
        dropShadow: 6,
        inkBanner: true,
      },
    ],
  };
}

export function isValidSceneState(candidate: unknown): candidate is SceneState {
  if (!candidate || typeof candidate !== 'object') {
    return false;
  }
  const partialScene = candidate as Partial<SceneState>;
  if (!partialScene.character || typeof partialScene.character !== 'object') {
    return false;
  }
  if (
    typeof partialScene.character.id !== 'string' ||
    typeof partialScene.character.scale !== 'number' ||
    typeof partialScene.character.x !== 'number' ||
    typeof partialScene.character.y !== 'number'
  ) {
    return false;
  }
  if (typeof partialScene.stageId !== 'string') {
    return false;
  }
  if (!partialScene.camera || typeof partialScene.camera.zoom !== 'number') {
    return false;
  }
  if (!partialScene.backdrop || typeof partialScene.backdrop.vignetteIntensity !== 'number') {
    return false;
  }
  if (!partialScene.editorOverlays || typeof partialScene.editorOverlays.showSafeZoneOverlay !== 'boolean') {
    return false;
  }
  if (!Array.isArray(partialScene.pedestals)) {
    return false;
  }
  for (const slot of partialScene.pedestals) {
    if (!slot || typeof slot !== 'object' || typeof slot.id !== 'string' || typeof slot.itemId !== 'number') {
      return false;
    }
  }
  if (!Array.isArray(partialScene.textLayers)) {
    return false;
  }
  for (const layer of partialScene.textLayers) {
    if (!layer || typeof layer !== 'object' || typeof layer.id !== 'string' || typeof layer.text !== 'string') {
      return false;
    }
  }
  return true;
}

export function loadWorkspaceScene(storageOverride?: Storage): SceneState {
  const storage = getSafeStorage(storageOverride);
  if (!storage) {
    return createEdenRunDefaultScene();
  }

  try {
    const raw = storage.getItem(WORKSPACE_STORAGE_KEY);
    if (!raw) {
      return createEdenRunDefaultScene();
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return createEdenRunDefaultScene();
    }

    if (parsed.schemaVersion !== CURRENT_SCHEMA_VERSION) {
      return createEdenRunDefaultScene();
    }

    if (!isValidSceneState(parsed.scene)) {
      return createEdenRunDefaultScene();
    }

    return parsed.scene;
  } catch {
    return createEdenRunDefaultScene();
  }
}

export function saveWorkspaceScene(scene: SceneState, storageOverride?: Storage): void {
  const storage = getSafeStorage(storageOverride);
  if (!storage) {
    return;
  }

  try {
    const payload: SerializedWorkspacePayload = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      updatedAt: Date.now(),
      scene: deepClone(scene),
    };
    storage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Gracefully ignore storage quota or write errors
  }
}

function loadCustomPresets(storageOverride?: Storage): TemplatePreset[] {
  const storage = getSafeStorage(storageOverride);
  if (!storage) {
    return [];
  }

  try {
    const raw = storage.getItem(PRESETS_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    const presetsArray = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.presets)
      ? parsed.presets
      : null;

    if (!presetsArray) {
      return [];
    }

    const validPresets: TemplatePreset[] = [];
    for (const item of presetsArray) {
      if (
        item &&
        typeof item === 'object' &&
        typeof item.id === 'string' &&
        typeof item.name === 'string' &&
        isValidSceneState(item.scene)
      ) {
        validPresets.push({
          id: item.id,
          name: item.name,
          isBuiltIn: false,
          scene: item.scene,
        });
      }
    }
    return validPresets;
  } catch {
    return [];
  }
}

function persistCustomPresets(presets: TemplatePreset[], storageOverride?: Storage): void {
  const storage = getSafeStorage(storageOverride);
  if (!storage) {
    return;
  }

  try {
    const payload: SerializedPresetsPayload = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      presets: deepClone(presets),
    };
    storage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Gracefully ignore storage quota or write errors
  }
}

export function listPresets(storageOverride?: Storage): TemplatePreset[] {
  const builtIns: TemplatePreset[] = [
    {
      id: BUILTIN_PRESET_EDEN_RUN,
      name: 'Eden Run Default',
      isBuiltIn: true,
      scene: createEdenRunDefaultScene(),
    },
    {
      id: BUILTIN_PRESET_DEVIL_DEAL,
      name: 'Devil Deal Showcase',
      isBuiltIn: true,
      scene: createDevilDealShowcaseScene(),
    },
  ];

  const custom = loadCustomPresets(storageOverride);
  return [...builtIns, ...custom];
}

export function saveCustomPreset(
  name: string,
  scene: SceneState,
  storageOverride?: Storage
): TemplatePreset {
  const trimmedName = name.trim() || 'Untitled Preset';
  const id = `custom-preset-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const presetScene = {
    ...deepClone(scene),
    presetName: trimmedName,
  };

  const newPreset: TemplatePreset = {
    id,
    name: trimmedName,
    isBuiltIn: false,
    scene: presetScene,
  };

  const existingCustom = loadCustomPresets(storageOverride);
  const nextCustom = [...existingCustom, newPreset];
  persistCustomPresets(nextCustom, storageOverride);

  return newPreset;
}

export function deleteCustomPreset(presetId: string, storageOverride?: Storage): void {
  // Built-in presets are protected against deletion
  if (
    presetId === BUILTIN_PRESET_EDEN_RUN ||
    presetId === BUILTIN_PRESET_DEVIL_DEAL
  ) {
    return;
  }

  const existingCustom = loadCustomPresets(storageOverride);
  const nextCustom = existingCustom.filter((preset) => preset.id !== presetId);
  persistCustomPresets(nextCustom, storageOverride);
}
