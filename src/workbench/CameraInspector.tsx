import React from 'react';
import { RotateCcw } from 'lucide-react';
import {
  type BackdropFilterConfig,
  type CameraConfig,
} from '../domain/sceneDocument';
import { InspectorSlider } from './InspectorSlider';

export interface CameraInspectorProps {
  activeRoomName: string;
  camera: CameraConfig;
  backdrop: BackdropFilterConfig;
  onUpdateCamera: (patch: Partial<CameraConfig>) => void;
  onUpdateBackdrop: (patch: Partial<BackdropFilterConfig>) => void;
  onReset: () => void;
}

export function CameraInspector({
  activeRoomName,
  camera,
  backdrop,
  onUpdateCamera,
  onUpdateBackdrop,
  onReset,
}: CameraInspectorProps): React.ReactElement {
  return (
    <div className="space-y-5">
      {/* SECTION 1: ROOM & CAMERA FRAMING */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#9E95A8]">
            Room &amp; Camera Framing
          </span>
          <span className="text-[11px] font-mono-tabular text-[#E5A93C]">
            {activeRoomName}
          </span>
        </div>

        <InspectorSlider
          id="slider-room-zoom"
          label="Room Zoom"
          displayValue={`${Math.round(camera.zoom * 100)}%`}
          min={1.0}
          max={3.0}
          step={0.05}
          value={camera.zoom}
          highlightReadout
          onChange={(zoom) => onUpdateCamera({ zoom })}
        />

        <InspectorSlider
          id="slider-pan-x"
          label="Pan X"
          displayValue={`${camera.panX}px`}
          min={-200}
          max={200}
          step={2}
          value={camera.panX}
          onChange={(panX) => onUpdateCamera({ panX })}
        />

        <InspectorSlider
          id="slider-pan-y"
          label="Pan Y"
          displayValue={`${camera.panY}px`}
          min={-200}
          max={200}
          step={2}
          value={camera.panY}
          onChange={(panY) => onUpdateCamera({ panY })}
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
          displayValue={`${backdrop.vignetteIntensity}%`}
          min={0}
          max={100}
          step={1}
          value={backdrop.vignetteIntensity}
          onChange={(vignetteIntensity) =>
            onUpdateBackdrop({ vignetteIntensity })
          }
        />

        <InspectorSlider
          id="slider-dimming"
          label="Backdrop Dimming"
          displayValue={`${backdrop.backdropDimming}%`}
          min={0}
          max={100}
          step={1}
          value={backdrop.backdropDimming}
          onChange={(backdropDimming) =>
            onUpdateBackdrop({ backdropDimming })
          }
        />

        <InspectorSlider
          id="slider-depth-blur"
          label="Depth Blur"
          displayValue={`${backdrop.depthBlur.toFixed(1)}px`}
          min={0}
          max={8}
          step={0.5}
          value={backdrop.depthBlur}
          onChange={(depthBlur) => onUpdateBackdrop({ depthBlur })}
        />

        <div className="pt-1">
          <button
            type="button"
            onClick={onReset}
            className="w-full py-1.5 px-2.5 rounded text-xs font-semibold bg-[#231F28] hover:bg-[#2A252D] text-[#9E95A8] hover:text-[#F4EFEA] border border-[#2A252D] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Camera &amp; Filters</span>
          </button>
        </div>
      </section>
    </div>
  );
}
