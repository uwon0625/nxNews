import { test, expect } from '@playwright/test';

const TEST_TIMEOUT = 120000;  // 120 seconds timeout for all test actions

test.describe('Story List', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { timeout: TEST_TIMEOUT });
    
    await expect(async () => {
      const items = await page.locator('app-story-item').all();
      expect(items.length).toBeGreaterThan(0);
    }).toPass({ timeout: TEST_TIMEOUT });
  });

  test('should load initial stories', async ({ page }) => {
    await expect(async () => {
      const stories = await page.locator('app-story-item').all();
      expect(stories.length).toBe(10);
    }).toPass({ timeout: TEST_TIMEOUT });
  });

  test('should handle pagination', async ({ page }) => {
    const firstStoryTitle = await page.locator('app-story-item .story-title').first().textContent();
    
    await page.locator('button.mat-mdc-paginator-navigation-next').click();
    
    await expect(async () => {
      const newTitle = await page.locator('app-story-item .story-title').first().textContent();
      expect(newTitle).not.toBe(firstStoryTitle);
    }).toPass({ timeout: TEST_TIMEOUT });
    
    await expect(page.locator('app-story-item')).toHaveCount(10);
  });

  test('should change page size', async ({ page }) => {
    const pageSizeLabel = page.locator('.mat-mdc-paginator-page-size-label');
    await expect(pageSizeLabel).toBeVisible({ timeout: TEST_TIMEOUT });
    
    await page.locator('.mat-mdc-paginator-page-size-select').click({ force: true });
    await page.waitForTimeout(1000);

    await page.waitForSelector('.mat-mdc-select-panel', { 
      state: 'visible',
      timeout: TEST_TIMEOUT 
    });

    await page.locator('.mat-mdc-select-panel mat-option').filter({ 
      hasText: '5' 
    }).click({ force: true });
    
    await expect(page.locator('app-story-item')).toHaveCount(5, { timeout: TEST_TIMEOUT });
  });

  test('should search stories', async ({ page }) => {
    const searchTerm = 'the';
    await page.fill('input[placeholder="search in title ..."]', searchTerm);
    await page.click('button:has-text("Search")');
    
    await expect(page.locator('.search-header')).toBeVisible();
    
    await expect(async () => {
      const titles = await page.locator('app-story-item .story-title').allTextContents();
      expect(titles.some(title => 
        title.toLowerCase().includes(searchTerm.toLowerCase())
      )).toBeTruthy();
    }).toPass({ timeout: TEST_TIMEOUT });
  });
}); 