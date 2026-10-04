import { test, expect } from './fixtures';

test.describe('Domain 7: Visual Regression & Golden Thumbnail Validation', () => {
  test('Scenario 7.1: Baseline Golden Thumbnail Snapshot', async ({ studioPage: page }) => {
    const stageCanvas = page.locator('[data-testid="stage-canvas"]');
    await expect(stageCanvas).toBeVisible();

    // Verify visual rendering stability against golden baseline
    await expect(stageCanvas).toHaveScreenshot('golden-stage-baseline.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

  test('Scenario 7.2: YouTube Feed Miniature Preview Comparison', async ({ studioPage: page }) => {
    const previewCard = page.locator('[data-testid="youtube-feed-preview-card"]');
    await expect(previewCard).toBeVisible();

    // Verify YouTube feed preview card matches visual baseline
    await expect(previewCard).toHaveScreenshot('youtube-preview-card.png', {
      maxDiffPixelRatio: 0.05,
    });
  });
});
