import { describe, expect, it } from 'vitest';
import {
  SNAP_GRID_STEP,
  createDefaultSceneState,
  resolveSceneLayout,
  snapToGrid,
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

  describe('snap grid', () => {
    function withSnapGrid(enabled: boolean) {
      const scene = createDefaultSceneState();
      return {
        ...scene,
        editorOverlays: { ...scene.editorOverlays, showSnapGrid: enabled },
      };
    }

    it('rounds snapToGrid values to the nearest grid step', () => {
      expect(snapToGrid(0)).toBe(0);
      expect(snapToGrid(SNAP_GRID_STEP / 2 - 1)).toBe(0);
      expect(snapToGrid(SNAP_GRID_STEP / 2)).toBe(SNAP_GRID_STEP);
      expect(snapToGrid(SNAP_GRID_STEP * 2 - 1)).toBe(SNAP_GRID_STEP * 2);
      expect(snapToGrid(97, 32)).toBe(96);
    });

    it('snaps a dragged text layer anchor to the grid when Snap Grid is on', () => {
      const controller = createCanvasInteractionController();
      const scene = withSnapGrid(true);

      // Headline is at (640, 96); grab it 5px right / 3px below its anchor.
      controller.onPointerDown({ x: 645, y: 99 }, scene);
      const moveRes = controller.onPointerMove({ x: 645 + 100, y: 99 + 30 }, scene);

      // Raw anchor target (740, 126) -> nearest grid points (768, 128)
      expect(moveRes.hasChanges).toBe(true);
      expect(moveRes.scene.textLayers[0].x).toBe(snapToGrid(740));
      expect(moveRes.scene.textLayers[0].y).toBe(snapToGrid(126));
    });

    it('snaps a dragged character anchor to the grid when Snap Grid is on', () => {
      const controller = createCanvasInteractionController();
      const scene = withSnapGrid(true);

      // Character is at (280, 505); grab it 45px above its anchor.
      controller.onPointerDown({ x: 280, y: 460 }, scene);
      const moveRes = controller.onPointerMove({ x: 280 + 50, y: 460 + 10 }, scene);

      // Raw anchor target (330, 515)
      expect(moveRes.scene.character.x).toBe(snapToGrid(330));
      expect(moveRes.scene.character.y).toBe(snapToGrid(515));
    });

    it('snaps a dragged pedestal to the grid when Snap Grid is on', () => {
      const controller = createCanvasInteractionController();
      const scene = withSnapGrid(true);
      const pedestal = resolveSceneLayout(scene).find((n) => n.kind === 'pedestal')!;

      const downRes = controller.onPointerDown(
        { x: pedestal.x, y: pedestal.y - 20 },
        scene
      );
      expect(downRes.selectedNode?.kind).toBe('pedestal');
      const moveRes = controller.onPointerMove(
        { x: pedestal.x + 13, y: pedestal.y - 20 + 7 },
        scene
      );

      const moved = resolveSceneLayout(moveRes.scene).find((n) => n.id === pedestal.id)!;
      expect(moved.x % SNAP_GRID_STEP).toBe(0);
      expect(moved.y % SNAP_GRID_STEP).toBe(0);
    });

    it('keeps the node on the grid across successive moves in the same drag', () => {
      const controller = createCanvasInteractionController();
      let scene = withSnapGrid(true);

      controller.onPointerDown({ x: 640, y: 96 }, scene);
      scene = controller.onPointerMove({ x: 700, y: 96 }, scene).scene;
      expect(scene.textLayers[0].x).toBe(snapToGrid(700));
      scene = controller.onPointerMove({ x: 730, y: 96 }, scene).scene;
      expect(scene.textLayers[0].x).toBe(snapToGrid(730));
      scene = controller.onPointerMove({ x: 780, y: 96 }, scene).scene;
      expect(scene.textLayers[0].x).toBe(snapToGrid(780));
    });

    it('reports no change once a snapped target is clamped at the stage edge', () => {
      const controller = createCanvasInteractionController();
      let scene = withSnapGrid(true);

      controller.onPointerDown({ x: 640, y: 96 }, scene);
      const first = controller.onPointerMove({ x: 1275, y: 96 }, scene);
      expect(first.hasChanges).toBe(true);
      expect(first.scene.textLayers[0].x).toBe(1240);
      scene = first.scene;

      const second = controller.onPointerMove({ x: 1278, y: 96 }, scene);
      expect(second.hasChanges).toBe(false);
      expect(second.scene).toBe(scene);
    });

    it('moves freely at 1px precision when Snap Grid is off', () => {
      const controller = createCanvasInteractionController();
      const scene = withSnapGrid(false);

      controller.onPointerDown({ x: 640, y: 96 }, scene);
      const moveRes = controller.onPointerMove({ x: 670, y: 111 }, scene);
      expect(moveRes.scene.textLayers[0].x).toBe(670);
      expect(moveRes.scene.textLayers[0].y).toBe(111);
    });

    it('follows the Snap Grid toggle mid-drag without the node jumping', () => {
      const controller = createCanvasInteractionController();

      controller.onPointerDown({ x: 640, y: 96 }, withSnapGrid(false));
      const free = controller.onPointerMove({ x: 670, y: 111 }, withSnapGrid(false));
      expect(free.scene.textLayers[0].x).toBe(670);
      expect(free.scene.textLayers[0].y).toBe(111);

      const snapped = controller.onPointerMove(
        { x: 700, y: 111 },
        { ...free.scene, editorOverlays: { ...free.scene.editorOverlays, showSnapGrid: true } }
      );
      expect(snapped.scene.textLayers[0].x).toBe(snapToGrid(700));
      expect(snapped.scene.textLayers[0].y).toBe(snapToGrid(111));

      const freeAgain = controller.onPointerMove(
        { x: 710, y: 130 },
        {
          ...snapped.scene,
          editorOverlays: { ...snapped.scene.editorOverlays, showSnapGrid: false },
        }
      );
      expect(freeAgain.scene.textLayers[0].x).toBe(snapToGrid(700) + 10);
      expect(freeAgain.scene.textLayers[0].y).toBe(snapToGrid(111) + 19);
    });
  });
});
