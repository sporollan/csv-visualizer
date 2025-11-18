import { test, expect } from '@playwright/test';

test.describe('Chart Application', () => {
  test('should load file and generate chart', async ({ page }) => {
    await page.goto('http://localhost:3000'); // Adjust URL
    
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('#loadFile');
    const fileChooser = await fileChooserPromise;
    
    await fileChooser.setFiles({
      name: 'test.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(`Time,Voltage,Current\n00:00,12.5,1.2\n00:01,12.6,1.3`)
    });

    await expect(page.locator('#loaded-files')).toContainText('test.csv');
    
    await expect(page.locator('#xAxis')).toHaveValue('Time');
    
    await page.click('#plotChart');
    
    await expect(page.locator('#chartContainer canvas')).toBeVisible();
  });

  test('should handle multiple Y axes', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    await page.selectOption('#yAxis1', 'Voltage');
    await page.selectOption('#yAxis2', 'Current');
    
    await page.click('#plotChart');
    
    await expect(page.locator('#chartContainer canvas')).toBeVisible();
  });
});