import { test, expect } from '../../fixtures';
import { TIMEOUTS } from '../../config';

/**
 * 01a — Auth tests for Parent role.
 * Parent tests run sequentially within the role.
 */
test.describe('Parent Auth Tests', () => {
  test.describe.configure({ mode: 'serial' });

  test('should login as parent and see dashboard', async ({ page, loginAs }) => {
    await loginAs('parent');
    await expect(page).not.toHaveURL(/sign-in/, { timeout: TIMEOUTS.long });
  });

  test('should logout as parent', async ({ page, loginAs, logout }) => {
    await loginAs('parent');
    await logout();
    await expect(page).toHaveURL(/sign-in/, { timeout: TIMEOUTS.long });
  });
});
