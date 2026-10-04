import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createDefaultSceneState } from '../domain/sceneDocument';
import { WorkbenchHeader, type WorkbenchHeaderProps } from './WorkbenchHeader';

function renderHeader(overrides: Partial<WorkbenchHeaderProps> = {}) {
  const defaultProps: WorkbenchHeaderProps = {
    scene: createDefaultSceneState(),
    activeCharacterName: 'Isaac',
    activeRoomName: 'Basement',
    activeRoomAccentColor: '#C83A3A',
    exportStatus: null,
    onSelectPreset: vi.fn(),
    onSavePreset: vi.fn(),
    onDeletePreset: vi.fn(),
    onToggleOverlay: vi.fn(),
    onCopyClipboard: vi.fn(),
    onExportPng: vi.fn(),
    ...overrides,
  };

  return {
    ...render(<WorkbenchHeader {...defaultProps} />),
    props: defaultProps,
  };
}

describe('WorkbenchHeader', () => {
  it('renders the brand logo image and title next to each other', () => {
    renderHeader();

    // Verify brand logo image is rendered with /logo.png and alt text
    const logoImg = screen.getByTestId('header-logo');
    expect(logoImg).toBeInTheDocument();
    expect(logoImg).toHaveAttribute('src', '/logo.png');
    expect(logoImg).toHaveAttribute('alt', 'Isaac Thumb Studio');

    // Verify brand text is adjacent
    expect(screen.getByText('ISAAC THUMB STUDIO')).toBeInTheDocument();

    // Verify status badge
    expect(screen.getByTestId('workspace-status-badge')).toHaveTextContent('Isaac Run - Basement');
  });

  it('triggers overlay toggles and export callbacks', () => {
    const onToggleOverlay = vi.fn();
    const onCopyClipboard = vi.fn();
    const onExportPng = vi.fn();

    renderHeader({
      exportStatus: 'Copied!',
      onToggleOverlay,
      onCopyClipboard,
      onExportPng,
    });

    // Toggle safe zone
    fireEvent.click(screen.getByRole('button', { name: /Safe Zone/i }));
    expect(onToggleOverlay).toHaveBeenCalledWith('safeZone');

    // Toggle snap grid
    fireEvent.click(screen.getByRole('button', { name: /Snap Grid/i }));
    expect(onToggleOverlay).toHaveBeenCalledWith('snapGrid');

    // Copy clipboard
    fireEvent.click(screen.getByRole('button', { name: /Copy Image/i }));
    expect(onCopyClipboard).toHaveBeenCalledTimes(1);

    // Export PNG
    fireEvent.click(screen.getByRole('button', { name: /Export 1280×720 PNG/i }));
    expect(onExportPng).toHaveBeenCalledTimes(1);

    // Export status notification
    expect(screen.getByRole('status')).toHaveTextContent('Copied!');
  });
});
