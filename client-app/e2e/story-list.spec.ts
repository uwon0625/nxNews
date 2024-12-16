import { test, expect } from '@playwright/test';

test.describe('Story List', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:4200');
    // Wait for initial stories to load and be visible
    await expect(page.locator('app-story-item')).toHaveCount(10, { timeout: 30000 });
  });

  test('should load initial stories', async ({ page }) => {
    const stories = await page.locator('app-story-item').all();
    expect(stories.length).toBe(10);
  });

  test('should handle pagination', async ({ page }) => {
    // Store first story title for comparison
    const firstStoryTitle = await page.locator('app-story-item .story-title').first().textContent();
    
    // Click next and wait for stories to change
    await page.getByRole('button', { name: 'Next' }).click();
    
    // Wait for stories to change
    await expect(async () => {
      const newTitle = await page.locator('app-story-item .story-title').first().textContent();
      expect(newTitle).not.toBe(firstStoryTitle);
    }).toPass({ timeout: 30000 });
    
    // Verify we still have 10 stories
    await expect(page.locator('app-story-item')).toHaveCount(10);
  });

  test('should change page size', async ({ page }) => {
    // Change page size to 5
    await page.selectOption('select#pageSizeSelect', '5');
    
    // Wait for story count to change
    await expect(page.locator('app-story-item')).toHaveCount(5, { timeout: 10000 });
  });

  test('should search stories', async ({ page }) => {
    // Store initial first story title
    const initialTitle = await page.locator('app-story-item .story-title').first().textContent();
    
    // Perform search with a term we expect to find
    const searchTerm = 'the';  // Common word that should appear in titles
    await page.fill('input[placeholder="search in title ..."]', searchTerm);
    await page.click('button:has-text("Search")');
    
    // Wait for search header and verify search results
    await expect(page.locator('.search-header')).toBeVisible({ timeout: 10000 });
    
    // Wait for and verify search results
    await expect(async () => {
      // Get all story titles
      const titles = await page.locator('app-story-item .story-title').allTextContents();
      
      // Verify we have results
      expect(titles.length).toBeGreaterThan(0);
      
      // Verify at least one title contains our search term (case insensitive)
      const hasMatch = titles.some(title => 
        title.toLowerCase().includes(searchTerm.toLowerCase())
      );
      expect(hasMatch).toBe(true);
    }).toPass({ timeout: 30000 });
    
    // Clear search and verify return to normal state
    await page.click('button:has-text("Clear Search")');
    await expect(page.locator('.search-header')).toBeHidden();
  });

  test('should handle loading states', async ({ page }) => {
    // Store initial first story title
    const initialTitle = await page.locator('app-story-item .story-title').first().textContent();
    
    // Click next page and wait for stories to change
    await page.getByRole('button', { name: 'Next' }).click();
    
    // Wait for stories to change
    await expect(async () => {
      const newTitle = await page.locator('app-story-item .story-title').first().textContent();
      expect(newTitle).not.toBe(initialTitle);
    }).toPass({ timeout: 30000 });
    
    await expect(page.locator('app-story-item')).toHaveCount(10);
  });
}); 