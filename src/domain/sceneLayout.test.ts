import { describe, expect, it } from 'vitest';
import { createDefaultSceneState } from './sceneTypes';
import {
  clampRotationDeg,
  clampStageCoords,
  clampTextStageCoords,
  getFormationCoordinates,
  resolveSceneLayout,
} from './sceneLayout';

describe('sceneLayout', () => {
  it('clamps stage and rotation coordinates to safe bounds', () => {
    expect(clampStageCoords(-100, -100)).toEqual({ x: 40, y: 80 });
    expect(clampStageCoords(2000, 2000)).toEqual({ x: 1240, y: 680 });

    expect(clampTextStageCoords(-10, -10)).toEqual({ x: 40, y: 40 });
    expect(clampTextStageCoords(2000, 2000)).toEqual({ x: 1240, y: 680 });

    expect(clampRotationDeg(-90)).toBe(-45);
    expect(clampRotationDeg(90)).toBe(45);
    expect(clampRotationDeg(15.4)).toBe(15);
  });

  it('calculates formation coordinates for arc, row, grid-2x2, and flank presets', () => {
    // Arc (count = 4)
    const arc0 = getFormationCoordinates(0, 4, 'arc');
    const arc3 = getFormationCoordinates(3, 4, 'arc');
    expect(arc0.x).toBeLessThan(arc3.x);

    // Row (count = 4)
    const row0 = getFormationCoordinates(0, 4, 'row');
    const row3 = getFormationCoordinates(3, 4, 'row');
    expect(row0.y).toBe(505);
    expect(row3.y).toBe(505);

    // Grid 2x2 (count = 4)
    const grid0 = getFormationCoordinates(0, 4, 'grid-2x2');
    const grid1 = getFormationCoordinates(1, 4, 'grid-2x2');
    const grid2 = getFormationCoordinates(2, 4, 'grid-2x2');
    expect(grid0.y).toBe(grid1.y);
    expect(grid2.y).toBeGreaterThan(grid0.y);

    // Flank (count = 5)
    const flankCenter = getFormationCoordinates(2, 5, 'flank');
    expect(flankCenter.x).toBe(640);
  });

  it('resolves scene layout ordering sprites by Y zIndex followed by text layers', () => {
    const scene = createDefaultSceneState();
    const resolved = resolveSceneLayout(scene);

    // Character + 4 pedestals + 1 text layer = 6 nodes
    expect(resolved).toHaveLength(6);

    const characterNode = resolved.find((n) => n.kind === 'character');
    expect(characterNode).toBeDefined();

    const textNodes = resolved.filter((n) => n.kind === 'text');
    expect(textNodes).toHaveLength(1);
    expect(textNodes[0].zIndex).toBeGreaterThanOrEqual(1000);
  });
});
