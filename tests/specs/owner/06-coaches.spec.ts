import { test, expect } from '../../fixtures';
import { CoachPage } from '../../pages/coach-page';
import { TIMEOUTS } from '../../config';

test.describe('Owner Coach Tests', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page, loginAs }) => {
    await loginAs('owner');
  });

  /**
   * @TC-71990 Add coach manually
   * TC-71990 [step 1-4]: Navigate to Coaches → New coach → fill form → save → verify
   * [step 1] Перейти в coach
   *   [step 1.1] открылась таблица со всеми коучами, если есть
   * [step 2] Нажать "New coach"
   *   [step 2.1] открылась информация к заполнению
   *   [step 2.2] есть поля: full name, email, password, confirm password, phone (optional)
   * [step 3] Заполнить все поля
   * [step 4] Сохранить
   *   [step 4.1] коач отобразился в таблице
   *   [step 4.2] на email пришло приветственное письмо (пропускаем — проверка email)
   *
   * @TC-72057 View coach
   * TC-72057 [step 1-4]: Verify coach table, search, pagination
   * [step 1] Перейти в coach
   *   [step 1.1] exp: есть таблица с коачами с информацией Name, Email, Phone number, action view + edit
   *   [step 1.2] exp: Есть кнопки view
   *   [step 1.3] exp: Есть также new coach
   * [step 2] Попробовать поиск по name
   *   [step 2.1] exp: поиск работает
   * [step 3] Попробовать поиск по email
   *   [step 3.1] exp: поиск работает
   * [step 4] Попробовать пагинацию
   *   [step 4.1] exp: пагинацию работает (пропускаем — нет данных для пагинации)
   *
   * @TC-71991 Edit coach
   * TC-71991 [step 1-4]: Navigate to Coaches → Edit coach → verify
   * [step 1] Перейти в coach
   *   [step 1.1] exp: открылась таблица со всеми коачами
   * [step 2] Нажать edit на выбранном юзере
   *   [step 2.1] exp: открылась таблица с редактированием first name, last name, email, phone
   *   [step 2.2] exp: Email нельзя отредактировать
   * [step 3] Отредактировать first name, last name и phone
   * [step 4] Сохранить
   *   [step 4.1] exp: информация отредактирована
   */
  test('should create, view and edit a coach', async ({ page }) => {
    const coachPage = new CoachPage(page);
    const COACH_EMAIL = `testcoach+${Date.now()}@aexsoft.com`;

    // ===== TC-71990: Create coach =====

    // TC-71990 [step 1]: Перейти в coach
    await coachPage.goto();

    // TC-71990 [step 1.1] exp: открылась таблица со всеми коучами, если есть
    await expect(coachPage.heading).toBeVisible({ timeout: TIMEOUTS.medium });

    // TC-71990 [step 2]: Нажать "New coach"
    await coachPage.clickNewCoach();

    // TC-71990 [step 2.1] exp: открылась информация к заполнению
    await expect(coachPage.newCoachHeading).toBeVisible({ timeout: TIMEOUTS.medium });

    // TC-71990 [step 2.2] exp: есть поля full name, email, password, confirm password, phone (optional)
    await expect(coachPage.firstNameInput).toBeVisible({ timeout: TIMEOUTS.medium });
    await expect(coachPage.lastNameInput).toBeVisible({ timeout: TIMEOUTS.medium });
    await expect(coachPage.emailInput).toBeVisible({ timeout: TIMEOUTS.medium });
    await expect(coachPage.passwordInput).toBeVisible({ timeout: TIMEOUTS.medium });
    await expect(coachPage.confirmPasswordInput).toBeVisible({ timeout: TIMEOUTS.medium });
    await expect(coachPage.phoneInput).toBeVisible({ timeout: TIMEOUTS.medium });

    // TC-71990 [step 3]: Заполнить все поля
    await coachPage.fillCoachForm({
      firstName: 'View',
      lastName: 'Coach',
      email: COACH_EMAIL,
      password: 'Test123456',
      confirmPassword: 'Test123456',
    });
    await coachPage.phoneInput.fill('+1234567890');

    // TC-71990 [step 4]: Сохранить
    await coachPage.createButton.click();
    // Ждём исчезновения спиннеров загрузки после создания
    await coachPage.waitForLoading();

    // TC-71990 [step 4.1] exp: коач отобразился в таблице
    await coachPage.search('View Coach');
    await expect(coachPage.searchInput).toHaveValue('View Coach');
    await expect(coachPage.getRowByName('View Coach')).toBeVisible({ timeout: TIMEOUTS.long });

    // ===== TC-72057: View coach =====

    // TC-72057 [step 1]: Перейти в coach
    // TC-72057 [step 1.1] exp: есть таблица с коачами с информацией Name, Email, Phone number, action view + edit
    await expect(coachPage.heading).toBeVisible({ timeout: TIMEOUTS.medium });

    // TC-72057 [step 1.2] exp: Есть кнопки view
    await coachPage.search('View Coach');
    const row = coachPage.getRowByName('View Coach');
    await expect(row).toBeVisible({ timeout: TIMEOUTS.long });
    await expect(coachPage.getViewButton('View Coach')).toBeVisible({ timeout: TIMEOUTS.medium });

    // TC-72057 [step 1.3] exp: Есть также new coach
    await expect(coachPage.newCoachButton).toBeVisible({ timeout: TIMEOUTS.medium });

    // TC-72057 [step 2]: Попробовать поиск по name
    await coachPage.search('View Coach');
    // TC-72057 [step 2.1] exp: поиск работает
    await expect(row).toBeVisible({ timeout: TIMEOUTS.medium });

    // TC-72057 [step 3]: Попробовать поиск по email
    await coachPage.search(COACH_EMAIL);
    // TC-72057 [step 3.1] exp: поиск работает
    await expect(row).toBeVisible({ timeout: TIMEOUTS.medium });

    // ===== TC-71991: Edit coach =====

    // TC-71991 [step 1]: Перейти в coach
    // TC-71991 [step 1.1] exp: открылась таблица со всеми коачами
    await expect(coachPage.heading).toBeVisible({ timeout: TIMEOUTS.medium });

    // TC-71991 [step 2]: Нажать edit на выбранном юзере
    // Ищем coach
    await coachPage.search('View Coach');
    await coachPage.openEditCoach('View Coach');

    // TC-71991 [step 2.1] exp: открылась форма с редактированием first name, last name, email, phone
    await expect(coachPage.firstNameInput).toBeVisible({ timeout: TIMEOUTS.medium });
    await expect(coachPage.lastNameInput).toBeVisible({ timeout: TIMEOUTS.medium });
    await expect(coachPage.emailInput).toBeVisible({ timeout: TIMEOUTS.medium });
    await expect(coachPage.phoneInput).toBeVisible({ timeout: TIMEOUTS.medium });

    // TC-71991 [step 2.2] exp: Email нельзя отредактировать (readonly)
    await expect(coachPage.emailInput).toHaveAttribute('readonly', { timeout: TIMEOUTS.medium });

    // TC-71991 [step 3]: Отредактировать first name, last name и phone
    await coachPage.editCoach({
      firstName: 'Edited',
      lastName: 'Coach',
      phone: '555-0123',
    });

    // TC-71991 [step 4]: Сохранить
    // TC-71991 [step 4.1] exp: информация отредактирована
    await expect(coachPage.heading).toBeVisible({ timeout: TIMEOUTS.long });
    // Ищем по уникальному имени
    await coachPage.search('Edited Coach');
    await expect(coachPage.getRowByName('Edited Coach')).toBeVisible({ timeout: TIMEOUTS.long });
  });
});
