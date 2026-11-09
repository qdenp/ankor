import { Page, Locator } from '@playwright/test';
import { BasePage } from './base-page';
import { PAGES } from '../config';

/**
 * Page Object для страницы регистрации (Sign Up).
 */
export class SignUpPage extends BasePage {
  readonly roleHeading: ReturnType<this['page']['getByRole']>;
  readonly nextButton: ReturnType<this['page']['getByRole']>;
  readonly backButton: ReturnType<this['page']['getByRole']>;
  readonly submitButton: ReturnType<this['page']['getByRole']>;
  readonly signInLink: ReturnType<this['page']['getByRole']>;

  // Step 1: Role selection
  readonly roleOption: (roleName: string) => Locator;

  // Step 2: Personal info
  readonly firstNameInput: ReturnType<this['page']['getByPlaceholder']>;
  readonly lastNameInput: ReturnType<this['page']['getByPlaceholder']>;
  readonly emailInput: ReturnType<this['page']['getByPlaceholder']>;
  readonly passwordInput: ReturnType<this['page']['getByPlaceholder']>;
  readonly confirmPasswordInput: ReturnType<this['page']['getByPlaceholder']>;
  readonly parentEmailInput: ReturnType<this['page']['getByPlaceholder']>;
  readonly athleteBirthdateInput: ReturnType<this['page']['getByPlaceholder']>;

  // Terms & Conditions
  readonly termsCheckbox: ReturnType<this['page']['getByRole']>;
  readonly termsLink: ReturnType<this['page']['getByRole']>;

  // Validation
  readonly validationMessage: ReturnType<this['page']['getByRole']>;
  readonly errorMessage: ReturnType<this['page']['getByText']>;

  constructor(page: Page) {
    super(page);

    this.roleHeading = page.getByRole('heading', { name: /select your role|Choose your role/i });
    this.nextButton = page.getByRole('button', { name: /next|Далее/i });
    this.backButton = page.getByRole('button', { name: /back|Назад/i });
    this.submitButton = page.getByRole('button', { name: /create.*account|Sign up|Register/i });
    this.signInLink = page.getByRole('link', { name: /sign in|Sign In|Вход/i });

    // Role options
    this.roleOption = (roleName: string) =>
      page.getByRole('option', { name: roleName, exact: true }).or(
        page.getByRole('button', { name: roleName, exact: true })
      );

    // Form fields
    this.firstNameInput = page.getByPlaceholder(/first.*name|Имя/i);
    this.lastNameInput = page.getByPlaceholder(/last.*name|Фамилия/i);
    this.emailInput = page.getByPlaceholder(/email|E-mail/i);
    this.passwordInput = page.getByPlaceholder(/password|Пароль/i);
    this.confirmPasswordInput = page.getByPlaceholder(/confirm.*password|Повторите.*пароль/i);
    this.parentEmailInput = page.getByPlaceholder(/parent.*email|email.*parent/i);
    this.athleteBirthdateInput = page.getByPlaceholder(/birth.*date|Дата.*рождения/i);

    // Terms
    this.termsCheckbox = page.getByRole('checkbox', { name: /terms|privacy|услов|политик/i });
    this.termsLink = page.getByRole('link', { name: /terms of service|privacy policy/i });

    // Validation
    this.validationMessage = page.getByRole('alert');
    this.errorMessage = page.getByText(/invalid|error|неверн|ошибк|required|обязател/i);
  }

  /** Переход на страницу регистрации */
  async goto(): Promise<void> {
    await this.page.goto(PAGES.signUp);
    await this.page.waitForLoadState('networkidle');
  }

  /** Переход на страницу регистрации с easy join code */
  async gotoWithCode(code: string): Promise<void> {
    await this.goto();
    // URL может содержать code как параметр
    await this.page.goto(`${PAGES.signUp}?code=${code}`);
    await this.waitForLoadState();
  }

  /** Выбор роли */
  async selectRole(roleName: string): Promise<void> {
    const option = this.roleOption(roleName);
    await option.click();
  }

  /** Заполнение персональных данных */
  async fillPersonalInfo(params: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword: string;
    parentEmail?: string;
    birthdate?: string;
  }): Promise<void> {
    await this.firstNameInput.fill(params.firstName);
    await this.lastNameInput.fill(params.lastName);
    await this.emailInput.fill(params.email);
    await this.passwordInput.fill(params.password);
    await this.confirmPasswordInput.fill(params.confirmPassword);

    if (params.parentEmail) {
      await this.parentEmailInput.fill(params.parentEmail);
    }
    if (params.birthdate) {
      await this.athleteBirthdateInput.fill(params.birthdate);
    }
  }

  /** Принятие условий использования */
  async acceptTerms(): Promise<void> {
    await this.termsCheckbox.check();
  }

  /** Отправка формы регистрации */
  async submitRegistration(): Promise<void> {
    await this.submitButton.click();
  }

  /** Полная регистрация атлета */
  async registerAthlete(params: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    parentEmail: string;
    birthdate: string;
  }): Promise<void> {
    await this.selectRole('Athlete');
    await this.nextButton.click();
    await this.fillPersonalInfo({
      ...params,
      confirmPassword: params.password,
    });
    await this.acceptTerms();
    await this.submitRegistration();
  }

  /** Переход на страницу входа */
  async goToSignIn(): Promise<void> {
    await this.signInLink.click();
  }

  /** Нажатие кнопки назад */
  async goBack(): Promise<void> {
    await this.backButton.click();
  }
}
