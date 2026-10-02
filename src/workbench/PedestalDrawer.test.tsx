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

  it('disables decrement button at bound 1 and increment button at bound 12', () => {
    const scene = createDefaultSceneState();
    const onUpdateCount = vi.fn();

    // 1. Render with 1 altar: [-] must be disabled, [+] must be enabled
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
    expect(decBtn).toBeDisabled();
    expect(incBtn).not.toBeDisabled();

    // 2. Render with 12 altars: [+] must be disabled, [-] must be enabled
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
});
