/**
 * Thumbnail Export Pipeline
 * Pure export subsystem that rasterizes an unadorned stage scene
 * to clean 1280x720 PNG blobs for direct file download or system clipboard transfer.
 */

export function exportCanvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Failed to generate 1280x720 PNG blob from canvas'));
        return;
      }
      resolve(blob);
    }, 'image/png');
  });
}

export async function copyCanvasToClipboard(canvas: HTMLCanvasElement): Promise<void> {
  const blob = await exportCanvasToPngBlob(canvas);
  if (!navigator.clipboard || typeof navigator.clipboard.write !== 'function') {
    throw new Error('System clipboard image writing is not supported in this browser context');
  }
  const item = new ClipboardItem({ 'image/png': blob });
  await navigator.clipboard.write([item]);
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
