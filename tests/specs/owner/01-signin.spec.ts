import * as allure from 'allure-js-commons';
import { test, expect } from '../../fixtures';
import { SignInPage } from '../../pages/sign-in-page';
import { CREDENTIALS, TIMEOUTS } from '../../config';

/**
 * 01 — Тесты страницы входа (Sign In)
 */

// Браузер каждого теста и так чистый: storageState в конфиге не задан, а тесты ниже не вызывают loginAs.
test.describe('Sign In', () => {
  test('should login successfully with valid credentials', async ({ page }) => {
    await allure.allureId('70936');
    const credentials = CREDENTIALS.owner;
    const signInPage = new SignInPage(page);

    await signInPage.goto();
    await signInPage.login(credentials.email, credentials.password);

    // После успешного логина должны перенаправить на дашборд/организации
    await expect(page).not.toHaveURL(/sign-in/);
  });

  /** Неверный пароль: существующий email + неверный пароль → ошибка, вход не выполнен */
  test('should show error with wrong password for existing user', async ({ page }) => {
    await allure.allureId('70941');
    const signInPage = new SignInPage(page);
    await signInPage.goto();

    await signInPage.login(CREDENTIALS.owner.email, 'WrongPassword123!');

    await expect(signInPage.errorAlert).toHaveText('Invalid login credentials', { timeout: TIMEOUTS.long });
    await expect(page).toHaveURL(/sign-in/);
  });

  /**
   * Forgot password — пока проверяется только переход на страницу восстановления.
   * TODO(70943): не хватает шагов кейса — ввести email, отправить запрос, проверить сообщение
   * об отправке письма. Письмо (ссылка сброса) не проверяем — email-тесты пока пропускаем (AGENTS.md §12).
   */
  test('should navigate to forgot password', async ({ page }) => {
    await allure.allureId('70943');
    test.skip(true, 'TODO(70943): covers only navigation; request submission and confirmation are not checked yet');
    const signInPage = new SignInPage(page);
    await signInPage.goto();
    await signInPage.goToForgotPassword();

    // Проверяем, что перенаправило на страницу восстановления
    await expect(page).toHaveURL(/(forgot|reset|password)/i);
  });

  /**
   * Успешная регистрация организации Lacrosse — пока проверяется только переход на /org-signup.
   * TODO(70897): не хватает шагов кейса — заполнить форму организации (вид спорта Lacrosse) и данные
   * админа, завершить регистрацию, проверить вход в новую организацию. Каждая регистрация создаёт
   * организацию и пользователя, которых нельзя удалить, — нужен уникальный email на прогон.
   */
  test('should navigate to create organization', async ({ page }) => {
    await allure.allureId('70897');
    test.skip(true, 'TODO(70897): covers only navigation; the organization registration itself is not implemented yet');
    const signInPage = new SignInPage(page);
    await signInPage.goto();
    await signInPage.goToCreateOrg();

    // Проверяем, что перенаправило на страницу создания организации
    await expect(page).toHaveURL(/org-signup/i);
  });
});
