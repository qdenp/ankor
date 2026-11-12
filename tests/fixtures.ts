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
 * Supabase хранит в localStorage JSON-объект сессии ({"access_token":"<JWT>", ...});
 * на случай другого формата поддерживается и «голый» JWT.
 * Битый или нечитаемый кэш — не ошибка теста, а повод для UI-логина, поэтому здесь catch → false.
 */
function isTokenValid(storagePath: string): boolean {
  if (!fs.existsSync(storagePath)) return false;
  try {
    const state = JSON.parse(fs.readFileSync(storagePath, 'utf-8'));
    const entries: Array<{ name: string; value: string }> = state.origins?.[0]?.localStorage ?? [];
    const token = entries.find((e) => e.name.includes('auth-token'));
    if (!token) return false;
    const jwt = token.value.trim().startsWith('{') ? JSON.parse(token.value).access_token : token.value;
    const payload = JSON.parse(atob(jwt.split('.')[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

/**
 * Восстановить сессию из storageState в уже существующий контекст страницы.
 * Открывает origin приложения, восстанавливает cookies и localStorage,
 * затем заново открывает / чтобы приложение подхватило авторизацию.
 */
async function restoreAuthFromCache(page: Page, storagePath: string): Promise<void> {
  const state = JSON.parse(fs.readFileSync(storagePath, 'utf-8'));

  // Открываем origin приложения, чтобы cookies/localStorage применялись к правильному домену
  await page.goto('/');

  // Восстанавливаем cookies
  if (state.cookies) {
    await page.context().addCookies(state.cookies);
  }

  // Восстанавливаем localStorage только для текущего origin
  const currentOrigin = new URL(page.url()).origin;
  for (const origin of state.origins || []) {
    if (origin.origin !== currentOrigin) continue;
    for (const item of origin.localStorage || []) {
      await page.evaluate(({ name, value }) => {
        localStorage.setItem(name, value);
      }, item);
    }
  }

  // Перезагружаем чтобы приложение подхватило состояние авторизации.
  // Именно goto('/'), а не reload(): к этому моменту приложение уже увело пустой браузер
  // на /sign-in, и reload рендерит страницу входа, которая мелькает перед переходом на /
  // и сбивает проверку в loginAs.
  await page.goto('/');
}

/**
 * Базовая фикстура для всех тестов Ankor.
 *
 * loginAs использует per-role storageState:
 * - Кэш: tests/.auth/{role}.json (owner, sysadmin, coach, parent, athlete)
 * - Каждый role имеет свой кэш-файл
 * - Если кэш валиден — восстанавливает сессию из storageState в текущий контекст
 * - Если кэш невалиден (logout отозвал сессию или токен истёк) — UI-логин + обновление кэша
 *
 * Тесты sign-in/sign-up не вызывают loginAs: браузер каждого теста и так чистый
 * (новый контекст на тест, storageState в конфиге не задан).
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
        // Приложению нужно ~3–4 с, чтобы решить судьбу сессии: показать меню
        // или (если токен отозван на сервере) уйти на /sign-in. Проверка URL
        // сразу после reload срабатывает раньше и принимает отозванную сессию за рабочую.
        const homeLink = new BasePage(page).navHome;
        await expect(homeLink.or(signInPage.welcomeHeading)).toBeVisible({ timeout: TIMEOUTS.long });
        if (await homeLink.isVisible()) {
          return; // Сессия восстановлена
        }
        // Токен отозван — кэш недействителен, делаем UI-логин.
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
      await expect(new BasePage(page).navHome).toBeVisible({ timeout: TIMEOUTS.long });

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
      // Сессия отозвана на сервере, кэш этой роли больше не валиден.
      // Кэши других ролей не трогаем — они живут на своих воркерах.
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
