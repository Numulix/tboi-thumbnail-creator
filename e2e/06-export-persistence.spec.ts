import { test, expect } from './fixtures';

test.describe('Domain 6: Preset Persistence, Auto-Save & Export Pipeline', () => {
  test('Scenario 6.1: Custom Preset Creation, Selection & Deletion', async ({ studioPage: page }) => {
    // 1. Change headline text to make scene distinct
    const headlineInput = page.locator('[data-testid="headline-text-input"]');
    await headlineInput.fill('MY CUSTOM PRESET RUN');

    // 2. Click Save Preset CTA button
    const savePresetBtn = page.locator('[data-testid="save-preset-btn"]');
    await savePresetBtn.click();

    // Verify modal is visible
    const presetNameInput = page.locator('[data-testid="preset-name-input"]');
    await expect(presetNameInput).toBeVisible();
    await presetNameInput.fill('Speedrun Showcase');

    // Submit save modal
    const confirmSaveBtn = page.locator('[data-testid="confirm-save-preset-btn"]');
    await confirmSaveBtn.click();

    // Verify active preset name updated in selector
    const presetSelector = page.locator('[data-testid="preset-selector-dropdown"]');
    await expect(presetSelector).toContainText('Speedrun Showcase');

    // 3. Open dropdown and switch back to Eden Run Default
    await presetSelector.click();
    const defaultOption = page.locator('[data-testid="preset-option-eden-run-default"]');
    await defaultOption.click();
    await expect(presetSelector).toContainText('Eden Run Default');
    await expect(headlineInput).toHaveValue('GOD TIER EDEN START?!');

    // 4. Open dropdown again, select custom preset, and delete it
    await presetSelector.click();
    const dropdownMenu = page.locator('[data-testid="preset-dropdown-menu"]');
    await expect(dropdownMenu).toBeVisible();

    const customOption = dropdownMenu.getByText('Speedrun Showcase');
    await expect(customOption).toBeVisible();

    // Click delete button for custom preset
    const deletePresetBtn = dropdownMenu.locator('[data-testid^="delete-preset-"]');
    await deletePresetBtn.click();

    // Verify custom preset is deleted from dropdown
    await expect(customOption).not.toBeVisible();
  });

  test('Scenario 6.2: LocalStorage Auto-Save State Restoration', async ({ studioPage: page }) => {
    const headlineInput = page.locator('[data-testid="headline-text-input"]');
    await headlineInput.fill('PERSISTENCE RELOAD TEST');

    // Wait a brief tick for auto-save useEffect
    await page.waitForTimeout(200);

    // Reload the page
    await page.reload();

    // Wait for canvas readiness
    await page.waitForSelector('canvas[data-testid="stage-canvas"][data-asset-revision]');

    // Verification: state restored from localStorage
    await expect(page.locator('[data-testid="headline-text-input"]')).toHaveValue('PERSISTENCE RELOAD TEST');
  });

  test('Scenario 6.3: PNG Export Download Trigger', async ({ studioPage: page }) => {
    const exportBtn = page.getByRole('button', { name: /Export 1280×720 PNG/i });

    // Listen for download event
    const downloadPromise = page.waitForEvent('download');
    await exportBtn.click();
    const download = await downloadPromise;

    // Verify downloaded filename and extension
    expect(download.suggestedFilename()).toBe('isaac-thumb-burning-basement-1280x720.png');

    // Verification: status readout displays Exported confirmation
    const status = page.getByRole('status');
    await expect(status).toContainText('Exported 1280×720 PNG');
  });

  test('Scenario 6.4: Clipboard Copy Image Flow', async ({ studioPage: page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    const copyBtn = page.getByRole('button', { name: /Copy Image/i });
    await copyBtn.click();

    // Verification: status readout displays Copy confirmation
    const status = page.getByRole('status');
    await expect(status).toContainText('Copied 1280×720 PNG to Clipboard');
  });
});
