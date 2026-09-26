import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createDefaultSceneState } from '../domain/sceneDocument';
import { CharacterDrawer } from './CharacterDrawer';

describe('CharacterDrawer', () => {
  it('renders active character details and fires callbacks on pose and scale changes', () => {
    const scene = createDefaultSceneState();
    const onPoseChange = vi.fn();
    const onScaleChange = vi.fn();
    const onResetScale = vi.fn();
    const onSelectCharacter = vi.fn();
    const onSelectEdenHair = vi.fn();
    const onRandomizeEdenHair = vi.fn();

    render(
      <CharacterDrawer
        character={scene.character}
        onSelectCharacter={onSelectCharacter}
        onPoseChange={onPoseChange}
        onScaleChange={onScaleChange}
        onResetScale={onResetScale}
        onSelectEdenHair={onSelectEdenHair}
        onRandomizeEdenHair={onRandomizeEdenHair}
      />
    );

    // Active preview check
    const preview = screen.getByTestId('active-character-preview');
    expect(within(preview).getByText('Eden')).toBeInTheDocument();

    // Pose change click
    const cheerBtn = screen.getByRole('button', { name: /Cheer/i });
    fireEvent.click(cheerBtn);
    expect(onPoseChange).toHaveBeenCalledWith('cheer');

    // Scale slider change
    const scaleSlider = screen.getByLabelText('Character Scale');
    fireEvent.change(scaleSlider, { target: { value: '2.1' } });
    expect(onScaleChange).toHaveBeenCalledWith(2.1);

    // Reset scale button click
    const resetBtn = screen.getByRole('button', { name: /Reset Scale/i });
    fireEvent.click(resetBtn);
    expect(onResetScale).toHaveBeenCalledTimes(1);

    // Randomize hair click
    const randomizeBtn = screen.getByRole('button', { name: /Randomize Hair/i });
    fireEvent.click(randomizeBtn);
    expect(onRandomizeEdenHair).toHaveBeenCalledTimes(1);
  });
});
