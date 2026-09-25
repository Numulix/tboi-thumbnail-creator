import {
  getCharacterById,
  getCollectibleById,
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
  pedestalScale: number;
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
export const DEFAULT_PEDESTAL_SCALE = 1.5;
export const DEFAULT_CHARACTER_POSITION: Vec2 = { x: 280, y: 505 };

const STARTER_PEDESTAL_POOL: PedestalSlotNode[] = [
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
  {
    id: 'pedestal-5',
    itemId: 331,
    itemName: 'Godhead',
    quality: 4,
    altarStyle: 'angel',
    priceTag: 'none',
    highlightFx: 'q4-glow',
  },
  {
    id: 'pedestal-6',
    itemId: 689,
    itemName: 'Glitched Crown',
    quality: 4,
    altarStyle: 'devil',
    priceTag: 'none',
    highlightFx: 'q4-glow',
  },
];

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
    pedestalScale: DEFAULT_PEDESTAL_SCALE,
    character: {
      id: 'eden',
      name: '09. Eden',
      pose: 'pickup',
      edenHairId: 12,
      scale: DEFAULT_CHARACTER_SCALE,
      x: DEFAULT_CHARACTER_POSITION.x,
      y: DEFAULT_CHARACTER_POSITION.y,
    },
    pedestals: STARTER_PEDESTAL_POOL.slice(0, 4).map((slot) => ({ ...slot })),
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

export function updatePedestalCount(
  scene: SceneState,
  count: 3 | 4 | 5 | 6
): SceneState {
  const clampedCount = Math.max(3, Math.min(6, Math.round(count)));
  const nextPedestals: PedestalSlotNode[] = [];

  for (let i = 0; i < clampedCount; i++) {
    const existing = scene.pedestals[i];
    if (existing) {
      nextPedestals.push({
        ...existing,
        manualOffset: undefined,
      });
    } else {
      const fallback = STARTER_PEDESTAL_POOL[i] ?? {
        id: `pedestal-${i + 1}`,
        itemId: 182,
        itemName: 'Sacred Heart',
        quality: 4 as const,
        altarStyle: 'stone' as const,
        priceTag: 'none' as const,
        highlightFx: 'none' as const,
      };
      nextPedestals.push({
        ...fallback,
        id: `pedestal-${i + 1}`,
        manualOffset: undefined,
      });
    }
  }

  return {
    ...scene,
    pedestals: nextPedestals,
  };
}

function clampStageCoords(x: number, y: number): Vec2 {
  return {
    x: Math.max(40, Math.min(1240, Math.round(x))),
    y: Math.max(80, Math.min(680, Math.round(y))),
  };
}

export function resetNodePositions(scene: SceneState): SceneState {
  return {
    ...scene,
    character: {
      ...scene.character,
      x: DEFAULT_CHARACTER_POSITION.x,
      y: DEFAULT_CHARACTER_POSITION.y,
    },
    pedestals: scene.pedestals.map((slot) => ({
      ...slot,
      manualOffset: undefined,
    })),
  };
}

export function applyFormationPreset(
  scene: SceneState,
  preset: FormationPreset
): SceneState {
  return {
    ...resetNodePositions(scene),
    formationPreset: preset,
  };
}

export function updatePedestalScale(scene: SceneState, scale: number): SceneState {
  const clamped = Math.max(1.0, Math.min(2.5, Number(scale.toFixed(2))));
  return {
    ...scene,
    pedestalScale: clamped,
  };
}

export function assignCollectibleToPedestal(
  scene: SceneState,
  pedestalId: string,
  itemId: number
): SceneState {
  const item = getCollectibleById(itemId);
  const isBlind = item.id === 0;

  return {
    ...scene,
    pedestals: scene.pedestals.map((slot) => {
      if (slot.id !== pedestalId) {
        return slot;
      }
      return {
        ...slot,
        itemId: item.id,
        itemName: item.name,
        quality: item.quality,
        priceTag: isBlind
          ? 'blind'
          : slot.priceTag === 'blind'
          ? 'none'
          : slot.priceTag,
        highlightFx:
          item.quality === 4 && slot.highlightFx === 'none'
            ? 'q4-glow'
            : slot.highlightFx,
      };
    }),
  };
}

export function updateNodeDragOffset(
  scene: SceneState,
  nodeId: string,
  delta: Vec2
): SceneState {
  if (nodeId === 'character' || nodeId === scene.character.id) {
    const clamped = clampStageCoords(
      scene.character.x + delta.x,
      scene.character.y + delta.y
    );
    return {
      ...scene,
      character: {
        ...scene.character,
        x: clamped.x,
        y: clamped.y,
      },
    };
  }

  return {
    ...scene,
    pedestals: scene.pedestals.map((slot, idx) => {
      if (slot.id !== nodeId) {
        return slot;
      }
      const base = getFormationCoordinates(
        idx,
        scene.pedestals.length,
        scene.formationPreset
      );
      const prevOffset = slot.manualOffset ?? { x: 0, y: 0 };
      const clamped = clampStageCoords(
        base.x + prevOffset.x + delta.x,
        base.y + prevOffset.y + delta.y
      );
      return {
        ...slot,
        manualOffset: {
          x: clamped.x - base.x,
          y: clamped.y - base.y,
        },
      };
    }),
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

function getFormationCoordinates(
  index: number,
  count: number,
  preset: FormationPreset
): Vec2 {
  const safeCount = Math.max(1, count);
  const t = safeCount === 1 ? 0.5 : index / (safeCount - 1);

  if (preset === 'row') {
    return {
      x: Math.round(530 + t * 500),
      y: 505,
    };
  }

  if (preset === 'grid-2x2') {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const totalRows = Math.ceil(safeCount / 2);
    const isTrailingSingle = safeCount % 2 === 1 && index === safeCount - 1;
    const x = isTrailingSingle ? 780 : 670 + col * 220;
    const startY = totalRows <= 2 ? 430 : 380;
    const rowStep = totalRows <= 2 ? 110 : 95;
    return {
      x,
      y: startY + row * rowStep,
    };
  }

  if (preset === 'flank') {
    const half = Math.floor(safeCount / 2);
    if (index < half) {
      return {
        x: 210 + index * 115,
        y: 490 + (index % 2) * 35,
      };
    }
    if (safeCount % 2 === 1 && index === half) {
      return {
        x: 640,
        y: 450,
      };
    }
    const mirrorIdx = safeCount - 1 - index;
    return {
      x: 1280 - (210 + mirrorIdx * 115),
      y: 490 + (mirrorIdx % 2) * 35,
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
  const pedestalScale = scene.pedestalScale ?? DEFAULT_PEDESTAL_SCALE;

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
      const base = getFormationCoordinates(
        idx,
        scene.pedestals.length,
        scene.formationPreset
      );
      const offset = slot.manualOffset ?? { x: 0, y: 0 };
      const { x, y } = clampStageCoords(base.x + offset.x, base.y + offset.y);
      return {
        id: slot.id,
        kind: 'pedestal' as const,
        x,
        y,
        scale: pedestalScale,
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
