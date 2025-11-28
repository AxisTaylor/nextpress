import { test, expect } from '@playwright/test';

test.describe('Debug wc-settings Script', () => {
  test('should load and transform wc-settings correctly', async ({ page }) => {
    const consoleMessages: string[] = [];
    const scriptErrors: string[] = [];

    page.on('console', msg => {
      const text = msg.text();
      consoleMessages.push(`[${msg.type()}] ${text}`);
      // Log all console messages in real-time
      console.log(`[BROWSER ${msg.type()}]`, text);
    });

    page.on('pageerror', error => {
      scriptErrors.push(error.message);
      console.log('[BROWSER ERROR]', error.message);
    });

    // Go to cart page
    await page.goto('/cart');
    await page.waitForLoadState('networkidle');

    console.log('\n=== WC-SETTINGS DEBUG ===\n');

    // Check for script errors
    if (scriptErrors.length > 0) {
      console.log('Script Errors:');
      scriptErrors.forEach(err => console.log('  -', err));
    }

    // Check for wc-settings global
    const wcSettingsCheck = await page.evaluate(() => {
      return {
        hasWcSettings: typeof (window as any).wcSettings !== 'undefined',
        wcSettingsKeys: (window as any).wcSettings ? Object.keys((window as any).wcSettings) : [],
        storePages: (window as any).wcSettings?.storePages,
        homeUrl: (window as any).wcSettings?.homeUrl,
      };
    });

    console.log('wcSettings check:', JSON.stringify(wcSettingsCheck, null, 2));

    // Check for wc-settings script in DOM
    const wcSettingsScript = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script'));
      const wcSettingsScript = scripts.find(s => s.id.includes('wc-settings'));
      return {
        found: !!wcSettingsScript,
        id: wcSettingsScript?.id,
        fullContent: wcSettingsScript?.textContent,
      };
    });

    console.log('wc-settings script ID:', wcSettingsScript.id);
    console.log('wc-settings full content:\n', wcSettingsScript.fullContent);

    // Look for ALL console messages
    console.log('\nAll console messages:');
    consoleMessages.forEach(msg => console.log('  ', msg));

    expect(scriptErrors.length).toBe(0);
  });
});
