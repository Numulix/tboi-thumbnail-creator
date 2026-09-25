import '@testing-library/jest-dom';
import { vi } from 'vitest';

const contextMap = new WeakMap<HTMLCanvasElement, CanvasRenderingContext2D>();

function createMockContext2D(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ops: Array<{ type: string; args: unknown[]; smoothing: boolean; filter: string }> = [];
  const stateStack: Array<{ smoothing: boolean; filter: string; globalAlpha: number }> = [];

  const ctx = {
    canvas,
    imageSmoothingEnabled: true,
    filter: 'none',
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1,
    lineJoin: 'miter',
    font: '10px sans-serif',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    globalAlpha: 1,
    __ops: ops,
    save: vi.fn(() => {
      stateStack.push({
        smoothing: ctx.imageSmoothingEnabled,
        filter: ctx.filter,
        globalAlpha: ctx.globalAlpha,
      });
    }),
    restore: vi.fn(() => {
      const prev = stateStack.pop();
      if (prev) {
        ctx.imageSmoothingEnabled = prev.smoothing;
        ctx.filter = prev.filter;
        ctx.globalAlpha = prev.globalAlpha;
      }
    }),
    clearRect: vi.fn((...args: unknown[]) => {
      ops.push({ type: 'clearRect', args, smoothing: ctx.imageSmoothingEnabled, filter: ctx.filter });
    }),
    fillRect: vi.fn((...args: unknown[]) => {
      ops.push({
        type: 'fillRect',
        args: [...args, ctx.fillStyle],
        smoothing: ctx.imageSmoothingEnabled,
        filter: ctx.filter,
      });
    }),
    strokeRect: vi.fn((...args: unknown[]) => {
      ops.push({
        type: 'strokeRect',
        args: [...args, ctx.strokeStyle],
        smoothing: ctx.imageSmoothingEnabled,
        filter: ctx.filter,
      });
    }),
    drawImage: vi.fn((...args: unknown[]) => {
      ops.push({ type: 'drawImage', args, smoothing: ctx.imageSmoothingEnabled, filter: ctx.filter });
    }),
    fillText: vi.fn((...args: unknown[]) => {
      ops.push({
        type: 'fillText',
        args,
        smoothing: ctx.imageSmoothingEnabled,
        filter: ctx.filter,
        font: ctx.font,
        textAlign: ctx.textAlign,
        fillStyle: ctx.fillStyle,
      } as (typeof ops)[number]);
    }),
    strokeText: vi.fn((...args: unknown[]) => {
      ops.push({
        type: 'strokeText',
        args,
        smoothing: ctx.imageSmoothingEnabled,
        filter: ctx.filter,
        font: ctx.font,
        textAlign: ctx.textAlign,
        strokeStyle: ctx.strokeStyle,
        lineWidth: ctx.lineWidth,
      } as (typeof ops)[number]);
    }),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn((...args: unknown[]) => {
      ops.push({
        type: 'arc',
        args,
        smoothing: ctx.imageSmoothingEnabled,
        filter: ctx.filter,
      });
    }),
    ellipse: vi.fn(),
    rect: vi.fn(),
    roundRect: vi.fn(),
    fill: vi.fn((...args: unknown[]) => {
      ops.push({ type: 'fill', args, smoothing: ctx.imageSmoothingEnabled, filter: ctx.filter });
    }),
    stroke: vi.fn((...args: unknown[]) => {
      ops.push({
        type: 'stroke',
        args: [...args, ctx.strokeStyle],
        smoothing: ctx.imageSmoothingEnabled,
        filter: ctx.filter,
      });
    }),
    setLineDash: vi.fn((...args: unknown[]) => {
      ops.push({ type: 'setLineDash', args, smoothing: ctx.imageSmoothingEnabled, filter: ctx.filter });
    }),
    translate: vi.fn((...args: unknown[]) => {
      ops.push({ type: 'translate', args, smoothing: ctx.imageSmoothingEnabled, filter: ctx.filter });
    }),
    scale: vi.fn(),
    rotate: vi.fn((...args: unknown[]) => {
      ops.push({ type: 'rotate', args, smoothing: ctx.imageSmoothingEnabled, filter: ctx.filter });
    }),
    createRadialGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    createLinearGradient: vi.fn(() => {
      const stops: Array<[number, string]> = [];
      return {
        stops,
        addColorStop: vi.fn((offset: number, color: string) => {
          stops.push([offset, color]);
          ops.push({
            type: 'linearGradientStop',
            args: [offset, color],
            smoothing: ctx.imageSmoothingEnabled,
            filter: ctx.filter,
          });
        }),
      };
    }),
    measureText: vi.fn((text: string) => ({
      width: text.length * 10,
    })),
  };

  return ctx as unknown as CanvasRenderingContext2D;
}

HTMLCanvasElement.prototype.getContext = function (
  this: HTMLCanvasElement,
  contextId: string
): RenderingContext | null {
  if (contextId === '2d') {
    let existing = contextMap.get(this);
    if (!existing) {
      existing = createMockContext2D(this);
      contextMap.set(this, existing);
    }
    return existing;
  }
  return null;
} as typeof HTMLCanvasElement.prototype.getContext;

HTMLCanvasElement.prototype.toBlob = function (
  this: HTMLCanvasElement,
  callback: BlobCallback,
  type = 'image/png'
): void {
  const header = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const metadata = new TextEncoder().encode(`PNG:${this.width}x${this.height}`);
  const blob = new Blob([header, metadata], { type });
  callback(blob);
};

if (typeof URL.createObjectURL !== 'function') {
  URL.createObjectURL = vi.fn(() => 'blob:mock-1280x720-png');
}
if (typeof URL.revokeObjectURL !== 'function') {
  URL.revokeObjectURL = vi.fn();
}

if (typeof window !== 'undefined' && typeof window.PointerEvent === 'undefined') {
  class MockPointerEvent extends MouseEvent {
    pointerId: number;
    pointerType: string;
    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params);
      this.pointerId = params.pointerId ?? 1;
      this.pointerType = params.pointerType ?? 'mouse';
    }
  }
  window.PointerEvent = MockPointerEvent as unknown as typeof PointerEvent;
}

HTMLAnchorElement.prototype.click = vi.fn();



