import { test, expect } from './fixtures';

test.describe('Domain 4: Multi-Layer Typography & Camera Framing', () => {
  test('Scenario 4.1: Typography Text & Alignment Editing', async ({ studioPage: page }) => {
    const headlineInput = page.locator('[data-testid="headline-text-input"]');
    await expect(headlineInput).toHaveValue('GOD TIER EDEN START?!');

    // Update headline text
    await headlineInput.fill('EPIC SYNERGY FOUND');
    await expect(headlineInput).toHaveValue('EPIC SYNERGY FOUND');

    // Alignment buttons
    const leftAlignBtn = page.locator('[data-testid="text-align-left"]');
    const centerAlignBtn = page.locator('[data-testid="text-align-center"]');
    const rightAlignBtn = page.locator('[data-testid="text-align-right"]');

    // Toggle Left alignment
    await leftAlignBtn.click();
    await expect(leftAlignBtn).toHaveAttribute('aria-pressed', 'true');
    await expect(centerAlignBtn).toHaveAttribute('aria-pressed', 'false');

    // Toggle Right alignment
    await rightAlignBtn.click();
    await expect(rightAlignBtn).toHaveAttribute('aria-pressed', 'true');
    await expect(leftAlignBtn).toHaveAttribute('aria-pressed', 'false');

    // Restore Center alignment
    await centerAlignBtn.click();
    await expect(centerAlignBtn).toHaveAttribute('aria-pressed', 'true');
  });

  test('Scenario 4.2: Font Family & Gradient Swatches', async ({ studioPage: page }) => {
    // Font switching
    const upheavalFont = page.locator('[data-testid="font-family-upheaval"]');
    const teamMeatFont = page.locator('[data-testid="font-family-team-meat"]');

    await expect(upheavalFont).toHaveAttribute('aria-pressed', 'true');
    await teamMeatFont.click();
    await expect(teamMeatFont).toHaveAttribute('aria-pressed', 'true');
    await expect(upheavalFont).toHaveAttribute('aria-pressed', 'false');

    // Swatch switching
    const goldSwatch = page.locator('[data-testid="swatch-gold-orange"]');
    const redBrimstoneSwatch = page.locator('[data-testid="swatch-red-brimstone"]');

    await expect(goldSwatch).toHaveAttribute('aria-pressed', 'true');
    await redBrimstoneSwatch.click();
    await expect(redBrimstoneSwatch).toHaveAttribute('aria-pressed', 'true');
    await expect(goldSwatch).toHaveAttribute('aria-pressed', 'false');
  });

  test('Scenario 4.3: Add & Delete Text Layers', async ({ studioPage: page }) => {
    const textSection = page.locator('[data-testid="text-layer-inspector-section"]');
    await expect(textSection).toContainText('Text Layers (1)');

    // Add new text layer
    const addLayerBtn = page.locator('[data-testid="add-text-layer-btn"]');
    await addLayerBtn.click();
    await expect(textSection).toContainText('Text Layers (2)');

    // Delete active text layer
    const deleteLayerBtn = page.locator('[data-testid="delete-text-layer-btn"]');
    await deleteLayerBtn.click();
    await expect(textSection).toContainText('Text Layers (1)');
  });

  test('Scenario 4.4: Camera Framing & Room Depth Filters', async ({ studioPage: page }) => {
    const zoomSlider = page.getByLabel('Room Zoom');
    const resetCameraBtn = page.getByRole('button', { name: /Reset Camera & Filters/i });

    // Initial zoom is 1.0 (100%)
    await expect(page.getByText('100%')).toBeVisible();

    // Adjust zoom to 2.0
    await zoomSlider.fill('2');
    await expect(page.getByText('200%')).toBeVisible();

    // Reset camera framing
    await resetCameraBtn.click();
    await expect(page.getByText('100%')).toBeVisible();
    await expect(zoomSlider).toHaveValue('1');
  });
});
