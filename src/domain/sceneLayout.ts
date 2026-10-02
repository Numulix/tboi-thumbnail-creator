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
  const safeIndex = Math.max(0, Math.min(safeCount - 1, index));
  const t = safeCount === 1 ? 0.5 : safeIndex / (safeCount - 1);

  if (preset === 'row') {
    const span =
      safeCount <= 4 ? 500 : Math.min(860, 500 + (safeCount - 4) * 45);
    return {
      x: Math.round(780 - span / 2 + t * span),
      y: 505,
    };
  }

  if (preset === 'grid-2x2') {
    const cols = safeCount <= 5 ? 2 : safeCount <= 8 ? 3 : 4;
    const totalRows = Math.ceil(safeCount / cols);
    const row = Math.floor(safeIndex / cols);
    const colInRow = safeIndex % cols;
    const itemsInThisRow = Math.min(cols, safeCount - row * cols);

    const colStep = cols === 2 ? 220 : cols === 3 ? 180 : 150;
    const x =
      itemsInThisRow === 1
        ? 780
        : Math.round(780 + (colInRow - (itemsInThisRow - 1) / 2) * colStep);

    const startY = totalRows <= 2 ? 430 : 400;
    const rowStep = totalRows <= 2 ? 110 : 95;
    return {
      x,
      y: startY + row * rowStep,
    };
  }

  if (preset === 'flank') {
    if (safeCount === 1) {
      return { x: 385, y: 505 };
    }

    const leftCount = Math.floor(safeCount / 2);
    const isLeftWing = safeIndex < leftCount;
    const wingItemIdx = isLeftWing ? safeIndex : safeIndex - leftCount;
    const countInWing = isLeftWing ? leftCount : safeCount - leftCount;

    let dx = 105;
    let y = 505;

    if (safeCount < 6) {
      dx = 105;
      if (countInWing === 1) {
        y = 505;
      } else if (countInWing === 2) {
        y = wingItemIdx === 0 ? 460 : 550;
      } else {
        y = 425 + wingItemIdx * 80;
      }
    } else {
      const col = wingItemIdx % 2; // 0 = inner column, 1 = outer column
      const row = Math.floor(wingItemIdx / 2);
      dx = col === 0 ? 105 : 180;
      const baseY = 425 + row * 80;
      const stagger = col === 1 ? 25 : 0;
      y = baseY + stagger;
    }

    const x = isLeftWing ? 280 - dx : 280 + dx;
    return { x, y };
  }

  // Default 'arc'
  const span =
    safeCount <= 4 ? 500 : Math.min(860, 500 + (safeCount - 4) * 45);
  const arcY = Math.round(515 - Math.sin(t * Math.PI) * 55);
  return {
    x: Math.round(780 - span / 2 + t * span),
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
