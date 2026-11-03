import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base-page';
import { TIMEOUTS } from '../config';

/**
 * Page Object для страницы Coaches.
 */
export class CoachPage extends BasePage {
  readonly heading: ReturnType<this['page']['getByRole']>;
  readonly newCoachButton: ReturnType<this['page']['getByRole']>;
  readonly searchInput: ReturnType<this['page']['getByRole']>;
  readonly createButton: ReturnType<this['page']['getByRole']>;

  // Form fields
  readonly firstNameInput: ReturnType<this['page']['getByRole']>;
  readonly lastNameInput: ReturnType<this['page']['getByRole']>;
  readonly emailInput: ReturnType<this['page']['getByRole']>;
  readonly passwordInput: ReturnType<this['page']['getByRole']>;
  readonly confirmPasswordInput: ReturnType<this['page']['getByRole']>;
  readonly phoneInput: ReturnType<this['page']['getByRole']>;

  // Dialog elements
  readonly newCoachHeading: ReturnType<this['page']['getByRole']>;

  // Table rows
  readonly coachRows: ReturnType<this['page']['getByRole']>;

  constructor(page: Page) {
    super(page);

    this.heading = page.getByRole('heading', { name: 'Coaches', level: 3 });
    this.newCoachButton = page.getByRole('button', { name: /New\s+Coach/i });
    this.searchInput = page.getByRole('textbox', { name: /search.*name|search.*email/i });
    this.createButton = page.getByRole('button', { name: 'Create' });

    // Form fields
    this.firstNameInput = page.getByRole('textbox', { name: 'First name', exact: true });
    this.lastNameInput = page.getByRole('textbox', { name: 'Last name', exact: true });
    this.emailInput = page.getByRole('textbox', { name: 'Email' });
    this.passwordInput = page.getByRole('textbox', { name: 'Password', exact: true });
    this.confirmPasswordInput = page.getByRole('textbox', { name: 'Confirm password' });
    this.phoneInput = page.getByRole('textbox', { name: 'Phone' }).or(
      page.getByRole('textbox', { name: /phone/i })
    );

    // Dialog elements
    this.newCoachHeading = page.getByRole('heading', { name: 'New Coach', level: 3 });

    // Table rows
    this.coachRows = page.getByRole('row');
  }

  /** Переход на страницу Coaches */
  async goto(): Promise<void> {
    await super.goto('/coaches');
    await expect(this.heading).toBeVisible({ timeout: TIMEOUTS.medium });
  }

  /** Нажатие кнопки New Coach */
  async clickNewCoach(): Promise<void> {
    await this.newCoachButton.click();
    await expect(this.newCoachHeading).toBeVisible({ timeout: TIMEOUTS.medium });
  }

  /** Заполнение формы создания Coach */
  async fillCoachForm(params: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword: string;
  }): Promise<void> {
    await this.firstNameInput.fill(params.firstName);
    await this.lastNameInput.fill(params.lastName);
    await this.emailInput.fill(params.email);
    await this.passwordInput.fill(params.password);
    await this.confirmPasswordInput.fill(params.confirmPassword);
  }

  /** Создание Coach */
  async createCoach(params: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword: string;
  }): Promise<void> {
    await this.clickNewCoach();
    await this.fillCoachForm(params);
    await this.createButton.click();
    await expect(this.heading).toBeVisible({ timeout: TIMEOUTS.long });
  }

  /** Поиск Coach по email */
  async searchByEmail(email: string): Promise<void> {
    await this.searchInput.fill(email);
    await expect(this.heading).toBeVisible({ timeout: TIMEOUTS.medium });
  }

  /** Поиск Coach по имени */
  async searchByName(name: string): Promise<void> {
    await this.searchInput.fill(name);
    await expect(this.heading).toBeVisible({ timeout: TIMEOUTS.medium });
  }

  /** Проверка существования Coach по email */
  async isCoachExists(email: string): Promise<boolean> {
    await this.searchInput.fill(email);
    await expect(this.heading).toBeVisible({ timeout: TIMEOUTS.medium });
    const rows = this.coachRows.filter({ hasText: email, exact: false });
    return await rows.count() > 0;
  }

  /** Применить поиск коуча по идентификатору (email или имя) */
  async applyCoachSearch(identifier: string): Promise<void> {
    await this.searchInput.fill(identifier);
    await expect(this.heading).toBeVisible({ timeout: TIMEOUTS.medium });
  }

  /** Получить локатор строки коуча в таблице (после применения поиска) */
  getCoachRow(identifier: string): Locator {
    return this.page.getByRole('row', { name: new RegExp(identifier, 'i'), exact: false }).first();
  }

  /** Получить локатор строки коуча по email */
  getRowByEmail(email: string): Locator {
    return this.coachRows.filter({ hasText: email, exact: false }).first();
  }

  /** Получить локатор строки коуча по имени (first + last) */
  getRowByName(name: string): Locator {
    return this.coachRows.filter({ hasText: name, exact: false }).first();
  }

  /** Открыть edit coach через More actions (search уже применён) */
  async openEditCoach(email: string): Promise<void> {
    // Ищем coach по email в строке таблицы (search уже применён тестом)
    const row = this.page.getByRole('row', { name: email, exact: false }).first();
    await expect(row).toBeVisible({ timeout: TIMEOUTS.medium });
    const moreActions = row.getByRole('button', { name: 'More actions' });
    await expect(moreActions).toBeVisible({ timeout: TIMEOUTS.medium });
    await moreActions.click();
    await expect(this.page.getByRole('menuitem', { name: 'Edit' })).toBeVisible({ timeout: TIMEOUTS.medium });
    await this.page.getByRole('menuitem', { name: 'Edit' }).click();
    await expect(this.page.getByRole('heading', { name: /Edit.*Coach/i })).toBeVisible({ timeout: TIMEOUTS.long });
  }

  /** Редактирование Coach (форма уже открыта) */
  async editCoach(params: {
    firstName: string;
    lastName: string;
    phone?: string;
  }): Promise<void> {
    // Email нельзя редактировать — проверить что readonly
    await expect(this.emailInput).toHaveAttribute('readonly', { timeout: TIMEOUTS.medium });

    // Редактировать first name, last name, phone
    await this.firstNameInput.fill(params.firstName);
    await this.lastNameInput.fill(params.lastName);
    if (params.phone) {
      await this.phoneInput.fill(params.phone);
    }

    // Сохранить
    const saveButton = this.page.getByRole('button', { name: 'Save' });
    await expect(saveButton).toBeVisible({ timeout: TIMEOUTS.medium });
    await saveButton.click();
  }

  /** Просмотр Coach через More actions */
  async viewCoach(email: string): Promise<void> {
    await this.applyCoachSearch(email);
    const row = this.getCoachRow(email);
    await expect(row).toBeVisible({ timeout: TIMEOUTS.medium });
    const moreActions = row.getByRole('button', { name: 'More actions' });
    await expect(moreActions).toBeVisible({ timeout: TIMEOUTS.medium });
    await moreActions.click();
    await expect(this.page.getByRole('menuitem', { name: 'View' })).toBeVisible({ timeout: TIMEOUTS.medium });
    await this.page.getByRole('menuitem', { name: 'View' }).click();
    await expect(this.page.getByRole('heading', { name: /Coach/i })).toBeVisible({ timeout: TIMEOUTS.long });
  }

  /** Удалить coach через More actions */
  async deleteCoach(email: string): Promise<void> {
    await this.applyCoachSearch(email);
    const row = this.getCoachRow(email);
    await expect(row).toBeVisible({ timeout: TIMEOUTS.medium });
    const moreActions = row.getByRole('button', { name: 'More actions' });
    await expect(moreActions).toBeVisible({ timeout: TIMEOUTS.medium });
    await moreActions.click();
    await expect(this.page.getByRole('menuitem', { name: 'Delete' })).toBeVisible({ timeout: TIMEOUTS.medium });
    await this.page.getByRole('menuitem', { name: 'Delete' }).click();
    // Confirm delete
    const confirmButton = this.page.getByRole('button', { name: /Delete|Confirm|Yes/i }).first();
    await expect(confirmButton).toBeVisible({ timeout: TIMEOUTS.medium });
    await confirmButton.click();
    await expect(this.heading).toBeVisible({ timeout: TIMEOUTS.long });
  }
}
