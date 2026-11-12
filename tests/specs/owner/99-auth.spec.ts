import { test, expect } from '../../fixtures';
import { TIMEOUTS } from '../../config';

/**
 * 99 — Выход из приложения (logout). Кнопка выхода одна для всех ролей — проверяется только у owner.
 * Вход отдельно не проверяется: его проходит каждый тест через loginAs, а вход через форму — 01-signin (70936).
 * Номер 99: logout отзывает сессию роли, поэтому файл обязан идти последним в серии owner (AGENTS.md §8).
 */
test.describe('Owner Auth Tests', () => {
  test.describe.configure({ mode: 'serial' });

  test('should logout as owner', async ({ page, loginAs, logout }) => {
    await loginAs('owner');
    await logout();
    await expect(page).toHaveURL(/sign-in/, { timeout: TIMEOUTS.long });
  });
});
