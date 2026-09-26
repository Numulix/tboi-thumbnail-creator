import React, { useMemo, useState } from 'react';
import { Dices } from 'lucide-react';
import {
  composeCharacterStack,
  getCharacterById,
  getCharacterPoseById,
  getEdenHairById,
  listCharacters,
  listEdenHairs,
  resolveCharacterEdenHairId,
} from '../catalog/gameAssetsCatalog';
import {
  type CharacterPoseId,
  type SceneState,
} from '../domain/sceneDocument';

export const POSE_OPTIONS: Array<{ id: CharacterPoseId; label: string }> = [
  { id: 'idle', label: 'Front Idle' },
  { id: 'pickup', label: 'Happy Pickup' },
  { id: 'thumbsUp', label: 'Thumbs Up' },
  { id: 'shocked', label: 'Shocked' },
  { id: 'agony', label: 'Agony' },
  { id: 'cheer', label: 'Cheer' },
  { id: 'crying', label: 'Crying' },
];

export interface CharacterDrawerProps {
  character: SceneState['character'];
  onSelectCharacter: (characterId: string, variant: 'normal' | 'tainted') => void;
  onPoseChange: (pose: CharacterPoseId) => void;
  onScaleChange: (scale: number) => void;
  onResetScale: () => void;
  onSelectEdenHair: (hairId: number) => void;
  onRandomizeEdenHair: () => void;
}

export function CharacterDrawer({
  character,
  onSelectCharacter,
  onPoseChange,
  onScaleChange,
  onResetScale,
  onSelectEdenHair,
  onRandomizeEdenHair,
}: CharacterDrawerProps): React.ReactElement {
  const activeCharacterEntry = useMemo(
    () => getCharacterById(character.id),
    [character.id]
  );

  const [characterVariantTab, setCharacterVariantTab] = useState<'normal' | 'tainted'>(
    () => activeCharacterEntry.variant
  );

  const activePoseEntry = useMemo(
    () => getCharacterPoseById(character.pose),
    [character.pose]
  );

  const activeEdenHairEntry = useMemo(
    () =>
      getEdenHairById(
        resolveCharacterEdenHairId(
          activeCharacterEntry,
          character.edenHairId
        )
      ),
    [character.edenHairId, activeCharacterEntry]
  );

  const activePreviewStack = useMemo(
    () => composeCharacterStack(character),
    [character]
  );

  const previewHeadLayer = useMemo(
    () => activePreviewStack.find((l) => l.kind === 'head'),
    [activePreviewStack]
  );

  const previewHairLayer = useMemo(
    () => activePreviewStack.find((l) => l.kind === 'edenHair'),
    [activePreviewStack]
  );

  const visibleCharacters = useMemo(
    () => listCharacters(characterVariantTab),
    [characterVariantTab]
  );

  const allEdenHairs = useMemo(() => listEdenHairs(), []);

  const handleSelectCharacter = (charId: string, variant: 'normal' | 'tainted') => {
    setCharacterVariantTab(variant);
    onSelectCharacter(charId, variant);
  };

  return (
    <section
      data-testid="character-builder-section"
      className="space-y-3.5"
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#9E95A8]">
          Modular Character Builder
        </span>
        <span className="text-[11px] font-mono-tabular text-[#E5A93C]">
          34 Playable
        </span>
      </div>

      {/* Active Character Sprite Preview Card */}
      <div
        data-testid="active-character-preview"
        className="bg-[#0D0B0E] border border-[#2A252D] rounded p-2.5 flex items-center gap-3"
      >
        <div className="w-16 h-16 rounded bg-[#19161C] border border-[#2A252D] relative overflow-hidden shrink-0 flex items-center justify-center">
          {/* Grounded Dark Oval Drop-Shadow */}
          <div className="w-8 h-2.5 rounded-full bg-black/60 absolute bottom-1.5 left-1/2 -translate-x-1/2" />
          {/* Character Base Sprite Cell (64x64) derived from composeCharacterStack */}
          {previewHeadLayer && (
            <div
              className="w-16 h-16 pixelated relative"
              style={{
                backgroundImage: `url(${previewHeadLayer.atlasUrl})`,
                backgroundPosition: `-${previewHeadLayer.sx}px -${previewHeadLayer.sy}px`,
                backgroundSize: `${POSE_OPTIONS.length * 64}px ${38 * 64}px`,
                backgroundRepeat: 'no-repeat',
              }}
            />
          )}
          {/* Pose-Aligned Eden Hairstyle Overlay derived from composeCharacterStack */}
          {previewHairLayer && (
            <div
              data-testid="preview-eden-hair-layer"
              className="w-16 h-16 pixelated absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: `url(${previewHairLayer.atlasUrl})`,
                backgroundPosition: `-${previewHairLayer.sx}px -${previewHairLayer.sy}px`,
                backgroundSize: `${9 * 64}px ${6 * 64}px`,
                backgroundRepeat: 'no-repeat',
                transform: `translate(${previewHairLayer.anchorOffset.x}px, ${previewHairLayer.anchorOffset.y}px)`,
              }}
            />
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-bold text-[#F4EFEA] truncate">
              {activeCharacterEntry.name}
            </span>
            <span
              className={`text-[10px] font-mono-tabular font-bold px-1.5 py-0.5 rounded uppercase ${
                activeCharacterEntry.variant === 'tainted'
                  ? 'bg-[#C83A3A]/25 text-[#F06E6E]'
                  : 'bg-[#E5A93C]/20 text-[#E5A93C]'
              }`}
            >
              {activeCharacterEntry.variant}
            </span>
          </div>
          <div className="text-[11px] text-[#9E95A8] flex items-center gap-1.5">
            <span>Pose:</span>
            <span className="text-[#F4EFEA] font-semibold">
              {POSE_OPTIONS.find((p) => p.id === character.pose)?.label ??
                activePoseEntry.label}
            </span>
          </div>
          <div className="text-[10px] font-mono-tabular text-[#9E95A8] flex items-center gap-2">
            <span>Scale: {character.scale.toFixed(2)}x</span>
            {activeCharacterEntry.supportsEdenHair && (
              <span className="text-[#E5A93C]">
                • Hair #{activeEdenHairEntry.id}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Segmented Toggle: 17 Normal vs 17 Tainted */}
      <div className="grid grid-cols-2 gap-1 bg-[#0D0B0E] p-1 rounded border border-[#2A252D] text-[11px]">
        <button
          type="button"
          onClick={() => setCharacterVariantTab('normal')}
          aria-pressed={characterVariantTab === 'normal'}
          className={`py-1 px-2 rounded font-semibold transition-colors cursor-pointer ${
            characterVariantTab === 'normal'
              ? 'bg-[#E5A93C] text-[#110F13] font-bold'
              : 'text-[#9E95A8] hover:text-[#F4EFEA]'
          }`}
        >
          Normal (17)
        </button>
        <button
          type="button"
          onClick={() => setCharacterVariantTab('tainted')}
          aria-pressed={characterVariantTab === 'tainted'}
          className={`py-1 px-2 rounded font-semibold transition-colors cursor-pointer ${
            characterVariantTab === 'tainted'
              ? 'bg-[#C83A3A] text-white font-bold'
              : 'text-[#9E95A8] hover:text-[#F4EFEA]'
          }`}
        >
          Tainted (17)
        </button>
      </div>

      {/* Roster Grid (17 characters per variant, 34 total) */}
      <div className="grid grid-cols-3 gap-1.5 max-h-48 overflow-y-auto custom-scroll p-1 bg-[#0D0B0E] rounded border border-[#2A252D]">
        {visibleCharacters.map((char) => {
          const isSelected = char.id === character.id;
          return (
            <button
              key={char.id}
              type="button"
              data-testid={`character-option-${char.id}`}
              aria-pressed={isSelected}
              onClick={() => handleSelectCharacter(char.id, char.variant)}
              className={`p-1.5 rounded border text-center flex flex-col items-center gap-1 transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[#231F28] border-[#E5A93C] text-[#F4EFEA] shadow-xs'
                  : 'bg-[#19161C] border-[#2A252D] text-[#9E95A8] hover:text-[#F4EFEA] hover:bg-[#231F28]/60'
              }`}
            >
              <div
                className="w-8 h-8 pixelated shrink-0"
                style={{
                  backgroundImage: 'url(/assets/characters/characters-atlas.png)',
                  backgroundPosition: `0px -${char.atlasRow * 32}px`,
                  backgroundSize: `${POSE_OPTIONS.length * 32}px ${38 * 32}px`,
                }}
              />
              <span className="text-[10px] font-semibold leading-tight truncate w-full">
                {char.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Pose & Expression Switcher */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#9E95A8]">
            Character Pose
          </span>
          <span className="text-[10px] font-mono-tabular text-[#9E95A8]">
            Head Anchor Synced
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1 bg-[#0D0B0E] p-1 rounded border border-[#2A252D] text-[11px]">
          {POSE_OPTIONS.map((poseOption) => {
            const isSelected = character.pose === poseOption.id;
            return (
              <button
                key={poseOption.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onPoseChange(poseOption.id)}
                className={`py-1.5 px-1 rounded font-semibold transition-colors cursor-pointer truncate ${
                  isSelected
                    ? 'bg-[#231F28] border border-[#E5A93C] text-[#E5A93C] font-bold'
                    : 'text-[#9E95A8] hover:text-[#F4EFEA]'
                }`}
              >
                {poseOption.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Character Scale Slider (1.0x to 2.5x) with Reset Action */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <label htmlFor="slider-character-scale" className="text-[#9E95A8]">
            Character Scale
          </label>
          <div className="flex items-center gap-2">
            <span className="font-mono-tabular font-semibold text-[#E5A93C]">
              {character.scale.toFixed(2)}x
            </span>
            <button
              type="button"
              aria-label="Reset Scale"
              onClick={onResetScale}
              className="text-[10px] font-mono-tabular text-[#9E95A8] hover:text-[#F4EFEA] bg-[#231F28] border border-[#2A252D] px-1.5 py-0.5 rounded cursor-pointer"
            >
              Reset
            </button>
          </div>
        </div>
        <input
          id="slider-character-scale"
          aria-label="Character Scale"
          type="range"
          min={1.0}
          max={2.5}
          step={0.05}
          value={character.scale}
          onChange={(e) => onScaleChange(Number(e.target.value))}
          className="w-full h-1.5 bg-[#0D0B0E] rounded accent-[#E5A93C] cursor-pointer"
        />
      </div>

      {/* Conditional Eden Hairstyle Section (Unlocks ONLY for Eden & Tainted Eden) */}
      {activeCharacterEntry.supportsEdenHair && (
        <div
          data-testid="eden-hair-section"
          className="space-y-2 pt-2 border-t border-[#2A252D]"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#E5A93C]">
              Eden Hairstyle ({allEdenHairs.length})
            </span>
            <button
              type="button"
              onClick={onRandomizeEdenHair}
              className="px-2 py-1 rounded text-[11px] font-semibold bg-[#231F28] hover:bg-[#2E2935] text-[#F4EFEA] border border-[#E5A93C]/60 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Dices className="w-3 h-3 text-[#E5A93C]" />
              <span>🎲 Randomize Hair</span>
            </button>
          </div>

          <div
            data-testid="eden-hair-grid"
            className="grid grid-cols-6 gap-1.5 max-h-48 overflow-y-auto custom-scroll p-1.5 bg-[#0D0B0E] rounded border border-[#2A252D]"
          >
            {allEdenHairs.map((hair) => {
              const isSelected = activeEdenHairEntry.id === hair.id;
              return (
                <button
                  key={hair.id}
                  type="button"
                  data-testid={`eden-hair-option-${hair.id}`}
                  aria-label={hair.label}
                  aria-pressed={isSelected}
                  title={hair.label}
                  onClick={() => onSelectEdenHair(hair.id)}
                  className={`aspect-square rounded border flex items-center justify-center relative overflow-hidden transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#231F28] border-[#E5A93C] ring-1 ring-[#E5A93C]'
                      : 'bg-[#19161C] border-[#2A252D] hover:border-[#9E95A8]'
                  }`}
                >
                  <div
                    className="w-8 h-8 pixelated"
                    style={{
                      backgroundImage: 'url(/assets/characters/eden-hairs-atlas.png)',
                      backgroundPosition: `-${hair.col * 32}px -${hair.row * 32}px`,
                      backgroundSize: `${9 * 32}px ${6 * 32}px`,
                    }}
                  />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
