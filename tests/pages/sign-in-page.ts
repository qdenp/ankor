import { Page, Locator } from '@playwright/test';
import { BasePage } from './base-page';
import { PAGES } from '../config';

/**
 * Page Object для страницы входа (Sign In).
 * Реальная структура DOM:
 * - heading "Welcome to Ankor!" [h1]
 * - paragraph "Please enter your details to continue to your account"
 * - textbox "Email"
 * - textbox "Password"
 * - button "Sign In"
 * - link "Forgot password?" -> /forgot-password
 * - link "Join an existing organization" -> /sign-up
 * - link "Create an organization profile" -> /org-signup
 */
export class SignInPage extends BasePage {
  readonly welcomeHeading: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly signInButton: Locator;
  readonly forgotPasswordLink: Locator;
  readonly joinOrgLink: Locator;
  readonly createOrgLink: Locator;
  readonly showPasswordToggle: Locator;

  constructor(page: Page) {
    super(page);

    this.welcomeHeading = page.getByRole('heading', { name: 'Welcome to Ankor!', level: 1 });
    this.emailInput = page.getByRole('textbox', { name: 'Email' });
    this.passwordInput = page.getByRole('textbox', { name: 'Password' });
    this.signInButton = page.getByRole('button', { name: 'Sign In' });
    this.forgotPasswordLink = page.getByRole('link', { name: 'Forgot password?' });
    this.joinOrgLink = page.getByRole('link', { name: 'Join an existing organization' });
    this.createOrgLink = page.getByRole('link', { name: 'Create an organization profile' });
    this.showPasswordToggle = page.getByRole('button', { name: 'Show password' });
  }

  /** Переход на страницу входа */
  async goto(): Promise<void> {
    await this.page.goto(PAGES.signIn);
    // Ждём загрузки состояния страницы (React отрендерит форму)
    // НЕ используем waitForLoading() — на sign-in нет спиннеров загрузки данных,
    // но есть статичные элементы с классом .MuiCircularProgress-root (SVG-иконки MUI).
    await this.page.waitForLoadState('networkidle');
  }

  /** Заполнение поля email */
  async fillEmail(email: string): Promise<void> {
    await this.emailInput.fill(email);
  }

  /** Заполнение поля пароля */
  async fillPassword(password: string): Promise<void> {
    await this.passwordInput.fill(password);
  }

  /** Показать/скрыть пароль */
  async togglePasswordVisibility(): Promise<void> {
    await this.showPasswordToggle.click();
  }

  /** Отправка формы входа */
  async submit(): Promise<void> {
    await this.signInButton.click();
  }

  /** Полная процедура входа */
  async login(email: string, password: string): Promise<void> {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.submit();
  }

  /** Переход на страницу регистрации (Join an existing organization) */
  async goToSignUp(): Promise<void> {
    await this.joinOrgLink.click();
  }

  /** Переход к восстановлению пароля */
  async goToForgotPassword(): Promise<void> {
    await this.forgotPasswordLink.click();
  }

  /** Переход к созданию организации */
  async goToCreateOrg(): Promise<void> {
    await this.createOrgLink.click();
  }

  /** Проверка валидации полей (без заполнения) */
  async submitEmptyForm(): Promise<void> {
    await this.signInButton.click();
  }
}
