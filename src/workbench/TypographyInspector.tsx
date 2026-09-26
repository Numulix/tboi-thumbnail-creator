import React, { useMemo } from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Plus,
  Trash2,
  Type,
} from 'lucide-react';
import {
  TEXT_FONT_OPTIONS,
  TEXT_GRADIENT_SWATCHES,
  type TextAlignMode,
  type TextGradientSwatchId,
  type TextLayerNode,
} from '../domain/sceneDocument';
import { InspectorSlider } from './InspectorSlider';

export interface TypographyInspectorProps {
  textLayers: TextLayerNode[];
  selectedTextLayerId: string;
  onSelectLayer: (id: string) => void;
  onAddLayer: () => void;
  onDeleteLayer: (id: string) => void;
  onUpdateLayer: (id: string, patch: Partial<Omit<TextLayerNode, 'id'>>) => void;
}

export function TypographyInspector({
  textLayers,
  selectedTextLayerId,
  onSelectLayer,
  onAddLayer,
  onDeleteLayer,
  onUpdateLayer,
}: TypographyInspectorProps): React.ReactElement {
  const activeTextLayer = useMemo(() => {
    return (
      textLayers.find((l) => l.id === selectedTextLayerId) ??
      textLayers[0] ??
      null
    );
  }, [textLayers, selectedTextLayerId]);

  return (
    <section
      data-testid="text-layer-inspector-section"
      className="space-y-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Type className="w-3.5 h-3.5 text-[#E5A93C]" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#E5A93C]">
            Text Layers ({textLayers.length})
          </span>
        </div>
        <button
          type="button"
          data-testid="add-text-layer-btn"
          aria-label="Add Text"
          onClick={onAddLayer}
          className="px-2 py-1 rounded text-[11px] font-bold bg-[#C83A3A] hover:brightness-110 text-white border border-[#F06E6E]/60 flex items-center gap-1 transition-all cursor-pointer"
        >
          <Plus className="w-3 h-3" />
          <span>+ Add Text</span>
        </button>
      </div>

      {/* Multi-Textbox Layer Selector List */}
      {textLayers.length > 0 && (
        <div className="flex items-center gap-1.5">
          <div className="flex-1 flex flex-wrap gap-1 bg-[#0D0B0E] p-1 rounded border border-[#2A252D]">
            {textLayers.map((layer, idx) => {
              const isLayerSelected = activeTextLayer?.id === layer.id;
              return (
                <button
                  key={layer.id}
                  type="button"
                  data-testid={`text-layer-item-${layer.id}`}
                  aria-pressed={isLayerSelected}
                  onClick={() => onSelectLayer(layer.id)}
                  className={`px-2 py-1 rounded text-[10px] font-mono-tabular font-semibold truncate max-w-[120px] transition-colors cursor-pointer ${
                    isLayerSelected
                      ? 'bg-[#231F28] border border-[#22D3EE] text-[#22D3EE]'
                      : 'text-[#9E95A8] hover:text-[#F4EFEA]'
                  }`}
                >
                  #{idx + 1} {layer.text || 'Empty'}
                </button>
              );
            })}
          </div>

          {activeTextLayer && (
            <button
              type="button"
              data-testid="delete-text-layer-btn"
              aria-label="Delete Text Layer"
              title="Delete Active Text Layer"
              onClick={() => onDeleteLayer(activeTextLayer.id)}
              className="p-1.5 rounded bg-[#231F28] hover:bg-[#C83A3A]/30 text-[#9E95A8] hover:text-[#F87171] border border-[#2A252D] transition-colors cursor-pointer shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {activeTextLayer && (
        <div className="space-y-3 pt-1">
          {/* Headline Text Content Input */}
          <div className="space-y-1">
            <label
              htmlFor="input-headline-text"
              className="block text-[11px] font-semibold text-[#9E95A8]"
            >
              Headline Text
            </label>
            <input
              id="input-headline-text"
              data-testid="headline-text-input"
              aria-label="Headline Text"
              type="text"
              value={activeTextLayer.text}
              onChange={(e) =>
                onUpdateLayer(activeTextLayer.id, { text: e.target.value })
              }
              placeholder="Enter headline text..."
              className="w-full bg-[#0D0B0E] border border-[#2A252D] focus:border-[#E5A93C] rounded px-2.5 py-1.5 text-xs font-bold text-[#F4EFEA] outline-none"
            />
          </div>

          {/* Font Family Switcher */}
          <div className="space-y-1">
            <span className="block text-[11px] font-semibold text-[#9E95A8]">
              Isaac Font Family
            </span>
            <div className="grid grid-cols-3 gap-1 bg-[#0D0B0E] p-1 rounded border border-[#2A252D] text-[10px]">
              {TEXT_FONT_OPTIONS.map((fontOpt) => {
                const isSelected = activeTextLayer.fontFamily === fontOpt.id;
                return (
                  <button
                    key={fontOpt.id}
                    type="button"
                    data-testid={`font-family-${fontOpt.id}`}
                    aria-pressed={isSelected}
                    onClick={() =>
                      onUpdateLayer(activeTextLayer.id, { fontFamily: fontOpt.id })
                    }
                    className={`py-1 px-1 rounded font-semibold truncate transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#231F28] border border-[#E5A93C] text-[#E5A93C] font-bold'
                        : 'text-[#9E95A8] hover:text-[#F4EFEA]'
                    }`}
                  >
                    {fontOpt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Text Alignment */}
          <div className="space-y-1">
            <span className="block text-[11px] font-semibold text-[#9E95A8]">
              Text Alignment
            </span>
            <div className="grid grid-cols-3 gap-1 bg-[#0D0B0E] p-1 rounded border border-[#2A252D] text-[11px]">
              {(
                [
                  { id: 'left', label: 'Left', Icon: AlignLeft },
                  { id: 'center', label: 'Center', Icon: AlignCenter },
                  { id: 'right', label: 'Right', Icon: AlignRight },
                ] as Array<{
                  id: TextAlignMode;
                  label: string;
                  Icon: typeof AlignLeft;
                }>
              ).map(({ id, label, Icon }) => {
                const isSelected = activeTextLayer.align === id;
                return (
                  <button
                    key={id}
                    type="button"
                    data-testid={`text-align-${id}`}
                    aria-label={`Align ${label}`}
                    aria-pressed={isSelected}
                    onClick={() => onUpdateLayer(activeTextLayer.id, { align: id })}
                    className={`py-1 px-1.5 rounded font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#231F28] border border-[#E5A93C] text-[#E5A93C]'
                        : 'text-[#9E95A8] hover:text-[#F4EFEA]'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Vertical Color Gradient Swatches */}
          <div className="space-y-1">
            <span className="block text-[11px] font-semibold text-[#9E95A8]">
              Vertical Gradient Swatch
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {(
                Object.values(TEXT_GRADIENT_SWATCHES) as Array<
                  (typeof TEXT_GRADIENT_SWATCHES)[TextGradientSwatchId]
                >
              ).map((swatch) => {
                const isSelected = activeTextLayer.swatch === swatch.id;
                return (
                  <button
                    key={swatch.id}
                    type="button"
                    data-testid={`swatch-${swatch.id}`}
                    aria-pressed={isSelected}
                    onClick={() =>
                      onUpdateLayer(activeTextLayer.id, { swatch: swatch.id })
                    }
                    className={`p-1.5 rounded border text-left flex items-center gap-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#231F28] border-[#E5A93C] ring-1 ring-[#E5A93C]'
                        : 'bg-[#0D0B0E] border-[#2A252D] hover:border-[#9E95A8]'
                    }`}
                  >
                    <span
                      className="w-4 h-4 rounded-xs border border-black/60 shrink-0"
                      style={{
                        background: `linear-gradient(180deg, ${swatch.topColor} 0%, ${swatch.midColor} 50%, ${swatch.bottomColor} 100%)`,
                      }}
                    />
                    <span className="text-[10px] font-semibold text-[#F4EFEA] truncate">
                      {swatch.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Font Size & Layer Tilt */}
          <InspectorSlider
            id="slider-font-size"
            label="Font Size"
            displayValue={`${activeTextLayer.fontSize}px`}
            min={24}
            max={120}
            step={2}
            value={activeTextLayer.fontSize}
            highlightReadout
            onChange={(fontSize) => onUpdateLayer(activeTextLayer.id, { fontSize })}
          />

          <InspectorSlider
            id="slider-layer-tilt"
            label="Layer Tilt"
            displayValue={`${activeTextLayer.rotationDeg > 0 ? '+' : ''}${activeTextLayer.rotationDeg}°`}
            min={-45}
            max={45}
            step={1}
            value={activeTextLayer.rotationDeg}
            onChange={(rotationDeg) =>
              onUpdateLayer(activeTextLayer.id, { rotationDeg })
            }
          />

          {/* Pixel Stroke Width & Hard Drop Shadow */}
          <InspectorSlider
            id="slider-stroke-width"
            label="Pixel Stroke Width"
            displayValue={`${activeTextLayer.strokeWidth}px`}
            min={0}
            max={16}
            step={1}
            value={activeTextLayer.strokeWidth}
            onChange={(strokeWidth) =>
              onUpdateLayer(activeTextLayer.id, { strokeWidth })
            }
          />

          <InspectorSlider
            id="slider-drop-shadow"
            label="Hard Drop Shadow"
            displayValue={`${activeTextLayer.dropShadow}px`}
            min={0}
            max={20}
            step={1}
            value={activeTextLayer.dropShadow}
            onChange={(dropShadow) =>
              onUpdateLayer(activeTextLayer.id, { dropShadow })
            }
          />

          {/* Isaac Ink-Streak Banner Underlay Toggle */}
          <button
            type="button"
            data-testid="ink-banner-toggle"
            aria-label="Ink-Streak Banner Underlay"
            aria-pressed={activeTextLayer.inkBanner}
            onClick={() =>
              onUpdateLayer(activeTextLayer.id, {
                inkBanner: !activeTextLayer.inkBanner,
              })
            }
            className={`w-full py-1.5 px-2.5 rounded border text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
              activeTextLayer.inkBanner
                ? 'bg-[#231F28] border-[#E5A93C] text-[#E5A93C]'
                : 'bg-[#0D0B0E] border-[#2A252D] text-[#9E95A8] hover:text-[#F4EFEA]'
            }`}
          >
            <span>Isaac Ink-Streak Banner</span>
            <span className="font-mono-tabular font-bold">
              {activeTextLayer.inkBanner ? 'ON' : 'OFF'}
            </span>
          </button>
        </div>
      )}
    </section>
  );
}
