import React from 'react';

export interface InspectorSliderProps {
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

export function InspectorSlider({
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
