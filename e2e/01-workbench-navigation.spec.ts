import { test, expect } from './fixtures';

test.describe('Domain 1: Workbench Navigation & Overlay Controls', () => {
  test('Scenario 1.1: Default Workbench Initialization', async ({ studioPage: page }) => {
    // Top header branding & title
    await expect(page.locator('[data-testid="header-logo"]')).toBeVisible();
    await expect(page.getByText('ISAAC THUMB STUDIO')).toBeVisible();

    // Project status badge
    const statusBadge = page.locator('[data-testid="workspace-status-badge"]');
    await expect(statusBadge).toBeVisible();
    await expect(statusBadge).toContainText('Eden Run - Burning Basement');
    await expect(statusBadge).toContainText('[Saved]');

    // Preset indicator
    const presetDropdown = page.locator('[data-testid="preset-selector-dropdown"]');
    await expect(presetDropdown).toBeVisible();
    await expect(presetDropdown).toContainText('Eden Run Default');

    // Canvas & Preview Card
    const stageCanvas = page.locator('[data-testid="stage-canvas"]');
    await expect(stageCanvas).toBeVisible();
    await expect(stageCanvas).toHaveAttribute('width', '1280');
    await expect(stageCanvas).toHaveAttribute('height', '720');

    const previewCard = page.locator('[data-testid="youtube-feed-preview-card"]');
    await expect(previewCard).toBeVisible();
    await expect(previewCard.locator('[data-testid="preview-canvas"]')).toBeVisible();
  });

  test('Scenario 1.2: Drawer Tab Navigation', async ({ studioPage: page }) => {
    const characterTab = page.getByRole('button', { name: 'Character', exact: true });
    const pedestalsTab = page.getByRole('button', { name: 'Pedestals', exact: true });
    const roomsTab = page.getByRole('button', { name: 'Rooms', exact: true });

    // Initial state: Character tab is active
    await expect(characterTab).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-testid="character-builder-section"]')).toBeVisible();

    // Switch to Pedestals tab
    await pedestalsTab.click();
    await expect(pedestalsTab).toHaveAttribute('aria-pressed', 'true');
    await expect(characterTab).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('[data-testid="pedestals-builder-section"]')).toBeVisible();

    // Switch to Rooms tab
    await roomsTab.click();
    await expect(roomsTab).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-testid="stage-catalog-section"]')).toBeVisible();

    // Switch back to Character tab
    await characterTab.click();
    await expect(characterTab).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-testid="character-builder-section"]')).toBeVisible();
  });

  test('Scenario 1.3: Safe-Zone & Snap Grid Overlay Toggles', async ({ studioPage: page }) => {
    // Safe-zone overlay button
    const safeZoneBtn = page.getByRole('button', { name: /Safe Zone:/i });
    await expect(safeZoneBtn).toContainText('Safe Zone: ON');
    await expect(safeZoneBtn).toHaveAttribute('aria-pressed', 'true');

    // Toggle Safe Zone off
    await safeZoneBtn.click();
    await expect(safeZoneBtn).toContainText('Safe Zone: OFF');
    await expect(safeZoneBtn).toHaveAttribute('aria-pressed', 'false');

    // Snap grid button
    const snapGridBtn = page.getByRole('button', { name: 'Snap Grid' });
    await expect(snapGridBtn).toHaveAttribute('aria-pressed', 'false');

    // Toggle Snap Grid on
    await snapGridBtn.click();
    await expect(snapGridBtn).toHaveAttribute('aria-pressed', 'true');

    // Toggle Snap Grid off
    await snapGridBtn.click();
    await expect(snapGridBtn).toHaveAttribute('aria-pressed', 'false');
  });
});
