import { test, expect } from '../../fixtures';
import { TIMEOUTS } from '../../config';

/**
 * 01a — Auth tests for Owner role.
 * Owner tests run sequentially within the role.
 */
test.describe('Owner Auth Tests', () => {
  test.describe.configure({ mode: 'serial' });

  test('should login as owner and see dashboard', async ({ page, loginAs }) => {
    await loginAs('owner');
    await expect(page).not.toHaveURL(/sign-in/, { timeout: TIMEOUTS.long });
  });

  test('should logout as owner', async ({ page, loginAs, logout }) => {
    await loginAs('owner');
    await logout();
    await expect(page).toHaveURL(/sign-in/, { timeout: TIMEOUTS.long });
  });
});
