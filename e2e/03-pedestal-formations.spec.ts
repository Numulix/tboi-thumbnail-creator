import { test, expect } from './fixtures';

test.describe('Domain 3: Pedestal Formations & Collectibles', () => {
  test.beforeEach(async ({ studioPage: page }) => {
    // Navigate to the Pedestals drawer tab
    const pedestalsTab = page.getByRole('button', { name: 'Pedestals', exact: true });
    await pedestalsTab.click();
    await expect(page.locator('[data-testid="pedestals-builder-section"]')).toBeVisible();
  });

  test('Scenario 3.1: Formation Preset Application', async ({ studioPage: page }) => {
    const arcPreset = page.locator('[data-testid="formation-preset-arc"]');
    const rowPreset = page.locator('[data-testid="formation-preset-row"]');
    const gridPreset = page.locator('[data-testid="formation-preset-grid"]');
    const flankPreset = page.locator('[data-testid="formation-preset-flank"]');

    // Default preset is Arc
    await expect(arcPreset).toHaveAttribute('aria-pressed', 'true');

    // Switch to Row
    await rowPreset.click();
    await expect(rowPreset).toHaveAttribute('aria-pressed', 'true');
    await expect(arcPreset).toHaveAttribute('aria-pressed', 'false');

    // Switch to 2x2 Grid
    await gridPreset.click();
    await expect(gridPreset).toHaveAttribute('aria-pressed', 'true');

    // Switch to Flank
    await flankPreset.click();
    await expect(flankPreset).toHaveAttribute('aria-pressed', 'true');

    // Click Reset Positions
    const resetBtn = page.locator('[data-testid="reset-positions-btn"]');
    await expect(resetBtn).toBeVisible();
    await resetBtn.click();
  });

  test('Scenario 3.2: Dynamic Pedestal Count Stepper', async ({ studioPage: page }) => {
    const countDisplay = page.locator('[data-testid="pedestal-stepper-value"]');
    const incrementBtn = page.locator('[data-testid="pedestal-stepper-increment"]');
    const decrementBtn = page.locator('[data-testid="pedestal-stepper-decrement"]');

    // Default has 4 Altars
    await expect(countDisplay).toContainText('4 Altars');
    await expect(page.locator('[data-testid^="pedestal-slot-card-"]')).toHaveCount(4);

    // Increment count twice -> 6 Altars
    await incrementBtn.click();
    await incrementBtn.click();
    await expect(countDisplay).toContainText('6 Altars');
    await expect(page.locator('[data-testid^="pedestal-slot-card-"]')).toHaveCount(6);

    // Decrement until minimum 1 Altar
    await decrementBtn.click();
    await decrementBtn.click();
    await decrementBtn.click();
    await decrementBtn.click();
    await decrementBtn.click();
    await expect(countDisplay).toContainText('1 Altar');
    await expect(page.locator('[data-testid^="pedestal-slot-card-"]')).toHaveCount(1);
    await expect(decrementBtn).toBeDisabled();
  });

  test('Scenario 3.3: Collectible Search & Assignment', async ({ studioPage: page }) => {
    const searchInput = page.locator('[data-testid="collectible-search-input"]');
    await searchInput.fill('Brimstone');

    // Collectible ID 118 is Brimstone
    const brimstoneResult = page.locator('[data-testid="collectible-result-118"]');
    await expect(brimstoneResult).toBeVisible();
    await expect(brimstoneResult).toContainText('Brimstone');

    // Assign to active pedestal
    await brimstoneResult.click();

    // Verify assigned item on active slot card
    const firstSlot = page.locator('[data-testid^="pedestal-slot-card-"]').first();
    await expect(firstSlot).toContainText('Brimstone');
    await expect(firstSlot).toContainText('Q4');
  });

  test('Scenario 3.4: Granular Pedestal Deletion & Selection Fallback', async ({ studioPage: page }) => {
    const countDisplay = page.locator('[data-testid="pedestal-stepper-value"]');
    await expect(countDisplay).toContainText('4 Altars');

    // Select the second slot
    const slots = page.locator('[data-testid^="pedestal-slot-card-"]');
    const secondSlot = slots.nth(1);
    await secondSlot.click();
    await expect(secondSlot).toHaveAttribute('aria-pressed', 'true');

    // Click delete on the second slot
    const deleteBtn = secondSlot.locator('[data-testid^="delete-pedestal-slot-"]');
    await deleteBtn.click();

    // Verification: count decrements to 3 altars
    await expect(countDisplay).toContainText('3 Altars');
    await expect(page.locator('[data-testid^="pedestal-slot-card-"]')).toHaveCount(3);

    // Verification: fallback selection is active on one of the remaining slots
    const activeSelectedSlot = page.locator('[data-testid^="pedestal-slot-card-"][aria-pressed="true"]');
    await expect(activeSelectedSlot).toHaveCount(1);
  });
});
