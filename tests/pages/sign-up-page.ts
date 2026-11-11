import { Page, Locator } from '@playwright/test';
import { BasePage } from './base-page';
import { PAGES } from '../config';

/**
 * Page Object для страницы регистрации (Sign Up, /sign-up).
 * Реальная структура (одна форма, без шагов):
 * - heading "Create account"
 * - Join code, Role (combobox), Email, Phone number, Parent email, Gender (combobox),
 *   First name, Last name, Graduation year, Position (combobox), Password, Confirm password
 * - checkbox "I agree to the Terms of Service and Privacy Policy"
 * - button "Create account", link "Sign in"
 *
 * Поля находятся по подписям: плейсхолдеры здесь — примеры значений ("Jose", "••••••••").
 * Подписи начинаются с названия поля ("Email *"), поэтому регулярки с ^:
 * /^Email/ не совпадает с "Parent email", /^Password/ — с "Confirm password" и "Show password".
 */
export class SignUpPage extends BasePage {
  readonly heading: Locator;
  readonly submitButton: Locator;
  readonly signInLink: Locator;

  // Fields
  readonly joinCodeInput: Locator;
  readonly roleSelect: Locator;
  readonly emailInput: Locator;
  readonly phoneInput: Locator;
  readonly parentEmailInput: Locator;
  readonly genderSelect: Locator;
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly graduationYearInput: Locator;
  readonly positionSelect: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;

  // Terms & Conditions
  readonly termsCheckbox: Locator;
  readonly termsLink: Locator;

  constructor(page: Page) {
    super(page);

    this.heading = page.getByRole('heading', { name: 'Create account' });
    this.submitButton = page.getByRole('button', { name: 'Create account', exact: true });
    this.signInLink = page.getByRole('link', { name: 'Sign in', exact: true });

    this.joinCodeInput = page.getByRole('textbox', { name: /^Join code/ });
    this.roleSelect = page.getByRole('combobox', { name: /^Role/ });
    this.emailInput = page.getByRole('textbox', { name: /^Email/ });
    this.phoneInput = page.getByRole('textbox', { name: /^Phone number/ });
    this.parentEmailInput = page.getByRole('textbox', { name: /^Parent email/ });
    this.genderSelect = page.getByRole('combobox', { name: /^Gender/ });
    this.firstNameInput = page.getByRole('textbox', { name: /^First name/ });
    this.lastNameInput = page.getByRole('textbox', { name: /^Last name/ });
    this.graduationYearInput = page.getByRole('spinbutton', { name: /^Graduation year/ });
    this.positionSelect = page.getByRole('combobox', { name: /^Position/ });
    // У полей пароля нет роли textbox — ищем по подписи
    this.passwordInput = page.getByLabel(/^Password/);
    this.confirmPasswordInput = page.getByLabel(/^Confirm password/);

    this.termsCheckbox = page.getByRole('checkbox', { name: /Terms of Service/ });
    this.termsLink = page.getByRole('link', { name: 'Terms of Service' });
  }

  /** Переход на страницу регистрации */
  async goto(): Promise<void> {
    await this.page.goto(PAGES.signUp);
    await this.page.waitForLoadState('networkidle');
  }

  /** Выбор роли в выпадающем списке Role */
  async selectRole(roleName: string): Promise<void> {
    await this.roleSelect.click();
    await this.page.getByRole('option', { name: roleName, exact: true }).click();
  }

  /** Заполнение персональных данных */
  async fillPersonalInfo(params: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword: string;
    parentEmail?: string;
  }): Promise<void> {
    await this.firstNameInput.fill(params.firstName);
    await this.lastNameInput.fill(params.lastName);
    await this.emailInput.fill(params.email);
    await this.passwordInput.fill(params.password);
    await this.confirmPasswordInput.fill(params.confirmPassword);

    if (params.parentEmail) {
      await this.parentEmailInput.fill(params.parentEmail);
    }
  }

  /** Принятие условий использования */
  async acceptTerms(): Promise<void> {
    await this.termsCheckbox.check();
  }

  /** Отправка формы регистрации (создаёт пользователя — пользователей нельзя удалить, только деактивировать) */
  async submitRegistration(): Promise<void> {
    await this.submitButton.click();
  }

  /** Переход на страницу входа */
  async goToSignIn(): Promise<void> {
    await this.signInLink.click();
  }
}
