import { test, expect } from './fixtures';

test.describe('Domain 2: Character Builder & Eden Hair', () => {
  test('Scenario 2.1: Character & Variant Selection', async ({ studioPage: page }) => {
    // Initial active character is Eden
    const preview = page.locator('[data-testid="active-character-preview"]');
    await expect(preview).toContainText('Eden');
    await expect(preview).toContainText('normal');

    // Switch to Isaac in Normal roster
    const isaacBtn = page.locator('[data-testid="character-option-isaac"]');
    await isaacBtn.click();
    await expect(preview).toContainText('Isaac');
    await expect(preview).toContainText('normal');
    await expect(page.locator('[data-testid="workspace-status-badge"]')).toContainText('Isaac Run');

    // Switch to Tainted roster
    const taintedTab = page.getByRole('button', { name: 'Tainted (17)', exact: true });
    await taintedTab.click();
    await expect(taintedTab).toHaveAttribute('aria-pressed', 'true');

    // Select Tainted Samson
    const taintedSamsonBtn = page.locator('[data-testid="character-option-tainted-samson"]');
    await taintedSamsonBtn.click();
    await expect(preview).toContainText('Tainted Samson');
    await expect(preview).toContainText('tainted');
    await expect(page.locator('[data-testid="workspace-status-badge"]')).toContainText('Tainted Samson Run');
  });

  test('Scenario 2.2: Character Pose Switching', async ({ studioPage: page }) => {
    const preview = page.locator('[data-testid="active-character-preview"]');
    const poses = [
      { label: 'Happy Pickup', expectedText: 'Happy Pickup' },
      { label: 'Thumbs Up', expectedText: 'Thumbs Up' },
      { label: 'Shocked', expectedText: 'Shocked' },
      { label: 'Agony', expectedText: 'Agony' },
      { label: 'Cheer', expectedText: 'Cheer' },
      { label: 'Crying', expectedText: 'Crying' },
      { label: 'Front Idle', expectedText: 'Front Idle' },
    ];

    for (const pose of poses) {
      const poseBtn = page.getByRole('button', { name: pose.label, exact: true });
      await poseBtn.click();
      await expect(poseBtn).toHaveAttribute('aria-pressed', 'true');
      await expect(preview).toContainText(pose.expectedText);
    }
  });

  test('Scenario 2.3: Eden Hairstyle Customization & Randomizer', async ({ studioPage: page }) => {
    const preview = page.locator('[data-testid="active-character-preview"]');

    // Eden is selected by default; verify hairstyle section is mounted
    const hairSection = page.locator('[data-testid="eden-hair-section"]');
    await expect(hairSection).toBeVisible();

    // Select specific hairstyle #15
    const hairOption15 = page.locator('[data-testid="eden-hair-option-15"]');
    await hairOption15.click();
    await expect(hairOption15).toHaveAttribute('aria-pressed', 'true');
    await expect(preview).toContainText('Hair #15');

    // Trigger Randomize Hair
    const randomizeBtn = page.getByRole('button', { name: /Randomize Hair/i });
    await randomizeBtn.click();
    await expect(preview).toContainText(/Hair #\d+/);

    // Switch to a non-Eden character and verify hairstyle section unmounts
    await page.locator('[data-testid="character-option-isaac"]').click();
    await expect(hairSection).not.toBeVisible();
  });

  test('Scenario 2.4: Character Scale & Reset', async ({ studioPage: page }) => {
    const preview = page.locator('[data-testid="active-character-preview"]');
    const scaleSlider = page.getByLabel('Character Scale');
    const resetBtn = page.getByRole('button', { name: 'Reset Scale' });

    // Initial scale is 1.85x
    await expect(preview).toContainText('Scale: 1.85x');

    // Adjust scale to 1.2x
    await scaleSlider.fill('1.2');
    await expect(preview).toContainText('Scale: 1.20x');

    // Click Reset
    await resetBtn.click();
    await expect(preview).toContainText('Scale: 1.85x');
    await expect(scaleSlider).toHaveValue('1.85');
  });
});
