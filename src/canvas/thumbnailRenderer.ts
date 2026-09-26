import {
  ASSET_URLS,
  createAssetStore,
  preloadSceneAssets,
  resolveAssetSource,
  type AssetBitmapCache,
  type AssetStore,
} from './assetStore';
import {
  copyCanvasToClipboard,
  exportCanvasToPngBlob,
  triggerBlobDownload,
} from './exportPipeline';
import {
  renderEditorOverlayPass,
  renderRoomBackdropPass,
  renderSpritePass,
  renderTypographyPass,
} from './renderPasses';
import {
  getNodeGizmoBounds,
  type NodeGizmoGeometry,
} from './gizmoGeometry';
import { hitTestTextLayers } from './canvasInteractionEngine';
import type { ResolvedSceneNode, SceneState } from '../domain/sceneDocument';

export type { AssetBitmapCache, AssetStore, NodeGizmoGeometry };
export {
  ASSET_URLS,
  copyCanvasToClipboard,
  createAssetStore,
  exportCanvasToPngBlob,
  getNodeGizmoBounds,
  preloadSceneAssets,
  triggerBlobDownload,
};
export const hitTestTextLayer = hitTestTextLayers;

export interface RenderOptions {
  includeEditorOverlays: boolean;
  selectedNodeId?: string | null;
}

/**
 * Stage Render Pipeline
 * Coordinates multi-pass canvas rasterization across backdrop, sprites, typography, and editor overlays.
 */
export function renderThumbnail(
  ctx: CanvasRenderingContext2D,
  scene: SceneState,
  resolvedNodes: ResolvedSceneNode[],
  assetSource: AssetBitmapCache | AssetStore,
  options: RenderOptions
): void {
  const width = ctx.canvas?.width || 1280;
  const height = ctx.canvas?.height || 720;
  const scaleRatio = width / 1280;
  const store = resolveAssetSource(assetSource);

  ctx.clearRect(0, 0, width, height);

  // Pass 1: Room Backdrop & Camera with nearest-neighbor scaling
  renderRoomBackdropPass(ctx, scene, store, width, height);

  // Pass 2: Nearest-neighbor pixel-art sprites (Characters, Eden Hair, Altars, Collectibles)
  renderSpritePass(ctx, scene, resolvedNodes, store, scaleRatio);

  // Pass 3: High-DPI vector typography
  renderTypographyPass(ctx, scene, scaleRatio);

  // Pass 4: Editor Overlays (strictly excluded for 180x101 feed preview & clean exports)
  if (options.includeEditorOverlays) {
    renderEditorOverlayPass(
      ctx,
      scene,
      resolvedNodes,
      width,
      height,
      scaleRatio,
      options.selectedNodeId
    );
  }
}

/**
 * High-Leverage Thumbnail Export Helpers
 */
export function renderCleanThumbnailCanvas(
  scene: SceneState,
  resolvedNodes: ResolvedSceneNode[],
  assetSource: AssetBitmapCache | AssetStore
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    renderThumbnail(ctx, scene, resolvedNodes, assetSource, {
      includeEditorOverlays: false,
    });
  }
  return canvas;
}

export async function exportSceneToPngBlob(
  scene: SceneState,
  resolvedNodes: ResolvedSceneNode[],
  assetSource: AssetBitmapCache | AssetStore
): Promise<Blob> {
  const canvas = renderCleanThumbnailCanvas(scene, resolvedNodes, assetSource);
  return exportCanvasToPngBlob(canvas);
}

export async function downloadThumbnailPng(
  scene: SceneState,
  resolvedNodes: ResolvedSceneNode[],
  assetSource: AssetBitmapCache | AssetStore,
  customFilename?: string
): Promise<Blob> {
  const blob = await exportSceneToPngBlob(scene, resolvedNodes, assetSource);
  const filename = customFilename ?? `isaac-thumb-${scene.stageId}-1280x720.png`;
  triggerBlobDownload(blob, filename);
  return blob;
}

export async function copyThumbnailToClipboard(
  scene: SceneState,
  resolvedNodes: ResolvedSceneNode[],
  assetSource: AssetBitmapCache | AssetStore
): Promise<void> {
  const canvas = renderCleanThumbnailCanvas(scene, resolvedNodes, assetSource);
  await copyCanvasToClipboard(canvas);
}
