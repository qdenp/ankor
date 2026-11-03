import { test as base, expect, Browser, Page } from '@playwright/test';
import { CREDENTIALS, TIMEOUTS } from './config';
import { SignInPage } from './pages/sign-in-page';
import { BasePage } from './pages/base-page';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Расширенная фикстура для авторизованной сессии.
 */
export interface AuthFixture {
  /** Страница входа */
  signInPage: SignInPage;
  /** Метод авторизации под определённой ролью */
  loginAs: (role: keyof typeof CREDENTIALS) => Promise<void>;
  /** Метод выхода */
  logout: () => Promise<void>;
}

/**
 * Проверить что JWT токен в storageState ещё валиден.
 */
function isTokenValid(storagePath: string): boolean {
  if (!fs.existsSync(storagePath)) return false;
  try {
    const state = JSON.parse(fs.readFileSync(storagePath, 'utf-8'));
    const token = state.origins?.[0]?.localStorage?.find(e => e.name.includes('auth-token'));
    if (!token) return false;
    const payload = JSON.parse(atob(token.value.split('.')[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

/**
 * Восстановить сессию из storageState в уже существующий контекст страницы.
 * Навигирует на origen приложения, восстанавливает cookies и localStorage,
 * затем перезагружает страницу чтобы приложение подхватило авторизацию.
 */
async function restoreAuthFromCache(page: Page, storagePath: string): Promise<void> {
  const state = JSON.parse(fs.readFileSync(storagePath, 'utf-8'));

  // Навигируем на origen приложения, чтобы cookies/localStorage применялись к правильному домену
  await page.goto('/');

  // Восстанавливаем cookies
  if (state.cookies) {
    await page.context().addCookies(state.cookies);
  }

  // Восстанавливаем localStorage только для текущего origen
  const currentOrigin = new URL(page.url()).origin;
  for (const origin of state.origins || []) {
    if (origin.origin !== currentOrigin) continue;
    for (const item of origin.localStorage || []) {
      await page.evaluate(({ name, value }) => {
        localStorage.setItem(name, value);
      }, item);
    }
  }

  // Перезагружаем чтобы приложение подхватило состояние авторизации
  await page.reload();
}

/**
 * Базовая фикстура для всех тестов Ankor.
 *
 * loginAs использует per-role storageState:
 * - Кэш: tests/.auth/{role}.json (owner, sysadmin, coach, parent, athlete)
 * - Каждый role имеет свой кэш-файл
 * - Если кэш валиден — восстанавливает сессию из storageState в текущий контекст
 * - Если кэш невалиден (logout ревокал или токен истёк) — UI-логин + обновление кэша
 *
 * Тесты sign-in/sign-up используют test.use({ storageState: undefined })
 * для сброса кэша и чистого браузера.
 */

// Роль, которая в данный момент залогинена (нужно для корректной инвалидации кэша при logout)
let currentRole: keyof typeof CREDENTIALS | null = null;

export const test = base.extend<AuthFixture, { browser: Browser }>({
  browser: async ({ browser }, use) => {
    await use(browser);
  },

  signInPage: async ({ page }, use) => {
    const signInPage = new SignInPage(page);
    await use(signInPage);
  },

  loginAs: async ({ page, signInPage }, use) => {
    await use(async (role: keyof typeof CREDENTIALS) => {
      currentRole = role;
      const credentials = CREDENTIALS[role];
      const storagePath = path.resolve('tests/.auth', `${role}.json`);

      // Если кэш валиден — восстанавливаем сессию из storageState
      if (isTokenValid(storagePath)) {
        await restoreAuthFromCache(page, storagePath);
        if (!page.url().includes('/sign-in')) {
          return; // Сессия восстановлена успешно
        }
        // Токен ревокан на сервере — приложение редиректит на sign-in.
        // В этом случае кэш недействителен — делаем UI-логин.
      }

      // UI-логин: гарантируем, что мы на странице входа.
      // После logout старый токен может остаться в localStorage — тогда
      // signInPage.goto() редиректит на dashboard и поле email не найдётся.
      await signInPage.goto();
      if (!page.url().includes('/sign-in')) {
        // Редирект на dashboard — очищаем localStorage и куки, пробуем снова
        await page.evaluate(() => localStorage.clear());
        await page.context().clearCookies();
        await signInPage.goto();
      }
      await signInPage.login(credentials.email, credentials.password);
      await expect(page).not.toHaveURL(/sign-in/, { timeout: TIMEOUTS.long });

      // Обновляем кэш свежим состоянием
      const state = await page.context().storageState();
      fs.mkdirSync(path.dirname(storagePath), { recursive: true });
      fs.writeFileSync(storagePath, JSON.stringify(state));
    });
  },

  logout: async ({ page }, use) => {
    await use(async () => {
      const basePage = new BasePage(page);
      await basePage.logout();

      // Инвалидируем кэш только той роли, которая была залогинена.
      // Токен ревокан на сервере, кэш этой роли больше не валиден.
      // Кэши других ролей не трогаем — они живут на своих воркерех.
      if (currentRole) {
        const storagePath = path.resolve('tests/.auth', `${currentRole}.json`);
        if (fs.existsSync(storagePath)) {
          fs.unlinkSync(storagePath);
        }
        currentRole = null;
      }
    });
  },
});

export { expect } from '@playwright/test';
