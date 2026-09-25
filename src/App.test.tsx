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

    // 2. Switching Left Drawer to Rooms tab and selecting Special Rooms -> Planetarium updates stage readout
    fireEvent.click(screen.getByRole('button', { name: /^Rooms$/i }));
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

  it('supports switching between 17 Normal and 17 Tainted characters (34 total), toggling poses (Front Idle, ★ Happy Pickup, Crying), scrubbing/resetting Character Scale (1.0x-2.5x), and conditionally revealing the 6-column Eden Hairstyle grid & 🎲 Randomize Hair button', () => {
    render(<App />);

    // Default active character is Eden (Normal variant), so Eden Hairstyle panel & Randomize Hair button are visible
    expect(screen.getByTestId('active-character-preview')).toBeInTheDocument();
    expect(screen.getByTestId('eden-hair-grid')).toBeInTheDocument();
    const randomizeHairBtn = screen.getByRole('button', {
      name: /Randomize Hair/i,
    });
    expect(randomizeHairBtn).toBeInTheDocument();

    // Verify 17 Normal characters are rendered under the Normal toggle
    const normalToggle = screen.getByRole('button', { name: /Normal \(17\)/i });
    const taintedToggle = screen.getByRole('button', { name: /Tainted \(17\)/i });
    expect(normalToggle).toBeInTheDocument();
    expect(taintedToggle).toBeInTheDocument();

    const normalCharButtons = screen.getAllByTestId(/^character-option-/);
    expect(normalCharButtons).toHaveLength(17);

    // Switch pose between Front Idle, ★ Happy Pickup, and Crying
    const idlePoseBtn = screen.getByRole('button', { name: /Front Idle/i });
    const pickupPoseBtn = screen.getByRole('button', { name: /Happy Pickup/i });
    const cryingPoseBtn = screen.getByRole('button', { name: /Crying/i });

    fireEvent.click(idlePoseBtn);
    expect(idlePoseBtn).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(cryingPoseBtn);
    expect(cryingPoseBtn).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(pickupPoseBtn);
    expect(pickupPoseBtn).toHaveAttribute('aria-pressed', 'true');

    // Scrub Character Scale (1.0x - 2.5x) and click Reset
    const charScaleSlider = screen.getByLabelText('Character Scale');
    fireEvent.change(charScaleSlider, { target: { value: '2.25' } });
    expect(screen.getByText('2.25x')).toBeInTheDocument();

    const resetScaleBtn = screen.getByRole('button', { name: /Reset Scale/i });
    fireEvent.click(resetScaleBtn);
    expect(screen.getByText('1.85x')).toBeInTheDocument();

    // Click an Eden hairstyle in the 6-column grid and click 🎲 Randomize Hair
    const hairOption5 = screen.getByTestId('eden-hair-option-5');
    fireEvent.click(hairOption5);
    expect(hairOption5).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(randomizeHairBtn);
    expect(hairOption5).toHaveAttribute('aria-pressed', 'false');

    // Selecting a non-Eden Normal character (e.g. Isaac) hides the Eden Hairstyle panel & Randomize button
    fireEvent.click(screen.getByTestId('character-option-isaac'));
    expect(screen.queryByTestId('eden-hair-grid')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Randomize Hair/i })
    ).not.toBeInTheDocument();

    // Switching to Tainted (17) displays all 17 Tainted characters
    fireEvent.click(taintedToggle);
    const taintedCharButtons = screen.getAllByTestId(/^character-option-/);
    expect(taintedCharButtons).toHaveLength(17);

    // Selecting Tainted Eden unlocks the Eden Hairstyle grid and Randomize Hair button again
    fireEvent.click(screen.getByTestId('character-option-tainted-eden'));
    expect(screen.getByTestId('eden-hair-grid')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Randomize Hair/i })
    ).toBeInTheDocument();
  });

  it('supports the Left Drawer Pedestals tab (3-6 count, Arc/Row/2x2 Grid/Flank presets, Pedestal Scale, 730+ collectible search by ID/name with Q0-Q4 badges) and interactive canvas dragging with Reset Positions', () => {
    render(<App />);

    // 1. Switch Left Asset Drawer to Pedestals tab
    const pedestalsTabBtn = screen.getByRole('button', { name: /^Pedestals$/i });
    fireEvent.click(pedestalsTabBtn);
    expect(screen.getByTestId('pedestals-builder-section')).toBeInTheDocument();

    // 2. Select active pedestal count (3, 4, 5, 6)
    expect(screen.getAllByTestId(/^pedestal-slot-card-/)).toHaveLength(4);

    fireEvent.click(screen.getByTestId('pedestal-count-6'));
    expect(screen.getAllByTestId(/^pedestal-slot-card-/)).toHaveLength(6);

    fireEvent.click(screen.getByTestId('pedestal-count-3'));
    expect(screen.getAllByTestId(/^pedestal-slot-card-/)).toHaveLength(3);

    fireEvent.click(screen.getByTestId('pedestal-count-4'));
    expect(screen.getAllByTestId(/^pedestal-slot-card-/)).toHaveLength(4);

    // 3. Switch formation presets (Arc, Row, 2×2 Grid, Flank) and scrub Pedestal Scale
    const rowPresetBtn = screen.getByTestId('formation-preset-row');
    fireEvent.click(rowPresetBtn);
    expect(rowPresetBtn).toHaveAttribute('aria-pressed', 'true');

    const gridPresetBtn = screen.getByTestId('formation-preset-grid-2x2');
    fireEvent.click(gridPresetBtn);
    expect(gridPresetBtn).toHaveAttribute('aria-pressed', 'true');

    const flankPresetBtn = screen.getByTestId('formation-preset-flank');
    fireEvent.click(flankPresetBtn);
    expect(flankPresetBtn).toHaveAttribute('aria-pressed', 'true');

    const arcPresetBtn = screen.getByTestId('formation-preset-arc');
    fireEvent.click(arcPresetBtn);
    expect(arcPresetBtn).toHaveAttribute('aria-pressed', 'true');

    const pedestalScaleSlider = screen.getByLabelText('Pedestal Scale');
    fireEvent.change(pedestalScaleSlider, { target: { value: '1.95' } });
    expect(screen.getByText('1.95x')).toBeInTheDocument();

    // 4. Select Pedestal Slot #4 and search 730+ items by numeric ID ("#182") and partial name ("Godhead")
    fireEvent.click(screen.getByTestId('pedestal-slot-card-pedestal-4'));

    const searchInput = screen.getByTestId('collectible-search-input');
    fireEvent.change(searchInput, { target: { value: '#182' } });
    expect(screen.getByTestId('collectible-result-182')).toBeInTheDocument();
    expect(screen.getByTestId('quality-badge-182')).toHaveTextContent('Q4');

    fireEvent.change(searchInput, { target: { value: 'Sacred' } });
    const sacredResult = screen.getByTestId('collectible-result-182');
    expect(sacredResult).toBeInTheDocument();
    fireEvent.click(sacredResult);

    // Slot 4 now displays Sacred Heart instead of Curse of the Blind
    expect(screen.getByTestId('pedestal-slot-card-pedestal-4')).toHaveTextContent(
      'Sacred Heart'
    );

    // 5. Drag pedestal-1 (at x=530, y=515 in 4-slot Arc) on stage-canvas and verify manual offset + Reset Positions
    const stageCanvas = screen.getByTestId('stage-canvas');
    fireEvent.pointerDown(stageCanvas, { clientX: 530, clientY: 515 });
    fireEvent.pointerMove(stageCanvas, { clientX: 610, clientY: 590 });
    fireEvent.pointerUp(stageCanvas, { clientX: 610, clientY: 590 });

    expect(screen.getByTestId('pedestal-slot-card-pedestal-1')).toHaveTextContent(
      '+80, +75'
    );

    // Clicking Reset Positions clears manual drag offsets back to mathematical formation
    const resetPositionsBtn = screen.getByTestId('reset-positions-btn');
    fireEvent.click(resetPositionsBtn);
    expect(
      screen.getByTestId('pedestal-slot-card-pedestal-1')
    ).not.toHaveTextContent('+80, +75');
  });
});


