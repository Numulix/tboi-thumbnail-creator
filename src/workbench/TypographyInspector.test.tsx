import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createDefaultSceneState } from '../domain/sceneDocument';
import { TypographyInspector } from './TypographyInspector';

describe('TypographyInspector', () => {
  it('renders active text layer controls and fires patch callbacks', () => {
    const scene = createDefaultSceneState();
    const onSelectLayer = vi.fn();
    const onAddLayer = vi.fn();
    const onDeleteLayer = vi.fn();
    const onUpdateLayer = vi.fn();

    render(
      <TypographyInspector
        textLayers={scene.textLayers}
        selectedTextLayerId="text-headline"
        onSelectLayer={onSelectLayer}
        onAddLayer={onAddLayer}
        onDeleteLayer={onDeleteLayer}
        onUpdateLayer={onUpdateLayer}
      />
    );

    // Headline text input
    const input = screen.getByTestId('headline-text-input');
    fireEvent.change(input, { target: { value: 'NEW TITLE' } });
    expect(onUpdateLayer).toHaveBeenCalledWith('text-headline', { text: 'NEW TITLE' });

    // Font family switch
    const teamMeatBtn = screen.getByTestId('font-family-team-meat');
    fireEvent.click(teamMeatBtn);
    expect(onUpdateLayer).toHaveBeenCalledWith('text-headline', { fontFamily: 'team-meat' });

    // Alignment switch
    const alignLeftBtn = screen.getByTestId('text-align-left');
    fireEvent.click(alignLeftBtn);
    expect(onUpdateLayer).toHaveBeenCalledWith('text-headline', { align: 'left' });

    // Ink banner toggle
    const bannerToggle = screen.getByTestId('ink-banner-toggle');
    fireEvent.click(bannerToggle);
    expect(onUpdateLayer).toHaveBeenCalledWith('text-headline', { inkBanner: false });

    // Add layer
    const addBtn = screen.getByTestId('add-text-layer-btn');
    fireEvent.click(addBtn);
    expect(onAddLayer).toHaveBeenCalledTimes(1);

    // Delete layer
    const deleteBtn = screen.getByTestId('delete-text-layer-btn');
    fireEvent.click(deleteBtn);
    expect(onDeleteLayer).toHaveBeenCalledWith('text-headline');
  });
});
