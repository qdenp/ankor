import { test, expect } from '../../fixtures';
import { TIMEOUTS } from '../../config';

/**
 * 99 — Auth tests for Parent role (login + logout).
 * Номер 99: logout отзывает сессию роли, поэтому файл обязан идти последним в серии роли (AGENTS.md §8).
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
