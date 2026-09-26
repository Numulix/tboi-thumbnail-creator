import {
  DEFAULT_PEDESTAL_SCALE,
  type FormationPreset,
  type ResolvedSceneNode,
  type SceneState,
  type Vec2,
} from './sceneTypes';

export function clampStageCoords(x: number, y: number): Vec2 {
  return {
    x: Math.max(40, Math.min(1240, Math.round(x))),
    y: Math.max(80, Math.min(680, Math.round(y))),
  };
}

export function clampRotationDeg(rotationDeg: number): number {
  return Math.max(-45, Math.min(45, Math.round(rotationDeg)));
}

export function clampTextStageCoords(x: number, y: number): Vec2 {
  return {
    x: Math.max(40, Math.min(1240, Math.round(x))),
    y: Math.max(40, Math.min(680, Math.round(y))),
  };
}

export function getFormationCoordinates(
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
      rotationDeg: scene.character.rotationDeg ?? 0,
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
        rotationDeg: slot.rotationDeg ?? 0,
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
