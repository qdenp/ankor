import { test, expect } from '../../fixtures';
import { TIMEOUTS } from '../../config';

/**
 * 99 — Auth tests for Owner role (login + logout).
 * Номер 99: logout отзывает сессию роли, поэтому файл обязан идти последним в серии роли (AGENTS.md §8).
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
