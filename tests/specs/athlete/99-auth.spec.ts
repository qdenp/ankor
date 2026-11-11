import { test, expect } from '../../fixtures';
import { TIMEOUTS } from '../../config';

/**
 * 99 — Auth tests for Athlete role (login + logout).
 * Номер 99: logout отзывает сессию роли, поэтому файл обязан идти последним в серии роли (AGENTS.md §8).
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
