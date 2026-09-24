import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from './App';

describe('StudioWorkbenchUI (App)', () => {
  it('renders the 3-column Studio Brimstone layout with single-line header, updates stage & preview on room/camera/filter changes, toggles safe-zone guides, and exports/copies clean 1280x720 PNGs', async () => {
    render(<App />);

    // 1. Top Header Bar single-line & unclipped check
    const header = screen.getByRole('banner');
    expect(header.className).toContain('whitespace-nowrap');
    expect(screen.getByText('ISAAC THUMB STUDIO')).toBeInTheDocument();

    // 3-Column layout headings
    expect(screen.getByText('ASSET DRAWER')).toBeInTheDocument();
    expect(screen.getByText('YouTube Feed Preview')).toBeInTheDocument();
    expect(screen.getByText('INSPECTOR')).toBeInTheDocument();

    // Verify 1280x720 stage canvas and 180x101 preview canvas dimensions
    const stageCanvas = screen.getByTestId('stage-canvas') as HTMLCanvasElement;
    const previewCanvas = screen.getByTestId('preview-canvas') as HTMLCanvasElement;
    expect(stageCanvas.width).toBe(1280);
    expect(stageCanvas.height).toBe(720);
    expect(previewCanvas.width).toBe(180);
    expect(previewCanvas.height).toBe(101);

    // 2. Selecting Special Rooms -> Planetarium updates stage readout
    fireEvent.click(screen.getByRole('button', { name: /Special Rooms/i }));
    fireEvent.click(screen.getByRole('button', { name: /Planetarium/i }));
    expect(screen.getAllByText('Planetarium').length).toBeGreaterThanOrEqual(1);

    // 3. Adjusting Room Zoom, Pan X, Pan Y, Vignette Intensity, Backdrop Dimming, and Depth Blur
    const zoomSlider = screen.getByLabelText('Room Zoom');
    fireEvent.change(zoomSlider, { target: { value: '2.4' } });
    expect(screen.getByText('240%')).toBeInTheDocument();

    const panXSlider = screen.getByLabelText('Pan X');
    fireEvent.change(panXSlider, { target: { value: '32' } });
    expect(screen.getByText('32px')).toBeInTheDocument();

    const panYSlider = screen.getByLabelText('Pan Y');
    fireEvent.change(panYSlider, { target: { value: '-24' } });
    expect(screen.getByText('-24px')).toBeInTheDocument();

    const vignetteSlider = screen.getByLabelText('Vignette Intensity');
    fireEvent.change(vignetteSlider, { target: { value: '85' } });
    expect(screen.getByText('85%')).toBeInTheDocument();

    const dimSlider = screen.getByLabelText('Backdrop Dimming');
    fireEvent.change(dimSlider, { target: { value: '45' } });
    expect(screen.getByText('45%')).toBeInTheDocument();

    const blurSlider = screen.getByLabelText('Depth Blur');
    fireEvent.change(blurSlider, { target: { value: '3' } });
    expect(screen.getByText('3.0px')).toBeInTheDocument();

    // 4. Safe Zone & Snap Grid toggles
    const safeZoneBtn = screen.getByRole('button', { name: /Safe Zone:/i });
    expect(safeZoneBtn).toHaveTextContent('Safe Zone: ON');
    fireEvent.click(safeZoneBtn);
    expect(safeZoneBtn).toHaveTextContent('Safe Zone: OFF');

    const snapGridBtn = screen.getByRole('button', { name: /Snap Grid/i });
    fireEvent.click(snapGridBtn);
    expect(snapGridBtn).toHaveAttribute('aria-pressed', 'true');

    // 5. Copy Image (⌘C) and Export 1280×720 PNG
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

    const copyBtn = screen.getByRole('button', { name: /Copy Image/i });
    fireEvent.click(copyBtn);
    await waitFor(() => {
      expect(writeSpy).toHaveBeenCalledTimes(1);
    });

    const createObjectURLSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:mock-1280x720-png');
    const revokeObjectURLSpy = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => {});

    const exportBtn = screen.getByRole('button', { name: /Export 1280×720 PNG/i });
    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
    });

    createObjectURLSpy.mockRestore();
    revokeObjectURLSpy.mockRestore();
  });
});
