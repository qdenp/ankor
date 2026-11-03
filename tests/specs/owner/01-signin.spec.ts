import { test, expect } from '../../fixtures';
import { SignInPage } from '../../pages/sign-in-page';
import { CREDENTIALS, PAGES, TIMEOUTS } from '../../config';

/**
 * 01 — Тесты авторизации (Sign In / Sign Up)
 */

test.describe('Sign In', () => {
  // Сброс storageState — тесты sign-in требуют чистый браузер
  test.use({ storageState: undefined });

  test('should display sign in page', async ({ page }) => {
    const signInPage = new SignInPage(page);
    await signInPage.goto();

    await expect(signInPage.welcomeHeading).toBeVisible();
    await expect(signInPage.emailInput).toBeVisible();
    await expect(signInPage.passwordInput).toBeVisible();
    await expect(signInPage.signInButton).toBeVisible();
    await expect(signInPage.joinOrgLink).toBeVisible();
  });

  test('should show validation when submitting empty form', async ({ page }) => {
    const signInPage = new SignInPage(page);
    await signInPage.goto();
    await signInPage.submitEmptyForm();

    // Ожидаем валидацию — страница остаётся на sign-in
    await expect(page).toHaveURL(/sign-in/);
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    const credentials = CREDENTIALS.owner;
    const signInPage = new SignInPage(page);

    await signInPage.goto();
    await signInPage.login(credentials.email, credentials.password);

    // После успешного логина должны перенаправить на дашборд/организации
    await expect(page).not.toHaveURL(/sign-in/);
  });

  test('should show error with invalid credentials', async ({ page }) => {
    const signInPage = new SignInPage(page);
    await signInPage.goto();

    await signInPage.fillEmail('invalid@example.com');
    await signInPage.fillPassword('wrongpassword');
    await signInPage.submit();

    // Ожидаем, что останемся на странице логина (или появится ошибка)
    await expect(page).toHaveURL(/sign-in/, { timeout: TIMEOUTS.long });
  });

  test('should navigate to sign up page', async ({ page }) => {
    const signInPage = new SignInPage(page);
    await signInPage.goto();
    await signInPage.goToSignUp();

    await expect(page).toHaveURL(/sign-up/);
  });

  test('should navigate to forgot password', async ({ page }) => {
    const signInPage = new SignInPage(page);
    await signInPage.goto();
    await signInPage.goToForgotPassword();

    // Проверяем, что перенаправило на страницу восстановления
    await expect(page).toHaveURL(/(forgot|reset|password)/i, { timeout: TIMEOUTS.medium });
  });

  test('should navigate to create organization', async ({ page }) => {
    const signInPage = new SignInPage(page);
    await signInPage.goto();
    await signInPage.goToCreateOrg();

    // Проверяем, что перенаправило на страницу создания организации
    await expect(page).toHaveURL(/org-signup/i, { timeout: TIMEOUTS.medium });
  });
});

test.describe('Sign Up', () => {
  test.use({ storageState: undefined });

  test('should display sign up page', async ({ page }) => {
    const signInPage = new SignInPage(page);
    await signInPage.goto();
    await signInPage.goToSignUp();

    await expect(page).toHaveURL(/sign-up/);
  });
});
