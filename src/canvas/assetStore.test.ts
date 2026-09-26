import { describe, expect, it, vi } from 'vitest';
import { getRoomBackdropById } from '../catalog/roomCatalog';
import { createDefaultSceneState } from '../domain/sceneDocument';
import {
  ASSET_URLS,
  createAssetStore,
  preloadSceneAssets,
  resolveAssetSource,
} from './assetStore';

describe('AssetStore', () => {
  it('stores and retrieves bitmaps in cache', () => {
    const store = createAssetStore();
    const mockCanvas = document.createElement('canvas');

    expect(store.has('test-url')).toBe(false);
    expect(store.get('test-url')).toBeUndefined();

    store.set('test-url', mockCanvas);
    expect(store.has('test-url')).toBe(true);
    expect(store.get('test-url')).toBe(mockCanvas);
  });

  it('generates and caches procedural room pixel surface when texture bitmap is missing', () => {
    const store = createAssetStore();
    const room = getRoomBackdropById('burning-basement');

    const surface1 = store.getOrCreateRoomPixelSurface(room);
    expect(surface1).toBeInstanceOf(HTMLCanvasElement);
    expect((surface1 as HTMLCanvasElement).width).toBe(468);
    expect((surface1 as HTMLCanvasElement).height).toBe(312);

    // Second call should retrieve cached canvas instance
    const surface2 = store.getOrCreateRoomPixelSurface(room);
    expect(surface2).toBe(surface1);

    // If texture is already set in cache, it should prefer the loaded texture
    const customTexture = document.createElement('canvas');
    store.set(room.textureUrl, customTexture);
    expect(store.getOrCreateRoomPixelSurface(room)).toBe(customTexture);
  });

  it('resolveAssetSource normalizes Map or AssetStore into an AssetStore adapter', () => {
    const customMap = new Map<string, CanvasImageSource>();
    const mockImage = document.createElement('canvas');
    customMap.set(ASSET_URLS.altarSheet, mockImage);

    const storeFromMap = resolveAssetSource(customMap);
    expect(storeFromMap.get(ASSET_URLS.altarSheet)).toBe(mockImage);

    const storeDirect = createAssetStore();
    expect(resolveAssetSource(storeDirect)).toBe(storeDirect);

    const storeDefault = resolveAssetSource(undefined);
    expect(storeDefault).toBeDefined();
  });

  it('preloadSceneAssets delegates to store preload method or wraps map', () => {
    const scene = createDefaultSceneState();
    const store = createAssetStore();
    const preloadSpy = vi.spyOn(store, 'preload');

    preloadSceneAssets(scene, store);
    expect(preloadSpy).toHaveBeenCalledTimes(1);

    const map = new Map<string, CanvasImageSource>();
    expect(() => preloadSceneAssets(scene, map)).not.toThrow();
  });
});
