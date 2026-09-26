import React, { useMemo, useState } from 'react';
import { Move, RotateCcw, Search } from 'lucide-react';
import {
  getCollectibleById,
  listCollectibles,
  searchCollectibles,
} from '../catalog/gameAssetsCatalog';
import {
  type FormationPreset,
  type PedestalSlotNode,
} from '../domain/sceneDocument';
import { InspectorSlider } from './InspectorSlider';

export const FORMATION_PRESET_OPTIONS: Array<{ id: FormationPreset; label: string }> = [
  { id: 'arc', label: 'Arc' },
  { id: 'row', label: 'Row' },
  { id: 'grid-2x2', label: '2×2 Grid' },
  { id: 'flank', label: 'Flank' },
];

export const PEDESTAL_COUNT_OPTIONS: Array<3 | 4 | 5 | 6> = [3, 4, 5, 6];

export function getQualityBadgeClasses(quality: 0 | 1 | 2 | 3 | 4): string {
  switch (quality) {
    case 4:
      return 'bg-[#E5A93C]/25 text-[#E5A93C] border-[#E5A93C]/60';
    case 3:
      return 'bg-[#A855F7]/20 text-[#C084FC] border-[#A855F7]/50';
    case 2:
      return 'bg-[#3B82F6]/20 text-[#60A5FA] border-[#3B82F6]/50';
    case 1:
      return 'bg-[#22C55E]/20 text-[#4ADE80] border-[#22C55E]/50';
    default:
      return 'bg-[#231F28] text-[#9E95A8] border-[#2A252D]';
  }
}

export function getCollectibleAtlasSpriteStyle(
  atlasCol: number,
  atlasRow: number
): React.CSSProperties {
  return {
    backgroundImage: 'url(/assets/collectibles/collectibles-atlas.png)',
    backgroundPosition: `-${atlasCol * 32}px -${atlasRow * 32}px`,
    backgroundSize: `${28 * 32}px ${26 * 32}px`,
  };
}

export interface PedestalDrawerProps {
  pedestals: PedestalSlotNode[];
  formationPreset: FormationPreset;
  pedestalScale: number;
  selectedPedestalId: string;
  onSelectPedestal: (id: string) => void;
  onUpdateCount: (count: 3 | 4 | 5 | 6) => void;
  onApplyPreset: (preset: FormationPreset) => void;
  onScaleChange: (scale: number) => void;
  onAssignCollectible: (pedestalId: string, itemId: number) => void;
  onResetPositions: () => void;
}

export function PedestalDrawer({
  pedestals,
  formationPreset,
  pedestalScale,
  selectedPedestalId,
  onSelectPedestal,
  onUpdateCount,
  onApplyPreset,
  onScaleChange,
  onAssignCollectible,
  onResetPositions,
}: PedestalDrawerProps): React.ReactElement {
  const [collectibleSearchQuery, setCollectibleSearchQuery] = useState<string>('');

  const matchingCollectibles = useMemo(
    () => searchCollectibles(collectibleSearchQuery, 48),
    [collectibleSearchQuery]
  );

  const effectiveSelectedPedestalId = useMemo(() => {
    const exists = pedestals.some((p) => p.id === selectedPedestalId);
    return exists ? selectedPedestalId : (pedestals[0]?.id ?? 'pedestal-1');
  }, [pedestals, selectedPedestalId]);

  return (
    <section
      data-testid="pedestals-builder-section"
      className="space-y-3.5"
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#9E95A8]">
          Pedestal Formation Engine
        </span>
        <span className="text-[11px] font-mono-tabular text-[#E5A93C]">
          {listCollectibles().length} Items
        </span>
      </div>

      {/* 1. Pedestal Slot Count Selector (3, 4, 5, 6) */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold text-[#9E95A8] flex items-center justify-between">
          <span>Active Slots</span>
          <span className="font-mono-tabular text-[#E5A93C]">
            {pedestals.length} Altars
          </span>
        </label>
        <div className="grid grid-cols-4 gap-1 bg-[#0D0B0E] p-1 rounded border border-[#2A252D] text-xs">
          {PEDESTAL_COUNT_OPTIONS.map((count) => {
            const isSelected = pedestals.length === count;
            return (
              <button
                key={count}
                type="button"
                data-testid={`pedestal-count-${count}`}
                aria-pressed={isSelected}
                onClick={() => onUpdateCount(count)}
                className={`py-1.5 rounded font-mono-tabular font-bold transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#E5A93C] text-[#110F13]'
                    : 'text-[#9E95A8] hover:text-[#F4EFEA]'
                }`}
              >
                {count} Slots
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. 1-Click Formation Presets (Arc, Row, 2×2 Grid, Flank) & Reset Positions */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#9E95A8]">
            Formation Preset
          </span>
          <button
            type="button"
            data-testid="reset-positions-btn"
            aria-label="Reset Positions"
            onClick={onResetPositions}
            className="text-[10px] font-mono-tabular text-[#E5A93C] hover:text-[#F4EFEA] bg-[#231F28] border border-[#E5A93C]/50 px-2 py-0.5 rounded flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            <span>Reset Positions</span>
          </button>
        </div>
        <div className="grid grid-cols-2 gap-1 bg-[#0D0B0E] p-1 rounded border border-[#2A252D] text-[11px]">
          {FORMATION_PRESET_OPTIONS.map((preset) => {
            const isSelected = formationPreset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                data-testid={`formation-preset-${preset.id}`}
                aria-pressed={isSelected}
                onClick={() => onApplyPreset(preset.id)}
                className={`py-1.5 px-2 rounded font-semibold transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#231F28] border border-[#E5A93C] text-[#E5A93C] font-bold'
                    : 'text-[#9E95A8] hover:text-[#F4EFEA]'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Pedestal Scale Slider (1.0x - 2.5x) */}
      <InspectorSlider
        id="slider-pedestal-scale"
        label="Pedestal Scale"
        displayValue={`${(pedestalScale ?? 1.5).toFixed(2)}x`}
        min={1.0}
        max={2.5}
        step={0.05}
        value={pedestalScale ?? 1.5}
        highlightReadout
        onChange={onScaleChange}
      />

      {/* 4. Active Pedestal Slots Selector */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#9E95A8]">
            Pedestal Slots (Click to Target)
          </span>
          <span className="text-[10px] font-mono-tabular text-[#9E95A8] flex items-center gap-1">
            <Move className="w-2.5 h-2.5 text-[#E5A93C]" />
            Drag on Stage
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          {pedestals.map((slot, idx) => {
            const isSelected = slot.id === effectiveSelectedPedestalId;
            const itemEntry = getCollectibleById(
              slot.priceTag === 'blind' ? 0 : slot.itemId
            );
            const hasManualOffset =
              slot.manualOffset !== undefined &&
              (slot.manualOffset.x !== 0 || slot.manualOffset.y !== 0);
            const offsetLabel = hasManualOffset
              ? `${slot.manualOffset!.x >= 0 ? '+' : ''}${slot.manualOffset!.x}, ${
                  slot.manualOffset!.y >= 0 ? '+' : ''
                }${slot.manualOffset!.y}`
              : 'Auto';

            return (
              <button
                key={slot.id}
                type="button"
                data-testid={`pedestal-slot-card-${slot.id}`}
                aria-pressed={isSelected}
                onClick={() => onSelectPedestal(slot.id)}
                className={`p-1.5 rounded border text-left flex items-center gap-2 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#231F28] border-[#E5A93C] ring-1 ring-[#E5A93C]'
                    : 'bg-[#0D0B0E] border-[#2A252D] hover:border-[#9E95A8]'
                }`}
              >
                <div className="w-8 h-8 rounded bg-[#19161C] border border-[#2A252D] flex items-center justify-center shrink-0 overflow-hidden">
                  <div
                    className="w-8 h-8 pixelated shrink-0"
                    style={getCollectibleAtlasSpriteStyle(
                      itemEntry.atlasCol,
                      itemEntry.atlasRow
                    )}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-mono-tabular text-[#E5A93C] font-bold">
                      #{idx + 1}
                    </span>
                    <span
                      className={`text-[9px] font-mono-tabular font-bold px-1 rounded border ${getQualityBadgeClasses(
                        slot.quality
                      )}`}
                    >
                      Q{slot.quality}
                    </span>
                  </div>
                  <div className="text-[11px] font-semibold text-[#F4EFEA] truncate">
                    {slot.itemName}
                  </div>
                  <div className="text-[9px] font-mono-tabular text-[#9E95A8] truncate">
                    {offsetLabel}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. 730+ Repentance+ Collectible Search & Picker */}
      <div className="space-y-2 pt-2 border-t border-[#2A252D]">
        <div className="flex items-center justify-between">
          <label
            htmlFor="collectible-search-input"
            className="text-[11px] font-bold uppercase tracking-wider text-[#E5A93C]"
          >
            Assign Collectible
          </label>
          <span className="text-[10px] font-mono-tabular text-[#9E95A8]">
            Target: {effectiveSelectedPedestalId}
          </span>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#9E95A8] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="collectible-search-input"
            data-testid="collectible-search-input"
            aria-label="Search Collectibles"
            type="text"
            value={collectibleSearchQuery}
            onChange={(e) => setCollectibleSearchQuery(e.target.value)}
            placeholder='Search name ("Sacred") or ID ("#182")...'
            className="w-full bg-[#0D0B0E] border border-[#2A252D] focus:border-[#E5A93C] rounded pl-8 pr-2.5 py-1.5 text-xs text-[#F4EFEA] placeholder-[#9E95A8]/60 outline-none font-mono-tabular"
          />
        </div>

        <div
          data-testid="collectible-search-results"
          className="space-y-1 max-h-56 overflow-y-auto custom-scroll p-1 bg-[#0D0B0E] rounded border border-[#2A252D]"
        >
          {matchingCollectibles.map((item) => {
            const activeSlot = pedestals.find(
              (p) => p.id === effectiveSelectedPedestalId
            );
            const isAssigned = activeSlot?.itemId === item.id;
            return (
              <button
                key={item.id}
                type="button"
                data-testid={`collectible-result-${item.id}`}
                aria-pressed={isAssigned}
                onClick={() => onAssignCollectible(effectiveSelectedPedestalId, item.id)}
                className={`w-full p-1.5 rounded border text-left flex items-center gap-2 transition-colors cursor-pointer ${
                  isAssigned
                    ? 'bg-[#231F28] border-[#E5A93C]'
                    : 'bg-[#19161C] border-[#2A252D] hover:bg-[#231F28]/70'
                }`}
              >
                <div
                  className="w-8 h-8 pixelated shrink-0"
                  style={getCollectibleAtlasSpriteStyle(
                    item.atlasCol,
                    item.atlasRow
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-[#F4EFEA] truncate">
                      {item.name}
                    </span>
                    <span
                      data-testid={`quality-badge-${item.id}`}
                      className={`text-[10px] font-mono-tabular font-bold px-1.5 py-0.5 rounded border shrink-0 ${getQualityBadgeClasses(
                        item.quality
                      )}`}
                    >
                      Q{item.quality}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono-tabular text-[#9E95A8]">
                    #{item.id} • {item.kind}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
