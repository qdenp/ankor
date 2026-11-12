import { test, expect } from '@playwright/test';
import { SignInPage } from '../pages/sign-in-page';
import { ManageUsersPage } from '../pages/manage-users-page';
import { CREDENTIALS, EVALUATED_ATHLETE, TIMEOUTS } from '../config';

/**
 * Служебный тест (не проверка): разово деактивировать пользователей, накопленных тестами создания.
 * Пользователей на стенде удалить нельзя — только деактивировать; после этого они пропадают из списков
 * Parents / Coaches, а в Manage Users остаются с пометкой "(Deactivated)".
 *
 * Безопасность:
 * - только под owner: owner видит пользователей своей организации, чужие организации не затрагиваются;
 * - только email по шаблонам тестов создания (поиск на сервере по email). Все пользователи, которых создают
 *   тесты, получают email с маркером "+temp-<роль>-<Date.now()>" (AGENTS.md §10) — один шаблон на всех;
 *   старые шаблоны — для пользователей, созданных до маркера;
 * - PROTECTED_USERS — постоянные пользователи, на которых держатся тесты. Тест падает ДО деактивации, если
 *   кто-то из них подходит под шаблон, и проверяет ПОСЛЕ, что все они активны;
 * - уже деактивированные пропускаются — тест можно перезапускать.
 *
 * ⚠️ Новый тест создания пользователей — email с маркером "+temp-" (шаблон добавлять не нужно).
 *    Новый постоянный пользователь — добавить в PROTECTED_USERS.
 *
 * Запуск: npm run test:setup -- --grep "deactivate users created by tests"
 * Новые пользователи после этого не копятся: тесты создания деактивируют своих в afterAll.
 */
const TEST_USER_EMAIL_PATTERNS = [
  '+temp-', // все тесты создания: dtimokhin+temp-<роль>-<Date.now()>@aexsoft.com
  // Созданные до маркера +temp- (2026-11-12):
  'dtimokhin+parent1', // 71252 Create parent: dtimokhin+parent<Date.now()>@aexsoft.com
  'testcoach+', // 71990 Add coach (и старые версии теста): testcoach+<Date.now()>@aexsoft.com
];

/** Постоянные пользователи организации owner: никогда не деактивировать */
const PROTECTED_USERS: { email: string; why: string }[] = [
  { email: CREDENTIALS.owner.email, why: 'owner из .env' },
  { email: CREDENTIALS.coach.email, why: 'coach из .env' },
  { email: CREDENTIALS.parent.email, why: 'parent из .env' },
  { email: CREDENTIALS.athlete.email, why: 'athlete из .env (Athlete User)' },
  { email: EVALUATED_ATHLETE.email, why: 'Athlete Last — его оценивают тесты 12-evaluations' },
  { email: 'athlete-031126-01@m.re', why: 'создан вручную (Athlete031126-01 Last)' },
  { email: 'dtimokhin+ankorathlete03@aexsoft.com', why: 'создан вручную (Athlete03Multy, несколько организаций)' },
];

/** Защита от бесконечного цикла, если деактивация перестанет срабатывать */
const MAX_DEACTIVATIONS_PER_PATTERN = 1000;

test.describe('Deactivate users created by tests', () => {
  test.describe.configure({ retries: 0 });

  test('should deactivate users created by tests', async ({ page }) => {
    // ~600 пользователей по 2–3 с — дольше обычного таймаута теста
    test.setTimeout(TIMEOUTS.long * 120);

    // До деактивации: ни один постоянный пользователь не подходит под шаблон (поиск — подстрока email без учёта регистра)
    for (const user of PROTECTED_USERS) {
      for (const pattern of TEST_USER_EMAIL_PATTERNS) {
        expect(
          user.email.toLowerCase().includes(pattern.toLowerCase()),
          `Protected user ${user.email} (${user.why}) matches cleanup pattern "${pattern}" — fix the pattern`,
        ).toBe(false);
      }
    }

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

    // После: все постоянные пользователи активны
    for (const user of PROTECTED_USERS) {
      await usersPage.search(user.email);
      await expect(usersPage.activeUserRows, `Protected user ${user.email} (${user.why}) should stay active`).toHaveCount(1, {
        timeout: TIMEOUTS.long,
      });
    }
  });
});
