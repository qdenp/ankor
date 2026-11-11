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

  // Page heading (for verifying page loaded)
  readonly pageHeading: ReturnType<this['page']['locator']>;

  // Sidebar navigation links
  readonly navOrganizations: ReturnType<this['page']['getByRole']>;
  readonly navAthletes: ReturnType<this['page']['getByRole']>;
  readonly navCoaches: ReturnType<this['page']['getByRole']>;
  readonly navParents: ReturnType<this['page']['getByRole']>;
  readonly navTeams: ReturnType<this['page']['getByRole']>;
  readonly navSkills: ReturnType<this['page']['getByRole']>;
  readonly navDrills: ReturnType<this['page']['getByRole']>;
  readonly navScorecards: ReturnType<this['page']['getByRole']>;
  readonly navEvaluations: ReturnType<this['page']['getByRole']>;
  readonly navEvaluationReports: ReturnType<this['page']['getByRole']>;
  readonly navPracticePlans: ReturnType<this['page']['getByRole']>;
  readonly navEasyJoin: ReturnType<this['page']['getByRole']>;
  readonly navNotifications: ReturnType<this['page']['getByRole']>;
  readonly navPlans: ReturnType<this['page']['getByRole']>;
  readonly navHome: ReturnType<this['page']['getByRole']>;

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

    // Page heading (for verifying page loaded)
    this.pageHeading = page.locator('h1, h2, h3').first();

    // Sidebar navigation links
    this.navOrganizations = page.getByRole('link', { name: /organizations/i, exact: false });
    this.navAthletes = page.getByRole('link', { name: /athletes/i, exact: false });
    this.navCoaches = page.getByRole('link', { name: /coaches/i, exact: false });
    this.navParents = page.getByRole('link', { name: /parents/i, exact: false });
    this.navTeams = page.getByRole('link', { name: /teams/i, exact: false });
    this.navSkills = page.getByRole('link', { name: /skills/i, exact: false });
    this.navDrills = page.getByRole('link', { name: /drills/i, exact: false });
    this.navScorecards = page.getByRole('link', { name: /scorecard/i, exact: false });
    this.navEvaluations = page.getByRole('link', { name: /evaluations/i, exact: false });
    this.navEvaluationReports = page.getByRole('link', { name: 'Evaluation Reports' });
    this.navPracticePlans = page.getByRole('link', { name: /practice.*plan/i, exact: false });
    this.navEasyJoin = page.getByRole('link', { name: /easy.*join/i, exact: false });
    this.navNotifications = page.getByRole('link', { name: /notification/i, exact: false });
    this.navPlans = page.getByRole('link', { name: /Plans/i, exact: false });
    // Home есть в меню у любого авторизованного пользователя — признак, что сессия рабочая
    this.navHome = page.getByRole('link', { name: 'Home', exact: true });
  }

  /** Переход на корневую страницу приложения */
  async goto(path: string = ''): Promise<void> {
    await this.page.goto(path);
    await this.waitForLoading();
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
    await this.waitForLoading();
  }

  /** Обновление страницы */
  async reload(): Promise<void> {
    await this.page.reload();
    await this.waitForLoading();
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

  /**
    * Ожидание завершения загрузки данных.
    * Ждёт исчезновения ВСЕХ спиннеров загрузки (MUI CircularProgress).
    * Покрывает глобальные спиннеры (при навигации) и локальные
    * (асинхронные блоки типа "Loading team snapshot", "Loading today's workout" и т.д.).
    * НЕ появляется при поиске — данные уже в DOM.
    */
  async waitForLoading(): Promise<void> {
    const loadingSpinners = this.page.locator('.MuiCircularProgress-root');
    await expect(loadingSpinners).toHaveCount(0);
  }

  // Sidebar navigation methods
  async goToOrganizations(): Promise<void> { await this.navOrganizations.click(); }
  async goToAthletes(): Promise<void> { await this.navAthletes.click(); }
  async goToCoaches(): Promise<void> { await this.navCoaches.click(); }
  async goToParents(): Promise<void> { await this.navParents.click(); }
  async goToTeams(): Promise<void> { await this.navTeams.click(); }
  async goToSkills(): Promise<void> { await this.navSkills.click(); }
  async goToDrills(): Promise<void> { await this.navDrills.click(); }
  async goToScorecards(): Promise<void> { await this.navScorecards.click(); }
  async goToEvaluations(): Promise<void> { await this.navEvaluations.click(); }
  async goToEvaluationReports(): Promise<void> { await this.navEvaluationReports.click(); }
  async goToPracticePlans(): Promise<void> { await this.navPracticePlans.click(); }
  async goToEasyJoin(): Promise<void> { await this.navEasyJoin.click(); }
  async goToNotifications(): Promise<void> { await this.navNotifications.click(); }
}
