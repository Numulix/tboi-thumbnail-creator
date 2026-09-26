import React from 'react';
import { Tv } from 'lucide-react';

export interface StageViewportProps {
  activeRoomName: string;
  activeCharacterName: string;
  stageCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  previewCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  onPointerDown: (
    e: React.PointerEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement>
  ) => void;
  onPointerMove: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  onPointerUp: () => void;
}

export function StageViewport({
  activeRoomName,
  activeCharacterName,
  stageCanvasRef,
  previewCanvasRef,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: StageViewportProps): React.ReactElement {
  return (
    <section className="flex-1 bg-cellar-grid relative overflow-hidden flex flex-col items-center justify-center p-6">
      {/* Top-Left Viewport Readout Bar */}
      <div className="absolute top-3 left-4 flex items-center gap-2.5 text-xs font-mono-tabular text-[#9E95A8] pointer-events-none z-10">
        <span className="bg-[#0D0B0E] px-2.5 py-1 rounded border border-[#2A252D] text-[#F4EFEA]">
          Stage: <strong className="text-[#E5A93C]">{activeRoomName}</strong>
        </span>
        <span className="bg-[#0D0B0E] px-2.5 py-1 rounded border border-[#2A252D] text-[#F4EFEA]">
          Hero: <strong className="text-[#E5A93C]">{activeCharacterName}</strong>
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
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
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
  );
}
