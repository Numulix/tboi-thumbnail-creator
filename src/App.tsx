import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Check,
  Copy,
  Dices,
  Download,
  Eye,
  Grid,
  Layers,
  Move,
  Package,
  Plus,
  RotateCcw,
  Search,
  Skull,
  Trash2,
  Tv,
  Type,
  User,
} from 'lucide-react';
import {
  composeCharacterStack,
  getCharacterById,
  getCharacterPoseById,
  getCollectibleById,
  getEdenHairById,
  listCharacters,
  listCollectibles,
  listEdenHairs,
  resolveCharacterEdenHairId,
  searchCollectibles,
} from './catalog/gameAssetsCatalog';
import {
  getRoomBackdropById,
  listRoomBackdrops,
  type RoomCategory,
} from './catalog/roomCatalog';
import {
  copyCanvasToClipboard,
  exportCanvasToPngBlob,
  getNodeGizmoBounds,
  hitTestTextLayer,
  preloadSceneAssets,
  renderThumbnail,
  type AssetBitmapCache,
} from './canvas/thumbnailRenderer';
import {
  addTextLayer,
  applyFormationPreset,
  assignCollectibleToPedestal,
  clampRotationDeg,
  createDefaultSceneState,
  deleteTextLayer,
  randomizeEdenHair,
  resetCameraAndBackdrop,
  resetCharacterScale,
  resetNodePositions,
  resolveSceneLayout,
  selectCharacter,
  selectEdenHair,
  TEXT_FONT_OPTIONS,
  TEXT_GRADIENT_SWATCHES,
  toggleEditorOverlay,
  updateBackdropFilters,
  updateCameraFraming,
  updateCharacterPose,
  updateCharacterScale,
  updateNodeDragOffset,
  updateNodeRotation,
  updateNodeScaleFromGizmo,
  updatePedestalCount,
  updatePedestalScale,
  updateRoomStage,
  updateTextLayer,
  type CharacterPoseId,
  type FormationPreset,
  type SceneState,
  type TextAlignMode,
  type TextGradientSwatchId,
  type Vec2,
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

const POSE_OPTIONS: Array<{ id: CharacterPoseId; label: string }> = [
  { id: 'idle', label: 'Front Idle' },
  { id: 'pickup', label: '★ Happy Pickup' },
  { id: 'crying', label: 'Crying' },
];

const FORMATION_PRESET_OPTIONS: Array<{ id: FormationPreset; label: string }> = [
  { id: 'arc', label: 'Arc' },
  { id: 'row', label: 'Row' },
  { id: 'grid-2x2', label: '2×2 Grid' },
  { id: 'flank', label: 'Flank' },
];

const PEDESTAL_COUNT_OPTIONS: Array<3 | 4 | 5 | 6> = [3, 4, 5, 6];

function getQualityBadgeClasses(quality: 0 | 1 | 2 | 3 | 4): string {
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

function getCollectibleAtlasSpriteStyle(
  atlasCol: number,
  atlasRow: number
): React.CSSProperties {
  return {
    backgroundImage: 'url(/assets/collectibles/collectibles-atlas.png)',
    backgroundPosition: `-${atlasCol * 32}px -${atlasRow * 32}px`,
    backgroundSize: `${28 * 32}px ${26 * 32}px`,
  };
}

function clientToCanvasCoords(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number
): Vec2 {
  const rect = canvas.getBoundingClientRect();
  const width = rect.width > 0 ? rect.width : 1280;
  const height = rect.height > 0 ? rect.height : 720;
  return {
    x: ((clientX - rect.left) / width) * 1280,
    y: ((clientY - rect.top) / height) * 720,
  };
}

function capturePointerSafely(
  e: React.PointerEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement>
): void {
  if ('pointerId' in e && typeof e.currentTarget.setPointerCapture === 'function') {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore pointer capture errors in synthetic test environments
    }
  }
}

export function App(): React.ReactElement {
  const [scene, setScene] = useState<SceneState>(() => createDefaultSceneState());
  const [activeDrawerTab, setActiveDrawerTab] = useState<
    'character' | 'pedestals' | 'rooms'
  >('character');
  const [characterVariantTab, setCharacterVariantTab] = useState<'normal' | 'tainted'>(
    'normal'
  );
  const [activeCategory, setActiveCategory] = useState<RoomCategory>('main');
  const [selectedPedestalId, setSelectedPedestalId] = useState<string>('pedestal-1');
  const [selectedTextLayerId, setSelectedTextLayerId] =
    useState<string>('text-headline');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(
    'text-headline'
  );
  const [collectibleSearchQuery, setCollectibleSearchQuery] = useState<string>('');
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [assetRevision, setAssetRevision] = useState(0);

  const stageCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const assetBitmapsRef = useRef<AssetBitmapCache>(new Map());
  const activeDragRef = useRef<{
    mode: 'move' | 'rotate' | 'resize';
    nodeId: string;
    lastCanvasPos: Vec2;
    anchor?: Vec2;
  } | null>(null);

  const activeRoom = useMemo(() => getRoomBackdropById(scene.stageId), [scene.stageId]);
  const categoryRooms = useMemo(
    () => listRoomBackdrops(activeCategory),
    [activeCategory]
  );
  const activeCharacterEntry = useMemo(
    () => getCharacterById(scene.character.id),
    [scene.character.id]
  );
  const activePoseEntry = useMemo(
    () => getCharacterPoseById(scene.character.pose),
    [scene.character.pose]
  );
  const activeEdenHairEntry = useMemo(
    () =>
      getEdenHairById(
        resolveCharacterEdenHairId(
          activeCharacterEntry,
          scene.character.edenHairId
        )
      ),
    [scene.character.edenHairId, activeCharacterEntry]
  );
  const activePreviewStack = useMemo(
    () => composeCharacterStack(scene.character),
    [scene.character]
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
  const matchingCollectibles = useMemo(
    () => searchCollectibles(collectibleSearchQuery, 48),
    [collectibleSearchQuery]
  );
  const effectiveSelectedPedestalId = useMemo(() => {
    const exists = scene.pedestals.some((p) => p.id === selectedPedestalId);
    return exists ? selectedPedestalId : (scene.pedestals[0]?.id ?? 'pedestal-1');
  }, [scene.pedestals, selectedPedestalId]);
  const activeTextLayer = useMemo(() => {
    return (
      scene.textLayers.find((l) => l.id === selectedTextLayerId) ??
      scene.textLayers[0] ??
      null
    );
  }, [scene.textLayers, selectedTextLayerId]);
  const resolvedNodes = useMemo(() => resolveSceneLayout(scene), [scene]);

  // Preload authentic room backdrop, collectibles atlas, altar sheet, and character/Eden hair atlases
  useEffect(() => {
    preloadSceneAssets(scene, assetBitmapsRef.current, () => {
      setAssetRevision((rev) => rev + 1);
    });
  }, [scene]);

  // Synchronize both 1280x720 Interactive Stage and 180x101 YouTube Feed Preview
  useEffect(() => {
    const stageCanvas = stageCanvasRef.current;
    if (stageCanvas) {
      const ctx = stageCanvas.getContext('2d');
      if (ctx) {
        renderThumbnail(ctx, scene, resolvedNodes, assetBitmapsRef.current, {
          includeEditorOverlays: true,
          selectedNodeId,
        });
      }
    }

    const previewCanvas = previewCanvasRef.current;
    if (previewCanvas) {
      const pctx = previewCanvas.getContext('2d');
      if (pctx) {
        renderThumbnail(pctx, scene, resolvedNodes, assetBitmapsRef.current, {
          includeEditorOverlays: false,
        });
      }
    }
  }, [scene, resolvedNodes, assetRevision, selectedNodeId]);

  const buildCleanExportCanvas = useCallback((): HTMLCanvasElement => {
    const offscreen = document.createElement('canvas');
    offscreen.width = 1280;
    offscreen.height = 720;
    const ctx = offscreen.getContext('2d');
    if (ctx) {
      renderThumbnail(ctx, scene, resolvedNodes, assetBitmapsRef.current, {
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

  const handleSelectCharacter = (characterId: string, variant: 'normal' | 'tainted') => {
    setCharacterVariantTab(variant);
    setScene((prev) => selectCharacter(prev, characterId));
  };

  const characterSection = (
    <section
      key="drawer-character-section"
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
                backgroundSize: `${6 * 64}px ${38 * 64}px`,
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
              {POSE_OPTIONS.find((p) => p.id === scene.character.pose)?.label ??
                activePoseEntry.label}
            </span>
          </div>
          <div className="text-[10px] font-mono-tabular text-[#9E95A8] flex items-center gap-2">
            <span>Scale: {scene.character.scale.toFixed(2)}x</span>
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
          const isSelected = char.id === scene.character.id;
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
                  backgroundSize: `${6 * 32}px ${38 * 32}px`,
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
            const isSelected = scene.character.pose === poseOption.id;
            return (
              <button
                key={poseOption.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() =>
                  setScene((prev) => updateCharacterPose(prev, poseOption.id))
                }
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
              {scene.character.scale.toFixed(2)}x
            </span>
            <button
              type="button"
              aria-label="Reset Scale"
              onClick={() => setScene((prev) => resetCharacterScale(prev))}
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
          value={scene.character.scale}
          onChange={(e) =>
            setScene((prev) => updateCharacterScale(prev, Number(e.target.value)))
          }
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
              onClick={() => setScene((prev) => randomizeEdenHair(prev))}
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
                  onClick={() =>
                    setScene((prev) => selectEdenHair(prev, hair.id))
                  }
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

  const handleCanvasPointerDown = (
    e: React.PointerEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement>
  ) => {
    const canvas = stageCanvasRef.current;
    if (!canvas) {
      return;
    }
    const pt = clientToCanvasCoords(canvas, e.clientX, e.clientY);

    // 1. Check if pointer hits the active node's cyan rotation handle knob or 4 corner resize handles
    if (selectedNodeId) {
      const activeBounds = getNodeGizmoBounds(
        scene,
        resolvedNodes,
        selectedNodeId
      );
      if (activeBounds) {
        if (
          Math.hypot(pt.x - activeBounds.handleX, pt.y - activeBounds.handleY) <=
          28
        ) {
          activeDragRef.current = {
            mode: 'rotate',
            nodeId: activeBounds.nodeId,
            lastCanvasPos: pt,
            anchor: { x: activeBounds.anchorX, y: activeBounds.anchorY },
          };
          capturePointerSafely(e);
          return;
        }

        if (
          activeBounds.corners.some(
            (corner) => Math.hypot(pt.x - corner.x, pt.y - corner.y) <= 18
          )
        ) {
          activeDragRef.current = {
            mode: 'resize',
            nodeId: activeBounds.nodeId,
            lastCanvasPos: pt,
            anchor: { x: activeBounds.anchorX, y: activeBounds.anchorY },
          };
          capturePointerSafely(e);
          return;
        }
      }
    }

    // 2. Check if pointer hits any Text Layer node (topmost first)
    const hitText = hitTestTextLayer(scene, pt);
    if (hitText) {
      setSelectedTextLayerId(hitText.id);
      setSelectedNodeId(hitText.id);
      activeDragRef.current = {
        mode: 'move',
        nodeId: hitText.id,
        lastCanvasPos: pt,
      };
      capturePointerSafely(e);
      return;
    }

    // 3. Check if pointer hits Character or Pedestal sprite nodes
    const spriteNodesDesc = [...resolvedNodes]
      .filter((n) => n.kind === 'character' || n.kind === 'pedestal')
      .reverse();

    let hitNode = spriteNodesDesc.find((node) => {
      const halfWidth = node.kind === 'character' ? 72 : 68;
      const topExtent = node.kind === 'character' ? 165 : 155;
      return (
        Math.abs(pt.x - node.x) <= halfWidth &&
        pt.y >= node.y - topExtent &&
        pt.y <= node.y + 40
      );
    });

    if (!hitNode) {
      let bestDist = 120;
      for (const node of spriteNodesDesc) {
        const dist = Math.hypot(pt.x - node.x, pt.y - (node.y - 35));
        if (dist <= bestDist) {
          bestDist = dist;
          hitNode = node;
        }
      }
    }

    if (!hitNode) {
      return;
    }

    const nodeId = hitNode.kind === 'character' ? 'character' : hitNode.id;
    setSelectedNodeId(nodeId);
    activeDragRef.current = {
      mode: 'move',
      nodeId,
      lastCanvasPos: pt,
    };

    if (hitNode.kind === 'pedestal') {
      setSelectedPedestalId(hitNode.id);
    }

    capturePointerSafely(e);
  };

  const handleCanvasPointerMove = (
    e: React.PointerEvent<HTMLCanvasElement>
  ) => {
    const dragState = activeDragRef.current;
    const canvas = stageCanvasRef.current;
    if (!dragState || !canvas) {
      return;
    }

    const nextPt = clientToCanvasCoords(canvas, e.clientX, e.clientY);

    if (dragState.mode === 'rotate' && dragState.anchor) {
      const angleRad = Math.atan2(
        nextPt.x - dragState.anchor.x,
        -(nextPt.y - dragState.anchor.y)
      );
      const deg = clampRotationDeg((angleRad * 180) / Math.PI);
      activeDragRef.current = {
        ...dragState,
        lastCanvasPos: nextPt,
      };
      setScene((prev) => updateNodeRotation(prev, dragState.nodeId, deg));
      return;
    }

    if (dragState.mode === 'resize' && dragState.anchor) {
      const prevDist = Math.max(
        24,
        Math.hypot(
          dragState.lastCanvasPos.x - dragState.anchor.x,
          dragState.lastCanvasPos.y - dragState.anchor.y
        )
      );
      const nextDist = Math.max(
        24,
        Math.hypot(
          nextPt.x - dragState.anchor.x,
          nextPt.y - dragState.anchor.y
        )
      );
      const scaleRatio = nextDist / prevDist;
      activeDragRef.current = {
        ...dragState,
        lastCanvasPos: nextPt,
      };
      setScene((prev) =>
        updateNodeScaleFromGizmo(prev, dragState.nodeId, scaleRatio)
      );
      return;
    }

    const dx = Math.round(nextPt.x - dragState.lastCanvasPos.x);
    const dy = Math.round(nextPt.y - dragState.lastCanvasPos.y);
    if (dx === 0 && dy === 0) {
      return;
    }

    const { nodeId } = dragState;
    activeDragRef.current = {
      ...dragState,
      lastCanvasPos: {
        x: dragState.lastCanvasPos.x + dx,
        y: dragState.lastCanvasPos.y + dy,
      },
    };
    setScene((prev) => updateNodeDragOffset(prev, nodeId, { x: dx, y: dy }));
  };

  const handleCanvasPointerUp = () => {
    activeDragRef.current = null;
  };

  const pedestalsSection = (
    <section
      key="drawer-pedestals-section"
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

      {/* 1. Active Pedestal Count (3, 4, 5, 6) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#9E95A8]">
            Active Pedestals
          </span>
          <span className="text-[10px] font-mono-tabular text-[#9E95A8]">
            {scene.pedestals.length} Slots Active
          </span>
        </div>
        <div className="grid grid-cols-4 gap-1 bg-[#0D0B0E] p-1 rounded border border-[#2A252D] text-xs">
          {PEDESTAL_COUNT_OPTIONS.map((count) => {
            const isSelected = scene.pedestals.length === count;
            return (
              <button
                key={count}
                type="button"
                data-testid={`pedestal-count-${count}`}
                aria-pressed={isSelected}
                onClick={() =>
                  setScene((prev) => updatePedestalCount(prev, count))
                }
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
            onClick={() => setScene((prev) => resetNodePositions(prev))}
            className="text-[10px] font-mono-tabular text-[#E5A93C] hover:text-[#F4EFEA] bg-[#231F28] border border-[#E5A93C]/50 px-2 py-0.5 rounded flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            <span>Reset Positions</span>
          </button>
        </div>
        <div className="grid grid-cols-2 gap-1 bg-[#0D0B0E] p-1 rounded border border-[#2A252D] text-[11px]">
          {FORMATION_PRESET_OPTIONS.map((preset) => {
            const isSelected = scene.formationPreset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                data-testid={`formation-preset-${preset.id}`}
                aria-pressed={isSelected}
                onClick={() =>
                  setScene((prev) => applyFormationPreset(prev, preset.id))
                }
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
        displayValue={`${(scene.pedestalScale ?? 1.5).toFixed(2)}x`}
        min={1.0}
        max={2.5}
        step={0.05}
        value={scene.pedestalScale ?? 1.5}
        highlightReadout
        onChange={(pedestalScale) =>
          setScene((prev) => updatePedestalScale(prev, pedestalScale))
        }
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
          {scene.pedestals.map((slot, idx) => {
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
                onClick={() => setSelectedPedestalId(slot.id)}
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
            const activeSlot = scene.pedestals.find(
              (p) => p.id === effectiveSelectedPedestalId
            );
            const isAssigned = activeSlot?.itemId === item.id;
            return (
              <button
                key={item.id}
                type="button"
                data-testid={`collectible-result-${item.id}`}
                aria-pressed={isAssigned}
                onClick={() =>
                  setScene((prev) =>
                    assignCollectibleToPedestal(
                      prev,
                      effectiveSelectedPedestalId,
                      item.id
                    )
                  )
                }
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

  const stageCatalogSection = (
    <section
      key="drawer-stage-section"
      data-testid="stage-catalog-section"
      className="space-y-2.5"
    >
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
  );

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
              {activeCharacterEntry.name} Run - {activeRoom.name}
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
              {listCharacters().length} Chars • {listCollectibles().length} Items
            </span>
          </div>

          {/* Left Drawer Tab Switcher: Character vs Pedestals vs Rooms */}
          <div className="grid grid-cols-3 gap-1 p-2 bg-[#0D0B0E] border-b border-[#2A252D] text-xs">
            <button
              type="button"
              onClick={() => setActiveDrawerTab('character')}
              aria-pressed={activeDrawerTab === 'character'}
              className={`py-1.5 px-1.5 rounded font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                activeDrawerTab === 'character'
                  ? 'bg-[#231F28] border border-[#E5A93C] text-[#E5A93C]'
                  : 'text-[#9E95A8] hover:text-[#F4EFEA]'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Character</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveDrawerTab('pedestals')}
              aria-pressed={activeDrawerTab === 'pedestals'}
              className={`py-1.5 px-1.5 rounded font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                activeDrawerTab === 'pedestals'
                  ? 'bg-[#231F28] border border-[#E5A93C] text-[#E5A93C]'
                  : 'text-[#9E95A8] hover:text-[#F4EFEA]'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Pedestals</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveDrawerTab('rooms')}
              aria-pressed={activeDrawerTab === 'rooms'}
              className={`py-1.5 px-1.5 rounded font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                activeDrawerTab === 'rooms'
                  ? 'bg-[#231F28] border border-[#E5A93C] text-[#E5A93C]'
                  : 'text-[#9E95A8] hover:text-[#F4EFEA]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Rooms</span>
            </button>
          </div>

          <div className="p-3 space-y-5">
            {activeDrawerTab === 'character'
              ? characterSection
              : activeDrawerTab === 'pedestals'
              ? pedestalsSection
              : stageCatalogSection}
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
            <span className="bg-[#0D0B0E] px-2.5 py-1 rounded border border-[#2A252D] text-[#F4EFEA]">
              Hero: <strong className="text-[#E5A93C]">{activeCharacterEntry.name}</strong>
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
              onPointerDown={handleCanvasPointerDown}
              onPointerMove={handleCanvasPointerMove}
              onPointerUp={handleCanvasPointerUp}
              onPointerCancel={handleCanvasPointerUp}
              className="w-full h-full block pixelated cursor-grab active:cursor-grabbing"
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
            {/* SECTION 0: MULTI-LAYER ISAAC TYPOGRAPHY ENGINE & INK-STREAK BANNERS */}
            <section
              data-testid="text-layer-inspector-section"
              className="space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5 text-[#E5A93C]" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#E5A93C]">
                    Text Layers ({scene.textLayers.length})
                  </span>
                </div>
                <button
                  type="button"
                  data-testid="add-text-layer-btn"
                  aria-label="Add Text"
                  onClick={() => {
                    const nextScene = addTextLayer(scene);
                    const created =
                      nextScene.textLayers[nextScene.textLayers.length - 1];
                    setScene(nextScene);
                    if (created) {
                      setSelectedTextLayerId(created.id);
                      setSelectedNodeId(created.id);
                    }
                  }}
                  className="px-2 py-1 rounded text-[11px] font-bold bg-[#C83A3A] hover:brightness-110 text-white border border-[#F06E6E]/60 flex items-center gap-1 transition-all cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>+ Add Text</span>
                </button>
              </div>

              {/* Multi-Textbox Layer Selector List */}
              {scene.textLayers.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className="flex-1 flex flex-wrap gap-1 bg-[#0D0B0E] p-1 rounded border border-[#2A252D]">
                    {scene.textLayers.map((layer, idx) => {
                      const isLayerSelected = activeTextLayer?.id === layer.id;
                      return (
                        <button
                          key={layer.id}
                          type="button"
                          data-testid={`text-layer-item-${layer.id}`}
                          aria-pressed={isLayerSelected}
                          onClick={() => {
                            setSelectedTextLayerId(layer.id);
                            setSelectedNodeId(layer.id);
                          }}
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
                      onClick={() => {
                        const targetId = activeTextLayer.id;
                        const nextScene = deleteTextLayer(scene, targetId);
                        setScene(nextScene);
                        const nextFallback = nextScene.textLayers[0]?.id ?? '';
                        setSelectedTextLayerId(nextFallback);
                        setSelectedNodeId(nextFallback || null);
                      }}
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
                        setScene((prev) =>
                          updateTextLayer(prev, activeTextLayer.id, {
                            text: e.target.value,
                          })
                        )
                      }
                      placeholder="Enter headline text..."
                      className="w-full bg-[#0D0B0E] border border-[#2A252D] focus:border-[#E5A93C] rounded px-2.5 py-1.5 text-xs font-bold text-[#F4EFEA] outline-none"
                    />
                  </div>

                  {/* Font Family Switcher (Upheaval TT, Team Meat, Space Grotesk / Impact) */}
                  <div className="space-y-1">
                    <span className="block text-[11px] font-semibold text-[#9E95A8]">
                      Isaac Font Family
                    </span>
                    <div className="grid grid-cols-3 gap-1 bg-[#0D0B0E] p-1 rounded border border-[#2A252D] text-[10px]">
                      {TEXT_FONT_OPTIONS.map((fontOpt) => {
                        const isSelected =
                          activeTextLayer.fontFamily === fontOpt.id;
                        return (
                          <button
                            key={fontOpt.id}
                            type="button"
                            data-testid={`font-family-${fontOpt.id}`}
                            aria-pressed={isSelected}
                            onClick={() =>
                              setScene((prev) =>
                                updateTextLayer(prev, activeTextLayer.id, {
                                  fontFamily: fontOpt.id,
                                })
                              )
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

                  {/* Text Alignment (Left, Center, Right) */}
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
                            onClick={() =>
                              setScene((prev) =>
                                updateTextLayer(prev, activeTextLayer.id, {
                                  align: id,
                                })
                              )
                            }
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

                  {/* 1-Click Vertical Color Gradient Swatches */}
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
                              setScene((prev) =>
                                updateTextLayer(prev, activeTextLayer.id, {
                                  swatch: swatch.id,
                                })
                              )
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

                  {/* Font Size & Layer Tilt (-45° to +45°) */}
                  <InspectorSlider
                    id="slider-font-size"
                    label="Font Size"
                    displayValue={`${activeTextLayer.fontSize}px`}
                    min={24}
                    max={120}
                    step={2}
                    value={activeTextLayer.fontSize}
                    highlightReadout
                    onChange={(fontSize) =>
                      setScene((prev) =>
                        updateTextLayer(prev, activeTextLayer.id, { fontSize })
                      )
                    }
                  />

                  <InspectorSlider
                    id="slider-layer-tilt"
                    label="Layer Tilt"
                    displayValue={`${
                      activeTextLayer.rotationDeg > 0 ? '+' : ''
                    }${activeTextLayer.rotationDeg}°`}
                    min={-45}
                    max={45}
                    step={1}
                    value={activeTextLayer.rotationDeg}
                    onChange={(rotationDeg) =>
                      setScene((prev) =>
                        updateTextLayer(prev, activeTextLayer.id, {
                          rotationDeg,
                        })
                      )
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
                      setScene((prev) =>
                        updateTextLayer(prev, activeTextLayer.id, {
                          strokeWidth,
                        })
                      )
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
                      setScene((prev) =>
                        updateTextLayer(prev, activeTextLayer.id, {
                          dropShadow,
                        })
                      )
                    }
                  />

                  {/* Isaac Ink-Streak Banner Underlay Toggle */}
                  <button
                    type="button"
                    data-testid="ink-banner-toggle"
                    aria-label="Ink-Streak Banner Underlay"
                    aria-pressed={activeTextLayer.inkBanner}
                    onClick={() =>
                      setScene((prev) =>
                        updateTextLayer(prev, activeTextLayer.id, {
                          inkBanner: !activeTextLayer.inkBanner,
                        })
                      )
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

            <div className="h-px bg-[#2A252D]" />

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
