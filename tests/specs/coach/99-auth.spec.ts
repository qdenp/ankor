import { test, expect } from '../../fixtures';
import { TIMEOUTS } from '../../config';

/**
 * 99 — Auth tests for Coach role (login + logout).
 * Номер 99: logout отзывает сессию роли, поэтому файл обязан идти последним в серии роли (AGENTS.md §8).
 * Coach tests run sequentially within the role.
 */
test.describe('Coach Auth Tests', () => {
  test.describe.configure({ mode: 'serial' });

  test('should login as coach and see dashboard', async ({ page, loginAs }) => {
    await loginAs('coach');
    await expect(page).not.toHaveURL(/sign-in/, { timeout: TIMEOUTS.long });
  });

  test('should logout as coach', async ({ page, loginAs, logout }) => {
    await loginAs('coach');
    await logout();
    await expect(page).toHaveURL(/sign-in/, { timeout: TIMEOUTS.long });
  });
});
