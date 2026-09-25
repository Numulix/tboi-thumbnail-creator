import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  getRoomBackdropById,
  listRoomBackdrops,
} from './roomCatalog';

describe('roomCatalog', () => {
  it('bundles all required Repentance+ Main Path, Alt Path, and Special Rooms locally without external URLs', () => {
    const allRooms = listRoomBackdrops();
    const names = allRooms.map((r) => r.name);

    expect(names).toEqual(
      expect.arrayContaining([
        'Basement',
        'Burning Basement',
        'Downpour',
        'Mausoleum',
        'Corpse',
        'Devil Room',
        'Angel Room',
        'Planetarium',
        'Treasure Room',
        'Ultra Secret Red Room',
      ])
    );

    for (const room of allRooms) {
      expect(room.textureDataUrl.startsWith('/assets/rooms/')).toBe(true);
      expect(room.textureDataUrl).not.toMatch(/^https?:\/\//i);
      const diskPath = path.resolve('public', room.textureDataUrl.slice(1));
      expect(fs.existsSync(diskPath)).toBe(true);
    }

    const mainRooms = listRoomBackdrops('main');
    const altRooms = listRoomBackdrops('alt');
    const specialRooms = listRoomBackdrops('special');

    expect(mainRooms.length).toBeGreaterThanOrEqual(4);
    expect(altRooms.length).toBeGreaterThanOrEqual(4);
    expect(specialRooms.length).toBeGreaterThanOrEqual(5);

    const burningBasement = getRoomBackdropById('burning-basement');
    expect(burningBasement.name).toBe('Burning Basement');
    expect(burningBasement.category).toBe('main');
  });
});
