import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base-page';
import { TIMEOUTS } from '../config';

/**
 * Page Object для страницы Athletes.
 */
export class AthletePage extends BasePage {
  readonly heading: Locator;
  readonly newAthleteButton: Locator;
  readonly searchInput: Locator;
  readonly createButton: Locator;

  // Form fields
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly graduationYearInput: Locator;
  readonly positionSelect: Locator;
  readonly emailInput: Locator;
  readonly teamSelect: Locator;
  readonly genderSelect: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;

  // Dialog elements
  readonly newAthleteHeading: Locator;
  readonly positionOptions: Locator;
  readonly teamOptions: Locator;
  readonly genderOptions: Locator;

  // Table rows
  readonly athleteRows: Locator;

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
    // exact: подстрока 'Male' совпала бы и с 'Female'
    await this.page.getByRole('option', { name: params.gender, exact: true }).click();
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
    return await this.athleteRows.filter({ hasText: email }).first().isVisible({ timeout: TIMEOUTS.short });
  }

  /** Получить локатор строки атлета в таблице */
  getAthleteRow(email: string): Locator {
    return this.athleteRows.filter({ hasText: email }).first();
  }
}
