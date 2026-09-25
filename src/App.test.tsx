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

  it('supports adding, selecting, dragging, tilting (-45° to +45°), aligning (Left/Center/Right), styling (Upheaval TT / Team Meat fonts, 4 gradient swatches, stroke width, drop shadow, Ink-Streak Banner underlay), and deleting multiple text layers while excluding cyan gizmos from 180x101 preview & PNG export', () => {
    render(<App />);

    // 1. Default headline is selected and populated in the Right Inspector Text Layer panel
    expect(screen.getByTestId('text-layer-inspector-section')).toBeInTheDocument();
    const headlineInput = screen.getByTestId('headline-text-input') as HTMLInputElement;
    expect(headlineInput.value).toBe('GOD TIER EDEN START?!');

    // Default swatch is Gold-to-Orange, font is Upheaval TT, Ink-Streak Banner is ON
    expect(screen.getByTestId('swatch-gold-orange')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('font-family-upheaval')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('ink-banner-toggle')).toHaveAttribute('aria-pressed', 'true');

    // 2. Add a second independent text layer (+ Add Text)
    const addTextBtn = screen.getByTestId('add-text-layer-btn');
    fireEvent.click(addTextBtn);
    expect(screen.getAllByTestId(/^text-layer-item-/)).toHaveLength(2);

    // Edit second text layer's headline text, font family (Team Meat), alignment (Right), font size, tilt angle, gradient swatch (Soul Blue), stroke width, drop shadow, and Ink-Streak Banner toggle
    fireEvent.change(headlineInput, { target: { value: 'STREAK #99 BOSS RUSH' } });
    expect(headlineInput.value).toBe('STREAK #99 BOSS RUSH');

    const teamMeatBtn = screen.getByTestId('font-family-team-meat');
    fireEvent.click(teamMeatBtn);
    expect(teamMeatBtn).toHaveAttribute('aria-pressed', 'true');

    const alignRightBtn = screen.getByTestId('text-align-right');
    fireEvent.click(alignRightBtn);
    expect(alignRightBtn).toHaveAttribute('aria-pressed', 'true');

    const fontSizeSlider = screen.getByLabelText('Font Size');
    fireEvent.change(fontSizeSlider, { target: { value: '74' } });
    expect(screen.getByText('74px')).toBeInTheDocument();

    const tiltSlider = screen.getByLabelText('Layer Tilt');
    fireEvent.change(tiltSlider, { target: { value: '-20' } });
    expect(screen.getByText('-20°')).toBeInTheDocument();

    const soulBlueSwatch = screen.getByTestId('swatch-soul-blue');
    fireEvent.click(soulBlueSwatch);
    expect(soulBlueSwatch).toHaveAttribute('aria-pressed', 'true');

    const strokeSlider = screen.getByLabelText('Pixel Stroke Width');
    fireEvent.change(strokeSlider, { target: { value: '9' } });
    expect(screen.getByText('9px')).toBeInTheDocument();

    const shadowSlider = screen.getByLabelText('Hard Drop Shadow');
    fireEvent.change(shadowSlider, { target: { value: '11' } });
    expect(screen.getByText('11px')).toBeInTheDocument();

    const inkBannerToggle = screen.getByTestId('ink-banner-toggle');
    fireEvent.click(inkBannerToggle);
    expect(inkBannerToggle).toHaveAttribute('aria-pressed', 'false');

    // 3. Click first text layer at (640, 96) on stage-canvas to select and drag it
    const stageCanvas = screen.getByTestId('stage-canvas') as HTMLCanvasElement;
    fireEvent.pointerDown(stageCanvas, { clientX: 640, clientY: 96 });
    expect((screen.getByTestId('headline-text-input') as HTMLInputElement).value).toBe(
      'GOD TIER EDEN START?!'
    );
    fireEvent.pointerMove(stageCanvas, { clientX: 590, clientY: 126 });
    fireEvent.pointerUp(stageCanvas, { clientX: 590, clientY: 126 });

    // Drag the top cyan rotation handle above the moved text layer (at x=590, y=126 - 44 - 28 = 54) to rotate it
    fireEvent.pointerDown(stageCanvas, { clientX: 590, clientY: 54 });
    fireEvent.pointerMove(stageCanvas, { clientX: 635, clientY: 60 });
    fireEvent.pointerUp(stageCanvas, { clientX: 635, clientY: 60 });

    // 4. Delete the active first text layer and confirm the second text layer remains
    const deleteLayerBtn = screen.getByTestId('delete-text-layer-btn');
    fireEvent.click(deleteLayerBtn);
    expect(screen.getAllByTestId(/^text-layer-item-/)).toHaveLength(1);
    expect((screen.getByTestId('headline-text-input') as HTMLInputElement).value).toBe(
      'STREAK #99 BOSS RUSH'
    );
  });
});



