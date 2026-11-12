import { test, expect } from '@playwright/test';
import { SignInPage } from '../pages/sign-in-page';
import { ManageUsersPage } from '../pages/manage-users-page';
import { CREDENTIALS, TIMEOUTS } from '../config';

/**
 * Служебный тест (не проверка): разово деактивировать пользователей, накопленных тестами создания.
 * Пользователей на стенде удалить нельзя — только деактивировать; после этого они пропадают из списков
 * Parents / Coaches, а в Manage Users остаются с пометкой "(Deactivated)".
 *
 * Безопасность:
 * - только под owner: owner видит пользователей своей организации, чужие организации не затрагиваются;
 * - только email по шаблонам тестов создания (поиск на сервере по email). Основные пользователи ролей
 *   из .env (dtimokhin+parent@…, dtimokhin+coach@…) под шаблоны не подходят;
 * - уже деактивированные пропускаются — тест можно перезапускать.
 *
 * Запуск: npm run test:setup -- --grep "deactivate users created by tests"
 * Новые пользователи после этого не копятся: 06-coaches и 07-parents деактивируют своих в afterAll.
 */
const TEST_USER_EMAIL_PATTERNS = [
  'dtimokhin+parent1', // 71252 Create parent: dtimokhin+parent<Date.now()>@aexsoft.com
  'testcoach+', // 71990 Add coach (и старые версии теста): testcoach+<Date.now()>@aexsoft.com
];
/** Защита от бесконечного цикла, если деактивация перестанет срабатывать */
const MAX_DEACTIVATIONS_PER_PATTERN = 1000;

test.describe('Deactivate users created by tests', () => {
  test.describe.configure({ retries: 0 });

  test('should deactivate users created by tests', async ({ page }) => {
    // ~600 пользователей по 2–3 с — дольше обычного таймаута теста
    test.setTimeout(TIMEOUTS.long * 120);
    const signInPage = new SignInPage(page);
    const usersPage = new ManageUsersPage(page);

    await signInPage.goto();
    await signInPage.login(CREDENTIALS.owner.email, CREDENTIALS.owner.password);
    await expect(usersPage.navHome).toBeVisible({ timeout: TIMEOUTS.long });
    await usersPage.goto();

    for (const pattern of TEST_USER_EMAIL_PATTERNS) {
      await usersPage.search(pattern);
      let deactivated = 0;
      while (deactivated < MAX_DEACTIVATIONS_PER_PATTERN) {
        // Счётчик для управления циклом, не проверка: страница уже загружена (waitForLoading)
        if ((await usersPage.activeUserRows.count()) > 0) {
          await usersPage.deactivateRow(usersPage.activeUserRows.first());
          deactivated++;
          continue;
        }
        if (await usersPage.nextPageButton.isDisabled()) break;
        await usersPage.nextPageButton.click();
        await usersPage.waitForLoading();
      }
      test.info().annotations.push({ type: 'deactivated', description: `${pattern}: ${deactivated}` });
      console.log(`Deactivated ${deactivated} users matching "${pattern}"`);
    }
  });
});
