import { getRoomBackdropById, type RoomBackdropRecord } from '../catalog/roomCatalog';
import type { SceneState } from '../domain/sceneDocument';

export type AssetBitmapCache = Map<string, CanvasImageSource>;

export const ASSET_URLS = {
  collectiblesAtlas: '/assets/collectibles/collectibles-atlas.png',
  altarSheet: '/assets/altars/levelitem_001_itemaltar.png',
  charactersAtlas: '/assets/characters/characters-atlas.png',
  edenHairsAtlas: '/assets/characters/eden-hairs-atlas.png',
} as const;

export interface AssetStore {
  readonly cache: AssetBitmapCache;
  get(url: string): CanvasImageSource | undefined;
  has(url: string): boolean;
  set(url: string, source: CanvasImageSource): void;
  getOrCreateRoomPixelSurface(room: RoomBackdropRecord): CanvasImageSource;
  preload(scene: SceneState, onLoaded?: () => void): void;
}

function generateRoomTileCanvas(room: RoomBackdropRecord): HTMLCanvasElement {
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

  return tileCanvas;
}

export function createAssetStore(initialCache?: AssetBitmapCache): AssetStore {
  const cache: AssetBitmapCache = initialCache ?? new Map();
  const pendingLoads = new Set<string>();
  const roomPixelTileCache = new Map<string, HTMLCanvasElement>();
  let bundledFontsPreloaded = false;

  return {
    get cache() {
      return cache;
    },

    get(url: string): CanvasImageSource | undefined {
      return cache.get(url);
    },

    has(url: string): boolean {
      return cache.has(url);
    },

    set(url: string, source: CanvasImageSource): void {
      cache.set(url, source);
    },

    getOrCreateRoomPixelSurface(room: RoomBackdropRecord): CanvasImageSource {
      const loaded = cache.get(room.textureUrl);
      if (loaded) {
        return loaded;
      }
      const existing = roomPixelTileCache.get(room.id);
      if (existing) {
        return existing;
      }
      const generated = generateRoomTileCanvas(room);
      roomPixelTileCache.set(room.id, generated);
      return generated;
    },

    preload(scene: SceneState, onLoaded?: () => void): void {
      if (
        !bundledFontsPreloaded &&
        typeof document !== 'undefined' &&
        'fonts' in document &&
        typeof document.fonts?.load === 'function'
      ) {
        bundledFontsPreloaded = true;
        Promise.all([
          document.fonts.load('900 64px "Upheaval TT"'),
          document.fonts.load('900 64px "Team Meat"'),
        ])
          .then(() => {
            onLoaded?.();
          })
          .catch(() => {
            // Fallback already embedded via inline @font-face data URI
          });
      }

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
    },
  };
}

const defaultGlobalStore = createAssetStore();

function isAssetStore(obj: unknown): obj is AssetStore {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'getOrCreateRoomPixelSurface' in obj &&
    typeof (obj as AssetStore).getOrCreateRoomPixelSurface === 'function'
  );
}

export function preloadSceneAssets(
  scene: SceneState,
  cacheOrStore: AssetBitmapCache | AssetStore,
  onLoaded?: () => void
): void {
  if (isAssetStore(cacheOrStore)) {
    cacheOrStore.preload(scene, onLoaded);
    return;
  }
  // Wrap cache map into an adapter store
  const store = createAssetStore(cacheOrStore);
  store.preload(scene, onLoaded);
}

export function resolveAssetSource(
  source: AssetBitmapCache | AssetStore | undefined
): AssetStore {
  if (!source) {
    return defaultGlobalStore;
  }
  if (isAssetStore(source)) {
    return source;
  }
  return createAssetStore(source);
}
