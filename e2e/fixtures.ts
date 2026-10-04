import { test as base, expect, Page } from '@playwright/test';

export interface StudioFixtures {
  studioPage: Page;
  waitForCanvasReady: () => Promise<void>;
}

export const test = base.extend<StudioFixtures>({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      window.localStorage.clear();
    });
    await use(page);
  },

  waitForCanvasReady: async ({ page }, use) => {
    const waiter = async () => {
      const canvas = page.locator('[data-testid="stage-canvas"]');
      await canvas.waitFor({ state: 'visible' });
      await expect(canvas).not.toHaveAttribute('data-asset-revision', '0', { timeout: 10000 });
    };
    await use(waiter);
  },

  studioPage: async ({ page, waitForCanvasReady }, use) => {
    await page.goto('/');
    await waitForCanvasReady();
    await use(page);
  },
});

export { expect };
