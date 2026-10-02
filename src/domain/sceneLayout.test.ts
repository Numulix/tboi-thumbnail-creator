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

  it('calculates baseline formation coordinates for arc, row, grid-2x2, and flank presets', () => {
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

    // Flank (count = 4)
    const flank0 = getFormationCoordinates(0, 4, 'flank');
    const flank3 = getFormationCoordinates(3, 4, 'flank');
    expect(flank0.x).toBeLessThan(280);
    expect(flank3.x).toBeGreaterThan(280);
    expect(flank3.x).toBeLessThan(640);
  });

  it('dynamically expands grid-2x2 columns and guarantees coordinates stay within 380px-620px stage window across counts 1-12', () => {
    for (let count = 1; count <= 12; count++) {
      const coords = Array.from({ length: count }, (_, i) =>
        getFormationCoordinates(i, count, 'grid-2x2')
      );

      // Verify vertical stage window: 380px–620px
      for (const pt of coords) {
        expect(pt.y).toBeGreaterThanOrEqual(380);
        expect(pt.y).toBeLessThanOrEqual(620);
        expect(pt.x).toBeGreaterThanOrEqual(40);
        expect(pt.x).toBeLessThanOrEqual(1240);
      }

      // Verify dynamic column expansion:
      // <= 5 slots: 2 columns
      // 6–8 slots: 3 columns
      // 9–12 slots: 4 columns
      const distinctXsInFirstRow = new Set(
        coords.filter((pt) => pt.y === coords[0].y).map((pt) => pt.x)
      );
      if (count <= 5) {
        expect(distinctXsInFirstRow.size).toBeLessThanOrEqual(2);
      } else if (count <= 8) {
        expect(distinctXsInFirstRow.size).toBeLessThanOrEqual(3);
        if (count >= 6) {
          expect(distinctXsInFirstRow.size).toBe(3);
        }
      } else {
        expect(distinctXsInFirstRow.size).toBeLessThanOrEqual(4);
        expect(distinctXsInFirstRow.size).toBe(4);
      }

      // Verify horizontal symmetry around center axis 780
      const avgX = coords.reduce((sum, pt) => sum + pt.x, 0) / count;
      expect(Math.abs(avgX - 780)).toBeLessThanOrEqual(1);
    }
  });

  it('arranges flank altars into dual left and right wings around Isaac (x: 280) without overlapping Isaac or advancing past screen center (640)', () => {
    for (let count = 1; count <= 12; count++) {
      const coords = Array.from({ length: count }, (_, i) =>
        getFormationCoordinates(i, count, 'flank')
      );

      for (const pt of coords) {
        // No altar overlaps Isaac at x: 280 (at least 70px clearance)
        expect(Math.abs(pt.x - 280)).toBeGreaterThanOrEqual(70);
        // Does not advance into or past the screen center (640)
        expect(pt.x).toBeLessThan(640);
        // Stays within canvas horizontal bounds
        expect(pt.x).toBeGreaterThanOrEqual(40);
        // Stays within vertical stage window: 380px–620px
        expect(pt.y).toBeGreaterThanOrEqual(380);
        expect(pt.y).toBeLessThanOrEqual(620);
      }

      // Check left wing (x < 280) and right wing (x > 280)
      const leftWing = coords.filter((pt) => pt.x < 280);
      const rightWing = coords.filter((pt) => pt.x > 280);

      if (count >= 2) {
        expect(leftWing.length).toBeGreaterThan(0);
        expect(rightWing.length).toBeGreaterThan(0);
      }

      // For even counts, verify exact reflection symmetry across Isaac at x: 280
      if (count % 2 === 0) {
        expect(leftWing.length).toBe(rightWing.length);
        const avgX = coords.reduce((sum, pt) => sum + pt.x, 0) / count;
        expect(Math.abs(avgX - 280)).toBeLessThanOrEqual(1);
      }

      // For high counts (>= 8), each wing clusters into staggered mini-columns (multiple distinct X positions)
      if (count >= 8) {
        const distinctLeftXs = new Set(leftWing.map((pt) => pt.x));
        const distinctRightXs = new Set(rightWing.map((pt) => pt.x));
        expect(distinctLeftXs.size).toBe(2);
        expect(distinctRightXs.size).toBe(2);
      }
    }
  });

  it('dynamically expands arc and row horizontal spans for up to 12 altars with compact spacing and balance within canvas boundaries (40px-1240px)', () => {
    const rowCoords4 = Array.from({ length: 4 }, (_, i) =>
      getFormationCoordinates(i, 4, 'row')
    );
    const rowCoords12 = Array.from({ length: 12 }, (_, i) =>
      getFormationCoordinates(i, 12, 'row')
    );

    const span4 = rowCoords4[3].x - rowCoords4[0].x;
    const span12 = rowCoords12[11].x - rowCoords12[0].x;

    // Horizontal span dynamically widens for large counts
    expect(span12).toBeGreaterThan(span4);

    // Spacing between adjacent altars at 12 items is compact and legible (>= 70px)
    const spacing12 = rowCoords12[1].x - rowCoords12[0].x;
    expect(spacing12).toBeGreaterThanOrEqual(70);

    for (let count = 1; count <= 12; count++) {
      const rowCoords = Array.from({ length: count }, (_, i) =>
        getFormationCoordinates(i, count, 'row')
      );
      const arcCoords = Array.from({ length: count }, (_, i) =>
        getFormationCoordinates(i, count, 'arc')
      );

      // Verify within-bounds
      for (const pt of [...rowCoords, ...arcCoords]) {
        expect(pt.x).toBeGreaterThanOrEqual(40);
        expect(pt.x).toBeLessThanOrEqual(1240);
        expect(pt.y).toBeGreaterThanOrEqual(380);
        expect(pt.y).toBeLessThanOrEqual(620);
      }

      // Symmetrically balanced around 780
      const rowAvgX = rowCoords.reduce((sum, pt) => sum + pt.x, 0) / count;
      const arcAvgX = arcCoords.reduce((sum, pt) => sum + pt.x, 0) / count;
      expect(Math.abs(rowAvgX - 780)).toBeLessThanOrEqual(1);
      expect(Math.abs(arcAvgX - 780)).toBeLessThanOrEqual(1);
    }
  });

  it('verifies stage coordinates across all 4 presets for counts 1 through 12 have no boundary clipping', () => {
    const presets = ['arc', 'row', 'grid-2x2', 'flank'] as const;

    for (const preset of presets) {
      for (let count = 1; count <= 12; count++) {
        for (let i = 0; i < count; i++) {
          const pt = getFormationCoordinates(i, count, preset);
          expect(pt.x).toBeGreaterThanOrEqual(40);
          expect(pt.x).toBeLessThanOrEqual(1240);
          expect(pt.y).toBeGreaterThanOrEqual(80);
          expect(pt.y).toBeLessThanOrEqual(680);
        }
      }
    }
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
