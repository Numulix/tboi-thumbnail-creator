import { describe, expect, it, vi } from 'vitest';
import {
  copyCanvasToClipboard,
  exportCanvasToPngBlob,
  triggerBlobDownload,
} from './exportPipeline';

describe('exportPipeline', () => {
  it('exports a canvas to a PNG blob', async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;

    const blob = await exportCanvasToPngBlob(canvas);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('image/png');
    expect(blob.size).toBeGreaterThan(0);
  });

  it('rejects with error if toBlob produces null', async () => {
    const canvas = document.createElement('canvas');
    vi.spyOn(canvas, 'toBlob').mockImplementation((callback) => {
      callback(null);
    });

    await expect(exportCanvasToPngBlob(canvas)).rejects.toThrow(
      'Failed to generate 1280x720 PNG blob from canvas'
    );
  });

  it('copies canvas PNG blob to navigator.clipboard', async () => {
    const canvas = document.createElement('canvas');
    const writeSpy = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { write: writeSpy },
      configurable: true,
    });
    if (typeof globalThis.ClipboardItem === 'undefined') {
      globalThis.ClipboardItem = class MockClipboardItem {
        items: Record<string, Blob>;
        constructor(items: Record<string, Blob>) {
          this.items = items;
        }
      } as unknown as typeof ClipboardItem;
    }

    await copyCanvasToClipboard(canvas);
    expect(writeSpy).toHaveBeenCalledTimes(1);
  });

  it('triggers browser download link and cleans up URL and DOM node', () => {
    const mockBlob = new Blob(['test content'], { type: 'image/png' });
    const createObjectUrlSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:http://localhost/test-uuid');
    const revokeObjectUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockReturnValue();
    const appendSpy = vi.spyOn(document.body, 'appendChild');
    const removeSpy = vi.spyOn(document.body, 'removeChild');

    triggerBlobDownload(mockBlob, 'test-thumb.png');

    expect(createObjectUrlSpy).toHaveBeenCalledWith(mockBlob);
    expect(appendSpy).toHaveBeenCalledTimes(1);
    expect(removeSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrlSpy).toHaveBeenCalledWith('blob:http://localhost/test-uuid');
  });
});
