import { test, expect } from '@playwright/test';

test.describe('Story List', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('app-story-item')).toHaveCount(10, { timeout: 30000 });
  });

  test('should load initial stories', async ({ page }) => {
    const stories = await page.locator('app-story-item').all();
    expect(stories.length).toBe(10);
  });

  test('should handle pagination', async ({ page }) => {
    const firstStoryTitle = await page.locator('app-story-item .story-title').first().textContent();
    
    await page.locator('button.mat-mdc-paginator-navigation-next').click();
    
    await expect(async () => {
      const newTitle = await page.locator('app-story-item .story-title').first().textContent();
      expect(newTitle).not.toBe(firstStoryTitle);
    }).toPass({ timeout: 30000 });
    
    await expect(page.locator('app-story-item')).toHaveCount(10);
  });

  test('should change page size', async ({ page }) => {
    // Find and click the paginator's page size label
    const pageSizeLabel = page.locator('.mat-mdc-paginator-page-size-label');
    await expect(pageSizeLabel).toBeVisible({ timeout: 10000 });
    
    // Click the select near the label
    await page.locator('.mat-mdc-paginator-page-size-select').click({ force: true });
    await page.waitForTimeout(1000);

    // Wait for and click option
    await page.waitForSelector('.mat-mdc-select-panel', { 
      state: 'visible',
      timeout: 10000 
    });

    // Click option 5 with force
    await page.locator('.mat-mdc-select-panel mat-option').filter({ 
      hasText: '5' 
    }).click({ force: true });
    
    // Wait for story count to change
    await expect(page.locator('app-story-item')).toHaveCount(5, { timeout: 10000 });
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
    }).toPass({ timeout: 30000 });
  });
}); 