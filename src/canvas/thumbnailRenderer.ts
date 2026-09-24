import { getRoomBackdropById, type RoomBackdropRecord } from '../catalog/roomCatalog';
import type { ResolvedSceneNode, SceneState } from '../domain/sceneDocument';

export type AssetBitmapCache = Map<string, CanvasImageSource>;

export interface RenderOptions {
  includeEditorOverlays: boolean;
}

const roomPixelTileCache = new Map<string, HTMLCanvasElement>();

function getOrCreateRoomPixelSurface(room: RoomBackdropRecord): HTMLCanvasElement {
  const existing = roomPixelTileCache.get(room.id);
  if (existing) {
    return existing;
  }

  const tileCanvas = document.createElement('canvas');
  tileCanvas.width = 320;
  tileCanvas.height = 180;
  const tctx = tileCanvas.getContext('2d');
  if (!tctx) {
    return tileCanvas;
  }

  tctx.imageSmoothingEnabled = false;
  const { palette } = room;

  // Outer stone walls
  tctx.fillStyle = palette.wallColor;
  tctx.fillRect(0, 0, 320, 180);

  // Wall brick courses
  tctx.fillStyle = palette.wallBrickColor;
  for (let bx = 8; bx < 312; bx += 24) {
    tctx.fillRect(bx, 6, 20, 10);
    tctx.fillRect(bx + 6, 18, 18, 10);
  }

  // Inner dungeon floor area
  const floorX = 24;
  const floorY = 36;
  const floorW = 272;
  const floorH = 128;

  tctx.fillStyle = palette.floorPrimary;
  tctx.fillRect(floorX, floorY, floorW, floorH);

  // Checkerboard pixel floor planks / tiles
  const cellW = 16;
  const cellH = 16;
  for (let gy = 0; gy < floorH / cellH; gy++) {
    for (let gx = 0; gx < floorW / cellW; gx++) {
      const px = floorX + gx * cellW;
      const py = floorY + gy * cellH;
      if ((gx + gy) % 2 === 0) {
        tctx.fillStyle = palette.floorSecondary;
        tctx.fillRect(px, py, cellW - 1, cellH - 1);
      }
      // Grout line
      tctx.fillStyle = palette.groutColor;
      tctx.fillRect(px, py + cellH - 1, cellW, 1);
      tctx.fillRect(px + cellW - 1, py, 1, cellH);
    }
  }

  // Inner wall bevel border
  tctx.fillStyle = palette.groutColor;
  tctx.fillRect(floorX - 2, floorY - 2, floorW + 4, 2);
  tctx.fillRect(floorX - 2, floorY + floorH, floorW + 4, 2);
  tctx.fillRect(floorX - 2, floorY, 2, floorH);
  tctx.fillRect(floorX + floorW, floorY, 2, floorH);

  // Top North Doorway arch
  tctx.fillStyle = palette.doorFrameColor;
  tctx.fillRect(140, 8, 40, 28);
  tctx.fillStyle = palette.doorInnerColor;
  tctx.fillRect(146, 14, 28, 22);

  // Pixel particles / room embers
  tctx.fillStyle = palette.particleColor;
  const particleCoords = [
    [62, 64],
    [118, 92],
    [198, 74],
    [248, 118],
    [94, 138],
    [215, 142],
  ];
  for (const [px, py] of particleCoords) {
    tctx.fillRect(px, py, 2, 2);
  }

  roomPixelTileCache.set(room.id, tileCanvas);
  return tileCanvas;
}

function renderPass1RoomBackdrop(
  ctx: CanvasRenderingContext2D,
  scene: SceneState,
  width: number,
  height: number
): void {
  const room = getRoomBackdropById(scene.stageId);
  const pixelSurface = getOrCreateRoomPixelSurface(room);

  ctx.save();
  // Strict nearest-neighbor pixel scaling for floor tiles
  ctx.imageSmoothingEnabled = false;

  if (scene.backdrop.depthBlur > 0) {
    ctx.filter = `blur(${scene.backdrop.depthBlur}px)`;
  } else {
    ctx.filter = 'none';
  }

  const zoom = Math.max(1, scene.camera.zoom);
  const drawW = width * zoom;
  const drawH = height * zoom;
  const scaleRatio = width / 1280;
  const offsetX = (width - drawW) / 2 + scene.camera.panX * scaleRatio * 2;
  const offsetY = (height - drawH) / 2 + scene.camera.panY * scaleRatio * 2;

  ctx.fillStyle = room.palette.wallColor;
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(pixelSurface, offsetX, offsetY, drawW, drawH);

  ctx.filter = 'none';

  // Ambient center stage glow
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
  scaleRatio: number
): void {
  ctx.save();
  ctx.imageSmoothingEnabled = false;

  const spriteNodes = resolvedNodes.filter(
    (node) => node.kind === 'character' || node.kind === 'pedestal'
  );

  for (const node of spriteNodes) {
    const nx = node.x * scaleRatio;
    const ny = node.y * scaleRatio;

    // Ground oval drop shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
    const shadowW = (node.kind === 'character' ? 116 : 76) * scaleRatio;
    const shadowH = (node.kind === 'character' ? 22 : 16) * scaleRatio;
    ctx.fillRect(nx - shadowW / 2, ny - shadowH / 2, shadowW, shadowH);

    if (node.kind === 'character') {
      const charW = 86 * scaleRatio * (node.scale / 1.85);
      const charH = 112 * scaleRatio * (node.scale / 1.85);
      // Body
      ctx.fillStyle = '#000000';
      ctx.fillRect(nx - charW * 0.28 - 2, ny - charH * 0.48 - 2, charW * 0.56 + 4, charH * 0.46 + 4);
      ctx.fillStyle = '#F7D8B5';
      ctx.fillRect(nx - charW * 0.28, ny - charH * 0.48, charW * 0.56, charH * 0.46);

      // Head
      ctx.fillStyle = '#000000';
      ctx.fillRect(nx - charW * 0.46 - 3, ny - charH - 3, charW * 0.92 + 6, charH * 0.58 + 6);
      ctx.fillStyle = '#F7D8B5';
      ctx.fillRect(nx - charW * 0.46, ny - charH, charW * 0.92, charH * 0.58);

      // Eden Hair (Spiky)
      ctx.fillStyle = '#FBF7EE';
      ctx.fillRect(nx - charW * 0.48, ny - charH * 1.18, charW * 0.96, charH * 0.26);
    } else {
      const slot = scene.pedestals.find((p) => p.id === node.id);
      const pedW = 68 * scaleRatio;
      const pedH = 52 * scaleRatio;

      // Altar base
      const altarColor =
        slot?.altarStyle === 'gold'
          ? '#E5A93C'
          : slot?.altarStyle === 'devil'
            ? '#2A1822'
            : '#4A4152';
      ctx.fillStyle = '#000000';
      ctx.fillRect(nx - pedW / 2 - 2, ny - pedH - 2, pedW + 4, pedH + 4);
      ctx.fillStyle = altarColor;
      ctx.fillRect(nx - pedW / 2, ny - pedH, pedW, pedH);

      // Floating collectible icon above altar
      const itemSize = 44 * scaleRatio;
      const itemY = ny - pedH - itemSize - 14 * scaleRatio;

      if (slot?.highlightFx === 'q4-glow') {
        ctx.fillStyle = 'rgba(229, 169, 60, 0.35)';
        ctx.fillRect(nx - itemSize * 0.8, itemY - itemSize * 0.3, itemSize * 1.6, itemSize * 1.6);
      } else if (slot?.highlightFx === 'outline') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(nx - itemSize / 2 - 3, itemY - 3, itemSize + 6, itemSize + 6);
      }

      ctx.fillStyle = slot?.priceTag === 'blind' ? '#C83A3A' : '#E5A93C';
      ctx.fillRect(nx - itemSize / 2, itemY, itemSize, itemSize);
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
  _assetBitmaps: AssetBitmapCache,
  options: RenderOptions
): void {
  const width = ctx.canvas?.width || 1280;
  const height = ctx.canvas?.height || 720;
  const scaleRatio = width / 1280;

  ctx.clearRect(0, 0, width, height);

  // Pass 1: Room Backdrop & Camera with nearest-neighbor scaling
  renderPass1RoomBackdrop(ctx, scene, width, height);

  // Pass 2: Nearest-neighbor pixel-art sprites
  renderPass2Sprites(ctx, scene, resolvedNodes, scaleRatio);

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
