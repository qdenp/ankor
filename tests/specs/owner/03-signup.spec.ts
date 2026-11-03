import { test, expect } from '../../fixtures';
import { SignUpPage } from '../../pages/sign-up-page';

/**
 * 02 — Тесты регистрации (Sign Up)
 * Пока заглушка — тесты будут добавлены позже.
 */
test.describe.skip('Sign Up', () => {
  test('should display sign up page', async ({ page }) => {
    const signUpPage = new SignUpPage(page);
    await signUpPage.goto();
    await expect(page).toHaveURL(/sign-up/);
  });
});
