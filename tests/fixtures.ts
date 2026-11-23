import { test as base, expect, Browser } from '@playwright/test';
import { CREDENTIALS, SUPABASE, TIMEOUTS } from './config';
import { SignInPage } from './pages/sign-in-page';
import { BasePage } from './pages/base-page';

type Role = keyof typeof CREDENTIALS;

/**
 * Расширенная фикстура для авторизованной сессии.
 */
export interface AuthFixture {
  /** Страница входа */
  signInPage: SignInPage;
  /** Метод авторизации под определённой ролью */
  loginAs: (role: Role) => Promise<void>;
  /** Метод выхода */
  logout: () => Promise<void>;
}

/** Сессия Supabase — ответ /auth/v1/token; приложение хранит её в localStorage как есть */
interface SupabaseSession {
  /** Срок действия access-токена, секунды Unix */
  expires_at: number;
}

/**
 * Сессии ролей в памяти воркера: один вход по API на роль, дальше тесты роли берут готовую.
 * Вход на каждый тест упёрся бы в лимит Supabase на /auth/v1/token (150 за 5 мин с IP, всплеск 30),
 * когда все роли идут параллельно с короткими тестами. В памяти, а не на диске: отозванная
 * или чужая сессия не переживает прогон.
 */
const sessions = new Map<Role, SupabaseSession>();

/**
 * Сессию, которой осталось жить меньше, заменяем новой: тест не должен застать истечение токена.
 * Порог должен быть больше запаса автообновления supabase-js (~90 с): приложение обновляет токен
 * и меняет refresh token только у почти истёкшей сессии — такую фикстура уже не раздаёт, иначе
 * Supabase принял бы старый refresh token за повторное использование и отозвал бы сессию.
 */
const MIN_SESSION_LIFETIME_MS = 5 * 60_000;

/** Роль, которая сейчас залогинена: logout выбрасывает её сессию */
let currentRole: Role | null = null;

/**
 * Вход по API — тот же запрос, что делает форма входа (supabase-js signInWithPassword).
 * Node fetch, а не page.request: тело запроса с паролем не попадает в трейс теста.
 */
async function getSession(role: Role): Promise<SupabaseSession> {
  const cached = sessions.get(role);
  if (cached && cached.expires_at * 1000 - Date.now() > MIN_SESSION_LIFETIME_MS) return cached;

  const { email, password } = CREDENTIALS[role];
  const response = await fetch(`${SUPABASE.url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: SUPABASE.anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    // В сообщении только ответ Supabase (код и текст ошибки), без учётных данных
    throw new Error(`API login as ${role} failed: HTTP ${response.status} ${await response.text()}`);
  }
  const session = (await response.json()) as SupabaseSession;
  sessions.set(role, session);
  return session;
}

/**
 * Базовая фикстура для всех тестов Ankor.
 *
 * loginAs(role): сессия роли из памяти воркера (или вход по API) кладётся в localStorage
 * до первой загрузки приложения — оно сразу стартует авторизованным, без формы входа.
 * Форму входа проверяют только 01-signin и вход другого пользователя в отдельном контексте.
 *
 * Тесты sign-in/sign-up начинают с чистого браузера (новый контекст на тест, storageState в конфиге
 * не задан); loginAs там — только если предусловие кейса — активная сессия (70937).
 */
export const test = base.extend<AuthFixture, { browser: Browser }>({
  browser: async ({ browser }, use) => {
    await use(browser);
  },

  signInPage: async ({ page }, use) => {
    const signInPage = new SignInPage(page);
    await use(signInPage);
  },

  loginAs: async ({ page }, use) => {
    await use(async (role: Role) => {
      currentRole = role;
      const session = await getSession(role);

      // Только при первой загрузке во вкладке (метка в sessionStorage): дальше сессией владеет
      // приложение — обновляет токен, а после logout удаляет его, и скрипт не должен вернуть
      // отозванную сессию при следующем переходе.
      await page.addInitScript(({ key, value }) => {
        if (sessionStorage.getItem('e2e-session-seeded')) return;
        sessionStorage.setItem('e2e-session-seeded', '1');
        localStorage.setItem(key, value);
      }, { key: SUPABASE.storageKey, value: JSON.stringify(session) });

      await page.goto('/');
      await expect(new BasePage(page).navHome).toBeVisible({ timeout: TIMEOUTS.long });
    });
  },

  logout: async ({ page }, use) => {
    await use(async () => {
      await new BasePage(page).logout();

      // Logout отзывает на сервере все сессии пользователя, в том числе ту, что в памяти:
      // следующий loginAs этой роли войдёт по API заново.
      if (currentRole) sessions.delete(currentRole);
      currentRole = null;
    });
  },
});

export { expect } from '@playwright/test';
