import itemsJson from './items.json';
import charactersJson from './characters.json';
import type { CharacterPoseId, Vec2 } from '../domain/sceneDocument';

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

export interface CharacterStackInput {
  id: string;
  pose: CharacterPoseId;
  edenHairId?: number;
}

export interface CompositeSpriteLayer {
  kind: 'shadow' | 'body' | 'head' | 'edenHair';
  atlasUrl?: string;
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  dx: number;
  dy: number;
  dw: number;
  dh: number;
  anchorOffset: Vec2;
  characterId: string;
  poseId: CharacterPoseId;
  edenHairId?: number;
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

export function listCharacters(variant?: 'normal' | 'tainted'): CharacterCatalogEntry[] {
  const all = charactersJson.characters as CharacterCatalogEntry[];
  if (!variant) {
    return all;
  }
  return all.filter((c) => c.variant === variant);
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

export function resolveCharacterEdenHairId(
  charEntry: CharacterCatalogEntry,
  edenHairId?: number
): number {
  return getEdenHairById(edenHairId ?? charEntry.defaultEdenHair ?? 12).id;
}

export function composeCharacterStack(
  character: CharacterStackInput
): CompositeSpriteLayer[] {
  const charEntry = getCharacterById(character.id);
  const poseEntry = getCharacterPoseById(character.pose);
  const cellSx = poseEntry.atlasCol * 64;
  const cellSy = charEntry.atlasRow * 64;

  // Pose-specific head offset relative to the Front Idle head anchor (where hair sits at (0, 6))
  const headAnchorOffset: Vec2 = {
    x: poseEntry.hairDx,
    y: poseEntry.hairDy - 6,
  };

  const layers: CompositeSpriteLayer[] = [
    {
      kind: 'shadow',
      sx: 0,
      sy: 0,
      sw: 28,
      sh: 10,
      dx: -14,
      dy: -5,
      dw: 28,
      dh: 10,
      anchorOffset: { x: 0, y: 0 },
      characterId: charEntry.id,
      poseId: character.pose,
    },
    {
      kind: 'body',
      atlasUrl: '/assets/characters/characters-atlas.png',
      sx: cellSx,
      sy: cellSy + 36,
      sw: 64,
      sh: 28,
      dx: -32,
      dy: -20,
      dw: 64,
      dh: 28,
      anchorOffset: { x: 0, y: 0 },
      characterId: charEntry.id,
      poseId: character.pose,
    },
    {
      kind: 'head',
      atlasUrl: '/assets/characters/characters-atlas.png',
      sx: cellSx,
      sy: cellSy,
      sw: 64,
      sh: 36,
      dx: -32,
      dy: -56,
      dw: 64,
      dh: 36,
      anchorOffset: headAnchorOffset,
      characterId: charEntry.id,
      poseId: character.pose,
    },
  ];

  if (charEntry.supportsEdenHair) {
    const hairEntry = getEdenHairById(
      resolveCharacterEdenHairId(charEntry, character.edenHairId)
    );
    const hairAnchorOffset: Vec2 = {
      x: poseEntry.hairDx,
      y: poseEntry.hairDy,
    };

    layers.push({
      kind: 'edenHair',
      atlasUrl: '/assets/characters/eden-hairs-atlas.png',
      sx: hairEntry.col * 64,
      sy: hairEntry.row * 64,
      sw: 64,
      sh: 64,
      dx: -32 + hairAnchorOffset.x,
      dy: -56 + hairAnchorOffset.y,
      dw: 64,
      dh: 64,
      anchorOffset: hairAnchorOffset,
      characterId: charEntry.id,
      poseId: character.pose,
      edenHairId: hairEntry.id,
    });
  }

  return layers;
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
