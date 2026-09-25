import {
  getCharacterById,
  listEdenHairs,
  resolveCharacterEdenHairId,
} from '../catalog/gameAssetsCatalog';

export type FormationPreset = 'arc' | 'row' | 'grid-2x2' | 'flank';
export type CharacterPoseId =
  | 'idle'
  | 'pickup'
  | 'thumbsUp'
  | 'shocked'
  | 'agony'
  | 'cheer'
  | 'crying';

export interface Vec2 {
  x: number;
  y: number;
}

export interface CameraConfig {
  zoom: number;
  panX: number;
  panY: number;
}

export interface BackdropFilterConfig {
  vignetteIntensity: number; // 0..100
  backdropDimming: number;   // 0..100
  depthBlur: number;         // 0..8 px
}

export interface EditorOverlayConfig {
  showSafeZoneOverlay: boolean;
  showSnapGrid: boolean;
}

export interface PedestalSlotNode {
  id: string;
  itemId: number;
  itemName: string;
  quality: 0 | 1 | 2 | 3 | 4;
  altarStyle: 'stone' | 'gold' | 'devil' | 'angel' | 'hidden';
  priceTag: 'none' | '1-heart' | '2-hearts' | '15c' | 'blind';
  highlightFx: 'none' | 'outline' | 'q4-glow';
  manualOffset?: Vec2;
}

export interface TextLayerNode {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  rotationDeg: number;
  swatch: 'gold-orange' | 'bone-white' | 'brimstone-red' | 'soul-blue';
  strokeWidth: number;
  inkBanner: boolean;
}

export interface SceneState {
  projectName: string;
  presetName: string;
  stageId: string;
  camera: CameraConfig;
  backdrop: BackdropFilterConfig;
  editorOverlays: EditorOverlayConfig;
  formationPreset: FormationPreset;
  character: {
    id: string;
    name: string;
    pose: CharacterPoseId;
    edenHairId?: number;
    scale: number;
    x: number;
    y: number;
  };
  pedestals: PedestalSlotNode[];
  textLayers: TextLayerNode[];
}

export interface ResolvedSceneNode {
  id: string;
  kind: 'character' | 'pedestal' | 'text';
  x: number;
  y: number;
  scale: number;
  rotationDeg: number;
  zIndex: number;
}

export const DEFAULT_CAMERA_CONFIG: CameraConfig = {
  zoom: 2.1,
  panX: 0,
  panY: -18,
};

export const DEFAULT_BACKDROP_FILTERS: BackdropFilterConfig = {
  vignetteIntensity: 65,
  backdropDimming: 25,
  depthBlur: 1.5,
};

export const DEFAULT_CHARACTER_SCALE = 1.85;

export function createDefaultSceneState(): SceneState {
  return {
    projectName: 'Eden Run - Burning Basement',
    presetName: 'YouTube 16:9 Bold',
    stageId: 'burning-basement',
    camera: { ...DEFAULT_CAMERA_CONFIG },
    backdrop: { ...DEFAULT_BACKDROP_FILTERS },
    editorOverlays: {
      showSafeZoneOverlay: true,
      showSnapGrid: false,
    },
    formationPreset: 'arc',
    character: {
      id: 'eden',
      name: '09. Eden',
      pose: 'pickup',
      edenHairId: 12,
      scale: DEFAULT_CHARACTER_SCALE,
      x: 280,
      y: 505,
    },
    pedestals: [
      {
        id: 'pedestal-1',
        itemId: 182,
        itemName: 'Sacred Heart',
        quality: 4,
        altarStyle: 'gold',
        priceTag: 'none',
        highlightFx: 'q4-glow',
      },
      {
        id: 'pedestal-2',
        itemId: 118,
        itemName: 'Brimstone',
        quality: 4,
        altarStyle: 'devil',
        priceTag: '2-hearts',
        highlightFx: 'outline',
      },
      {
        id: 'pedestal-3',
        itemId: 562,
        itemName: 'Rock Bottom',
        quality: 3,
        altarStyle: 'stone',
        priceTag: 'none',
        highlightFx: 'none',
      },
      {
        id: 'pedestal-4',
        itemId: 0,
        itemName: 'Curse of the Blind',
        quality: 4,
        altarStyle: 'stone',
        priceTag: 'blind',
        highlightFx: 'none',
      },
    ],
    textLayers: [
      {
        id: 'text-headline',
        text: 'GOD TIER EDEN START?!',
        x: 640,
        y: 96,
        fontSize: 64,
        rotationDeg: 0,
        swatch: 'gold-orange',
        strokeWidth: 4,
        inkBanner: true,
      },
    ],
  };
}

export function selectCharacter(scene: SceneState, characterId: string): SceneState {
  const entry = getCharacterById(characterId);
  return {
    ...scene,
    character: {
      ...scene.character,
      id: entry.id,
      name: entry.name,
      edenHairId: entry.supportsEdenHair
        ? resolveCharacterEdenHairId(entry, scene.character.edenHairId)
        : undefined,
    },
  };
}

export function updateCharacterPose(
  scene: SceneState,
  pose: CharacterPoseId
): SceneState {
  return {
    ...scene,
    character: {
      ...scene.character,
      pose,
    },
  };
}

export function updateCharacterScale(scene: SceneState, scale: number): SceneState {
  const clamped = Math.max(1.0, Math.min(2.5, Number(scale.toFixed(2))));
  return {
    ...scene,
    character: {
      ...scene.character,
      scale: clamped,
    },
  };
}

export function resetCharacterScale(scene: SceneState): SceneState {
  return {
    ...scene,
    character: {
      ...scene.character,
      scale: DEFAULT_CHARACTER_SCALE,
    },
  };
}

export function selectEdenHair(scene: SceneState, edenHairId: number): SceneState {
  const clamped = Math.max(1, Math.min(54, Math.round(edenHairId || 1)));
  return {
    ...scene,
    character: {
      ...scene.character,
      edenHairId: clamped,
    },
  };
}

export function randomizeEdenHair(
  scene: SceneState,
  randomFn: () => number = Math.random
): SceneState {
  const hairs = listEdenHairs();
  const currentId = scene.character.edenHairId ?? 1;
  const candidates = hairs.filter((h) => h.id !== currentId);
  const pool = candidates.length > 0 ? candidates : hairs;
  const index = Math.min(
    pool.length - 1,
    Math.max(0, Math.floor(randomFn() * pool.length))
  );
  return {
    ...scene,
    character: {
      ...scene.character,
      edenHairId: pool[index].id,
    },
  };
}

export function updateRoomStage(scene: SceneState, stageId: string): SceneState {
  return {
    ...scene,
    stageId,
  };
}

export function updateCameraFraming(
  scene: SceneState,
  patch: Partial<CameraConfig>
): SceneState {
  return {
    ...scene,
    camera: {
      ...scene.camera,
      ...patch,
    },
  };
}

export function updateBackdropFilters(
  scene: SceneState,
  patch: Partial<BackdropFilterConfig>
): SceneState {
  return {
    ...scene,
    backdrop: {
      ...scene.backdrop,
      ...patch,
    },
  };
}

export function resetCameraAndBackdrop(scene: SceneState): SceneState {
  return {
    ...scene,
    camera: { ...DEFAULT_CAMERA_CONFIG },
    backdrop: { ...DEFAULT_BACKDROP_FILTERS },
  };
}

export function toggleEditorOverlay(
  scene: SceneState,
  overlay: 'safeZone' | 'snapGrid'
): SceneState {
  if (overlay === 'safeZone') {
    return {
      ...scene,
      editorOverlays: {
        ...scene.editorOverlays,
        showSafeZoneOverlay: !scene.editorOverlays.showSafeZoneOverlay,
      },
    };
  }
  return {
    ...scene,
    editorOverlays: {
      ...scene.editorOverlays,
      showSnapGrid: !scene.editorOverlays.showSnapGrid,
    },
  };
}

function getFormationCoordinates(index: number, count: number, preset: FormationPreset): Vec2 {
  const safeCount = Math.max(1, count);
  const t = safeCount === 1 ? 0.5 : index / (safeCount - 1);

  if (preset === 'row') {
    return {
      x: Math.round(520 + t * 520),
      y: 505,
    };
  }

  if (preset === 'grid-2x2') {
    const col = index % 2;
    const row = Math.floor(index / 2);
    return {
      x: 620 + col * 220,
      y: 420 + row * 110,
    };
  }

  if (preset === 'flank') {
    const isLeft = index < Math.ceil(safeCount / 2);
    const sideIndex = isLeft ? index : index - Math.ceil(safeCount / 2);
    return {
      x: isLeft ? 200 + sideIndex * 110 : 860 + sideIndex * 110,
      y: 490 + (sideIndex % 2) * 35,
    };
  }

  // Default 'arc'
  const arcY = Math.round(515 - Math.sin(t * Math.PI) * 55);
  return {
    x: Math.round(530 + t * 500),
    y: arcY,
  };
}

export function resolveSceneLayout(scene: SceneState): ResolvedSceneNode[] {
  const spriteNodes: ResolvedSceneNode[] = [
    {
      id: scene.character.id,
      kind: 'character' as const,
      x: scene.character.x,
      y: scene.character.y,
      scale: scene.character.scale,
      rotationDeg: 0,
      zIndex: Math.round(scene.character.y),
    },
    ...scene.pedestals.map((slot, idx) => {
      const base = getFormationCoordinates(idx, scene.pedestals.length, scene.formationPreset);
      const offset = slot.manualOffset ?? { x: 0, y: 0 };
      const x = Math.max(40, Math.min(1240, base.x + offset.x));
      const y = Math.max(80, Math.min(680, base.y + offset.y));
      return {
        id: slot.id,
        kind: 'pedestal' as const,
        x,
        y,
        scale: 1.5,
        rotationDeg: 0,
        zIndex: Math.round(y),
      };
    }),
  ].sort((a, b) => a.zIndex - b.zIndex);

  const textNodes: ResolvedSceneNode[] = scene.textLayers.map((layer, idx) => ({
    id: layer.id,
    kind: 'text',
    x: layer.x,
    y: layer.y,
    scale: 1,
    rotationDeg: layer.rotationDeg,
    zIndex: 1000 + idx,
  }));

  return [...spriteNodes, ...textNodes];
}
