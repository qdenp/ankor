import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base-page';
import { TIMEOUTS } from '../config';

/**
 * Page Object для страницы Parents.
 */
export class ParentPage extends BasePage {
  readonly heading: ReturnType<this['page']['getByRole']>;
  readonly newParentButton: ReturnType<this['page']['getByRole']>;
  readonly searchInput: ReturnType<this['page']['getByRole']>;
  readonly createButton: ReturnType<this['page']['getByRole']>;
  readonly saveButton: ReturnType<this['page']['getByRole']>;

  // Form fields
  readonly firstNameInput: ReturnType<this['page']['getByRole']>;
  readonly lastNameInput: ReturnType<this['page']['getByRole']>;
  readonly emailInput: ReturnType<this['page']['getByRole']>;
  readonly passwordInput: ReturnType<this['page']['getByRole']>;
  readonly confirmPasswordInput: ReturnType<this['page']['getByRole']>;
  readonly relationshipSelect: ReturnType<this['page']['getByRole']>;
  readonly athleteSelect: ReturnType<this['page']['getByRole']>;

  // Dialog elements
  readonly newParentHeading: ReturnType<this['page']['getByRole']>;
  readonly relationshipOptions: ReturnType<this['page']['getByRole']>;
  readonly athleteOptions: ReturnType<this['page']['getByRole']>;

  // Table rows
  readonly parentRows: ReturnType<this['page']['getByRole']>;

  constructor(page: Page) {
    super(page);

    this.heading = page.getByRole('heading', { name: 'Parents', level: 3 });
    this.newParentButton = page.getByRole('button', { name: /^New\s+\w+$/i }).first();
    this.searchInput = page.getByRole('textbox', { name: /search.*parent|search.*name/i });
    this.createButton = page.getByRole('button', { name: 'Create' });
    this.saveButton = page.getByRole('button', { name: 'Save' });

    // Form fields
    this.firstNameInput = page.getByRole('textbox', { name: 'First name', exact: true });
    this.lastNameInput = page.getByRole('textbox', { name: 'Last name', exact: true });
    this.emailInput = page.getByRole('textbox', { name: 'Email' });
    this.passwordInput = page.getByRole('textbox', { name: 'Password', exact: true });
    this.confirmPasswordInput = page.getByRole('textbox', { name: 'Confirm password' });
    this.relationshipSelect = page.getByRole('combobox', { name: 'Relationship' });
    this.athleteSelect = page.getByRole('combobox', { name: 'Select athlete(s)' });

    // Dialog elements
    this.newParentHeading = page.getByRole('heading', { name: 'New Parent', level: 3 });
    this.relationshipOptions = page.getByRole('option');
    this.athleteOptions = page.getByRole('option');

    // Table rows
    this.parentRows = page.getByRole('row');
  }

  /** Переход на страницу Parents */
  async goto(): Promise<void> {
    await super.goto('/parents');
    await expect(this.heading).toBeVisible({ timeout: TIMEOUTS.medium });
  }

  /** Нажатие кнопки New Parent */
  async clickNewParent(): Promise<void> {
    await this.newParentButton.click();
    await expect(this.newParentHeading).toBeVisible({ timeout: TIMEOUTS.medium });
  }

  /** Заполнение формы создания Parent */
  async fillParentForm(params: {
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

  /** Выбор Relationship */
  async selectRelationship(relationship: string): Promise<void> {
    await this.relationshipSelect.click();
    await this.relationshipOptions.filter({ hasText: new RegExp(relationship, 'i') }).first().click();
  }

  /** Выбор Athlete */
  async selectAthlete(athleteName: string): Promise<void> {
    await this.athleteSelect.click();
    await this.athleteOptions.filter({ hasText: new RegExp(athleteName, 'i') }).first().click();
  }

  /** Нажать Create в диалоге создания */
  async clickCreateInDialog(): Promise<void> {
    await this.page.getByRole('button', { name: 'Create' }).first().click();
  }

  /** Создание Parent */
  async createParent(params: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword: string;
    relationship: string;
    athleteName: string;
  }): Promise<void> {
    await this.clickNewParent();
    await this.fillParentForm(params);
    await this.selectRelationship(params.relationship);
    await this.selectAthlete(params.athleteName);
    await this.clickCreateInDialog();
    // Ждем загрузки страницы списка после создания
    await expect(this.heading).toBeVisible({ timeout: TIMEOUTS.long });
  }

  /** Поиск Parent по email */
  async searchByEmail(email: string): Promise<void> {
    await this.searchInput.fill(email);
    await expect(this.heading).toBeVisible({ timeout: TIMEOUTS.medium });
  }

  /** Проверка существования Parent по email */
  async isParentExists(email: string): Promise<boolean> {
    return await this.parentRows.filter({ hasText: email, exact: false }).first().isVisible({ timeout: TIMEOUTS.short });
  }

  /** Получить локатор строки родителя в таблице */
  getParentRow(email: string): Locator {
    return this.parentRows.filter({ hasText: email, exact: false }).first();
  }

  /** Открыть edit parent через More actions (search уже применён тестом, identifier — имя) */
  async openEditParent(identifier: string): Promise<void> {
    const row = this.page.getByRole('row', { name: identifier, exact: false }).first();
    await expect(row).toBeVisible({ timeout: TIMEOUTS.medium });
    const moreActions = row.getByRole('button', { name: 'More actions' });
    await expect(moreActions).toBeVisible({ timeout: TIMEOUTS.medium });
    await moreActions.click();
    await expect(this.page.getByRole('menuitem', { name: 'Edit' })).toBeVisible({ timeout: TIMEOUTS.medium });
    await this.page.getByRole('menuitem', { name: 'Edit' }).click();
    await expect(this.page.getByRole('heading', { name: /Edit.*Parent/i })).toBeVisible({ timeout: TIMEOUTS.long });
  }

  /** Редактирование Parent (форма уже открыта) */
  async editParent(params: {
    firstName: string;
    lastName: string;
  }): Promise<void> {
    // Email нельзя редактировать — проверить что readonly
    await expect(this.emailInput).toHaveAttribute('readonly', { timeout: TIMEOUTS.medium });

    // Редактировать first name, last name
    await this.firstNameInput.fill(params.firstName);
    await this.lastNameInput.fill(params.lastName);

    // Сохранить
    await this.saveButton.click();
  }
}
