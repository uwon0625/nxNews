import { test, expect } from '@playwright/test';

test.describe('Story List', () => {
  test.beforeEach(async ({ page }) => {
    // Add retry logic for connection
    let retries = 3;
    while (retries > 0) {
      try {
        await page.goto('http://localhost:4200', {
          waitUntil: 'networkidle',
          timeout: 30000
        });
        break;
      } catch (error) {
        retries--;
        if (retries === 0) throw error;
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s before retry
      }
    }
  });

  test('should load initial stories', async ({ page }) => {
    // Wait for stories to load
    await page.waitForSelector('app-story-item');
    
    // Check if we have the correct number of stories
    const stories = await page.locator('app-story-item').all();
    expect(stories.length).toBe(10);
  });

  test('should handle pagination', async ({ page }) => {
    // Wait for initial load
    await page.waitForSelector('app-story-item');
    
    // Get initial first story title
    const firstStoryTitle = await page.locator('app-story-item').first().textContent();
    
    // Click next page
    await page.getByRole('button', { name: 'Next' }).click();
    
    // Wait for new stories to load
    await page.waitForTimeout(500);
    
    // Get new first story title
    const newFirstStoryTitle = await page.locator('app-story-item').first().textContent();
    
    // Verify it's different
    expect(newFirstStoryTitle).not.toBe(firstStoryTitle);
  });

  test('should change page size', async ({ page }) => {
    // Wait for initial load
    await page.waitForSelector('app-story-item');
    
    // Change page size to 5
    await page.selectOption('select#pageSizeSelect', '5');
    
    // Wait for update
    await page.waitForTimeout(500);
    
    // Check number of stories
    const stories = await page.locator('app-story-item').all();
    expect(stories.length).toBe(5);
  });

  test('should search stories', async ({ page }) => {
    // Wait for initial load
    await page.waitForSelector('app-story-item');
    
    // Perform search
    await page.fill('input[placeholder="Enter part of story title to search..."]', 'test');
    await page.click('button:has-text("Search")');
    
    // Wait for search results
    await page.waitForSelector('.search-header');
    
    // Verify search mode
    expect(await page.locator('.search-header').isVisible()).toBeTruthy();
    
    // Clear search
    await page.click('button:has-text("Clear Search")');
    
    // Verify back to normal mode
    expect(await page.locator('.search-header').isVisible()).toBeFalsy();
  });

  test('should handle loading states', async ({ page }) => {
    // Wait for initial load
    await page.waitForSelector('app-story-item', { timeout: 10000 });
    
    // Store initial stories for comparison
    const initialStories = await page.locator('app-story-item').all();
    const initialFirstStory = await page.locator('app-story-item').first().textContent();
    
    // Click next page to trigger loading
    await page.getByRole('button', { name: 'Next' }).click();
    
    // Wait for stories to change (indicates loading completed)
    await page.waitForFunction(
      ([initialText, initialLength]) => {
        const stories = document.querySelectorAll('app-story-item');
        const firstStory = stories[0]?.textContent;
        return stories.length === initialLength && firstStory !== initialText;
      },
      [initialFirstStory, initialStories.length],
      { timeout: 10000 }
    );
  });

  test('should handle search pagination', async ({ page }) => {
    // Wait for initial load
    await page.waitForSelector('app-story-item', { timeout: 10000 });
    
    // Perform search
    await page.fill('input[placeholder="Enter part of story title to search..."]', 'the');
    await page.click('button:has-text("Search")');
    
    // Wait for search results
    await page.waitForSelector('.search-header');
    
    // Wait for initial search results to load
    await page.waitForSelector('app-story-item', { timeout: 10000 });
    
    // Get initial count and content
    const initialStories = await page.locator('app-story-item').all();
    const initialCount = initialStories.length;
    const initialFirstStory = await page.locator('app-story-item').first().textContent();
    
    // Click next page if available
    const nextButton = page.getByRole('button', { name: 'Next' });
    if (await nextButton.isEnabled()) {
      await nextButton.click();
      
      // Wait for stories to change or count to change
      await page.waitForFunction(
        ([initialText, initialLength]) => {
          const stories = document.querySelectorAll('app-story-item');
          const firstStory = stories[0]?.textContent;
          return stories.length !== initialLength || firstStory !== initialText;
        },
        [initialFirstStory, initialCount],
        { timeout: 10000 }
      );
      
      // Get new count
      const newStories = await page.locator('app-story-item').all();
      expect(newStories.length).toBeLessThanOrEqual(initialCount);
    }
  });
}); 