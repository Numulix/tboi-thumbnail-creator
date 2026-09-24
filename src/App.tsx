import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  Eye,
  Grid,
  Layers,
  RotateCcw,
  Skull,
  Tv,
} from 'lucide-react';
import {
  getRoomBackdropById,
  listRoomBackdrops,
  type RoomCategory,
} from './catalog/roomCatalog';
import {
  copyCanvasToClipboard,
  exportCanvasToPngBlob,
  renderThumbnail,
} from './canvas/thumbnailRenderer';
import {
  createDefaultSceneState,
  resetCameraAndBackdrop,
  resolveSceneLayout,
  toggleEditorOverlay,
  updateBackdropFilters,
  updateCameraFraming,
  updateRoomStage,
  type SceneState,
} from './domain/sceneDocument';

interface InspectorSliderProps {
  id: string;
  label: string;
  displayValue: string;
  min: number;
  max: number;
  step: number;
  value: number;
  highlightReadout?: boolean;
  onChange: (nextValue: number) => void;
}

function InspectorSlider({
  id,
  label,
  displayValue,
  min,
  max,
  step,
  value,
  highlightReadout = false,
  onChange,
}: InspectorSliderProps): React.ReactElement {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <label htmlFor={id} className="text-[#9E95A8]">
          {label}
        </label>
        <span
          className={`font-mono-tabular font-semibold ${
            highlightReadout ? 'text-[#E5A93C]' : 'text-[#F4EFEA]'
          }`}
        >
          {displayValue}
        </span>
      </div>
      <input
        id={id}
        aria-label={label}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-[#0D0B0E] rounded accent-[#E5A93C] cursor-pointer"
      />
    </div>
  );
}

export function App(): React.ReactElement {
  const [scene, setScene] = useState<SceneState>(() => createDefaultSceneState());
  const [activeCategory, setActiveCategory] = useState<RoomCategory>('main');
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  const stageCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const activeRoom = useMemo(() => getRoomBackdropById(scene.stageId), [scene.stageId]);
  const categoryRooms = useMemo(
    () => listRoomBackdrops(activeCategory),
    [activeCategory]
  );
  const resolvedNodes = useMemo(() => resolveSceneLayout(scene), [scene]);

  // Synchronize both 1280x720 Interactive Stage and 180x101 YouTube Feed Preview
  useEffect(() => {
    const stageCanvas = stageCanvasRef.current;
    if (stageCanvas) {
      const ctx = stageCanvas.getContext('2d');
      if (ctx) {
        renderThumbnail(ctx, scene, resolvedNodes, new Map(), {
          includeEditorOverlays: true,
        });
      }
    }

    const previewCanvas = previewCanvasRef.current;
    if (previewCanvas) {
      const pctx = previewCanvas.getContext('2d');
      if (pctx) {
        renderThumbnail(pctx, scene, resolvedNodes, new Map(), {
          includeEditorOverlays: false,
        });
      }
    }
  }, [scene, resolvedNodes]);

  const buildCleanExportCanvas = useCallback((): HTMLCanvasElement => {
    const offscreen = document.createElement('canvas');
    offscreen.width = 1280;
    offscreen.height = 720;
    const ctx = offscreen.getContext('2d');
    if (ctx) {
      renderThumbnail(ctx, scene, resolvedNodes, new Map(), {
        includeEditorOverlays: false,
      });
    }
    return offscreen;
  }, [scene, resolvedNodes]);

  const handleExportPng = useCallback(async () => {
    try {
      const cleanCanvas = buildCleanExportCanvas();
      const blob = await exportCanvasToPngBlob(cleanCanvas);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `isaac-thumb-${scene.stageId}-1280x720.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setExportStatus('Exported 1280×720 PNG');
    } catch {
      setExportStatus('Export failed');
    }
  }, [buildCleanExportCanvas, scene.stageId]);

  const handleCopyClipboard = useCallback(async () => {
    try {
      const cleanCanvas = buildCleanExportCanvas();
      await copyCanvasToClipboard(cleanCanvas);
      setExportStatus('Copied 1280×720 PNG to Clipboard');
    } catch {
      setExportStatus('Clipboard unavailable');
    }
  }, [buildCleanExportCanvas]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'c') {
        const activeTag = document.activeElement?.tagName.toLowerCase();
        if (activeTag !== 'input' && activeTag !== 'textarea') {
          e.preventDefault();
          void handleCopyClipboard();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleCopyClipboard]);

  const handleSelectStage = (stageId: string, category: RoomCategory) => {
    setActiveCategory(category);
    setScene((prev) => updateRoomStage(prev, stageId));
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#110F13] text-[#F4EFEA] select-none">
      {/* =================================================================== */}
      {/* 1. TOP HEADER BAR (Single-line, unclipped, Studio Brimstone tokens) */}
      {/* =================================================================== */}
      <header className="h-14 w-full bg-[#19161C] border-b border-[#2A252D] px-4 flex items-center justify-between shrink-0 flex-nowrap whitespace-nowrap overflow-x-auto custom-scroll z-30">
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

          <div className="flex items-center gap-2 bg-[#0D0B0E] border border-[#2A252D] rounded px-2.5 py-1 text-xs">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: activeRoom.accentDotColor }}
            />
            <span className="font-semibold text-[#F4EFEA]">
              Eden Run - {activeRoom.name}
            </span>
            <span className="font-mono-tabular text-[11px] text-[#9E95A8]">[Local Bundle]</span>
          </div>

          <div className="flex items-center gap-1.5 bg-[#231F28] border border-[#2A252D] rounded px-2.5 py-1 text-xs">
            <span className="text-[#9E95A8]">Preset:</span>
            <span className="text-[#E5A93C] font-semibold">{scene.presetName}</span>
          </div>
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
            onClick={() => setScene((prev) => toggleEditorOverlay(prev, 'safeZone'))}
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
            onClick={() => setScene((prev) => toggleEditorOverlay(prev, 'snapGrid'))}
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
            onClick={() => void handleCopyClipboard()}
            className="px-2.5 py-1.5 rounded text-xs font-semibold bg-[#231F28] hover:bg-[#2E2935] text-[#F4EFEA] border border-[#2A252D] flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5 text-[#E5A93C]" />
            <span>Copy Image (⌘C)</span>
          </button>

          <button
            type="button"
            onClick={() => void handleExportPng()}
            className="px-3.5 py-1.5 rounded text-xs font-bold bg-[#C83A3A] hover:brightness-110 text-white border-t border-[#F06E6E] border-b-2 border-[#751F1F] shadow-md flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export 1280×720 PNG</span>
          </button>
        </div>
      </header>

      {/* =================================================================== */}
      {/* MAIN 3-COLUMN WORKBENCH                                             */}
      {/* =================================================================== */}
      <main className="flex-1 flex overflow-hidden">
        {/* ================================================================= */}
        {/* 2. LEFT ASSET DRAWER (320px Stone Panel #19161C)                  */}
        {/* ================================================================= */}
        <aside className="w-[320px] bg-[#19161C] border-r border-[#2A252D] flex flex-col shrink-0 overflow-y-auto custom-scroll">
          <div className="px-3 py-2.5 border-b border-[#2A252D] bg-[#0D0B0E] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#E5A93C]" />
              <span className="text-xs font-bold tracking-wider uppercase text-[#E5A93C]">
                ASSET DRAWER
              </span>
            </div>
            <span className="text-[11px] font-mono-tabular text-[#9E95A8]">
              {listRoomBackdrops().length} Bundled Rooms
            </span>
          </div>

          <div className="p-3 space-y-4">
            {/* Stage / Room Catalog Browser */}
            <section className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#9E95A8]">
                  Repentance+ Stage Catalog
                </span>
                <span className="text-[11px] font-mono-tabular text-[#E5A93C]">
                  CORS-Free
                </span>
              </div>

              {/* Category Tabs: Main Path, Alt Path, Special Rooms */}
              <div className="grid grid-cols-3 gap-1 bg-[#0D0B0E] p-1 rounded border border-[#2A252D] text-[11px]">
                <button
                  type="button"
                  onClick={() => setActiveCategory('main')}
                  className={`py-1 px-1.5 rounded font-semibold transition-colors cursor-pointer ${
                    activeCategory === 'main'
                      ? 'bg-[#E5A93C] text-[#110F13] font-bold'
                      : 'text-[#9E95A8] hover:text-[#F4EFEA]'
                  }`}
                >
                  Main Path
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCategory('alt')}
                  className={`py-1 px-1.5 rounded font-semibold transition-colors cursor-pointer ${
                    activeCategory === 'alt'
                      ? 'bg-[#E5A93C] text-[#110F13] font-bold'
                      : 'text-[#9E95A8] hover:text-[#F4EFEA]'
                  }`}
                >
                  Alt Path
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCategory('special')}
                  className={`py-1 px-1.5 rounded font-semibold transition-colors cursor-pointer ${
                    activeCategory === 'special'
                      ? 'bg-[#E5A93C] text-[#110F13] font-bold'
                      : 'text-[#9E95A8] hover:text-[#F4EFEA]'
                  }`}
                >
                  Special Rooms
                </button>
              </div>

              {/* Bundled Stage Cards */}
              <div className="space-y-1.5">
                {categoryRooms.map((room) => {
                  const isSelected = room.id === scene.stageId;
                  return (
                    <button
                      key={room.id}
                      type="button"
                      onClick={() => handleSelectStage(room.id, room.category)}
                      className={`w-full p-2 rounded border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#231F28] border-[#E5A93C] shadow-sm'
                          : 'bg-[#0D0B0E] border-[#2A252D] hover:bg-[#231F28]/60'
                      }`}
                    >
                      <img
                        src={room.textureDataUrl}
                        alt={room.name}
                        className="w-14 h-8 rounded-xs border border-[#2A252D] object-cover pixelated shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold text-[#F4EFEA] truncate">
                            {room.name}
                          </span>
                          {isSelected && (
                            <span className="text-[10px] font-mono-tabular font-bold px-1.5 py-0.5 rounded bg-[#E5A93C]/20 text-[#E5A93C]">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-[#9E95A8] truncate mt-0.5">
                          {room.subtitle}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>
        </aside>

        {/* ================================================================= */}
        {/* 3. CENTER VIEWPORT: 16:9 STAGE + 180×101 YOUTUBE FEED PREVIEW     */}
        {/* ================================================================= */}
        <section className="flex-1 bg-cellar-grid relative overflow-hidden flex flex-col items-center justify-center p-6">
          {/* Top-Left Viewport Readout Bar */}
          <div className="absolute top-3 left-4 flex items-center gap-2.5 text-xs font-mono-tabular text-[#9E95A8] pointer-events-none z-10">
            <span className="bg-[#0D0B0E] px-2.5 py-1 rounded border border-[#2A252D] text-[#F4EFEA]">
              Stage: <strong className="text-[#E5A93C]">{activeRoom.name}</strong>
            </span>
            <span className="bg-[#0D0B0E] px-2.5 py-1 rounded border border-[#2A252D]">
              1280 × 720 px (16:9)
            </span>
            <span className="bg-[#0D0B0E] px-2.5 py-1 rounded border border-[#2A252D]">
              imageSmoothingEnabled = false
            </span>
          </div>

          {/* 16:9 Interactive Master Artboard */}
          <div className="relative w-full max-w-[920px] aspect-video bg-[#0D0B0E] rounded-xs shadow-2xl border border-[#2A252D] overflow-hidden">
            <canvas
              ref={stageCanvasRef}
              data-testid="stage-canvas"
              width={1280}
              height={720}
              className="w-full h-full block pixelated"
            />
          </div>

          {/* Floating 180×101 YouTube Feed Preview Card (Bottom-Right Docked) */}
          <div
            data-testid="youtube-feed-preview-card"
            className="absolute bottom-4 right-6 bg-[#19161C] border border-[#2A252D] rounded p-3 shadow-2xl w-[256px] z-20"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Tv className="w-3.5 h-3.5 text-[#C83A3A]" />
                <span className="text-xs font-bold text-[#F4EFEA]">
                  YouTube Feed Preview
                </span>
              </div>
              <span className="text-[11px] font-mono-tabular text-[#9E95A8]">
                180×101
              </span>
            </div>

            {/* Clean 180x101 Miniature Canvas (Editor Overlays Strictly Excluded) */}
            <div className="w-[180px] h-[101px] mx-auto bg-[#0D0B0E] rounded-xs border border-[#2A252D] relative overflow-hidden mb-2 shadow-inner">
              <canvas
                ref={previewCanvasRef}
                data-testid="preview-canvas"
                width={180}
                height={101}
                className="w-[180px] h-[101px] block pixelated"
              />
              <div className="absolute bottom-1 right-1 bg-black/90 text-white text-[9px] font-mono-tabular font-bold px-1 py-0.2 rounded-xs pointer-events-none">
                19:42
              </div>
            </div>

            {/* Mock YouTube Video Feed Metadata */}
            <div className="flex gap-2 items-start">
              <div className="w-6 h-6 rounded-full bg-[#C83A3A] flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                ED
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-[#F4EFEA] truncate leading-tight">
                  I ROLLED 2 QUALITY 4 ITEMS ON EDEN START...
                </div>
                <div className="text-[10px] font-mono-tabular text-[#9E95A8] mt-0.5">
                  IsaacStreak • 142K views • 1h ago
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* 4. RIGHT CONTEXT INSPECTOR (320px Stone Panel #19161C)            */}
        {/* ================================================================= */}
        <aside className="w-[320px] bg-[#19161C] border-l border-[#2A252D] flex flex-col shrink-0 overflow-y-auto custom-scroll">
          <div className="px-3 py-2.5 border-b border-[#2A252D] bg-[#0D0B0E] flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider uppercase text-[#E5A93C]">
              INSPECTOR
            </span>
            <button
              type="button"
              onClick={() => setScene((prev) => resetCameraAndBackdrop(prev))}
              className="text-[11px] font-mono-tabular text-[#9E95A8] hover:text-[#F4EFEA] bg-[#231F28] border border-[#2A252D] px-2 py-0.5 rounded flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Camera</span>
            </button>
          </div>

          <div className="p-3.5 space-y-5">
            {/* SECTION 1: ROOM & CAMERA FRAMING */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#9E95A8]">
                  Room &amp; Camera Framing
                </span>
                <span className="text-[11px] font-mono-tabular text-[#E5A93C]">
                  {activeRoom.name}
                </span>
              </div>

              <InspectorSlider
                id="slider-room-zoom"
                label="Room Zoom"
                displayValue={`${Math.round(scene.camera.zoom * 100)}%`}
                min={1.0}
                max={3.0}
                step={0.05}
                value={scene.camera.zoom}
                highlightReadout
                onChange={(zoom) =>
                  setScene((prev) => updateCameraFraming(prev, { zoom }))
                }
              />

              <InspectorSlider
                id="slider-pan-x"
                label="Pan X"
                displayValue={`${scene.camera.panX}px`}
                min={-200}
                max={200}
                step={2}
                value={scene.camera.panX}
                onChange={(panX) =>
                  setScene((prev) => updateCameraFraming(prev, { panX }))
                }
              />

              <InspectorSlider
                id="slider-pan-y"
                label="Pan Y"
                displayValue={`${scene.camera.panY}px`}
                min={-200}
                max={200}
                step={2}
                value={scene.camera.panY}
                onChange={(panY) =>
                  setScene((prev) => updateCameraFraming(prev, { panY }))
                }
              />
            </section>

            <div className="h-px bg-[#2A252D]" />

            {/* SECTION 2: BACKDROP READABILITY & ATMOSPHERE */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#9E95A8]">
                  Readability &amp; Contrast FX
                </span>
                <span className="text-[11px] font-mono-tabular text-[#9E95A8]">
                  Foreground Pop
                </span>
              </div>

              <InspectorSlider
                id="slider-vignette"
                label="Vignette Intensity"
                displayValue={`${scene.backdrop.vignetteIntensity}%`}
                min={0}
                max={100}
                step={1}
                value={scene.backdrop.vignetteIntensity}
                onChange={(vignetteIntensity) =>
                  setScene((prev) =>
                    updateBackdropFilters(prev, { vignetteIntensity })
                  )
                }
              />

              <InspectorSlider
                id="slider-dimming"
                label="Backdrop Dimming"
                displayValue={`${scene.backdrop.backdropDimming}%`}
                min={0}
                max={100}
                step={1}
                value={scene.backdrop.backdropDimming}
                onChange={(backdropDimming) =>
                  setScene((prev) =>
                    updateBackdropFilters(prev, { backdropDimming })
                  )
                }
              />

              <InspectorSlider
                id="slider-depth-blur"
                label="Depth Blur"
                displayValue={`${scene.backdrop.depthBlur.toFixed(1)}px`}
                min={0}
                max={8}
                step={0.5}
                value={scene.backdrop.depthBlur}
                onChange={(depthBlur) =>
                  setScene((prev) => updateBackdropFilters(prev, { depthBlur }))
                }
              />
            </section>
          </div>
        </aside>
      </main>
    </div>
  );
}

export default App;
