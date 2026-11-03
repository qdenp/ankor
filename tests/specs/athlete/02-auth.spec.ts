import { test, expect } from '../../fixtures';
import { TIMEOUTS } from '../../config';

/**
 * 01a — Auth tests for Athlete role.
 * Athlete tests run sequentially within the role.
 */
test.describe('Athlete Auth Tests', () => {
  test.describe.configure({ mode: 'serial' });

  test('should login as athlete and see dashboard', async ({ page, loginAs }) => {
    await loginAs('athlete');
    await expect(page).not.toHaveURL(/sign-in/, { timeout: TIMEOUTS.long });
  });

  test('should logout as athlete', async ({ page, loginAs, logout }) => {
    await loginAs('athlete');
    await logout();
    await expect(page).toHaveURL(/sign-in/, { timeout: TIMEOUTS.long });
  });
});
