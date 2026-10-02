import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import {
  PRESETS_STORAGE_KEY,
  WORKSPACE_STORAGE_KEY,
} from './domain/templatePersistenceStore';

describe('StudioWorkbenchUI (App)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });
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

    // 2. Adjust active pedestal count via stepper
    expect(screen.getAllByTestId(/^pedestal-slot-card-/)).toHaveLength(4);

    const stepperInc = screen.getByTestId('pedestal-stepper-increment');
    const stepperDec = screen.getByTestId('pedestal-stepper-decrement');

    // Increment from 4 to 6
    fireEvent.click(stepperInc);
    expect(screen.getAllByTestId(/^pedestal-slot-card-/)).toHaveLength(5);
    fireEvent.click(stepperInc);
    expect(screen.getAllByTestId(/^pedestal-slot-card-/)).toHaveLength(6);

    // Decrement from 6 to 3
    fireEvent.click(stepperDec);
    fireEvent.click(stepperDec);
    fireEvent.click(stepperDec);
    expect(screen.getAllByTestId(/^pedestal-slot-card-/)).toHaveLength(3);

    // Increment back to 4
    fireEvent.click(stepperInc);
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

  it('supports localStorage auto-save, fallback on corrupted cache, switching between built-in templates ("Eden Run Default", "Devil Deal Showcase"), and + Save Preset / delete custom presets workflow', async () => {
    // 1. Initial render with empty localStorage starts with "Eden Run Default" and [Saved] status badge
    const { unmount } = render(<App />);

    expect(screen.getByTestId('workspace-status-badge')).toHaveTextContent('[Saved]');
    expect(screen.getByTestId('preset-selector-dropdown')).toHaveTextContent('Eden Run Default');

    // 2. Modifying properties on the workbench auto-persists to localStorage
    // Change character to Judas
    fireEvent.click(screen.getByTestId('character-option-judas'));
    // Change room stage to Sheol
    fireEvent.click(screen.getByRole('button', { name: /^Rooms$/i }));
    fireEvent.click(screen.getByRole('button', { name: /Sheol/i }));

    // Verify localStorage has persisted the modified character and stage
    await waitFor(() => {
      const rawStored = localStorage.getItem(WORKSPACE_STORAGE_KEY);
      expect(rawStored).toBeTruthy();
      const parsed = JSON.parse(rawStored!);
      expect(parsed.scene.character.id).toBe('judas');
      expect(parsed.scene.stageId).toBe('sheol');
    });

    // 3. Simulating page reload: unmount and re-render App -> restores Judas and Sheol cleanly
    unmount();
    const reloaded = render(<App />);

    expect(reloaded.getByTestId('workspace-status-badge')).toHaveTextContent('[Saved]');
    expect(reloaded.getAllByText('Sheol').length).toBeGreaterThanOrEqual(1);
    expect(reloaded.getByTestId('active-character-preview')).toHaveTextContent('Judas');

    // 4. Fallback on corrupt or invalid localStorage
    reloaded.unmount();
    localStorage.setItem(WORKSPACE_STORAGE_KEY, '{{invalid json garbage}}');

    const corruptReloaded = render(<App />);
    expect(corruptReloaded.getByTestId('preset-selector-dropdown')).toHaveTextContent(
      'Eden Run Default'
    );
    expect(corruptReloaded.getByTestId('active-character-preview')).toHaveTextContent('Eden');

    // 5. Switching between built-in presets: open dropdown and select "Devil Deal Showcase"
    const presetDropdownBtn = corruptReloaded.getByTestId('preset-selector-dropdown');
    fireEvent.click(presetDropdownBtn);

    expect(corruptReloaded.getByTestId('preset-dropdown-menu')).toBeInTheDocument();
    expect(corruptReloaded.getByText('Built-in Templates')).toBeInTheDocument();

    const devilDealOption = corruptReloaded.getByTestId('preset-option-devil-deal-showcase');
    expect(devilDealOption).toHaveTextContent('Devil Deal Showcase');
    fireEvent.click(devilDealOption);

    // Immediately applies Devil Deal Showcase scene: Judas, Devil Room, Brimstone red, headline
    expect(corruptReloaded.getByTestId('preset-selector-dropdown')).toHaveTextContent(
      'Devil Deal Showcase'
    );
    expect(corruptReloaded.getAllByText('Devil Room').length).toBeGreaterThanOrEqual(1);
    expect(
      (corruptReloaded.getByTestId('headline-text-input') as HTMLInputElement).value
    ).toBe('DEVIL DEAL CARRY?!');

    // 6. + Save Preset workflow
    const savePresetBtn = corruptReloaded.getByTestId('save-preset-btn');
    fireEvent.click(savePresetBtn);

    // Modal dialog is displayed
    expect(corruptReloaded.getByRole('dialog')).toBeInTheDocument();
    const presetNameInput = corruptReloaded.getByTestId('preset-name-input') as HTMLInputElement;

    fireEvent.change(presetNameInput, { target: { value: 'My Mega Satan Preset' } });
    const confirmSaveBtn = corruptReloaded.getByTestId('confirm-save-preset-btn');
    fireEvent.click(confirmSaveBtn);

    // Modal closes and active preset name is updated
    expect(corruptReloaded.queryByRole('dialog')).not.toBeInTheDocument();
    expect(corruptReloaded.getByTestId('preset-selector-dropdown')).toHaveTextContent(
      'My Mega Satan Preset'
    );

    // Verify custom preset is stored in localStorage
    const rawPresets = localStorage.getItem(PRESETS_STORAGE_KEY);
    expect(rawPresets).toBeTruthy();
    expect(rawPresets).toContain('My Mega Satan Preset');

    // 7. Verify custom preset appears in dropdown and can be deleted while built-in presets remain protected
    fireEvent.click(corruptReloaded.getByTestId('preset-selector-dropdown'));
    const dropdownMenu = corruptReloaded.getByTestId('preset-dropdown-menu');
    expect(within(dropdownMenu).getByText('Custom Presets')).toBeInTheDocument();
    expect(within(dropdownMenu).getByText('My Mega Satan Preset')).toBeInTheDocument();

    // Built-in presets do not have a delete button
    expect(
      within(dropdownMenu).queryByTestId('delete-preset-eden-run-default')
    ).not.toBeInTheDocument();
    expect(
      within(dropdownMenu).queryByTestId('delete-preset-devil-deal-showcase')
    ).not.toBeInTheDocument();

    // Delete custom preset
    const deleteCustomBtn = within(dropdownMenu).getByLabelText('Delete preset My Mega Satan Preset');
    fireEvent.click(deleteCustomBtn);

    expect(within(dropdownMenu).queryByText('My Mega Satan Preset')).not.toBeInTheDocument();
    expect(within(dropdownMenu).getByText('No custom presets saved')).toBeInTheDocument();

    corruptReloaded.unmount();
  });

  it('supports granular pedestal slot deletion with trash button, updating stepper count, retaining stable IDs, and falling back selection smoothly', () => {
    render(<App />);

    // 1. Switch to Pedestals tab
    fireEvent.click(screen.getByRole('button', { name: /^Pedestals$/i }));
    expect(screen.getByTestId('pedestal-stepper-value')).toHaveTextContent('4 Altars');

    // 4 slot cards present: pedestal-1, pedestal-2, pedestal-3, pedestal-4
    expect(screen.getByTestId('pedestal-slot-card-pedestal-1')).toBeInTheDocument();
    expect(screen.getByTestId('pedestal-slot-card-pedestal-2')).toBeInTheDocument();
    expect(screen.getByTestId('pedestal-slot-card-pedestal-3')).toBeInTheDocument();
    expect(screen.getByTestId('pedestal-slot-card-pedestal-4')).toBeInTheDocument();

    // 2. Select pedestal-2
    fireEvent.click(screen.getByTestId('pedestal-slot-card-pedestal-2'));
    expect(screen.getByTestId('pedestal-slot-card-pedestal-2')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByText('Target: pedestal-2')).toBeInTheDocument();

    // 3. Delete pedestal-2 from the middle of the list via its trash button
    const deleteBtnPedestal2 = screen.getByTestId('delete-pedestal-slot-pedestal-2');
    fireEvent.click(deleteBtnPedestal2);

    // Stepper count decreases to 3 Altars
    expect(screen.getByTestId('pedestal-stepper-value')).toHaveTextContent('3 Altars');

    // pedestal-2 card is removed from document
    expect(screen.queryByTestId('pedestal-slot-card-pedestal-2')).not.toBeInTheDocument();

    // Remaining slots maintain their stable IDs: pedestal-1, pedestal-3, pedestal-4
    expect(screen.getByTestId('pedestal-slot-card-pedestal-1')).toBeInTheDocument();
    expect(screen.getByTestId('pedestal-slot-card-pedestal-3')).toBeInTheDocument();
    expect(screen.getByTestId('pedestal-slot-card-pedestal-4')).toBeInTheDocument();

    // 4. Selection falls back smoothly to the nearest remaining slot (pedestal-3)
    expect(screen.getByTestId('pedestal-slot-card-pedestal-3')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByText('Target: pedestal-3')).toBeInTheDocument();

    // Stage canvas hit-testing immediately reflects the removal (clicking former position of pedestal-2 does not select it)
    const stageCanvas = screen.getByTestId('stage-canvas') as HTMLCanvasElement;
    fireEvent.pointerDown(stageCanvas, { clientX: 697, clientY: 477 });
    expect(screen.getByText('Target: pedestal-3')).toBeInTheDocument();
    expect(screen.queryByText('Target: pedestal-2')).not.toBeInTheDocument();

    // Verify cyan transform gizmo is rendered for the fallback selection
    const mockCtx = stageCanvas.getContext('2d') as unknown as {
      __ops: Array<{ type: string; args: unknown[] }>;
    };
    const cyanGizmos = mockCtx.__ops.filter(
      (op) => op.type === 'strokeRect' && op.args.includes('#22D3EE')
    );
    expect(cyanGizmos.length).toBeGreaterThan(0);

    // 5. Select pedestal-4 (last item) and delete it
    fireEvent.click(screen.getByTestId('pedestal-slot-card-pedestal-4'));
    expect(screen.getByText('Target: pedestal-4')).toBeInTheDocument();

    const deleteBtnPedestal4 = screen.getByTestId('delete-pedestal-slot-pedestal-4');
    fireEvent.click(deleteBtnPedestal4);

    // Stepper updates to 2 Altars
    expect(screen.getByTestId('pedestal-stepper-value')).toHaveTextContent('2 Altars');
    expect(screen.queryByTestId('pedestal-slot-card-pedestal-4')).not.toBeInTheDocument();

    // Selection falls back to preceding remaining slot (pedestal-3)
    expect(screen.getByTestId('pedestal-slot-card-pedestal-3')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByText('Target: pedestal-3')).toBeInTheDocument();

    // 6. Delete remaining slots until list is emptied
    fireEvent.click(screen.getByTestId('delete-pedestal-slot-pedestal-3'));
    expect(screen.getByTestId('pedestal-stepper-value')).toHaveTextContent('1 Altar');
    expect(screen.getByTestId('pedestal-slot-card-pedestal-1')).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    // Reset ops tracker before deleting the final altar
    mockCtx.__ops.length = 0;
    fireEvent.click(screen.getByTestId('delete-pedestal-slot-pedestal-1'));
    expect(screen.getByTestId('pedestal-stepper-value')).toHaveTextContent('0 Altars');
    expect(screen.queryAllByTestId(/^pedestal-slot-card-/)).toHaveLength(0);

    // Stage canvas renders clean with zero pedestal transform gizmos
    const postEmptyGizmos = mockCtx.__ops.filter(
      (op) => op.type === 'strokeRect' && op.args.includes('#22D3EE')
    );
    expect(postEmptyGizmos).toHaveLength(0);
  });
});




