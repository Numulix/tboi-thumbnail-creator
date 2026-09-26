import {
  type ResolvedSceneNode,
  type SceneState,
  type TextAlignMode,
  type TextLayerNode,
  type Vec2,
} from '../domain/sceneDocument';

export interface NodeGizmoGeometry {
  nodeId: string;
  kind: 'character' | 'pedestal' | 'text';
  anchorX: number;
  anchorY: number;
  rotationDeg: number;
  localLeft: number;
  localRight: number;
  localTop: number;
  localBottom: number;
  handleX: number;
  handleY: number;
  corners: Vec2[];
}

export interface TextLayerBoxMetrics {
  align: TextAlignMode;
  boxW: number;
  boxH: number;
  localLeft: number;
  localRight: number;
  localTop: number;
  localBottom: number;
  bannerW: number;
  bannerH: number;
  bannerLeft: number;
}

export function computeTextLayerBoxMetrics(layer: TextLayerNode): TextLayerBoxMetrics {
  const align = layer.align ?? 'center';
  const boxW = Math.max(
    180,
    Math.min(1160, Math.round(layer.text.length * layer.fontSize * 0.62 + 64))
  );
  const boxH = Math.max(52, Math.round(layer.fontSize * 1.38));
  const localLeft =
    align === 'left' ? -18 : align === 'right' ? -boxW + 18 : -boxW / 2;
  const bannerW = Math.max(420, boxW + 32);
  const bannerLeft =
    align === 'left' ? -24 : align === 'right' ? -bannerW + 24 : -bannerW / 2;

  return {
    align,
    boxW,
    boxH,
    localLeft,
    localRight: localLeft + boxW,
    localTop: -boxH / 2,
    localBottom: boxH / 2,
    bannerW,
    bannerH: boxH,
    bannerLeft,
  };
}

export function projectLocalGizmoGeometry(
  nodeId: string,
  kind: 'character' | 'pedestal' | 'text',
  anchorX: number,
  anchorY: number,
  rotationDeg: number,
  localLeft: number,
  localRight: number,
  localTop: number,
  localBottom: number,
  handleOffset: number
): NodeGizmoGeometry {
  const localCenterX = (localLeft + localRight) / 2;
  const localHandleY = localTop - handleOffset;
  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const toWorld = (lx: number, ly: number): Vec2 => ({
    x: anchorX + lx * cos - ly * sin,
    y: anchorY + lx * sin + ly * cos,
  });

  const handlePt = toWorld(localCenterX, localHandleY);
  const corners: Vec2[] = [
    toWorld(localLeft, localTop),
    toWorld(localRight, localTop),
    toWorld(localLeft, localBottom),
    toWorld(localRight, localBottom),
  ];

  return {
    nodeId,
    kind,
    anchorX,
    anchorY,
    rotationDeg,
    localLeft,
    localRight,
    localTop,
    localBottom,
    handleX: handlePt.x,
    handleY: handlePt.y,
    corners,
  };
}

export function getNodeGizmoBounds(
  scene: SceneState,
  resolvedNodes: ResolvedSceneNode[],
  nodeId: string
): NodeGizmoGeometry | null {
  const textLayer = scene.textLayers.find((l) => l.id === nodeId);
  if (textLayer) {
    const metrics = computeTextLayerBoxMetrics(textLayer);
    return projectLocalGizmoGeometry(
      textLayer.id,
      'text',
      textLayer.x,
      textLayer.y,
      textLayer.rotationDeg ?? 0,
      metrics.localLeft,
      metrics.localRight,
      metrics.localTop,
      metrics.localBottom,
      28
    );
  }

  const resolved = resolvedNodes.find(
    (n) =>
      n.id === nodeId || (nodeId === 'character' && n.kind === 'character')
  );
  if (resolved) {
    const halfW = resolved.kind === 'character' ? 68 : 64;
    const localTop = resolved.kind === 'character' ? -156 : -148;
    return projectLocalGizmoGeometry(
      resolved.kind === 'character' ? 'character' : resolved.id,
      resolved.kind,
      resolved.x,
      resolved.y,
      resolved.rotationDeg ?? 0,
      -halfW,
      halfW,
      localTop,
      20,
      26
    );
  }

  return null;
}

export function hitTestRotatedLocalBounds(
  bounds: NodeGizmoGeometry,
  pt: Vec2,
  padding = 6
): { hit: boolean; localX: number; localY: number; distanceToCenter: number } {
  const dx = pt.x - bounds.anchorX;
  const dy = pt.y - bounds.anchorY;
  const rad = (-bounds.rotationDeg * Math.PI) / 180;
  const lx = dx * Math.cos(rad) - dy * Math.sin(rad);
  const ly = dx * Math.sin(rad) + dy * Math.cos(rad);

  const hit =
    lx >= bounds.localLeft - padding &&
    lx <= bounds.localRight + padding &&
    ly >= bounds.localTop - padding &&
    ly <= bounds.localBottom + padding;

  const localCenterX = (bounds.localLeft + bounds.localRight) / 2;
  const distanceToCenter = Math.hypot(lx - localCenterX, ly);

  return { hit, localX: lx, localY: ly, distanceToCenter };
}

export function isPointInCircle(center: Vec2, pt: Vec2, radius: number): boolean {
  return Math.hypot(pt.x - center.x, pt.y - center.y) <= radius;
}
