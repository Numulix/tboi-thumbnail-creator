import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createDefaultSceneState } from '../domain/sceneDocument';
import { PedestalDrawer } from './PedestalDrawer';

describe('PedestalDrawer', () => {
  it('renders pedestal slots and fires callbacks on count, preset, and item assignment', () => {
    const scene = createDefaultSceneState();
    const onSelectPedestal = vi.fn();
    const onUpdateCount = vi.fn();
    const onApplyPreset = vi.fn();
    const onScaleChange = vi.fn();
    const onAssignCollectible = vi.fn();
    const onResetPositions = vi.fn();

    render(
      <PedestalDrawer
        pedestals={scene.pedestals}
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

    // Change slot count to 6
    const count6Btn = screen.getByTestId('pedestal-count-6');
    fireEvent.click(count6Btn);
    expect(onUpdateCount).toHaveBeenCalledWith(6);

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
});
