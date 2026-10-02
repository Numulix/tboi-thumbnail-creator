import React, { useMemo, useState } from 'react';
import { Move, Package, Plus, RotateCcw, Search, Trash2 } from 'lucide-react';
import {
  getCollectibleById,
  listCollectibles,
  searchCollectibles,
} from '../catalog/gameAssetsCatalog';
import {
  MAX_PEDESTAL_COUNT,
  MIN_PEDESTAL_COUNT,
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
  onDeletePedestal?: (id: string) => void;
  onUpdateCount: (count: number) => void;
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
  onDeletePedestal,
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
    return exists ? selectedPedestalId : (pedestals[0]?.id ?? '');
  }, [pedestals, selectedPedestalId]);

  return (
    <section
      data-testid="pedestals-builder-section"
      className="space-y-3.5"
    >
      {/* 1. Pedestal Drawer Header with Stepper Control ( [-] N [+] ) */}
      <div
        data-testid="pedestal-drawer-header"
        className="flex items-center justify-between pb-2.5 border-b border-[#2A252D]"
      >
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#9E95A8] block">
            Pedestal Formation
          </span>
          <span className="text-[10px] font-mono-tabular text-[#9E95A8]/70">
            {listCollectibles().length} Items
          </span>
        </div>

        {/* Stepper control ( [-] and [+] ) displaying active altar count */}
        <div
          data-testid="pedestal-stepper"
          className="flex items-center gap-1.5 bg-[#0D0B0E] p-1 rounded border border-[#2A252D]"
        >
          <button
            type="button"
            data-testid="pedestal-stepper-decrement"
            aria-label="Decrease Altar Count"
            disabled={pedestals.length <= MIN_PEDESTAL_COUNT}
            onClick={() => onUpdateCount(pedestals.length - 1)}
            className="w-6 h-6 rounded bg-[#231F28] hover:bg-[#2A252D] text-[#F4EFEA] font-bold text-xs flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors border border-[#2A252D]"
          >
            <span data-testid="pedestal-count-decrement">-</span>
          </button>
          <span
            data-testid="pedestal-count-display"
            className="px-1 text-xs font-mono-tabular font-bold text-[#E5A93C] min-w-16 text-center"
          >
            <span data-testid="pedestal-stepper-value">
              {pedestals.length} {pedestals.length === 1 ? 'Altar' : 'Altars'}
            </span>
          </span>
          <button
            type="button"
            data-testid="pedestal-stepper-increment"
            aria-label="Increase Altar Count"
            disabled={pedestals.length >= MAX_PEDESTAL_COUNT}
            onClick={() => onUpdateCount(pedestals.length + 1)}
            className="w-6 h-6 rounded bg-[#231F28] hover:bg-[#2A252D] text-[#F4EFEA] font-bold text-xs flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors border border-[#2A252D]"
          >
            <span data-testid="pedestal-count-increment">+</span>
          </button>
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
          {pedestals.length > 0 && (
            <span className="text-[10px] font-mono-tabular text-[#9E95A8] flex items-center gap-1">
              <Move className="w-2.5 h-2.5 text-[#E5A93C]" />
              Drag on Stage
            </span>
          )}
        </div>

        {pedestals.length === 0 ? (
          <div
            data-testid="pedestal-empty-state"
            className="p-5 rounded-lg border border-dashed border-[#2A252D] bg-[#0D0B0E]/60 text-center space-y-3 my-1"
          >
            <div className="w-10 h-10 mx-auto rounded-full bg-[#19161C] border border-[#2A252D] flex items-center justify-center text-[#9E95A8]">
              <Package className="w-5 h-5 text-[#9E95A8]/70" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-[#F4EFEA]">
                No Altars in Scene
              </h4>
              <p className="text-[11px] text-[#9E95A8] max-w-[240px] mx-auto leading-relaxed">
                The stage is set for a character-only or room-backdrop composition.
              </p>
            </div>
            <button
              type="button"
              data-testid="pedestal-empty-state-add-btn"
              aria-label="Add Altar"
              onClick={() => onUpdateCount(1)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#141216] bg-[#E5A93C] hover:bg-[#F2BA52] rounded transition-colors cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Altar</span>
            </button>
          </div>
        ) : (
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
              <div
                key={slot.id}
                role="button"
                tabIndex={0}
                data-testid={`pedestal-slot-card-${slot.id}`}
                aria-pressed={isSelected}
                onClick={() => onSelectPedestal(slot.id)}
                onKeyDown={(e) => {
                  if (
                    e.target === e.currentTarget &&
                    (e.key === 'Enter' || e.key === ' ')
                  ) {
                    e.preventDefault();
                    onSelectPedestal(slot.id);
                  }
                }}
                className={`p-1.5 rounded border text-left flex items-center gap-2 transition-all cursor-pointer relative group ${
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
                    <div className="flex items-center gap-1">
                      <span
                        className={`text-[9px] font-mono-tabular font-bold px-1 rounded border ${getQualityBadgeClasses(
                          slot.quality
                        )}`}
                      >
                        Q{slot.quality}
                      </span>
                      <button
                        type="button"
                        data-testid={`delete-pedestal-slot-${slot.id}`}
                        aria-label={`Delete altar ${idx + 1}`}
                        title={`Delete altar #${idx + 1}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeletePedestal?.(slot.id);
                        }}
                        onKeyDown={(e) => {
                          e.stopPropagation();
                        }}
                        className="p-0.5 rounded text-[#9E95A8] hover:text-[#F87171] hover:bg-[#C83A3A]/20 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div className="text-[11px] font-semibold text-[#F4EFEA] truncate">
                    {slot.itemName}
                  </div>
                  <div className="text-[9px] font-mono-tabular text-[#9E95A8] truncate">
                    {offsetLabel}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        )}
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
            Target: {effectiveSelectedPedestalId || 'None'}
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
