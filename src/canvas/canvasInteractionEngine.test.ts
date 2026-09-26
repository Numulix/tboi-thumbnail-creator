import { describe, expect, it } from 'vitest';
import {
  createDefaultSceneState,
  resolveSceneLayout,
} from '../domain/sceneDocument';
import {
  createCanvasInteractionController,
  hitTestSpriteNodes,
  hitTestTextLayers,
  viewportToCanvasPoint,
} from './canvasInteractionEngine';
import { getNodeGizmoBounds } from './gizmoGeometry';

describe('canvasInteractionEngine', () => {
  it('maps viewport client coordinates to 1280x720 stage coordinates using canvas bounding rect', () => {
    const mockCanvas = {
      getBoundingClientRect: () => ({
        left: 100,
        top: 50,
        width: 640,
        height: 360,
      }),
      width: 1280,
      height: 720,
    };

    // Client point at center of canvas rect
    const pt = viewportToCanvasPoint(mockCanvas, 420, 230);
    expect(pt.x).toBe(640);
    expect(pt.y).toBe(360);
  });

  it('hit tests text layers and sprite nodes in stage coordinates', () => {
    const scene = createDefaultSceneState();

    // Default scene has headline text at (640, 96)
    const hitText = hitTestTextLayers(scene, { x: 640, y: 96 });
    expect(hitText).not.toBeNull();
    expect(hitText?.id).toBe('text-headline');

    // Default scene character is at (280, 505)
    const hitChar = hitTestSpriteNodes(scene, { x: 280, y: 460 });
    expect(hitChar).not.toBeNull();
    expect(hitChar?.kind).toBe('character');
    expect(hitChar?.id).toBe('character');

    // Pedestal-1 is placed along formation
    const resolved = resolveSceneLayout(scene);
    const pedestalNode = resolved.find((n) => n.kind === 'pedestal')!;
    const hitPedestal = hitTestSpriteNodes(scene, {
      x: pedestalNode.x,
      y: pedestalNode.y - 20,
    });
    expect(hitPedestal).not.toBeNull();
    expect(hitPedestal?.kind).toBe('pedestal');
  });

  it('selects and drags text layer nodes across onPointerDown and onPointerMove', () => {
    const controller = createCanvasInteractionController();
    const scene = createDefaultSceneState();

    // 1. Pointer Down on text headline
    const downRes = controller.onPointerDown({ x: 640, y: 96 }, scene);
    expect(downRes.selectedNode).toEqual({ id: 'text-headline', kind: 'text' });
    expect(downRes.isDragging).toBe(true);
    expect(controller.isDragging()).toBe(true);

    // 2. Pointer Move with dx = +30, dy = +15
    const moveRes = controller.onPointerMove({ x: 670, y: 111 }, scene);
    expect(moveRes.hasChanges).toBe(true);
    expect(moveRes.scene.textLayers[0].x).toBe(640 + 30);
    expect(moveRes.scene.textLayers[0].y).toBe(96 + 15);

    // 3. Pointer Up ends drag
    controller.onPointerUp();
    expect(controller.isDragging()).toBe(false);
  });

  it('rotates a selected node when dragging its rotation handle stalk knob', () => {
    const controller = createCanvasInteractionController();
    const scene = createDefaultSceneState();
    const resolvedNodes = resolveSceneLayout(scene);

    const textBounds = getNodeGizmoBounds(scene, resolvedNodes, 'text-headline')!;
    expect(textBounds).not.toBeNull();

    // Pointer down on rotation handle knob
    const downRes = controller.onPointerDown(
      { x: textBounds.handleX, y: textBounds.handleY },
      scene,
      'text-headline'
    );
    expect(downRes.isDragging).toBe(true);
    expect(controller.getActiveDragSession()?.mode).toBe('rotate');

    // Drag handle 45 degrees to the right
    // handle was at (640, 36) relative to anchor (640, 96). Dragging to (680, 56)
    const moveRes = controller.onPointerMove({ x: 680, y: 56 }, scene);
    expect(moveRes.hasChanges).toBe(true);
    expect(moveRes.scene.textLayers[0].rotationDeg).not.toBe(0);

    controller.onPointerUp();
    expect(controller.isDragging()).toBe(false);
  });

  it('scales a selected node when dragging any of its 4 corner resize handles', () => {
    const controller = createCanvasInteractionController();
    const scene = createDefaultSceneState();
    const resolvedNodes = resolveSceneLayout(scene);

    const textBounds = getNodeGizmoBounds(scene, resolvedNodes, 'text-headline')!;
    const corner = textBounds.corners[0]; // top-left corner

    // Pointer down on top-left corner resize handle
    const downRes = controller.onPointerDown(corner, scene, 'text-headline');
    expect(downRes.isDragging).toBe(true);
    expect(controller.getActiveDragSession()?.mode).toBe('resize');

    // Drag outward further away from center anchor (640, 96)
    const initialFontSize = scene.textLayers[0].fontSize;
    const moveRes = controller.onPointerMove(
      { x: corner.x - 40, y: corner.y - 20 },
      scene
    );
    expect(moveRes.hasChanges).toBe(true);
    expect(moveRes.scene.textLayers[0].fontSize).toBeGreaterThan(initialFontSize);

    controller.onPointerUp();
    expect(controller.isDragging()).toBe(false);
  });

  it('clears selection when clicking empty backdrop stage coordinates', () => {
    const controller = createCanvasInteractionController();
    const scene = createDefaultSceneState();

    const downRes = controller.onPointerDown({ x: 50, y: 50 }, scene);
    expect(downRes.selectedNode).toBeNull();
    expect(downRes.isDragging).toBe(false);
  });
});
