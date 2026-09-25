import {
  ALTAR_SPRITE_CELLS,
  composeCharacterStack,
  getCollectibleById,
} from '../catalog/gameAssetsCatalog';
import { getRoomBackdropById, type RoomBackdropRecord } from '../catalog/roomCatalog';
import type { ResolvedSceneNode, SceneState } from '../domain/sceneDocument';

export type AssetBitmapCache = Map<string, CanvasImageSource>;

export interface RenderOptions {
  includeEditorOverlays: boolean;
}

export const ASSET_URLS = {
  collectiblesAtlas: '/assets/collectibles/collectibles-atlas.png',
  altarSheet: '/assets/altars/levelitem_001_itemaltar.png',
  charactersAtlas: '/assets/characters/characters-atlas.png',
  edenHairsAtlas: '/assets/characters/eden-hairs-atlas.png',
} as const;

const pendingLoads = new Set<string>();
const roomPixelTileCache = new Map<string, HTMLCanvasElement>();

export function preloadSceneAssets(
  scene: SceneState,
  cache: AssetBitmapCache,
  onLoaded?: () => void
): void {
  if (typeof Image === 'undefined') {
    return;
  }

  const room = getRoomBackdropById(scene.stageId);
  const urlsToLoad = [
    room.textureUrl,
    ASSET_URLS.collectiblesAtlas,
    ASSET_URLS.altarSheet,
    ASSET_URLS.charactersAtlas,
    ASSET_URLS.edenHairsAtlas,
  ];

  for (const url of urlsToLoad) {
    if (cache.has(url) || pendingLoads.has(url)) {
      continue;
    }
    pendingLoads.add(url);
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      pendingLoads.delete(url);
      cache.set(url, img);
      onLoaded?.();
    };
    img.onerror = () => {
      pendingLoads.delete(url);
    };
    img.src = url;
  }
}

function getOrCreateRoomPixelSurface(room: RoomBackdropRecord): HTMLCanvasElement {
  const existing = roomPixelTileCache.get(room.id);
  if (existing) {
    return existing;
  }

  const tileCanvas = document.createElement('canvas');
  tileCanvas.width = 468;
  tileCanvas.height = 312;
  const tctx = tileCanvas.getContext('2d');
  if (!tctx) {
    return tileCanvas;
  }

  tctx.imageSmoothingEnabled = false;
  const { palette } = room;

  tctx.fillStyle = palette.wallColor;
  tctx.fillRect(0, 0, 468, 312);

  const floorX = 52;
  const floorY = 52;
  const floorW = 364;
  const floorH = 208;

  tctx.fillStyle = palette.floorPrimary;
  tctx.fillRect(floorX, floorY, floorW, floorH);

  const cellW = 26;
  const cellH = 26;
  for (let gy = 0; gy < floorH / cellH; gy++) {
    for (let gx = 0; gx < floorW / cellW; gx++) {
      const px = floorX + gx * cellW;
      const py = floorY + gy * cellH;
      if ((gx + gy) % 2 === 0) {
        tctx.fillStyle = palette.floorSecondary;
        tctx.fillRect(px, py, cellW - 1, cellH - 1);
      }
      tctx.fillStyle = palette.groutColor;
      tctx.fillRect(px, py + cellH - 1, cellW, 1);
      tctx.fillRect(px + cellW - 1, py, 1, cellH);
    }
  }

  roomPixelTileCache.set(room.id, tileCanvas);
  return tileCanvas;
}

function renderPass1RoomBackdrop(
  ctx: CanvasRenderingContext2D,
  scene: SceneState,
  assetBitmaps: AssetBitmapCache,
  width: number,
  height: number
): void {
  const room = getRoomBackdropById(scene.stageId);
  const loadedRoomBitmap = assetBitmaps.get(room.textureUrl);
  const pixelSurface = loadedRoomBitmap ?? getOrCreateRoomPixelSurface(room);

  ctx.save();
  // Strict nearest-neighbor pixel scaling for authentic Repentance+ room tiles
  ctx.imageSmoothingEnabled = false;

  if (scene.backdrop.depthBlur > 0) {
    ctx.filter = `blur(${scene.backdrop.depthBlur}px)`;
  } else {
    ctx.filter = 'none';
  }

  // Authentic room stitched dimensions are 468x312 (18x12 tiles of 26x26 px = 3:2 aspect).
  // At default camera.zoom = 2.1, drawW matches the full 1280px stage width while keeping 1:1 square pixels.
  const zoom = Math.max(1, scene.camera.zoom);
  const baseUnitScale = width / (468 * 2.1);
  const drawW = Math.round(468 * baseUnitScale * zoom);
  const drawH = Math.round(312 * baseUnitScale * zoom);
  const scaleRatio = width / 1280;
  const offsetX = Math.round((width - drawW) / 2 + scene.camera.panX * scaleRatio * 2);
  const offsetY = Math.round((height - drawH) / 2 + scene.camera.panY * scaleRatio * 2);

  ctx.fillStyle = '#08060A';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(pixelSurface, offsetX, offsetY, drawW, drawH);

  ctx.filter = 'none';

  // Subtle ambient center stage glow
  const ambientGrad = ctx.createRadialGradient(
    width * 0.5,
    height * 0.62,
    width * 0.05,
    width * 0.5,
    height * 0.62,
    width * 0.65
  );
  ambientGrad.addColorStop(0, room.palette.ambientGlowColor);
  ambientGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = ambientGrad;
  ctx.fillRect(0, 0, width, height);

  // Backdrop Dimming pass
  if (scene.backdrop.backdropDimming > 0) {
    const dimAlpha = Math.min(0.92, Math.max(0, scene.backdrop.backdropDimming / 100));
    ctx.fillStyle = `rgba(8, 6, 10, ${dimAlpha.toFixed(3)})`;
    ctx.fillRect(0, 0, width, height);
  }

  // Edge Vignette Intensity pass
  if (scene.backdrop.vignetteIntensity > 0) {
    const vigAlpha = Math.min(0.98, Math.max(0, scene.backdrop.vignetteIntensity / 100));
    const vigGrad = ctx.createRadialGradient(
      width * 0.5,
      height * 0.54,
      width * 0.22,
      width * 0.5,
      height * 0.54,
      width * 0.76
    );
    vigGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vigGrad.addColorStop(1, `rgba(7, 5, 9, ${vigAlpha.toFixed(3)})`);
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, width, height);
  }

  ctx.restore();
}

function renderPass2Sprites(
  ctx: CanvasRenderingContext2D,
  scene: SceneState,
  resolvedNodes: ResolvedSceneNode[],
  assetBitmaps: AssetBitmapCache,
  scaleRatio: number
): void {
  ctx.save();
  ctx.imageSmoothingEnabled = false;

  const collectiblesAtlas = assetBitmaps.get(ASSET_URLS.collectiblesAtlas);
  const altarSheet = assetBitmaps.get(ASSET_URLS.altarSheet);

  const spriteNodes = resolvedNodes.filter(
    (node) => node.kind === 'character' || node.kind === 'pedestal'
  );

  for (const node of spriteNodes) {
    const nx = Math.round(node.x * scaleRatio);
    const ny = Math.round(node.y * scaleRatio);

    if (node.kind === 'character') {
      const charPixelScale = 3.2 * (node.scale / 1.85) * scaleRatio;
      const stack = composeCharacterStack(scene.character);

      for (const layer of stack) {
        if (layer.kind === 'shadow') {
          const shadowW = Math.round(layer.dw * charPixelScale);
          const shadowH = Math.round(layer.dh * charPixelScale);
          ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
          if (typeof ctx.ellipse === 'function') {
            ctx.beginPath();
            ctx.ellipse(nx, ny, shadowW / 2, shadowH / 2, 0, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.fillRect(
              Math.round(nx - shadowW / 2),
              Math.round(ny - shadowH / 2),
              shadowW,
              shadowH
            );
          }
          continue;
        }

        const atlasBitmap = layer.atlasUrl ? assetBitmaps.get(layer.atlasUrl) : undefined;
        if (atlasBitmap) {
          ctx.drawImage(
            atlasBitmap,
            layer.sx,
            layer.sy,
            layer.sw,
            layer.sh,
            Math.round(nx + layer.dx * charPixelScale),
            Math.round(ny + layer.dy * charPixelScale),
            Math.round(layer.dw * charPixelScale),
            Math.round(layer.dh * charPixelScale)
          );
        } else if (layer.kind === 'body') {
          // Synchronous fallback when HTMLImageElement is still decoding
          const charW = 86 * scaleRatio * (node.scale / 1.85);
          const charH = 112 * scaleRatio * (node.scale / 1.85);
          ctx.fillStyle = '#F7D8B5';
          ctx.fillRect(nx - charW * 0.46, ny - charH, charW * 0.92, charH);
        }
      }
    } else {
      const slot = scene.pedestals.find((p) => p.id === node.id);
      const pedPixelScale = 3.4 * scaleRatio;
      const cellDestSize = Math.round(32 * pedPixelScale);

      // 1. Draw Altar Pedestal & Shadow from levelitem_001_itemaltar.png
      if (altarSheet && slot?.altarStyle !== 'hidden') {
        const styleKey =
          slot?.altarStyle === 'gold' ||
          slot?.altarStyle === 'devil' ||
          slot?.altarStyle === 'angel'
            ? slot.altarStyle
            : 'stone';
        const altarCell = ALTAR_SPRITE_CELLS[styleKey];
        const shadowCell = ALTAR_SPRITE_CELLS.shadow;

        // In the 32x32 altar cell, the base rests at y = 27, x = 16
        const altarDx = Math.round(nx - 16 * pedPixelScale);
        const altarDy = Math.round(ny - 27 * pedPixelScale);

        // 1. Authentic stone pedestal altar (col=0, row=0)
        ctx.drawImage(
          altarSheet,
          altarCell.col * 32,
          altarCell.row * 32,
          32,
          32,
          altarDx,
          altarDy,
          cellDestSize,
          cellDestSize
        );

        // 2. Authentic floating-item oval shadow on the top face of the stone altar (col=1, row=0)
        ctx.drawImage(
          altarSheet,
          shadowCell.col * 32,
          shadowCell.row * 32,
          32,
          32,
          altarDx,
          altarDy,
          cellDestSize,
          cellDestSize
        );
      } else if (!altarSheet && slot?.altarStyle !== 'hidden') {
        const pedW = 68 * scaleRatio;
        const pedH = 52 * scaleRatio;
        ctx.fillStyle = '#4A4152';
        ctx.fillRect(nx - pedW / 2, ny - pedH, pedW, pedH);
      }

      // 2. Draw Floating Collectible Sprite from collectibles-atlas.png
      const effectiveItemId = slot?.priceTag === 'blind' ? 0 : (slot?.itemId ?? 182);
      const itemEntry = getCollectibleById(effectiveItemId);
      const itemDx = Math.round(nx - 16 * pedPixelScale);
      const itemDy = Math.round(ny - 51 * pedPixelScale);

      if (slot?.highlightFx === 'q4-glow') {
        const glowRadius = cellDestSize * 0.72;
        const glowCenterY = itemDy + cellDestSize * 0.5;
        const glowGrad = ctx.createRadialGradient(
          nx,
          glowCenterY,
          glowRadius * 0.1,
          nx,
          glowCenterY,
          glowRadius
        );
        glowGrad.addColorStop(0, 'rgba(255, 215, 90, 0.55)');
        glowGrad.addColorStop(0.6, 'rgba(229, 169, 60, 0.22)');
        glowGrad.addColorStop(1, 'rgba(229, 169, 60, 0)');
        ctx.fillStyle = glowGrad;
        ctx.fillRect(
          nx - glowRadius,
          glowCenterY - glowRadius,
          glowRadius * 2,
          glowRadius * 2
        );
      }

      if (collectiblesAtlas) {
        const sx = itemEntry.atlasCol * 32;
        const sy = itemEntry.atlasRow * 32;
        ctx.drawImage(
          collectiblesAtlas,
          sx,
          sy,
          32,
          32,
          itemDx,
          itemDy,
          cellDestSize,
          cellDestSize
        );
      } else {
        const itemSize = 44 * scaleRatio;
        ctx.fillStyle = '#E5A93C';
        ctx.fillRect(nx - itemSize / 2, itemDy, itemSize, itemSize);
      }
    }
  }

  ctx.restore();
}

function renderPass3Typography(
  ctx: CanvasRenderingContext2D,
  scene: SceneState,
  scaleRatio: number
): void {
  ctx.save();
  ctx.imageSmoothingEnabled = true;

  for (const layer of scene.textLayers) {
    const tx = layer.x * scaleRatio;
    const ty = layer.y * scaleRatio;
    const fontSize = Math.max(8, Math.round(layer.fontSize * scaleRatio));

    if (layer.inkBanner) {
      const bannerW = 760 * scaleRatio;
      const bannerH = 84 * scaleRatio;
      ctx.fillStyle = 'rgba(10, 8, 12, 0.76)';
      ctx.fillRect(tx - bannerW / 2, ty - bannerH / 2, bannerW, bannerH);
    }

    ctx.font = `900 ${fontSize}px "Space Grotesk", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(1.5, layer.strokeWidth * scaleRatio * 1.6);
    ctx.strokeStyle = '#000000';
    ctx.strokeText(layer.text, tx, ty);

    const grad = ctx.createLinearGradient(0, ty - fontSize * 0.5, 0, ty + fontSize * 0.5);
    grad.addColorStop(0, '#FFF089');
    grad.addColorStop(0.5, '#FFB800');
    grad.addColorStop(1, '#FF7A00');
    ctx.fillStyle = grad;
    ctx.fillText(layer.text, tx, ty);
  }

  ctx.restore();
}

function renderPass4EditorOverlays(
  ctx: CanvasRenderingContext2D,
  scene: SceneState,
  width: number,
  height: number,
  scaleRatio: number
): void {
  ctx.save();

  // Optional Snap Grid
  if (scene.editorOverlays.showSnapGrid) {
    ctx.strokeStyle = 'rgba(229, 169, 60, 0.16)';
    ctx.lineWidth = 1;
    const step = Math.max(16, Math.round(64 * scaleRatio));
    for (let x = step; x < width; x += step) {
      ctx.strokeRect(x, 0, 1, height);
    }
    for (let y = step; y < height; y += step) {
      ctx.strokeRect(0, y, width, 1);
    }
  }

  // YouTube Timestamp Safe-Zone Overlay (19:42 YT SAFE ZONE)
  if (scene.editorOverlays.showSafeZoneOverlay) {
    const badgeW = 228 * scaleRatio;
    const badgeH = 44 * scaleRatio;
    const badgeX = width - badgeW - 20 * scaleRatio;
    const badgeY = height - badgeH - 18 * scaleRatio;

    ctx.fillStyle = 'rgba(13, 11, 14, 0.9)';
    ctx.fillRect(badgeX, badgeY, badgeW, badgeH);

    ctx.setLineDash([6 * scaleRatio, 4 * scaleRatio]);
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = Math.max(1, 2 * scaleRatio);
    ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);
    ctx.setLineDash([]);

    ctx.font = `700 ${Math.max(9, Math.round(15 * scaleRatio))}px "JetBrains Mono", monospace`;
    ctx.fillStyle = '#F87171';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('19:42 YT SAFE ZONE', badgeX + badgeW / 2, badgeY + badgeH / 2);
  }

  ctx.restore();
}

export function renderThumbnail(
  ctx: CanvasRenderingContext2D,
  scene: SceneState,
  resolvedNodes: ResolvedSceneNode[],
  assetBitmaps: AssetBitmapCache,
  options: RenderOptions
): void {
  const width = ctx.canvas?.width || 1280;
  const height = ctx.canvas?.height || 720;
  const scaleRatio = width / 1280;

  ctx.clearRect(0, 0, width, height);

  // Pass 1: Room Backdrop & Camera with nearest-neighbor scaling
  renderPass1RoomBackdrop(ctx, scene, assetBitmaps, width, height);

  // Pass 2: Nearest-neighbor pixel-art sprites (Characters, Eden Hair, Altars, Collectibles)
  renderPass2Sprites(ctx, scene, resolvedNodes, assetBitmaps, scaleRatio);

  // Pass 3: High-DPI vector typography
  renderPass3Typography(ctx, scene, scaleRatio);

  // Pass 4: Editor Overlays (strictly excluded for 180x101 feed preview & PNG/Clipboard exports)
  if (options.includeEditorOverlays) {
    renderPass4EditorOverlays(ctx, scene, width, height, scaleRatio);
  }
}

export function exportCanvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Failed to generate 1280x720 PNG blob from canvas'));
        return;
      }
      resolve(blob);
    }, 'image/png');
  });
}

export async function copyCanvasToClipboard(canvas: HTMLCanvasElement): Promise<void> {
  const blob = await exportCanvasToPngBlob(canvas);
  if (!navigator.clipboard || typeof navigator.clipboard.write !== 'function') {
    throw new Error('System clipboard image writing is not supported in this browser context');
  }
  const item = new ClipboardItem({ 'image/png': blob });
  await navigator.clipboard.write([item]);
}
