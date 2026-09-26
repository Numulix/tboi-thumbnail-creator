import {
  clampRotationDeg,
  resolveSceneLayout,
  updateNodeDragOffset,
  updateNodeRotation,
  updateNodeScaleFromGizmo,
  type SceneState,
  type TextLayerNode,
  type Vec2,
} from '../domain/sceneDocument';
import {
  getNodeGizmoBounds,
  hitTestRotatedLocalBounds,
  isPointInCircle,
} from './gizmoGeometry';

export interface InteractiveNodeSelection {
  id: string;
  kind: 'character' | 'pedestal' | 'text';
}

export type DragMode = 'move' | 'rotate' | 'resize';

export interface DragSessionState {
  mode: DragMode;
  nodeId: string;
  lastCanvasPos: Vec2;
  anchor?: Vec2;
}

export interface PointerDownResult {
  scene: SceneState;
  selectedNode: InteractiveNodeSelection | null;
  isDragging: boolean;
  cursor?: string;
}

export interface PointerMoveResult {
  scene: SceneState;
  hasChanges: boolean;
  cursor?: string;
}

export interface CanvasInteractionController {
  onPointerDown(
    stagePt: Vec2,
    scene: SceneState,
    currentSelectedNodeId?: string | null
  ): PointerDownResult;
  onPointerMove(stagePt: Vec2, scene: SceneState): PointerMoveResult;
  onPointerUp(): void;
  reset(): void;
  isDragging(): boolean;
  getActiveDragSession(): Readonly<DragSessionState> | null;
}

export interface CanvasDimensionsLike {
  getBoundingClientRect(): { left: number; top: number; width: number; height: number };
  width: number;
  height: number;
}

export function viewportToCanvasPoint(
  canvas: CanvasDimensionsLike,
  clientX: number,
  clientY: number
): Vec2 {
  const rect = canvas.getBoundingClientRect();
  const widthRatio = rect.width > 0 ? canvas.width / rect.width : 1;
  const heightRatio = rect.height > 0 ? canvas.height / rect.height : 1;
  return {
    x: (clientX - rect.left) * widthRatio,
    y: (clientY - rect.top) * heightRatio,
  };
}

export function hitTestTextLayers(
  scene: SceneState,
  stagePt: Vec2
): TextLayerNode | null {
  let bestLayer: TextLayerNode | null = null;
  let bestDist = Infinity;

  for (let i = scene.textLayers.length - 1; i >= 0; i--) {
    const layer = scene.textLayers[i];
    const bounds = getNodeGizmoBounds(scene, [], layer.id);
    if (!bounds) {
      continue;
    }
    const { hit, distanceToCenter } = hitTestRotatedLocalBounds(bounds, stagePt, 6);
    if (hit && distanceToCenter < bestDist) {
      bestDist = distanceToCenter;
      bestLayer = layer;
    }
  }

  return bestLayer;
}

export function hitTestSpriteNodes(
  scene: SceneState,
  stagePt: Vec2
): InteractiveNodeSelection | null {
  const resolvedNodes = resolveSceneLayout(scene);
  const spriteNodesDesc = [...resolvedNodes]
    .filter((n) => n.kind === 'character' || n.kind === 'pedestal')
    .reverse();

  let hitNode = spriteNodesDesc.find((node) => {
    const halfWidth = node.kind === 'character' ? 72 : 68;
    const topExtent = node.kind === 'character' ? 165 : 155;
    return (
      Math.abs(stagePt.x - node.x) <= halfWidth &&
      stagePt.y >= node.y - topExtent &&
      stagePt.y <= node.y + 40
    );
  });

  if (!hitNode) {
    let bestDist = 120;
    for (const node of spriteNodesDesc) {
      const dist = Math.hypot(stagePt.x - node.x, stagePt.y - (node.y - 35));
      if (dist <= bestDist) {
        bestDist = dist;
        hitNode = node;
      }
    }
  }

  if (!hitNode) {
    return null;
  }

  return {
    id: hitNode.kind === 'character' ? 'character' : hitNode.id,
    kind: hitNode.kind,
  };
}

export function createCanvasInteractionController(): CanvasInteractionController {
  let activeDrag: DragSessionState | null = null;

  return {
    onPointerDown(
      stagePt: Vec2,
      scene: SceneState,
      currentSelectedNodeId?: string | null
    ): PointerDownResult {
      const resolvedNodes = resolveSceneLayout(scene);

      // 1. Check if pointer hits currently selected node's cyan rotation handle knob or 4 corner resize handles
      if (currentSelectedNodeId) {
        const activeBounds = getNodeGizmoBounds(
          scene,
          resolvedNodes,
          currentSelectedNodeId
        );

        if (activeBounds) {
          // Check cyan rotation knob (radius 28px)
          if (
            isPointInCircle(
              { x: activeBounds.handleX, y: activeBounds.handleY },
              stagePt,
              28
            )
          ) {
            activeDrag = {
              mode: 'rotate',
              nodeId: activeBounds.nodeId,
              lastCanvasPos: stagePt,
              anchor: { x: activeBounds.anchorX, y: activeBounds.anchorY },
            };
            return {
              scene,
              selectedNode: {
                id: activeBounds.nodeId,
                kind: activeBounds.kind,
              },
              isDragging: true,
              cursor: 'grab',
            };
          }

          // Check 4 corner resize handles (radius 18px)
          const hitCorner = activeBounds.corners.some((corner) =>
            isPointInCircle(corner, stagePt, 18)
          );
          if (hitCorner) {
            activeDrag = {
              mode: 'resize',
              nodeId: activeBounds.nodeId,
              lastCanvasPos: stagePt,
              anchor: { x: activeBounds.anchorX, y: activeBounds.anchorY },
            };
            return {
              scene,
              selectedNode: {
                id: activeBounds.nodeId,
                kind: activeBounds.kind,
              },
              isDragging: true,
              cursor: 'nwse-resize',
            };
          }
        }
      }

      // 2. Check if pointer hits any Text Layer node (topmost first)
      const hitText = hitTestTextLayers(scene, stagePt);
      if (hitText) {
        activeDrag = {
          mode: 'move',
          nodeId: hitText.id,
          lastCanvasPos: stagePt,
        };
        return {
          scene,
          selectedNode: { id: hitText.id, kind: 'text' },
          isDragging: true,
          cursor: 'move',
        };
      }

      // 3. Check if pointer hits Character or Pedestal sprite nodes
      const hitSprite = hitTestSpriteNodes(scene, stagePt);
      if (hitSprite) {
        activeDrag = {
          mode: 'move',
          nodeId: hitSprite.id,
          lastCanvasPos: stagePt,
        };
        return {
          scene,
          selectedNode: hitSprite,
          isDragging: true,
          cursor: 'move',
        };
      }

      // 4. Clicked on empty backdrop stage space
      activeDrag = null;
      return {
        scene,
        selectedNode: null,
        isDragging: false,
      };
    },

    onPointerMove(stagePt: Vec2, scene: SceneState): PointerMoveResult {
      if (!activeDrag) {
        return { scene, hasChanges: false };
      }

      if (activeDrag.mode === 'rotate' && activeDrag.anchor) {
        const angleRad = Math.atan2(
          stagePt.x - activeDrag.anchor.x,
          -(stagePt.y - activeDrag.anchor.y)
        );
        const deg = clampRotationDeg((angleRad * 180) / Math.PI);
        activeDrag = {
          ...activeDrag,
          lastCanvasPos: stagePt,
        };
        const nextScene = updateNodeRotation(scene, activeDrag.nodeId, deg);
        return { scene: nextScene, hasChanges: true, cursor: 'grabbing' };
      }

      if (activeDrag.mode === 'resize' && activeDrag.anchor) {
        const prevDist = Math.max(
          24,
          Math.hypot(
            activeDrag.lastCanvasPos.x - activeDrag.anchor.x,
            activeDrag.lastCanvasPos.y - activeDrag.anchor.y
          )
        );
        const nextDist = Math.max(
          24,
          Math.hypot(
            stagePt.x - activeDrag.anchor.x,
            stagePt.y - activeDrag.anchor.y
          )
        );
        const scaleRatio = nextDist / prevDist;
        activeDrag = {
          ...activeDrag,
          lastCanvasPos: stagePt,
        };
        const nextScene = updateNodeScaleFromGizmo(
          scene,
          activeDrag.nodeId,
          scaleRatio
        );
        return { scene: nextScene, hasChanges: true, cursor: 'nwse-resize' };
      }

      // Move translation
      const dx = Math.round(stagePt.x - activeDrag.lastCanvasPos.x);
      const dy = Math.round(stagePt.y - activeDrag.lastCanvasPos.y);
      if (dx === 0 && dy === 0) {
        return { scene, hasChanges: false };
      }

      const { nodeId } = activeDrag;
      activeDrag = {
        ...activeDrag,
        lastCanvasPos: {
          x: activeDrag.lastCanvasPos.x + dx,
          y: activeDrag.lastCanvasPos.y + dy,
        },
      };

      const nextScene = updateNodeDragOffset(scene, nodeId, { x: dx, y: dy });
      return { scene: nextScene, hasChanges: true, cursor: 'move' };
    },

    onPointerUp(): void {
      activeDrag = null;
    },

    reset(): void {
      activeDrag = null;
    },

    isDragging(): boolean {
      return activeDrag !== null;
    },

    getActiveDragSession(): Readonly<DragSessionState> | null {
      return activeDrag;
    },
  };
}
