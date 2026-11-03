import { Page, Locator, expect } from '@playwright/test';
import { TIMEOUTS } from '../config';

/**
 * Базовый класс для всех Page Object.
 * Содержит общие методы для взаимодействия со страницами.
 */
export class BasePage {
  readonly page: Page;

  // Header / Profile elements
  readonly profileButton: ReturnType<this['page']['getByRole']>;
  readonly logoutMenuItem: ReturnType<this['page']['getByRole']>;

  constructor(page: Page) {
    this.page = page;

    // Profile button - avatar/menu trigger in top bar
    // Try accessible name first, then icon/avatar button anywhere on page
    this.profileButton = page
      .getByRole('button', { name: /profile|user|account|username/i })
      .or(page.locator('[role="button"]:has(svg)'))
      .or(page.locator('[role="button"]:has(img)'))
      .or(page.locator('[role="button"]:has(.MuiAvatar-root)'))
      .first();

    // Logout menu item — accessible name is "Log Out" from the <h6> inside <li role="menuitem">
    this.logoutMenuItem = page.getByRole('menuitem', { name: /log out/i });
  }

  /** Переход на корневую страницу приложения */
  async goto(path: string = ''): Promise<void> {
    await this.page.goto(path);
  }

  /** Текущий URL страницы */
  async getUrl(): Promise<string> {
    return this.page.url();
  }

  /** Текущий путь страницы */
  async getPathname(): Promise<string> {
    return new URL(this.page.url()).pathname;
  }

  /** Ожидание загрузки страницы */
  async waitForLoadState(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  /** Обновление страницы */
  async reload(): Promise<void> {
    await this.page.reload({ waitUntil: 'networkidle' });
  }

  /** Выбор элемента в выпадающем списке */
  async selectOption(label: string, container?: Locator): Promise<void> {
    if (container) {
      await container.getByRole('option', { name: label }).click();
    } else {
      await this.page.getByRole('option', { name: label }).click();
    }
  }

  /** Ожидание появления элемента */
  async waitForElement(locator: Locator, timeout?: number): Promise<void> {
    await locator.waitFor({ timeout, state: 'visible' });
  }

  /** Ожидание исчезновения элемента */
  async waitForElementGone(locator: Locator, timeout?: number): Promise<void> {
    await locator.waitFor({ timeout, state: 'hidden' });
  }

  /** Получение текста элемента */
  async getText(locator: Locator): Promise<string> {
    return locator.textContent() ?? '';
  }

  /** Нажатие на элемент */
  async click(locator: Locator): Promise<void> {
    await locator.click();
  }

  /** Получение количества элементов */
  async getCount(locator: Locator): Promise<number> {
    return locator.count();
  }

  /** Клик по профилю в хедере и ожидание меню */
  async openProfileMenu(): Promise<void> {
    await this.profileButton.waitFor({ state: 'visible', timeout: TIMEOUTS.medium });
    await this.profileButton.click({ timeout: TIMEOUTS.medium });
    
    // Wait for dropdown menu
    await expect(this.logoutMenuItem).toBeVisible({ timeout: TIMEOUTS.medium });
  }

  /** Выход из системы */
  async logout(): Promise<void> {
    await this.openProfileMenu();
    await this.logoutMenuItem.click();
    await expect(this.page).toHaveURL(/sign-in/, { timeout: TIMEOUTS.long });
  }
}
