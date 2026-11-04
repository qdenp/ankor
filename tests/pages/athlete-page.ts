import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base-page';
import { TIMEOUTS } from '../config';

/**
 * Page Object для страницы Athletes.
 */
export class AthletePage extends BasePage {
  readonly heading: ReturnType<this['page']['getByRole']>;
  readonly newAthleteButton: ReturnType<this['page']['getByRole']>;
  readonly searchInput: ReturnType<this['page']['getByRole']>;
  readonly createButton: ReturnType<this['page']['getByRole']>;

  // Form fields
  readonly firstNameInput: ReturnType<this['page']['getByRole']>;
  readonly lastNameInput: ReturnType<this['page']['getByRole']>;
  readonly graduationYearInput: ReturnType<this['page']['getByRole']>;
  readonly positionSelect: ReturnType<this['page']['getByRole']>;
  readonly emailInput: ReturnType<this['page']['getByRole']>;
  readonly teamSelect: ReturnType<this['page']['getByRole']>;
  readonly genderSelect: ReturnType<this['page']['getByRole']>;
  readonly passwordInput: ReturnType<this['page']['getByRole']>;
  readonly confirmPasswordInput: ReturnType<this['page']['getByRole']>;

  // Dialog elements
  readonly newAthleteHeading: ReturnType<this['page']['getByRole']>;
  readonly positionOptions: ReturnType<this['page']['getByRole']>;
  readonly teamOptions: ReturnType<this['page']['getByRole']>;
  readonly genderOptions: ReturnType<this['page']['getByRole']>;

  // Table rows
  readonly athleteRows: ReturnType<this['page']['getByRole']>;

  constructor(page: Page) {
    super(page);

    this.heading = page.getByRole('heading', { name: 'Athletes', level: 3 });
    this.newAthleteButton = page.getByRole('button', { name: /^New\s+\w+$/i }).first();
    this.searchInput = page.getByRole('textbox', { name: /search.*name|search.*email/i });
    this.createButton = page.getByRole('button', { name: 'Create' });

    // Form fields
    this.firstNameInput = page.getByRole('textbox', { name: 'First name', exact: true });
    this.lastNameInput = page.getByRole('textbox', { name: 'Last name', exact: true });
    this.graduationYearInput = page.getByRole('spinbutton', { name: 'Graduation year' });
    this.positionSelect = page.getByRole('combobox', { name: 'Position' });
    this.emailInput = page.getByRole('textbox', { name: 'Email', exact: true });
    this.teamSelect = page.getByRole('combobox', { name: 'Team' });
    this.genderSelect = page.getByRole('combobox', { name: 'Gender' });
    this.passwordInput = page.getByRole('textbox', { name: 'Password', exact: true });
    this.confirmPasswordInput = page.getByRole('textbox', { name: 'Confirm password' });

    // Dialog elements
    this.newAthleteHeading = page.getByRole('heading', { name: 'New Athlete', level: 3 });
    this.positionOptions = page.getByRole('option');
    this.teamOptions = page.getByRole('option');
    this.genderOptions = page.getByRole('option');

    // Table rows
    this.athleteRows = page.getByRole('row');
  }

  /** Переход на страницу Athletes */
  async goto(): Promise<void> {
    await super.goto('/athletes');
    await expect(this.heading).toBeVisible({ timeout: TIMEOUTS.medium });
  }

  /** Нажатие кнопки New Athlete */
  async clickNewAthlete(): Promise<void> {
    await this.newAthleteButton.click();
    await expect(this.newAthleteHeading).toBeVisible({ timeout: TIMEOUTS.medium });
  }

  /** Заполнение формы создания Athlete */
  async fillAthleteForm(params: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword: string;
    graduationYear: string;
    team: string;
    gender: string;
  }): Promise<void> {
    await this.firstNameInput.fill(params.firstName);
    await this.lastNameInput.fill(params.lastName);
    await this.graduationYearInput.fill(params.graduationYear);
    await this.positionSelect.click();
    await this.positionOptions.first().click();
    await this.emailInput.fill(params.email);
    await this.teamSelect.click();
    await this.page.getByRole('option', { name: params.team }).click();
    await this.genderSelect.click();
    await this.page.getByRole('option', { name: new RegExp(params.gender, 'i') }).first().click();
    await this.passwordInput.fill(params.password);
    await this.confirmPasswordInput.fill(params.confirmPassword);
  }

  /** Создание Athlete */
  async createAthlete(params: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword: string;
    graduationYear: string;
    team: string;
    gender: string;
  }): Promise<void> {
    await this.clickNewAthlete();
    await this.fillAthleteForm(params);
    await this.createButton.click();
    await expect(this.newAthleteHeading).toBeHidden({ timeout: TIMEOUTS.medium });
    // Ждём загрузки страницы списка после создания
    await this.waitForLoading();
  }

  /** Поиск по email (клиентская фильтрация, Enter не нужен) */
  async search(text: string): Promise<void> {
    await this.searchInput.click();
    await this.searchInput.fill(text);
  }

  /** Проверка существования Athlete по email */
  async isAthleteExists(email: string): Promise<boolean> {
    return await this.athleteRows.filter({ hasText: email, exact: false }).first().isVisible({ timeout: TIMEOUTS.short });
  }

  /** Получить локатор строки атлета в таблице */
  getAthleteRow(email: string): Locator {
    return this.athleteRows.filter({ hasText: email, exact: false }).first();
  }
}
