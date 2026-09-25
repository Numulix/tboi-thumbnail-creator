import itemsJson from './items.json';
import charactersJson from './characters.json';

export interface CollectibleCatalogEntry {
  id: number;
  name: string;
  kind: string;
  quality: 0 | 1 | 2 | 3 | 4;
  gfx: string;
  atlasCol: number;
  atlasRow: number;
}

export interface CharacterPoseEntry {
  id: string;
  label: string;
  atlasCol: number;
  hairDx: number;
  hairDy: number;
}

export interface CharacterCatalogEntry {
  id: string;
  name: string;
  variant: 'normal' | 'tainted';
  atlasRow: number;
  supportsEdenHair: boolean;
  defaultEdenHair: number | null;
}

export interface EdenHairCatalogEntry {
  id: number;
  label: string;
  col: number;
  row: number;
}

const ITEMS_ARRAY = (
  Array.isArray(itemsJson) ? itemsJson : (itemsJson as { items: CollectibleCatalogEntry[] }).items
) as CollectibleCatalogEntry[];

const ITEMS_BY_ID = new Map<number, CollectibleCatalogEntry>();
for (const item of ITEMS_ARRAY) {
  ITEMS_BY_ID.set(item.id, item);
}

const CURSE_OF_THE_BLIND_ENTRY: CollectibleCatalogEntry = {
  id: 0,
  name: 'Curse of the Blind',
  kind: 'special',
  quality: 0,
  gfx: 'questionmark.png',
  atlasCol: 0,
  atlasRow: 0,
};

export function getCollectibleById(itemId: number): CollectibleCatalogEntry {
  if (itemId <= 0) {
    return CURSE_OF_THE_BLIND_ENTRY;
  }
  return ITEMS_BY_ID.get(itemId) ?? CURSE_OF_THE_BLIND_ENTRY;
}

export function listCollectibles(): CollectibleCatalogEntry[] {
  return ITEMS_ARRAY;
}

export function getCharacterById(characterId: string): CharacterCatalogEntry {
  const found = (charactersJson.characters as CharacterCatalogEntry[]).find(
    (c) => c.id === characterId
  );
  return (
    found ??
    (charactersJson.characters as CharacterCatalogEntry[]).find(
      (c) => c.id === 'eden'
    )!
  );
}

export function listCharacters(): CharacterCatalogEntry[] {
  return charactersJson.characters as CharacterCatalogEntry[];
}

export function getCharacterPoseById(poseId: string): CharacterPoseEntry {
  const normalized = poseId === 'crying' ? 'agony' : poseId;
  const found = (charactersJson.poses as CharacterPoseEntry[]).find(
    (p) => p.id === normalized
  );
  return found ?? (charactersJson.poses as CharacterPoseEntry[])[0];
}

export function listCharacterPoses(): CharacterPoseEntry[] {
  return charactersJson.poses as CharacterPoseEntry[];
}

export function getEdenHairById(hairId: number): EdenHairCatalogEntry {
  const clamped = Math.max(1, Math.min(54, Math.round(hairId || 1)));
  const found = (charactersJson.edenHairs as EdenHairCatalogEntry[]).find(
    (h) => h.id === clamped
  );
  return found ?? (charactersJson.edenHairs as EdenHairCatalogEntry[])[0];
}

export function listEdenHairs(): EdenHairCatalogEntry[] {
  return charactersJson.edenHairs as EdenHairCatalogEntry[];
}

export const ALTAR_SPRITE_CELLS: Record<
  'stone' | 'gold' | 'devil' | 'angel' | 'shadow',
  { col: number; row: number }
> = {
  stone: { col: 0, row: 0 },
  gold: { col: 0, row: 0 },
  devil: { col: 0, row: 0 },
  angel: { col: 0, row: 0 },
  shadow: { col: 1, row: 0 },
};
