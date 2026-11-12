import { expect, type Browser } from '@playwright/test';
import { SignInPage } from '../pages/sign-in-page';
import { ManageUsersPage } from '../pages/manage-users-page';
import { CREDENTIALS, TIMEOUTS } from '../config';

/**
 * Деактивировать пользователя, созданного тестом (удалить пользователя на стенде нельзя), чтобы тестовые
 * пользователи не копились в списках Parents / Coaches. Для afterAll тестов создания (REVIEW-PLAN 3.11).
 *
 * Под owner — он видит только свою организацию — и в отдельном контексте браузера: сессии роли не трогаются.
 * baseURL в afterAll недоступен как фикстура — передавать testInfo.project.use.baseURL.
 */
export async function deactivateCreatedUser(browser: Browser, baseURL: string | undefined, email: string): Promise<void> {
  const context = await browser.newContext({ baseURL });
  try {
    const tab = await context.newPage();
    const signInPage = new SignInPage(tab);
    const usersPage = new ManageUsersPage(tab);
    await signInPage.goto();
    await signInPage.login(CREDENTIALS.owner.email, CREDENTIALS.owner.password);
    await expect(usersPage.navHome, 'Owner should be logged in').toBeVisible({ timeout: TIMEOUTS.long });
    await usersPage.goto();
    await usersPage.deactivateUserByEmail(email);
  } finally {
    await context.close();
  }
}
