import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createDefaultSceneState } from '../domain/sceneDocument';
import { PedestalDrawer } from './PedestalDrawer';

describe('PedestalDrawer', () => {
  it('renders stepper in the header displaying active altar count and triggers onUpdateCount', () => {
    const scene = createDefaultSceneState();
    const onSelectPedestal = vi.fn();
    const onUpdateCount = vi.fn();
    const onApplyPreset = vi.fn();
    const onScaleChange = vi.fn();
    const onAssignCollectible = vi.fn();
    const onResetPositions = vi.fn();

    render(
      <PedestalDrawer
        pedestals={scene.pedestals} // 4 pedestals
        formationPreset={scene.formationPreset}
        pedestalScale={scene.pedestalScale}
        selectedPedestalId="pedestal-1"
        onSelectPedestal={onSelectPedestal}
        onUpdateCount={onUpdateCount}
        onApplyPreset={onApplyPreset}
        onScaleChange={onScaleChange}
        onAssignCollectible={onAssignCollectible}
        onResetPositions={onResetPositions}
      />
    );

    // Verify stepper is rendered in the header displaying "4 Altars"
    expect(screen.getByTestId('pedestal-drawer-header')).toBeInTheDocument();
    expect(screen.getByTestId('pedestal-stepper')).toBeInTheDocument();
    expect(screen.getByTestId('pedestal-stepper-value')).toHaveTextContent('4 Altars');

    const incBtn = screen.getByTestId('pedestal-stepper-increment');
    const decBtn = screen.getByTestId('pedestal-stepper-decrement');

    // Both are enabled for count 4
    expect(incBtn).not.toBeDisabled();
    expect(decBtn).not.toBeDisabled();

    // Increment calls onUpdateCount with 5
    fireEvent.click(incBtn);
    expect(onUpdateCount).toHaveBeenCalledWith(5);

    // Decrement calls onUpdateCount with 3
    fireEvent.click(decBtn);
    expect(onUpdateCount).toHaveBeenCalledWith(3);

    // Apply Row preset
    const rowPresetBtn = screen.getByTestId('formation-preset-row');
    fireEvent.click(rowPresetBtn);
    expect(onApplyPreset).toHaveBeenCalledWith('row');

    // Reset positions
    const resetPositionsBtn = screen.getByTestId('reset-positions-btn');
    fireEvent.click(resetPositionsBtn);
    expect(onResetPositions).toHaveBeenCalledTimes(1);

    // Filter search items
    const searchInput = screen.getByTestId('collectible-search-input');
    fireEvent.change(searchInput, { target: { value: 'Brimstone' } });
    const brimstoneResult = screen.getByTestId('collectible-result-118');
    fireEvent.click(brimstoneResult);
    expect(onAssignCollectible).toHaveBeenCalledWith('pedestal-1', 118);
  });

  it('disables decrement button at bound 0 and increment button at bound 12, allowing decrement from 1 to 0', () => {
    const scene = createDefaultSceneState();
    const onUpdateCount = vi.fn();

    // 1. Render with 1 altar: [-] must be enabled, [+] must be enabled
    const singlePedestal = scene.pedestals.slice(0, 1);
    const { rerender } = render(
      <PedestalDrawer
        pedestals={singlePedestal}
        formationPreset="arc"
        pedestalScale={1.5}
        selectedPedestalId="pedestal-1"
        onSelectPedestal={vi.fn()}
        onUpdateCount={onUpdateCount}
        onApplyPreset={vi.fn()}
        onScaleChange={vi.fn()}
        onAssignCollectible={vi.fn()}
        onResetPositions={vi.fn()}
      />
    );

    const decBtn = screen.getByTestId('pedestal-stepper-decrement');
    const incBtn = screen.getByTestId('pedestal-stepper-increment');
    expect(screen.getByTestId('pedestal-stepper-value')).toHaveTextContent('1 Altar');
    expect(decBtn).not.toBeDisabled();
    expect(incBtn).not.toBeDisabled();

    // Decrement from 1 calls onUpdateCount with 0
    fireEvent.click(decBtn);
    expect(onUpdateCount).toHaveBeenCalledWith(0);

    // 2. Render with 0 altars: [-] must be disabled, [+] must be enabled, stepper shows "0 Altars"
    rerender(
      <PedestalDrawer
        pedestals={[]}
        formationPreset="arc"
        pedestalScale={1.5}
        selectedPedestalId=""
        onSelectPedestal={vi.fn()}
        onUpdateCount={onUpdateCount}
        onApplyPreset={vi.fn()}
        onScaleChange={vi.fn()}
        onAssignCollectible={vi.fn()}
        onResetPositions={vi.fn()}
      />
    );

    expect(screen.getByTestId('pedestal-stepper-value')).toHaveTextContent('0 Altars');
    expect(decBtn).toBeDisabled();
    expect(incBtn).not.toBeDisabled();

    // Clicking [+] when count is 0 calls onUpdateCount with 1
    onUpdateCount.mockClear();
    fireEvent.click(incBtn);
    expect(onUpdateCount).toHaveBeenCalledWith(1);

    // 3. Render with 12 altars: [+] must be disabled, [-] must be enabled
    const twelvePedestals = Array.from({ length: 12 }, (_, i) => ({
      id: `pedestal-${i + 1}`,
      itemId: 182,
      itemName: `Item ${i + 1}`,
      quality: 4 as const,
      altarStyle: 'stone' as const,
      priceTag: 'none' as const,
      highlightFx: 'none' as const,
    }));

    rerender(
      <PedestalDrawer
        pedestals={twelvePedestals}
        formationPreset="arc"
        pedestalScale={1.5}
        selectedPedestalId="pedestal-1"
        onSelectPedestal={vi.fn()}
        onUpdateCount={onUpdateCount}
        onApplyPreset={vi.fn()}
        onScaleChange={vi.fn()}
        onAssignCollectible={vi.fn()}
        onResetPositions={vi.fn()}
      />
    );

    expect(screen.getByTestId('pedestal-stepper-value')).toHaveTextContent('12 Altars');
    expect(incBtn).toBeDisabled();
    expect(decBtn).not.toBeDisabled();

    // Verify all 12 slot cards are rendered
    const slotCards = screen.getAllByTestId(/^pedestal-slot-card-/);
    expect(slotCards).toHaveLength(12);
  });

  it('renders an empty state banner with an active add button when count is 0, and allows formation presets switching', () => {
    const onUpdateCount = vi.fn();
    const onApplyPreset = vi.fn();

    render(
      <PedestalDrawer
        pedestals={[]}
        formationPreset="arc"
        pedestalScale={1.5}
        selectedPedestalId=""
        onSelectPedestal={vi.fn()}
        onUpdateCount={onUpdateCount}
        onApplyPreset={onApplyPreset}
        onScaleChange={vi.fn()}
        onAssignCollectible={vi.fn()}
        onResetPositions={vi.fn()}
      />
    );

    // Empty state banner is rendered
    const emptyStateBanner = screen.getByTestId('pedestal-empty-state');
    expect(emptyStateBanner).toBeInTheDocument();
    expect(screen.getByText(/no altars in.*scene/i)).toBeInTheDocument();

    // No slot cards are rendered
    expect(screen.queryAllByTestId(/^pedestal-slot-card-/)).toHaveLength(0);

    // Assign Collectible search is omitted when no pedestals are present
    expect(screen.queryByTestId('collectible-search-input')).not.toBeInTheDocument();

    // Active add button in empty state banner calls onUpdateCount with 1
    const addAltarBtn = screen.getByTestId('pedestal-empty-state-add-btn');
    expect(addAltarBtn).toBeInTheDocument();
    fireEvent.click(addAltarBtn);
    expect(onUpdateCount).toHaveBeenCalledWith(1);

    // Formation preset buttons work cleanly even when count is 0
    const rowPresetBtn = screen.getByTestId('formation-preset-row');
    fireEvent.click(rowPresetBtn);
    expect(onApplyPreset).toHaveBeenCalledWith('row');
  });

  it('renders a delete button with a trash icon on each slot card and triggers onDeletePedestal without triggering card selection', () => {
    const scene = createDefaultSceneState(); // 4 pedestals
    const onSelectPedestal = vi.fn();
    const onDeletePedestal = vi.fn();

    render(
      <PedestalDrawer
        pedestals={scene.pedestals}
        formationPreset={scene.formationPreset}
        pedestalScale={scene.pedestalScale}
        selectedPedestalId="pedestal-1"
        onSelectPedestal={onSelectPedestal}
        onDeletePedestal={onDeletePedestal}
        onUpdateCount={vi.fn()}
        onApplyPreset={vi.fn()}
        onScaleChange={vi.fn()}
        onAssignCollectible={vi.fn()}
        onResetPositions={vi.fn()}
      />
    );

    // Verify each card has a delete button with a trash icon
    for (const slot of scene.pedestals) {
      const deleteBtn = screen.getByTestId(`delete-pedestal-slot-${slot.id}`);
      expect(deleteBtn).toBeInTheDocument();
      expect(deleteBtn).toHaveAttribute('aria-label', expect.stringContaining('Delete'));
    }

    // Clicking delete on pedestal-2 invokes onDeletePedestal with 'pedestal-2'
    const deleteBtn2 = screen.getByTestId('delete-pedestal-slot-pedestal-2');
    fireEvent.click(deleteBtn2);
    expect(onDeletePedestal).toHaveBeenCalledWith('pedestal-2');
    // Propagation was stopped, so onSelectPedestal was not triggered for pedestal-2
    expect(onSelectPedestal).not.toHaveBeenCalledWith('pedestal-2');

    // Clicking the slot card itself selects the slot
    const card3 = screen.getByTestId('pedestal-slot-card-pedestal-3');
    fireEvent.click(card3);
    expect(onSelectPedestal).toHaveBeenCalledWith('pedestal-3');

    // Pressing Enter on slot card triggers selection
    fireEvent.keyDown(card3, { key: 'Enter' });
    expect(onSelectPedestal).toHaveBeenCalledWith('pedestal-3');

    // Pressing Enter or Space on delete button does not trigger slot selection
    onSelectPedestal.mockClear();
    const deleteBtn3 = screen.getByTestId('delete-pedestal-slot-pedestal-3');
    fireEvent.keyDown(deleteBtn3, { key: 'Enter' });
    expect(onSelectPedestal).not.toHaveBeenCalled();
  });
});

