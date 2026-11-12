import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base-page';
import { TIMEOUTS } from '../config';

/**
 * Page Object для страницы Teams.
 * Навигация через левое меню (Teams).
 * Поддерживает: Create, Read.
 */
export class TeamPage extends BasePage {
  readonly heading: Locator;
  readonly newTeamButton: Locator;
  readonly searchInput: Locator;

  // Form fields
  readonly nameInput: Locator;
  readonly sportSelect: Locator;
  readonly activeToggle: Locator;
  readonly createButton: Locator;

  // Sidebar link
  readonly sidebarLink: Locator;

  // Dialog elements
  readonly newTeamHeading: Locator;

  // Table rows
  readonly teamRows: Locator;

  constructor(page: Page) {
    super(page);

    this.heading = page.getByRole('heading', { name: 'Teams', level: 3 });
    this.newTeamButton = page.getByRole('button', { name: /New team|New Team/i }).first();
    this.searchInput = page.getByRole('textbox', { name: /search/i });

    // Form fields
    this.nameInput = page.getByRole('textbox', { name: 'Team name' });
    this.sportSelect = page.getByRole('combobox', { name: /sport/i });
    this.activeToggle = page.getByRole('switch', { name: /active team/i });
    this.createButton = page.getByRole('button', { name: 'Create' });

    // Sidebar link
    this.sidebarLink = page.getByRole('link', { name: /Teams/i, exact: false });

    // Dialog elements
    this.newTeamHeading = page.getByRole('heading', { name: /New Team/i });

    // Table rows
    this.teamRows = page.getByRole('row');
  }

  /** Переход на страницу Teams через левое меню */
  async goto(): Promise<void> {
    await this.sidebarLink.click();
    await expect(this.heading).toBeVisible({ timeout: TIMEOUTS.medium });
    await this.waitForLoading();
  }

  /** Нажатие кнопки New Team */
  async clickNewTeam(): Promise<void> {
    await this.newTeamButton.click();
    await expect(this.newTeamHeading).toBeVisible({ timeout: TIMEOUTS.medium });
  }

  /** Заполнение формы создания Team */
  async fillTeamForm(params: {
    name: string;
    active?: boolean;
  }): Promise<void> {
    await this.nameInput.fill(params.name);
    if (params.active !== undefined) {
      if (params.active) {
        await this.activeToggle.check();
      } else {
        await this.activeToggle.uncheck();
      }
    }
  }

  /** Создание Team */
  async createTeam(params: {
    name: string;
    sport?: string;
    active?: boolean;
  }): Promise<void> {
    await this.clickNewTeam();
    await this.fillTeamForm(params);
    await this.createButton.click();
    await expect(this.newTeamHeading).toBeHidden({ timeout: TIMEOUTS.long });
    // Ждём загрузки страницы списка после создания
    await this.waitForLoading();
  }

  /** Поиск по имени (клиентская фильтрация, Enter не нужен) */
  async search(text: string): Promise<void> {
    await this.searchInput.click();
    await this.searchInput.fill(text);
  }

  /** Получить локатор строки команды в таблице */
  getTeamRow(name: string): Locator {
    return this.teamRows.filter({ hasText: name }).first();
  }
}
