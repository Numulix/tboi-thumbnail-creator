import { describe, expect, it } from 'vitest';
import {
  composeCharacterStack,
  listCharacters,
  listEdenHairs,
} from './gameAssetsCatalog';

describe('gameAssetsCatalog & SpriteCompositor.composeCharacterStack', () => {
  it('lists all 34 playable characters split into 17 Normal and 17 Tainted variants', () => {
    const allCharacters = listCharacters();
    const normalCharacters = listCharacters('normal');
    const taintedCharacters = listCharacters('tainted');

    expect(normalCharacters).toHaveLength(17);
    expect(taintedCharacters).toHaveLength(17);
    expect(allCharacters).toHaveLength(34);

    expect(normalCharacters.map((c) => c.id)).toContain('eden');
    expect(normalCharacters.map((c) => c.id)).toContain('isaac');
    expect(taintedCharacters.map((c) => c.id)).toContain('tainted-eden');
    expect(taintedCharacters.map((c) => c.id)).toContain('tainted-lost');
  });

  it('composes shadow -> body -> head -> edenHair in order with pose-accurate anchor offsets for Eden and Tainted Eden', () => {
    const idleStack = composeCharacterStack({
      id: 'eden',
      pose: 'idle',
      edenHairId: 12,
    });

    expect(idleStack.map((layer) => layer.kind)).toEqual([
      'shadow',
      'body',
      'head',
      'edenHair',
    ]);

    const pickupStack = composeCharacterStack({
      id: 'eden',
      pose: 'pickup',
      edenHairId: 12,
    });

    const cryingStack = composeCharacterStack({
      id: 'tainted-eden',
      pose: 'crying',
      edenHairId: 21,
    });

    const idleHead = idleStack.find((l) => l.kind === 'head')!;
    const idleHair = idleStack.find((l) => l.kind === 'edenHair')!;
    const pickupHead = pickupStack.find((l) => l.kind === 'head')!;
    const pickupHair = pickupStack.find((l) => l.kind === 'edenHair')!;
    const cryingHead = cryingStack.find((l) => l.kind === 'head')!;
    const cryingHair = cryingStack.find((l) => l.kind === 'edenHair')!;

    // Verify pose-specific shifts across Front Idle, Happy Pickup, and Crying
    expect(idleHead.anchorOffset).toEqual({ x: 0, y: 0 });
    expect(idleHair.anchorOffset).toEqual({ x: 0, y: 6 });

    expect(pickupHead.anchorOffset).toEqual({ x: 0, y: 2 });
    expect(pickupHair.anchorOffset).toEqual({ x: 0, y: 8 });

    expect(cryingHead.anchorOffset).toEqual({ x: 2, y: -1 });
    expect(cryingHair.anchorOffset).toEqual({ x: 2, y: 5 });

    // Verify hair remains locked at constant relative offset (0, +6) from head across all 3 poses
    for (const [head, hair] of [
      [idleHead, idleHair],
      [pickupHead, pickupHair],
      [cryingHead, cryingHair],
    ]) {
      expect(hair.anchorOffset.x - head.anchorOffset.x).toBe(0);
      expect(hair.anchorOffset.y - head.anchorOffset.y).toBe(6);
    }

    expect(idleHair.edenHairId).toBe(12);
    expect(cryingHair.edenHairId).toBe(21);
  });

  it('omits the edenHair layer cleanly when any non-Eden character is selected', () => {
    for (const characterId of ['isaac', 'the-lost', 'tainted-isaac', 'tainted-lost']) {
      const stack = composeCharacterStack({
        id: characterId,
        pose: 'pickup',
        edenHairId: 12,
      });

      expect(stack.map((layer) => layer.kind)).toEqual(['shadow', 'body', 'head']);
      expect(stack.find((layer) => layer.kind === 'edenHair')).toBeUndefined();
    }
  });

  it('provides the full catalog of Eden hairstyles for the 6-column visual picker', () => {
    const hairs = listEdenHairs();
    expect(hairs.length).toBeGreaterThanOrEqual(12);
    expect(hairs[0]).toMatchObject({ id: 1, col: 0, row: 0 });
  });
});
