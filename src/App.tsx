import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Layers, Package, User } from 'lucide-react';
import {
  getCharacterById,
  listCharacters,
  listCollectibles,
} from './catalog/gameAssetsCatalog';
import { getRoomBackdropById } from './catalog/roomCatalog';
import {
  copyThumbnailToClipboard,
  createAssetStore,
  downloadThumbnailPng,
  renderThumbnail,
  type AssetStore,
} from './canvas/thumbnailRenderer';
import {
  createCanvasInteractionController,
  viewportToCanvasPoint,
  type CanvasInteractionController,
} from './canvas/canvasInteractionEngine';
import {
  addTextLayer,
  deleteTextLayer,
  resolveSceneLayout,
  useSceneDocument,
  type SceneState,
} from './domain/sceneDocument';
import {
  deepClone,
  deleteCustomPreset,
  loadWorkspaceScene,
  saveCustomPreset,
  saveWorkspaceScene,
  type TemplatePreset,
} from './domain/templatePersistenceStore';
import { WorkbenchHeader } from './workbench/WorkbenchHeader';
import { CharacterDrawer } from './workbench/CharacterDrawer';
import { PedestalDrawer } from './workbench/PedestalDrawer';
import { RoomDrawer } from './workbench/RoomDrawer';
import { StageViewport } from './workbench/StageViewport';
import { TypographyInspector } from './workbench/TypographyInspector';
import { CameraInspector } from './workbench/CameraInspector';

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
  const { scene, actions } = useSceneDocument(() => loadWorkspaceScene());
  const [activeDrawerTab, setActiveDrawerTab] = useState<
    'character' | 'pedestals' | 'rooms'
  >('character');
  const [selectedPedestalId, setSelectedPedestalId] = useState<string>('pedestal-1');
  const [selectedTextLayerId, setSelectedTextLayerId] =
    useState<string>('text-headline');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(
    'text-headline'
  );
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [assetRevision, setAssetRevision] = useState(0);

  const stageCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const assetStoreRef = useRef<AssetStore | null>(null);
  if (!assetStoreRef.current) {
    assetStoreRef.current = createAssetStore();
  }
  const interactionControllerRef = useRef<CanvasInteractionController | null>(null);
  if (!interactionControllerRef.current) {
    interactionControllerRef.current = createCanvasInteractionController();
  }

  const activeRoom = useMemo(() => getRoomBackdropById(scene.stageId), [scene.stageId]);
  const activeCharacterEntry = useMemo(
    () => getCharacterById(scene.character.id),
    [scene.character.id]
  );
  const resolvedNodes = useMemo(() => resolveSceneLayout(scene), [scene]);

  // Preload authentic room backdrop, collectibles atlas, altar sheet, and character/Eden hair atlases
  useEffect(() => {
    assetStoreRef.current?.preload(scene, () => {
      setAssetRevision((rev) => rev + 1);
    });
  }, [scene]);

  // Synchronize both 1280x720 Interactive Stage and 180x101 YouTube Feed Preview
  useEffect(() => {
    const store = assetStoreRef.current;
    if (!store) return;

    const stageCanvas = stageCanvasRef.current;
    if (stageCanvas) {
      const ctx = stageCanvas.getContext('2d');
      if (ctx) {
        renderThumbnail(ctx, scene, resolvedNodes, store, {
          includeEditorOverlays: true,
          selectedNodeId,
        });
      }
    }

    const previewCanvas = previewCanvasRef.current;
    if (previewCanvas) {
      const pctx = previewCanvas.getContext('2d');
      if (pctx) {
        renderThumbnail(pctx, scene, resolvedNodes, store, {
          includeEditorOverlays: false,
        });
      }
    }
  }, [scene, resolvedNodes, assetRevision, selectedNodeId]);

  const handleExportPng = useCallback(async () => {
    const store = assetStoreRef.current;
    if (!store) return;
    try {
      await downloadThumbnailPng(scene, resolvedNodes, store);
      setExportStatus('Exported 1280×720 PNG');
    } catch {
      setExportStatus('Export failed');
    }
  }, [scene, resolvedNodes]);

  const handleCopyClipboard = useCallback(async () => {
    const store = assetStoreRef.current;
    if (!store) return;
    try {
      await copyThumbnailToClipboard(scene, resolvedNodes, store);
      setExportStatus('Copied 1280×720 PNG to Clipboard');
    } catch {
      setExportStatus('Clipboard unavailable');
    }
  }, [scene, resolvedNodes]);

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

  // Auto-save active SceneState to browser localStorage on every modification
  useEffect(() => {
    saveWorkspaceScene(scene);
  }, [scene]);

  const handleSelectPreset = (preset: TemplatePreset) => {
    const nextScene: SceneState = deepClone(preset.scene);
    actions.replaceScene(nextScene);
    setSelectedPedestalId(nextScene.pedestals[0]?.id ?? 'pedestal-1');
    setSelectedTextLayerId(nextScene.textLayers[0]?.id ?? 'text-headline');
    setSelectedNodeId(nextScene.textLayers[0]?.id ?? 'character');
  };

  const handleSavePreset = (name: string) => {
    const saved = saveCustomPreset(name, scene);
    actions.replaceScene({
      ...scene,
      presetName: saved.name,
    });
  };

  const handleDeletePreset = (presetId: string) => {
    deleteCustomPreset(presetId);
    if (scene.presetName === presetId) {
      actions.replaceScene({ ...scene, presetName: 'Eden Run Default' });
    }
  };

  const handleCanvasPointerDown = (
    e: React.PointerEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement>
  ) => {
    const canvas = stageCanvasRef.current;
    const controller = interactionControllerRef.current;
    if (!canvas || !controller) {
      return;
    }
    const pt = viewportToCanvasPoint(canvas, e.clientX, e.clientY);
    const result = controller.onPointerDown(pt, scene, selectedNodeId);

    if (result.selectedNode) {
      setSelectedNodeId(result.selectedNode.id);
      if (result.selectedNode.kind === 'text') {
        setSelectedTextLayerId(result.selectedNode.id);
      } else if (result.selectedNode.kind === 'pedestal') {
        setSelectedPedestalId(result.selectedNode.id);
      }
    } else {
      setSelectedNodeId(null);
    }

    if (result.isDragging) {
      capturePointerSafely(e);
    }
  };

  const handleCanvasPointerMove = (
    e: React.PointerEvent<HTMLCanvasElement>
  ) => {
    const canvas = stageCanvasRef.current;
    const controller = interactionControllerRef.current;
    if (!canvas || !controller || !controller.isDragging()) {
      return;
    }
    const pt = viewportToCanvasPoint(canvas, e.clientX, e.clientY);
    const result = controller.onPointerMove(pt, scene);
    if (result.hasChanges) {
      actions.replaceScene(result.scene);
    }
  };

  const handleCanvasPointerUp = () => {
    interactionControllerRef.current?.onPointerUp();
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#110F13] text-[#F4EFEA] select-none">
      {/* 1. TOP HEADER BAR */}
      <WorkbenchHeader
        scene={scene}
        activeCharacterName={activeCharacterEntry.name}
        activeRoomName={activeRoom.name}
        activeRoomAccentColor={activeRoom.accentDotColor}
        exportStatus={exportStatus}
        onSelectPreset={handleSelectPreset}
        onSavePreset={handleSavePreset}
        onDeletePreset={handleDeletePreset}
        onToggleOverlay={actions.toggleOverlay}
        onCopyClipboard={() => void handleCopyClipboard()}
        onExportPng={() => void handleExportPng()}
      />

      {/* MAIN 3-COLUMN WORKBENCH */}
      <main className="flex-1 flex overflow-hidden">
        {/* 2. LEFT ASSET DRAWER */}
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
            {activeDrawerTab === 'character' ? (
              <CharacterDrawer
                character={scene.character}
                onSelectCharacter={(charId) => actions.selectCharacter(charId)}
                onPoseChange={actions.setCharacterPose}
                onScaleChange={actions.setCharacterScale}
                onResetScale={actions.resetCharacterScale}
                onSelectEdenHair={actions.selectEdenHair}
                onRandomizeEdenHair={actions.randomizeEdenHair}
              />
            ) : activeDrawerTab === 'pedestals' ? (
              <PedestalDrawer
                pedestals={scene.pedestals}
                formationPreset={scene.formationPreset}
                pedestalScale={scene.pedestalScale}
                selectedPedestalId={selectedPedestalId}
                onSelectPedestal={setSelectedPedestalId}
                onUpdateCount={actions.setPedestalCount}
                onApplyPreset={actions.applyFormationPreset}
                onScaleChange={actions.setPedestalScale}
                onAssignCollectible={(pedestalId, itemId) =>
                  actions.assignCollectible(pedestalId, itemId)
                }
                onResetPositions={actions.resetPositions}
              />
            ) : (
              <RoomDrawer
                activeStageId={scene.stageId}
                onSelectStage={(stageId) => actions.setRoomStage(stageId)}
              />
            )}
          </div>
        </aside>

        {/* 3. CENTER VIEWPORT: 16:9 STAGE + 180×101 YOUTUBE FEED PREVIEW */}
        <StageViewport
          activeRoomName={activeRoom.name}
          activeCharacterName={activeCharacterEntry.name}
          stageCanvasRef={stageCanvasRef}
          previewCanvasRef={previewCanvasRef}
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handleCanvasPointerMove}
          onPointerUp={handleCanvasPointerUp}
        />

        {/* 4. RIGHT CONTEXT INSPECTOR */}
        <aside className="w-[320px] bg-[#19161C] border-l border-[#2A252D] flex flex-col shrink-0 overflow-y-auto custom-scroll">
          <div className="px-3 py-2.5 border-b border-[#2A252D] bg-[#0D0B0E] flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider uppercase text-[#E5A93C]">
              INSPECTOR
            </span>
          </div>

          <div className="p-3.5 space-y-5">
            <TypographyInspector
              textLayers={scene.textLayers}
              selectedTextLayerId={selectedTextLayerId}
              onSelectLayer={(id: string) => {
                setSelectedTextLayerId(id);
                setSelectedNodeId(id);
              }}
              onAddLayer={() => {
                const nextScene = addTextLayer(scene);
                const created = nextScene.textLayers[nextScene.textLayers.length - 1];
                actions.replaceScene(nextScene);
                if (created) {
                  setSelectedTextLayerId(created.id);
                  setSelectedNodeId(created.id);
                }
              }}
              onDeleteLayer={(id: string) => {
                const nextScene = deleteTextLayer(scene, id);
                actions.replaceScene(nextScene);
                const nextFallback = nextScene.textLayers[0]?.id ?? '';
                setSelectedTextLayerId(nextFallback);
                setSelectedNodeId(nextFallback || null);
              }}
              onUpdateLayer={actions.updateTextLayer}
            />

            <div className="h-px bg-[#2A252D]" />

            <CameraInspector
              activeRoomName={activeRoom.name}
              camera={scene.camera}
              backdrop={scene.backdrop}
              onUpdateCamera={actions.updateCameraFraming}
              onUpdateBackdrop={actions.updateBackdropFilters}
              onReset={actions.resetCameraAndBackdrop}
            />
          </div>
        </aside>
      </main>
    </div>
  );
}

export default App;
