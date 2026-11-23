import * as allure from 'allure-js-commons';
import { test, expect } from '../../fixtures';
import { SignInPage } from '../../pages/sign-in-page';
import { HomePage } from '../../pages/home-page';
import { CREDENTIALS, PAGES, TIMEOUTS } from '../../config';

/**
 * 01 — Тесты страницы входа (Sign In)
 */

// Браузер каждого теста и так чистый: storageState в конфиге не задан; loginAs вызывает только тест 70937,
// которому нужна активная сессия.
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
   * Пустые поля: ошибка под пустым Email, затем под пустым Password.
   * Приложение показывает «Invalid email» и «String must contain at least 1 character(s)» вместо
   * текстов кейса — тест ожидаемо падает (test.fail), пока не исправят
   * https://github.com/coachklipstein-ui/ankor-training-fe/issues/315; после исправления Playwright
   * сообщит о неожиданном PASS — тогда убрать test.fail.
   * Пока дефект есть, тест падает на тексте под Email, и половина про Password не выполняется.
   * Ошибка привязана к полю через aria-describedby — проверяем описание самого поля.
   */
  test('should show required errors for empty email and empty password', async ({ page }) => {
    await allure.allureId('70939');
    test.fail(true, 'Required-field texts differ from the case until ankor-training-fe#315 is fixed');
    const signInPage = new SignInPage(page);
    await signInPage.goto();

    await signInPage.login('', 'Password123!');
    await expect(signInPage.emailInput).toHaveAttribute('aria-invalid', 'true');
    await expect(signInPage.emailInput).toHaveAccessibleDescription('Email is required.');

    await signInPage.login('user@example.com', '');
    await expect(signInPage.passwordInput).toHaveAttribute('aria-invalid', 'true');
    await expect(signInPage.passwordInput).toHaveAccessibleDescription('Password is required.');
  });

  /**
   * Невалидный формат email: форма не отправляется. Запрос входа уходит сразу по клику,
   * поэтому к появлению ошибки под полем он был бы уже посчитан.
   */
  test('should block sign in with invalid email format', async ({ page }) => {
    await allure.allureId('70940');
    const signInPage = new SignInPage(page);
    await signInPage.goto();

    await signInPage.login('user@', 'Password123!');

    await expect(signInPage.emailInput).toHaveAttribute('aria-invalid', 'true');
    await expect(signInPage.emailInput).toHaveAccessibleDescription('Invalid email');
    expect(signInPage.authRequestCount, 'Sign in request should not be sent').toBe(0);
  });

  /** Несуществующий email → та же ошибка, что и при неверном пароле; вход не выполнен */
  test('should show error for non-existent email', async ({ page }) => {
    await allure.allureId('70942');
    const signInPage = new SignInPage(page);
    await signInPage.goto();

    await signInPage.login(`nonexistent-${Date.now()}@aexsoft.com`, 'Password123!');

    await expect(signInPage.errorAlert).toHaveText('Invalid login credentials', { timeout: TIMEOUTS.long });
    await expect(page).toHaveURL(/sign-in/);
  });

  /** Защищённая страница без сессии → Sign In; после входа — Home (а не запрошенная страница) */
  test('should redirect unauthenticated user to sign in and then to home', async ({ page }) => {
    await allure.allureId('70938');
    const signInPage = new SignInPage(page);
    const homePage = new HomePage(page);

    await page.goto(PAGES.athletes);
    await expect(page, 'Protected page should redirect to sign in').toHaveURL(/sign-in/);
    await expect(signInPage.welcomeHeading).toBeVisible();

    await signInPage.login(CREDENTIALS.owner.email, CREDENTIALS.owner.password);

    await expect(homePage.welcomeHeading).toBeVisible({ timeout: TIMEOUTS.long });
    await expect(page).toHaveURL(PAGES.home);
  });

  /**
   * Уже авторизованный пользователь на /sign-in → Home, формы входа нет.
   * loginAs здесь нужен: предусловие кейса — активная сессия (logout нет, сессию не отзывает).
   */
  test('should redirect authenticated user from sign in to home', async ({ page, loginAs }) => {
    await allure.allureId('70937');
    const signInPage = new SignInPage(page);
    const homePage = new HomePage(page);
    await loginAs('owner');

    await page.goto(PAGES.signIn);

    await expect(page).toHaveURL(PAGES.home, { timeout: TIMEOUTS.long });
    await expect(homePage.welcomeHeading).toBeVisible();
    await expect(signInPage.emailInput).toBeHidden();
  });

  /**
   * Forgot password — пока проверяется только переход на страницу восстановления.
   * TODO(70943): не хватает шагов кейса — ввести email, отправить запрос, проверить сообщение
   * об отправке письма. Письмо (ссылка сброса) не проверяем — email-тесты пока пропускаем (AGENTS.md §10).
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
