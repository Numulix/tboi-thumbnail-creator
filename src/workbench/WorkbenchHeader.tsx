import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bookmark,
  Check,
  ChevronDown,
  Copy,
  Download,
  Eye,
  Grid,
  Plus,
  Skull,
  Trash2,
  X,
} from 'lucide-react';
import { type SceneState } from '../domain/sceneDocument';
import {
  listPresets,
  type TemplatePreset,
} from '../domain/templatePersistenceStore';

export interface WorkbenchHeaderProps {
  scene: SceneState;
  activeCharacterName: string;
  activeRoomName: string;
  activeRoomAccentColor: string;
  exportStatus: string | null;
  onSelectPreset: (preset: TemplatePreset) => void;
  onSavePreset: (name: string) => void;
  onDeletePreset: (presetId: string) => void;
  onToggleOverlay: (overlay: 'safeZone' | 'snapGrid') => void;
  onCopyClipboard: () => void;
  onExportPng: () => void;
}

export function WorkbenchHeader({
  scene,
  activeCharacterName,
  activeRoomName,
  activeRoomAccentColor,
  exportStatus,
  onSelectPreset,
  onSavePreset,
  onDeletePreset,
  onToggleOverlay,
  onCopyClipboard,
  onExportPng,
}: WorkbenchHeaderProps): React.ReactElement {
  const [presets, setPresets] = useState<TemplatePreset[]>(() => listPresets());
  const [isPresetDropdownOpen, setIsPresetDropdownOpen] = useState(false);
  const [isSavePresetModalOpen, setIsSavePresetModalOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const presetDropdownRef = useRef<HTMLDivElement | null>(null);

  // Close preset dropdown on click outside
  useEffect(() => {
    if (!isPresetDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        presetDropdownRef.current &&
        !presetDropdownRef.current.contains(e.target as Node)
      ) {
        setIsPresetDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isPresetDropdownOpen]);

  const builtinPresets = useMemo(
    () => presets.filter((p) => p.isBuiltIn),
    [presets]
  );
  const customPresets = useMemo(
    () => presets.filter((p) => !p.isBuiltIn),
    [presets]
  );

  const handleSelect = (preset: TemplatePreset) => {
    setIsPresetDropdownOpen(false);
    onSelectPreset(preset);
  };

  const handleSaveSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newPresetName.trim()) return;
    onSavePreset(newPresetName.trim());
    setPresets(listPresets());
    setNewPresetName('');
    setIsSavePresetModalOpen(false);
  };

  const handleDelete = (presetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onDeletePreset(presetId);
    setPresets(listPresets());
  };

  return (
    <>
      <header className="h-14 w-full bg-[#19161C] border-b border-[#2A252D] px-4 flex items-center justify-between shrink-0 flex-nowrap whitespace-nowrap z-30">
        {/* Left: Brand & Project Status */}
        <div className="flex items-center gap-3 shrink-0 whitespace-nowrap">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-[#231F28] border border-[#2A252D] flex items-center justify-center shadow-inner shrink-0">
              <Skull className="w-4 h-4 text-[#C83A3A]" />
            </div>
            <span className="font-black tracking-tight text-sm uppercase text-[#F4EFEA]">
              ISAAC THUMB STUDIO
            </span>
          </div>

          <div className="h-4 w-px bg-[#2A252D]" />

          <div
            data-testid="workspace-status-badge"
            className="flex items-center gap-2 bg-[#0D0B0E] border border-[#2A252D] rounded px-2.5 py-1 text-xs"
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: activeRoomAccentColor }}
            />
            <span className="font-semibold text-[#F4EFEA]">
              {activeCharacterName} Run - {activeRoomName}
            </span>
            <span className="font-mono-tabular text-[11px] text-[#22C55E] font-medium">[Saved]</span>
          </div>

          {/* Preset Selector Dropdown */}
          <div className="relative" ref={presetDropdownRef}>
            <button
              type="button"
              data-testid="preset-selector-dropdown"
              onClick={() => setIsPresetDropdownOpen((prev) => !prev)}
              aria-expanded={isPresetDropdownOpen}
              aria-haspopup="listbox"
              className="flex items-center gap-1.5 bg-[#231F28] hover:bg-[#2E2935] border border-[#2A252D] rounded px-2.5 py-1 text-xs transition-colors cursor-pointer"
            >
              <Bookmark className="w-3.5 h-3.5 text-[#E5A93C]" />
              <span className="text-[#9E95A8]">Preset:</span>
              <span className="text-[#E5A93C] font-semibold max-w-[130px] truncate">
                {scene.presetName}
              </span>
              <ChevronDown className="w-3 h-3 text-[#9E95A8]" />
            </button>

            {isPresetDropdownOpen && (
              <div
                data-testid="preset-dropdown-menu"
                className="absolute left-0 top-full mt-1.5 w-64 bg-[#19161C] border border-[#2A252D] rounded-lg shadow-2xl p-2 z-50 space-y-2 select-none"
              >
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#9E95A8] px-2 py-1">
                    Built-in Templates
                  </div>
                  <div className="space-y-0.5">
                    {builtinPresets.map((p) => {
                      const isSelected = scene.presetName === p.name;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          data-testid={`preset-option-${p.id}`}
                          onClick={() => handleSelect(p)}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs transition-colors cursor-pointer text-left ${
                            isSelected
                              ? 'bg-[#231F28] text-[#E5A93C] font-semibold border border-[#E5A93C]/40'
                              : 'text-[#F4EFEA] hover:bg-[#231F28] border border-transparent'
                          }`}
                        >
                          <span className="truncate">{p.name}</span>
                          <span className="text-[10px] font-mono-tabular px-1.5 py-0.5 rounded bg-[#0D0B0E] text-[#9E95A8] border border-[#2A252D]">
                            Built-in
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-[#2A252D] pt-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#9E95A8] px-2 py-1">
                    Custom Presets
                  </div>
                  {customPresets.length === 0 ? (
                    <div className="text-xs text-[#9E95A8] italic px-2 py-1">
                      No custom presets saved
                    </div>
                  ) : (
                    <div className="space-y-0.5 max-h-40 overflow-y-auto custom-scroll">
                      {customPresets.map((p) => {
                        const isSelected = scene.presetName === p.name;
                        return (
                          <div
                            key={p.id}
                            className={`flex items-center justify-between rounded px-2 py-1 transition-colors ${
                              isSelected
                                ? 'bg-[#231F28] border border-[#E5A93C]/40'
                                : 'hover:bg-[#231F28] border border-transparent'
                            }`}
                          >
                            <button
                              type="button"
                              data-testid={`preset-option-${p.id}`}
                              onClick={() => handleSelect(p)}
                              className={`flex-1 text-left text-xs truncate cursor-pointer mr-1 ${
                                isSelected
                                  ? 'text-[#E5A93C] font-semibold'
                                  : 'text-[#F4EFEA]'
                              }`}
                            >
                              {p.name}
                            </button>
                            <button
                              type="button"
                              data-testid={`delete-preset-${p.id}`}
                              aria-label={`Delete preset ${p.name}`}
                              onClick={(e) => handleDelete(p.id, e)}
                              className="p-1 rounded text-[#9E95A8] hover:text-[#F06E6E] hover:bg-[#C83A3A]/20 transition-colors cursor-pointer shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* + Save Preset CTA */}
          <button
            type="button"
            data-testid="save-preset-btn"
            onClick={() => {
              setNewPresetName(`${activeCharacterName} - ${activeRoomName}`);
              setIsSavePresetModalOpen(true);
            }}
            className="flex items-center gap-1.5 bg-[#231F28] hover:bg-[#2E2935] text-[#F4EFEA] border border-[#2A252D] rounded px-2.5 py-1 text-xs cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-[#E5A93C]" />
            <span>+ Save Preset</span>
          </button>
        </div>

        {/* Center: Canvas Resolution, Safe Zone Toggle & Snap Grid */}
        <div className="flex items-center gap-2 px-3 shrink-0 whitespace-nowrap">
          <div className="bg-[#0D0B0E] border border-[#2A252D] rounded px-2.5 py-1 text-xs font-mono-tabular flex items-center gap-1.5">
            <span className="text-[#E5A93C] font-bold">1280×720</span>
            <span className="text-[#2A252D]">•</span>
            <span className="text-[#9E95A8]">16:9</span>
          </div>

          <div className="h-4 w-px bg-[#2A252D]" />

          <button
            type="button"
            onClick={() => onToggleOverlay('safeZone')}
            aria-pressed={scene.editorOverlays.showSafeZoneOverlay}
            className={`px-2.5 py-1 rounded text-xs font-mono-tabular font-semibold border flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
              scene.editorOverlays.showSafeZoneOverlay
                ? 'bg-[#231F28] border-[#E5A93C] text-[#E5A93C]'
                : 'bg-[#0D0B0E] border-[#2A252D] text-[#9E95A8] hover:text-[#F4EFEA]'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>
              Safe Zone: {scene.editorOverlays.showSafeZoneOverlay ? 'ON' : 'OFF'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onToggleOverlay('snapGrid')}
            aria-pressed={scene.editorOverlays.showSnapGrid}
            className={`px-2.5 py-1 rounded text-xs font-mono-tabular font-semibold border flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
              scene.editorOverlays.showSnapGrid
                ? 'bg-[#231F28] border-[#E5A93C] text-[#E5A93C]'
                : 'bg-[#0D0B0E] border-[#2A252D] text-[#9E95A8] hover:text-[#F4EFEA]'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Snap Grid</span>
          </button>
        </div>

        {/* Right: Copy Image (⌘C) & Export 1280×720 PNG Primary CTA */}
        <div className="flex items-center gap-2 shrink-0 whitespace-nowrap">
          {exportStatus && (
            <span
              role="status"
              className="text-xs font-mono-tabular text-[#E5A93C] bg-[#0D0B0E] border border-[#2A252D] px-2 py-1 rounded flex items-center gap-1"
            >
              <Check className="w-3 h-3" />
              {exportStatus}
            </span>
          )}

          <button
            type="button"
            onClick={onCopyClipboard}
            className="px-2.5 py-1.5 rounded text-xs font-semibold bg-[#231F28] hover:bg-[#2E2935] text-[#F4EFEA] border border-[#2A252D] flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5 text-[#E5A93C]" />
            <span>Copy Image (⌘C)</span>
          </button>

          <button
            type="button"
            onClick={onExportPng}
            className="px-3.5 py-1.5 rounded text-xs font-bold bg-[#C83A3A] hover:brightness-110 text-white border-t border-[#F06E6E] border-b-2 border-[#751F1F] shadow-md flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export 1280×720 PNG</span>
          </button>
        </div>
      </header>

      {/* Save Preset Dialog Modal */}
      {isSavePresetModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="save-preset-title"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-[#19161C] border border-[#2A252D] rounded-xl shadow-2xl w-full max-w-sm p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-[#2A252D] pb-2.5">
              <div className="flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-[#E5A93C]" />
                <h3 id="save-preset-title" className="text-sm font-bold text-[#F4EFEA]">
                  Save Template Preset
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSavePresetModalOpen(false)}
                className="text-[#9E95A8] hover:text-[#F4EFEA] p-1 rounded cursor-pointer"
                aria-label="Close save preset dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSubmit} className="space-y-3">
              <div className="space-y-1">
                <label
                  htmlFor="preset-name-input"
                  className="text-xs font-semibold text-[#9E95A8]"
                >
                  Preset Name
                </label>
                <input
                  id="preset-name-input"
                  data-testid="preset-name-input"
                  type="text"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  placeholder="e.g. Devil Deal Carry"
                  autoFocus
                  className="w-full bg-[#0D0B0E] border border-[#2A252D] focus:border-[#E5A93C] rounded px-3 py-1.5 text-xs text-[#F4EFEA] outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  data-testid="cancel-save-preset-btn"
                  onClick={() => setIsSavePresetModalOpen(false)}
                  className="px-3 py-1.5 rounded text-xs text-[#9E95A8] hover:text-[#F4EFEA] hover:bg-[#231F28] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  data-testid="confirm-save-preset-btn"
                  className="px-3.5 py-1.5 rounded text-xs font-bold bg-[#C83A3A] hover:brightness-110 text-white border-t border-[#F06E6E] border-b-2 border-[#751F1F] shadow-md transition-all cursor-pointer"
                >
                  Save Preset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
