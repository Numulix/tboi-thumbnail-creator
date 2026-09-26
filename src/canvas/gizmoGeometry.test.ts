import { describe, expect, it } from 'vitest';
import {
  createDefaultSceneState,
  resolveSceneLayout,
} from '../domain/sceneDocument';
import {
  computeTextLayerBoxMetrics,
  getNodeGizmoBounds,
  hitTestRotatedLocalBounds,
  isPointInCircle,
  projectLocalGizmoGeometry,
} from './gizmoGeometry';

describe('gizmoGeometry', () => {
  it('computes symmetric box metrics for center-aligned text and offset metrics for left/right alignment', () => {
    const defaultScene = createDefaultSceneState();
    const textLayer = defaultScene.textLayers[0];

    const centerMetrics = computeTextLayerBoxMetrics({
      ...textLayer,
      align: 'center',
    });
    expect(centerMetrics.localLeft).toBe(-centerMetrics.boxW / 2);
    expect(centerMetrics.localRight).toBe(centerMetrics.boxW / 2);
    expect(centerMetrics.bannerLeft).toBe(-centerMetrics.bannerW / 2);

    const leftMetrics = computeTextLayerBoxMetrics({
      ...textLayer,
      align: 'left',
    });
    expect(leftMetrics.localLeft).toBe(-18);
    expect(leftMetrics.localRight).toBe(leftMetrics.boxW - 18);

    const rightMetrics = computeTextLayerBoxMetrics({
      ...textLayer,
      align: 'right',
    });
    expect(rightMetrics.localLeft).toBe(-rightMetrics.boxW + 18);
  });

  it('projects world coordinates for corners and rotation handle stalk accounting for rotationDeg', () => {
    const unrotated = projectLocalGizmoGeometry(
      'node-1',
      'text',
      640,
      100,
      0,
      -100,
      100,
      -40,
      40,
      28
    );
    expect(unrotated.handleX).toBe(640);
    expect(unrotated.handleY).toBe(100 - 40 - 28);
    expect(unrotated.corners[0]).toEqual({ x: 540, y: 60 });
    expect(unrotated.corners[3]).toEqual({ x: 740, y: 140 });

    const rotated90 = projectLocalGizmoGeometry(
      'node-1',
      'text',
      640,
      100,
      90,
      -100,
      100,
      -40,
      40,
      28
    );
    // At 90 deg rotation, upward stalk (0, -68) rotates to (+68, 0)
    expect(Math.round(rotated90.handleX)).toBe(640 + 68);
    expect(Math.round(rotated90.handleY)).toBe(100);
  });

  it('resolves gizmo bounds for text, character, and pedestal nodes from scene state', () => {
    const scene = createDefaultSceneState();
    const resolvedNodes = resolveSceneLayout(scene);

    const textBounds = getNodeGizmoBounds(scene, resolvedNodes, 'text-headline');
    expect(textBounds).not.toBeNull();
    expect(textBounds?.kind).toBe('text');
    expect(textBounds?.anchorX).toBe(640);
    expect(textBounds?.anchorY).toBe(96);

    const charBounds = getNodeGizmoBounds(scene, resolvedNodes, 'character');
    expect(charBounds).not.toBeNull();
    expect(charBounds?.kind).toBe('character');
    expect(charBounds?.anchorX).toBe(scene.character.x);

    const pedestalBounds = getNodeGizmoBounds(
      scene,
      resolvedNodes,
      scene.pedestals[0].id
    );
    expect(pedestalBounds).not.toBeNull();
    expect(pedestalBounds?.kind).toBe('pedestal');

    expect(getNodeGizmoBounds(scene, resolvedNodes, 'non-existent')).toBeNull();
  });

  it('performs rotated local hit-testing and circle distance tests correctly', () => {
    const bounds = projectLocalGizmoGeometry(
      'node-1',
      'text',
      500,
      500,
      0,
      -50,
      50,
      -20,
      20,
      28
    );

    const inside = hitTestRotatedLocalBounds(bounds, { x: 520, y: 510 });
    expect(inside.hit).toBe(true);

    const outside = hitTestRotatedLocalBounds(bounds, { x: 600, y: 500 });
    expect(outside.hit).toBe(false);

    expect(isPointInCircle({ x: 100, y: 100 }, { x: 110, y: 100 }, 15)).toBe(true);
    expect(isPointInCircle({ x: 100, y: 100 }, { x: 130, y: 100 }, 15)).toBe(false);
  });
});
