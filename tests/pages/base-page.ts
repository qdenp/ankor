import { Page, Locator, expect } from '@playwright/test';
import { TIMEOUTS } from '../config';

/**
 * Базовый класс для всех Page Object.
 * Содержит общие методы для взаимодействия со страницами.
 */
export class BasePage {
  readonly page: Page;

  // Header / Profile elements
  readonly profileButton: Locator;
  readonly logoutMenuItem: Locator;

  // Page heading (for verifying page loaded)
  readonly pageHeading: Locator;

  // Sidebar navigation links
  readonly navOrganizations: Locator;
  readonly navAthletes: Locator;
  readonly navCoaches: Locator;
  readonly navParents: Locator;
  readonly navTeams: Locator;
  readonly navSkills: Locator;
  readonly navDrills: Locator;
  readonly navScorecards: Locator;
  readonly navEvaluations: Locator;
  readonly navEvaluationReports: Locator;
  readonly navEasyJoin: Locator;
  readonly navPlans: Locator;
  readonly navHome: Locator;

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

    // Sidebar navigation links (названия пунктов меню сверены с реальным меню owner/sysadmin 2026-11-12)
    this.navOrganizations = page.getByRole('link', { name: 'Organization Profile', exact: true });
    this.navAthletes = page.getByRole('link', { name: /athletes/i, exact: false });
    this.navCoaches = page.getByRole('link', { name: /coaches/i, exact: false });
    this.navParents = page.getByRole('link', { name: /parents/i, exact: false });
    this.navTeams = page.getByRole('link', { name: /teams/i, exact: false });
    this.navSkills = page.getByRole('link', { name: /skills/i, exact: false });
    this.navDrills = page.getByRole('link', { name: /drills/i, exact: false });
    // В меню «Score Cards Template» — с пробелом; /scorecard/i его не находил
    this.navScorecards = page.getByRole('link', { name: 'Score Cards Template', exact: true });
    this.navEvaluations = page.getByRole('link', { name: /evaluations/i, exact: false });
    this.navEvaluationReports = page.getByRole('link', { name: 'Evaluation Reports' });
    this.navEasyJoin = page.getByRole('link', { name: /easy.*join/i, exact: false });
    this.navPlans = page.getByRole('link', { name: /Plans/i, exact: false });
    // Home есть в меню у любого авторизованного пользователя — признак, что сессия рабочая
    this.navHome = page.getByRole('link', { name: 'Home', exact: true });
  }

  /** Переход на корневую страницу приложения */
  async goto(path: string = ''): Promise<void> {
    await this.page.goto(path);
    await this.waitForLoading();
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
   * Ожидание завершения загрузки данных — вызывать после КАЖДОГО перехода на страницу
   * и после КАЖДОГО создания / редактирования / удаления (приложение возвращает на страницу
   * с данными, и она грузится заново). Спиннеры есть на всех страницах, кроме входа и регистрации.
   *
   * 1. Спиннер появляется через ~150–215 мс после клика (замер 2026-11-12). Если сразу проверить
   *    «спиннеров 0», проверка пройдёт ДО его появления и тест прочитает пустую таблицу.
   *    Поэтому сначала коротко ждём появления (TIMEOUTS.spinnerAppear).
   *    Не появился — данные уже на странице (например, вкладка с закэшированными данными):
   *    это ожидаемая ситуация, а не ошибка, поэтому таймаут этого шага намеренно не роняет тест.
   * 2. Ждём исчезновения ВСЕХ спиннеров (глобальных и локальных блоков вроде "Loading team snapshot").
   *    Этот шаг — обычный ассерт: зависший спиннер роняет тест.
   */
  async waitForLoading(): Promise<void> {
    const loadingSpinners = this.page.locator('.MuiCircularProgress-root');
    await loadingSpinners.first()
      .waitFor({ state: 'attached', timeout: TIMEOUTS.spinnerAppear })
      .then(() => undefined, () => undefined);
    await expect(loadingSpinners).toHaveCount(0);
  }

  /** Переход по пункту бокового меню с ожиданием загрузки данных */
  private async navigate(link: Locator): Promise<void> {
    await link.click();
    await this.waitForLoading();
  }

  // Sidebar navigation methods
  async goToOrganizations(): Promise<void> { await this.navigate(this.navOrganizations); }
  async goToAthletes(): Promise<void> { await this.navigate(this.navAthletes); }
  async goToCoaches(): Promise<void> { await this.navigate(this.navCoaches); }
  async goToParents(): Promise<void> { await this.navigate(this.navParents); }
  async goToTeams(): Promise<void> { await this.navigate(this.navTeams); }
  async goToSkills(): Promise<void> { await this.navigate(this.navSkills); }
  async goToDrills(): Promise<void> { await this.navigate(this.navDrills); }
  async goToScorecards(): Promise<void> { await this.navigate(this.navScorecards); }
  async goToEvaluations(): Promise<void> { await this.navigate(this.navEvaluations); }
  async goToEvaluationReports(): Promise<void> { await this.navigate(this.navEvaluationReports); }
  async goToEasyJoin(): Promise<void> { await this.navigate(this.navEasyJoin); }
}
