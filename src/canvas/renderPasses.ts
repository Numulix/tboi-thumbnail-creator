import {
  ALTAR_SPRITE_CELLS,
  composeCharacterStack,
  getCollectibleById,
} from '../catalog/gameAssetsCatalog';
import { getRoomBackdropById } from '../catalog/roomCatalog';
import {
  TEXT_FONT_OPTIONS,
  TEXT_GRADIENT_SWATCHES,
  type ResolvedSceneNode,
  type SceneState,
} from '../domain/sceneDocument';
import { ASSET_URLS, type AssetStore } from './assetStore';
import { computeTextLayerBoxMetrics, getNodeGizmoBounds } from './gizmoGeometry';

export function renderRoomBackdropPass(
  ctx: CanvasRenderingContext2D,
  scene: SceneState,
  assetStore: AssetStore,
  width: number,
  height: number
): void {
  const room = getRoomBackdropById(scene.stageId);
  const pixelSurface = assetStore.getOrCreateRoomPixelSurface(room);

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

export function renderSpritePass(
  ctx: CanvasRenderingContext2D,
  scene: SceneState,
  resolvedNodes: ResolvedSceneNode[],
  assetStore: AssetStore,
  scaleRatio: number
): void {
  ctx.save();
  ctx.imageSmoothingEnabled = false;

  const collectiblesAtlas = assetStore.get(ASSET_URLS.collectiblesAtlas);
  const altarSheet = assetStore.get(ASSET_URLS.altarSheet);

  const spriteNodes = resolvedNodes.filter(
    (node) => node.kind === 'character' || node.kind === 'pedestal'
  );

  for (const node of spriteNodes) {
    const nx = Math.round(node.x * scaleRatio);
    const ny = Math.round(node.y * scaleRatio);

    ctx.save();
    if (node.rotationDeg !== 0) {
      ctx.translate(nx, ny);
      ctx.rotate((node.rotationDeg * Math.PI) / 180);
      ctx.translate(-nx, -ny);
    }

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

        const atlasBitmap = layer.atlasUrl ? assetStore.get(layer.atlasUrl) : undefined;
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
      const scaleFactor = (node.scale || 1.5) / 1.5;
      const pedPixelScale = 3.4 * scaleFactor * scaleRatio;
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

        // Authentic stone pedestal altar
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

        // Authentic floating-item oval shadow on top of the altar
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
        const pedW = 68 * scaleFactor * scaleRatio;
        const pedH = 52 * scaleFactor * scaleRatio;
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

    ctx.restore();
  }

  ctx.restore();
}

export function renderTypographyPass(
  ctx: CanvasRenderingContext2D,
  scene: SceneState,
  scaleRatio: number
): void {
  ctx.save();
  ctx.imageSmoothingEnabled = true;

  for (const layer of scene.textLayers) {
    const tx = layer.x * scaleRatio;
    const ty = layer.y * scaleRatio;
    const fontSize = Math.max(6, Math.round(layer.fontSize * scaleRatio));
    const metrics = computeTextLayerBoxMetrics(layer);
    const fontFamilyId = layer.fontFamily ?? 'upheaval';
    const fontOpt =
      TEXT_FONT_OPTIONS.find((f) => f.id === fontFamilyId) ??
      TEXT_FONT_OPTIONS[0];
    const swatch =
      TEXT_GRADIENT_SWATCHES[layer.swatch ?? 'gold-orange'] ??
      TEXT_GRADIENT_SWATCHES['gold-orange'];
    const rotationDeg = layer.rotationDeg ?? 0;

    ctx.save();
    ctx.translate(tx, ty);
    if (rotationDeg !== 0) {
      ctx.rotate((rotationDeg * Math.PI) / 180);
    }

    if (layer.inkBanner) {
      const bannerW = metrics.bannerW * scaleRatio;
      const bannerH = metrics.bannerH * scaleRatio;
      const bannerLeft = metrics.bannerLeft * scaleRatio;

      // Dark Isaac Ink-Streak Torn Underlay Band
      ctx.fillStyle = 'rgba(10, 8, 12, 0.86)';
      ctx.fillRect(bannerLeft, -bannerH / 2, bannerW, bannerH);

      // Tapered ink-streak end feathers & top/bottom parchment/brimstone rules
      ctx.fillStyle = 'rgba(200, 58, 58, 0.48)';
      ctx.fillRect(
        bannerLeft + 10 * scaleRatio,
        -bannerH / 2 + 2 * scaleRatio,
        bannerW - 20 * scaleRatio,
        Math.max(1, 2 * scaleRatio)
      );
      ctx.fillStyle = 'rgba(229, 169, 60, 0.42)';
      ctx.fillRect(
        bannerLeft + 14 * scaleRatio,
        bannerH / 2 - 4 * scaleRatio,
        bannerW - 28 * scaleRatio,
        Math.max(1, 2 * scaleRatio)
      );
    }

    ctx.font = `900 ${fontSize}px ${fontOpt.cssFamily}`;
    ctx.textAlign = metrics.align;
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';

    const strokeW =
      (layer.strokeWidth ?? 6) > 0
        ? Math.max(1.5, (layer.strokeWidth ?? 6) * scaleRatio * 1.8)
        : 0;
    const dropShadowPx = (layer.dropShadow ?? 6) * scaleRatio;

    // 1. Hard Black Drop Shadow pass
    if (dropShadowPx > 0) {
      const shadowOffset = Math.max(1, Math.round(dropShadowPx));
      ctx.fillStyle = '#000000';
      ctx.strokeStyle = '#000000';
      if (strokeW > 0) {
        ctx.lineWidth = strokeW;
        ctx.strokeText(layer.text, shadowOffset, shadowOffset);
      }
      ctx.fillText(layer.text, shadowOffset, shadowOffset);
    }

    // 2. Thick Black Pixel Stroke (#000000)
    if (strokeW > 0) {
      ctx.lineWidth = strokeW;
      ctx.strokeStyle = '#000000';
      ctx.strokeText(layer.text, 0, 0);
    }

    // 3. Vertical Linear Gradient Swatch Fill
    const grad = ctx.createLinearGradient(
      0,
      -fontSize * 0.55,
      0,
      fontSize * 0.55
    );
    grad.addColorStop(0, swatch.topColor);
    grad.addColorStop(0.5, swatch.midColor);
    grad.addColorStop(1, swatch.bottomColor);
    ctx.fillStyle = grad;
    ctx.fillText(layer.text, 0, 0);

    ctx.restore();
  }

  ctx.restore();
}

export function renderEditorOverlayPass(
  ctx: CanvasRenderingContext2D,
  scene: SceneState,
  resolvedNodes: ResolvedSceneNode[],
  width: number,
  height: number,
  scaleRatio: number,
  selectedNodeId?: string | null
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

  // Interactive Cyan Transform Gizmo (#22D3EE) around selected canvas node
  if (selectedNodeId) {
    const bounds = getNodeGizmoBounds(scene, resolvedNodes, selectedNodeId);
    if (bounds) {
      ctx.save();
      ctx.translate(bounds.anchorX * scaleRatio, bounds.anchorY * scaleRatio);
      if (bounds.rotationDeg !== 0) {
        ctx.rotate((bounds.rotationDeg * Math.PI) / 180);
      }

      const boxX = bounds.localLeft * scaleRatio;
      const boxY = bounds.localTop * scaleRatio;
      const boxW = (bounds.localRight - bounds.localLeft) * scaleRatio;
      const boxH = (bounds.localBottom - bounds.localTop) * scaleRatio;
      const centerX = boxX + boxW / 2;
      const handleY = boxY - 28 * scaleRatio;

      // Bounding Box (#22D3EE)
      ctx.strokeStyle = '#22D3EE';
      ctx.lineWidth = Math.max(1.5, 2 * scaleRatio);
      ctx.strokeRect(boxX, boxY, boxW, boxH);

      // Rotation stem & top handle knob
      ctx.beginPath();
      ctx.moveTo(centerX, boxY);
      ctx.lineTo(centerX, handleY);
      ctx.stroke();

      ctx.fillStyle = '#0D0B0E';
      ctx.beginPath();
      ctx.arc(centerX, handleY, Math.max(4, 6 * scaleRatio), 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 4 Corner Control Handles
      const handleSize = Math.max(5, 8 * scaleRatio);
      const halfH = handleSize / 2;
      const corners = [
        [boxX, boxY],
        [boxX + boxW, boxY],
        [boxX, boxY + boxH],
        [boxX + boxW, boxY + boxH],
      ];
      for (const [cx, cy] of corners) {
        ctx.fillStyle = '#0D0B0E';
        ctx.fillRect(cx - halfH, cy - halfH, handleSize, handleSize);
        ctx.strokeStyle = '#22D3EE';
        ctx.strokeRect(cx - halfH, cy - halfH, handleSize, handleSize);
      }

      ctx.restore();
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
