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

  it('renders active character preview with 7-column atlas scaling and exact pose coordinates', () => {
    const defaultScene = createDefaultSceneState();

    // Test Tainted Eve in 'thumbsUp', 'shocked', and 'agony' poses (from user report)
    const { rerender } = render(
      <CharacterDrawer
        character={{
          ...defaultScene.character,
          id: 'tainted-eve',
          pose: 'thumbsUp',
        }}
        onSelectCharacter={vi.fn()}
        onPoseChange={vi.fn()}
        onScaleChange={vi.fn()}
        onResetScale={vi.fn()}
        onSelectEdenHair={vi.fn()}
        onRandomizeEdenHair={vi.fn()}
      />
    );

    const preview = screen.getByTestId('active-character-preview');
    expect(within(preview).getByText('Tainted Eve')).toBeInTheDocument();

    const spriteDiv = preview.querySelector('.pixelated') as HTMLElement;
    expect(spriteDiv).not.toBeNull();
    expect(spriteDiv.style.backgroundSize).toBe('448px 2432px');
    expect(spriteDiv.style.backgroundPosition).toBe('-128px -1600px');
    expect(spriteDiv.style.backgroundRepeat).toBe('no-repeat');

    // Rerender with pose 'shocked' (col 3: 192px)
    rerender(
      <CharacterDrawer
        character={{
          ...defaultScene.character,
          id: 'tainted-eve',
          pose: 'shocked',
        }}
        onSelectCharacter={vi.fn()}
        onPoseChange={vi.fn()}
        onScaleChange={vi.fn()}
        onResetScale={vi.fn()}
        onSelectEdenHair={vi.fn()}
        onRandomizeEdenHair={vi.fn()}
      />
    );
    expect(spriteDiv.style.backgroundPosition).toBe('-192px -1600px');

    // Rerender with pose 'agony' (col 4: 256px)
    rerender(
      <CharacterDrawer
        character={{
          ...defaultScene.character,
          id: 'tainted-eve',
          pose: 'agony',
        }}
        onSelectCharacter={vi.fn()}
        onPoseChange={vi.fn()}
        onScaleChange={vi.fn()}
        onResetScale={vi.fn()}
        onSelectEdenHair={vi.fn()}
        onRandomizeEdenHair={vi.fn()}
      />
    );
    expect(spriteDiv.style.backgroundPosition).toBe('-256px -1600px');

    // Rerender with pose 'crying' (col 6: 384px)
    rerender(
      <CharacterDrawer
        character={{
          ...defaultScene.character,
          id: 'tainted-eve',
          pose: 'crying',
        }}
        onSelectCharacter={vi.fn()}
        onPoseChange={vi.fn()}
        onScaleChange={vi.fn()}
        onResetScale={vi.fn()}
        onSelectEdenHair={vi.fn()}
        onRandomizeEdenHair={vi.fn()}
      />
    );
    expect(spriteDiv.style.backgroundPosition).toBe('-384px -1600px');
  });
});

