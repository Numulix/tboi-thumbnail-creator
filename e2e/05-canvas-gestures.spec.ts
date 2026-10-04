import { test, expect } from './fixtures';
import type { Locator } from '@playwright/test';

async function stageToScreen(
  canvas: Locator,
  stageX: number,
  stageY: number
): Promise<{ x: number; y: number }> {
  const box = await canvas.boundingBox();
  if (!box) {
    throw new Error('Canvas bounding box not found');
  }
  return {
    x: box.x + (stageX / 1280) * box.width,
    y: box.y + (stageY / 720) * box.height,
  };
}

test.describe('Domain 5: Stage Canvas Gestures, Node Hit-Testing & Grid Snapping', () => {
  test('Scenario 5.1: Stage Node Selection via Canvas Direct Click', async ({ studioPage: page }) => {
    const canvas = page.locator('[data-testid="stage-canvas"]');

    // Click character node at (280, 450)
    const charPt = await stageToScreen(canvas, 280, 450);
    await page.mouse.click(charPt.x, charPt.y);
    await expect(canvas).toHaveAttribute('data-selected-node-id', 'character');

    // Click headline text layer at (640, 96)
    const textPt = await stageToScreen(canvas, 640, 96);
    await page.mouse.click(textPt.x, textPt.y);
    await expect(canvas).toHaveAttribute('data-selected-node-id', 'text-headline');
  });

  test('Scenario 5.2: Node Drag & Drop Translation', async ({ studioPage: page }) => {
    const canvas = page.locator('[data-testid="stage-canvas"]');
    await expect(canvas).toHaveAttribute('data-character-pos', '280,505');

    // Start drag at character anchor
    const startPt = await stageToScreen(canvas, 280, 450);
    const endPt = await stageToScreen(canvas, 450, 450);

    await page.mouse.move(startPt.x, startPt.y);
    await page.mouse.down();
    await page.mouse.move(endPt.x, endPt.y, { steps: 5 });
    await page.mouse.up();

    // Verify character position has translated rightwards
    const updatedPos = await canvas.getAttribute('data-character-pos');
    expect(updatedPos).toBeTruthy();
    const [posX] = updatedPos!.split(',').map(Number);
    expect(posX).toBeGreaterThan(350);
  });

  test('Scenario 5.3: Canvas Background Deselection', async ({ studioPage: page }) => {
    const canvas = page.locator('[data-testid="stage-canvas"]');

    // Select character first
    const charPt = await stageToScreen(canvas, 280, 450);
    await page.mouse.click(charPt.x, charPt.y);
    await expect(canvas).toHaveAttribute('data-selected-node-id', 'character');

    // Click top-left empty background area at (50, 50)
    const emptyPt = await stageToScreen(canvas, 50, 50);
    await page.mouse.click(emptyPt.x, emptyPt.y);

    // Verify deselected
    await expect(canvas).toHaveAttribute('data-selected-node-id', '');
  });

  test('Scenario 5.4: Grid Snapping Alignment During Canvas Drag', async ({ studioPage: page }) => {
    const canvas = page.locator('[data-testid="stage-canvas"]');

    // Enable Snap Grid overlay
    const snapGridBtn = page.getByRole('button', { name: 'Snap Grid' });
    await snapGridBtn.click();
    await expect(snapGridBtn).toHaveAttribute('aria-pressed', 'true');

    // Drag character to an arbitrary stage coordinate
    const startPt = await stageToScreen(canvas, 280, 450);
    const targetPt = await stageToScreen(canvas, 412, 388);

    await page.mouse.move(startPt.x, startPt.y);
    await page.mouse.down();
    await page.mouse.move(targetPt.x, targetPt.y, { steps: 5 });
    await page.mouse.up();

    // With Snap Grid active (64px step), resulting coordinate snaps to multiple of 64
    const finalPos = await canvas.getAttribute('data-character-pos');
    expect(finalPos).toBeTruthy();
    const [finalX, finalY] = finalPos!.split(',').map(Number);
    expect(finalX % 64).toBe(0);
    expect(finalY % 64).toBe(0);
  });
});
