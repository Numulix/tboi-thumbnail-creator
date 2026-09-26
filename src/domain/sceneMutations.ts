import {
  getCharacterById,
  getCollectibleById,
  listEdenHairs,
  resolveCharacterEdenHairId,
} from '../catalog/gameAssetsCatalog';
import {
  clampRotationDeg,
  clampStageCoords,
  clampTextStageCoords,
  getFormationCoordinates,
} from './sceneLayout';
import {
  DEFAULT_BACKDROP_FILTERS,
  DEFAULT_CAMERA_CONFIG,
  DEFAULT_CHARACTER_POSITION,
  DEFAULT_CHARACTER_SCALE,
  STARTER_PEDESTAL_POOL,
  type BackdropFilterConfig,
  type CameraConfig,
  type CharacterPoseId,
  type FormationPreset,
  type PedestalSlotNode,
  type SceneState,
  type TextLayerNode,
  type Vec2,
} from './sceneTypes';

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

export function resetNodePositions(scene: SceneState): SceneState {
  return {
    ...scene,
    character: {
      ...scene.character,
      x: DEFAULT_CHARACTER_POSITION.x,
      y: DEFAULT_CHARACTER_POSITION.y,
      rotationDeg: 0,
    },
    pedestals: scene.pedestals.map((slot) => ({
      ...slot,
      manualOffset: undefined,
      rotationDeg: 0,
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

export function addTextLayer(
  scene: SceneState,
  partial?: Partial<Omit<TextLayerNode, 'id'>>
): SceneState {
  const existingIds = new Set(scene.textLayers.map((l) => l.id));
  let nextNum = scene.textLayers.length + 1;
  while (existingIds.has(`text-layer-${nextNum}`)) {
    nextNum++;
  }
  const id = `text-layer-${nextNum}`;
  const defaultY = Math.min(225, 96 + scene.textLayers.length * 84);

  const newLayer: TextLayerNode = {
    id,
    text: partial?.text ?? `STREAK #${40 + nextNum}`,
    x: partial?.x ?? 640,
    y: partial?.y ?? defaultY,
    fontFamily: partial?.fontFamily ?? 'upheaval',
    fontSize: partial?.fontSize ?? 56,
    rotationDeg: clampRotationDeg(partial?.rotationDeg ?? 0),
    align: partial?.align ?? 'center',
    swatch: partial?.swatch ?? 'gold-orange',
    strokeWidth: partial?.strokeWidth ?? 6,
    dropShadow: partial?.dropShadow ?? 6,
    inkBanner: partial?.inkBanner ?? true,
  };

  return {
    ...scene,
    textLayers: [...scene.textLayers, newLayer],
  };
}

export function updateTextLayer(
  scene: SceneState,
  layerId: string,
  patch: Partial<Omit<TextLayerNode, 'id'>>
): SceneState {
  return {
    ...scene,
    textLayers: scene.textLayers.map((layer) => {
      if (layer.id !== layerId) {
        return layer;
      }
      const nextPos = clampTextStageCoords(
        patch.x ?? layer.x,
        patch.y ?? layer.y
      );
      const nextFontSize =
        patch.fontSize !== undefined
          ? Math.max(24, Math.min(120, Math.round(patch.fontSize)))
          : layer.fontSize;
      const nextRotation =
        patch.rotationDeg !== undefined
          ? clampRotationDeg(patch.rotationDeg)
          : layer.rotationDeg;
      const nextStroke =
        patch.strokeWidth !== undefined
          ? Math.max(0, Math.min(16, Number(patch.strokeWidth)))
          : layer.strokeWidth;
      const nextShadow =
        patch.dropShadow !== undefined
          ? Math.max(0, Math.min(20, Math.round(patch.dropShadow)))
          : layer.dropShadow;

      return {
        ...layer,
        ...patch,
        x: nextPos.x,
        y: nextPos.y,
        fontSize: nextFontSize,
        rotationDeg: nextRotation,
        strokeWidth: nextStroke,
        dropShadow: nextShadow,
      };
    }),
  };
}

export function deleteTextLayer(scene: SceneState, layerId: string): SceneState {
  return {
    ...scene,
    textLayers: scene.textLayers.filter((layer) => layer.id !== layerId),
  };
}

export function updateNodeRotation(
  scene: SceneState,
  nodeId: string,
  rotationDeg: number
): SceneState {
  const clamped = clampRotationDeg(rotationDeg);
  if (scene.textLayers.some((l) => l.id === nodeId)) {
    return updateTextLayer(scene, nodeId, { rotationDeg: clamped });
  }
  if (nodeId === 'character' || nodeId === scene.character.id) {
    return {
      ...scene,
      character: {
        ...scene.character,
        rotationDeg: clamped,
      },
    };
  }
  return {
    ...scene,
    pedestals: scene.pedestals.map((slot) =>
      slot.id === nodeId ? { ...slot, rotationDeg: clamped } : slot
    ),
  };
}

export function updateNodeScaleFromGizmo(
  scene: SceneState,
  nodeId: string,
  scaleRatio: number
): SceneState {
  const safeRatio = Math.max(0.5, Math.min(2.0, scaleRatio));
  const textLayer = scene.textLayers.find((l) => l.id === nodeId);
  if (textLayer) {
    return updateTextLayer(scene, nodeId, {
      fontSize: Math.round(textLayer.fontSize * safeRatio),
    });
  }
  if (nodeId === 'character' || nodeId === scene.character.id) {
    return updateCharacterScale(scene, scene.character.scale * safeRatio);
  }
  if (scene.pedestals.some((p) => p.id === nodeId)) {
    return updatePedestalScale(scene, (scene.pedestalScale ?? 1.5) * safeRatio);
  }
  return scene;
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

  if (scene.textLayers.some((layer) => layer.id === nodeId)) {
    return {
      ...scene,
      textLayers: scene.textLayers.map((layer) => {
        if (layer.id !== nodeId) {
          return layer;
        }
        const clamped = clampTextStageCoords(layer.x + delta.x, layer.y + delta.y);
        return {
          ...layer,
          x: clamped.x,
          y: clamped.y,
        };
      }),
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

export type SceneAction =
  | { type: 'select-character'; characterId: string }
  | { type: 'set-character-pose'; pose: CharacterPoseId }
  | { type: 'set-character-scale'; scale: number }
  | { type: 'reset-character-scale' }
  | { type: 'select-eden-hair'; edenHairId: number }
  | { type: 'randomize-eden-hair' }
  | { type: 'set-pedestal-count'; count: 3 | 4 | 5 | 6 }
  | { type: 'apply-formation'; preset: FormationPreset }
  | { type: 'set-pedestal-scale'; scale: number }
  | { type: 'assign-collectible'; pedestalId: string; itemId: number }
  | { type: 'reset-positions' }
  | { type: 'set-room-stage'; stageId: string }
  | { type: 'set-camera-framing'; patch: Partial<CameraConfig> }
  | { type: 'set-backdrop-filters'; patch: Partial<BackdropFilterConfig> }
  | { type: 'reset-camera-and-backdrop' }
  | { type: 'toggle-editor-overlay'; overlay: 'safeZone' | 'snapGrid' }
  | { type: 'add-text-layer'; partial?: Partial<Omit<TextLayerNode, 'id'>> }
  | { type: 'update-text-layer'; layerId: string; patch: Partial<Omit<TextLayerNode, 'id'>> }
  | { type: 'delete-text-layer'; layerId: string }
  | { type: 'update-node-rotation'; nodeId: string; rotationDeg: number }
  | { type: 'update-node-scale-gizmo'; nodeId: string; scaleRatio: number }
  | { type: 'update-node-drag-offset'; nodeId: string; delta: Vec2 }
  | { type: 'replace-scene'; scene: SceneState };

export function sceneReducer(scene: SceneState, action: SceneAction): SceneState {
  switch (action.type) {
    case 'select-character':
      return selectCharacter(scene, action.characterId);
    case 'set-character-pose':
      return updateCharacterPose(scene, action.pose);
    case 'set-character-scale':
      return updateCharacterScale(scene, action.scale);
    case 'reset-character-scale':
      return resetCharacterScale(scene);
    case 'select-eden-hair':
      return selectEdenHair(scene, action.edenHairId);
    case 'randomize-eden-hair':
      return randomizeEdenHair(scene);
    case 'set-pedestal-count':
      return updatePedestalCount(scene, action.count);
    case 'apply-formation':
      return applyFormationPreset(scene, action.preset);
    case 'set-pedestal-scale':
      return updatePedestalScale(scene, action.scale);
    case 'assign-collectible':
      return assignCollectibleToPedestal(scene, action.pedestalId, action.itemId);
    case 'reset-positions':
      return resetNodePositions(scene);
    case 'set-room-stage':
      return updateRoomStage(scene, action.stageId);
    case 'set-camera-framing':
      return updateCameraFraming(scene, action.patch);
    case 'set-backdrop-filters':
      return updateBackdropFilters(scene, action.patch);
    case 'reset-camera-and-backdrop':
      return resetCameraAndBackdrop(scene);
    case 'toggle-editor-overlay':
      return toggleEditorOverlay(scene, action.overlay);
    case 'add-text-layer':
      return addTextLayer(scene, action.partial);
    case 'update-text-layer':
      return updateTextLayer(scene, action.layerId, action.patch);
    case 'delete-text-layer':
      return deleteTextLayer(scene, action.layerId);
    case 'update-node-rotation':
      return updateNodeRotation(scene, action.nodeId, action.rotationDeg);
    case 'update-node-scale-gizmo':
      return updateNodeScaleFromGizmo(scene, action.nodeId, action.scaleRatio);
    case 'update-node-drag-offset':
      return updateNodeDragOffset(scene, action.nodeId, action.delta);
    case 'replace-scene':
      return action.scene;
    default:
      return scene;
  }
}

export function createSceneActions(dispatch: (action: SceneAction) => void) {
  return {
    selectCharacter: (characterId: string) =>
      dispatch({ type: 'select-character', characterId }),
    setCharacterPose: (pose: CharacterPoseId) =>
      dispatch({ type: 'set-character-pose', pose }),
    setCharacterScale: (scale: number) =>
      dispatch({ type: 'set-character-scale', scale }),
    resetCharacterScale: () => dispatch({ type: 'reset-character-scale' }),
    selectEdenHair: (edenHairId: number) =>
      dispatch({ type: 'select-eden-hair', edenHairId }),
    randomizeEdenHair: () => dispatch({ type: 'randomize-eden-hair' }),
    setPedestalCount: (count: 3 | 4 | 5 | 6) =>
      dispatch({ type: 'set-pedestal-count', count }),
    applyFormationPreset: (preset: FormationPreset) =>
      dispatch({ type: 'apply-formation', preset }),
    setPedestalScale: (scale: number) =>
      dispatch({ type: 'set-pedestal-scale', scale }),
    assignCollectible: (pedestalId: string, itemId: number) =>
      dispatch({ type: 'assign-collectible', pedestalId, itemId }),
    resetPositions: () => dispatch({ type: 'reset-positions' }),
    setRoomStage: (stageId: string) =>
      dispatch({ type: 'set-room-stage', stageId }),
    updateCameraFraming: (patch: Partial<CameraConfig>) =>
      dispatch({ type: 'set-camera-framing', patch }),
    updateBackdropFilters: (patch: Partial<BackdropFilterConfig>) =>
      dispatch({ type: 'set-backdrop-filters', patch }),
    resetCameraAndBackdrop: () =>
      dispatch({ type: 'reset-camera-and-backdrop' }),
    toggleOverlay: (overlay: 'safeZone' | 'snapGrid') =>
      dispatch({ type: 'toggle-editor-overlay', overlay }),
    addTextLayer: (partial?: Partial<Omit<TextLayerNode, 'id'>>) =>
      dispatch({ type: 'add-text-layer', partial }),
    updateTextLayer: (
      layerId: string,
      patch: Partial<Omit<TextLayerNode, 'id'>>
    ) => dispatch({ type: 'update-text-layer', layerId, patch }),
    deleteTextLayer: (layerId: string) =>
      dispatch({ type: 'delete-text-layer', layerId }),
    updateNodeRotation: (nodeId: string, rotationDeg: number) =>
      dispatch({ type: 'update-node-rotation', nodeId, rotationDeg }),
    updateNodeScaleFromGizmo: (nodeId: string, scaleRatio: number) =>
      dispatch({ type: 'update-node-scale-gizmo', nodeId, scaleRatio }),
    updateNodeDragOffset: (nodeId: string, delta: Vec2) =>
      dispatch({ type: 'update-node-drag-offset', nodeId, delta }),
    replaceScene: (scene: SceneState) =>
      dispatch({ type: 'replace-scene', scene }),
  };
}

export type SceneActions = ReturnType<typeof createSceneActions>;
