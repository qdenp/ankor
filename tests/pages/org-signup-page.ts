import { Page, Locator } from '@playwright/test';
import { BasePage } from './base-page';

/**
 * Page Object для регистрации организации (/org-signup, ссылка "Sign up your organization" на Sign In).
 * Реальная структура — два шага:
 * - Step 1. Admin info: Admin first name, Admin last name, Admin email, Admin phone number,
 *   Password, Confirm password → button "Next"
 * - Step 2. Organization info: Organization name, Select sport (combobox; на стенде только Lacrosse),
 *   Gender (combobox: Girls / Boys / Coed, по умолчанию Coed), Team name → button "Create organization"
 *
 * Каждая регистрация создаёт организацию и пользователя, которых нельзя удалить, — нужен уникальный email.
 */
export class OrgSignUpPage extends BasePage {
  readonly heading: Locator;

  // Step 1. Admin info
  readonly adminFirstNameInput: Locator;
  readonly adminLastNameInput: Locator;
  readonly adminEmailInput: Locator;
  readonly adminPhoneInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly nextButton: Locator;

  // Step 2. Organization info
  readonly organizationNameInput: Locator;
  readonly sportSelect: Locator;
  readonly genderSelect: Locator;
  readonly teamNameInput: Locator;
  readonly createOrganizationButton: Locator;
  /** Пункты открытого списка (sport / gender) */
  readonly listOptions: Locator;

  constructor(page: Page) {
    super(page);

    this.heading = page.getByRole('heading', { name: 'Create organization account' });

    this.adminFirstNameInput = page.getByRole('textbox', { name: 'Admin first name' });
    this.adminLastNameInput = page.getByRole('textbox', { name: 'Admin last name' });
    this.adminEmailInput = page.getByRole('textbox', { name: 'Admin email' });
    this.adminPhoneInput = page.getByRole('textbox', { name: 'Admin phone number' });
    this.passwordInput = page.getByRole('textbox', { name: 'Password', exact: true });
    this.confirmPasswordInput = page.getByRole('textbox', { name: 'Confirm password' });
    this.nextButton = page.getByRole('button', { name: 'Next' });

    this.organizationNameInput = page.getByRole('textbox', { name: 'Organization name' });
    this.sportSelect = page.getByRole('combobox', { name: 'Select sport' });
    this.genderSelect = page.getByRole('combobox', { name: 'Gender' });
    this.teamNameInput = page.getByRole('textbox', { name: 'Team name' });
    this.createOrganizationButton = page.getByRole('button', { name: 'Create organization' });
    this.listOptions = page.getByRole('option');
  }

  async goto(): Promise<void> {
    await this.page.goto('/org-signup');
    await this.heading.waitFor();
  }

  /** Пройти оба шага и нажать "Create organization" */
  async createOrganization(params: {
    adminFirstName: string;
    adminLastName: string;
    adminEmail: string;
    adminPhone: string;
    password: string;
    organizationName: string;
    sport: string;
    gender: 'Girls' | 'Boys' | 'Coed';
    teamName: string;
  }): Promise<void> {
    await this.adminFirstNameInput.fill(params.adminFirstName);
    await this.adminLastNameInput.fill(params.adminLastName);
    await this.adminEmailInput.fill(params.adminEmail);
    await this.adminPhoneInput.fill(params.adminPhone);
    await this.passwordInput.fill(params.password);
    await this.confirmPasswordInput.fill(params.password);
    await this.nextButton.click();

    await this.organizationNameInput.fill(params.organizationName);
    await this.sportSelect.click();
    await this.selectExactOption(params.sport);
    await this.genderSelect.click();
    await this.selectExactOption(params.gender);
    await this.teamNameInput.fill(params.teamName);
    await this.createOrganizationButton.click();
  }

  /** Пункт открытого списка — по точному тексту: hasText-подстрока совпала бы и с более длинными вариантами */
  private async selectExactOption(text: string): Promise<void> {
    const exactText = new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
    await this.listOptions.filter({ hasText: exactText }).click();
  }
}
