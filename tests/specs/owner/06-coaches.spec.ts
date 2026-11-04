import { test, expect } from '../../fixtures';
import { CoachPage } from '../../pages/coach-page';
import { TIMEOUTS } from '../../config';

test.describe('Owner Coach Tests', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page, loginAs }) => {
    await loginAs('owner');
  });

  /**
   * @TC-91891 Add coach manually
   * TC-91891 [step 1-5]: Navigate to Coaches → New coach → fill form → save → verify
   * [step 1] Перейти в coach
   *   [step 1.1] открылась таблица со всеми коачами, если есть
   * [step 2] Нажать "New coach"
   *   [step 2.1] открылась информация к заполнению
   *   [step 2.2] есть поля: full name, email, password, confirm password, phone (optional)
   * [step 3] Заполнить все поля
   * [step 4] Сохранить
   *   [step 4.1] коач отобразился в таблице
   *   [step 4.2] а имайл пришло велком письмо (пропускаем — проверка email)
   * [step 5] Зайти коачем под кредами (пропускаем — отдельный login тест)
   *   [step 5.1] юзер вошел
   *   [step 5.2] роль коач
   */
  test('should add coach manually', async ({ page }) => {
    const coachPage = new CoachPage(page);
    const COACH_EMAIL = `testcoach+add${Date.now()}@gmail.com`;

    // TC-91891 [step 1]: Перейти в coach
    await coachPage.goto();

    // TC-91891 [step 1.1] exp: открылась таблица со всеми коачами, если есть
    await expect(coachPage.heading).toBeVisible({ timeout: TIMEOUTS.medium });

    // TC-91891 [step 2]: Нажать "New coach"
    await coachPage.clickNewCoach();

    // TC-91891 [step 2.1] exp: открылась информация к заполнению
    await expect(coachPage.newCoachHeading).toBeVisible({ timeout: TIMEOUTS.medium });

    // TC-91891 [step 2.2] exp: есть поля full name, email, password, confirm password, phone (optional)
    await expect(coachPage.firstNameInput).toBeVisible({ timeout: TIMEOUTS.medium });
    await expect(coachPage.lastNameInput).toBeVisible({ timeout: TIMEOUTS.medium });
    await expect(coachPage.emailInput).toBeVisible({ timeout: TIMEOUTS.medium });
    await expect(coachPage.passwordInput).toBeVisible({ timeout: TIMEOUTS.medium });
    await expect(coachPage.confirmPasswordInput).toBeVisible({ timeout: TIMEOUTS.medium });

    // TC-91891 [step 3]: Заполнить все поля
    await coachPage.fillCoachForm({
      firstName: 'Add',
      lastName: 'Coach',
      email: COACH_EMAIL,
      password: 'Test123456',
      confirmPassword: 'Test123456',
    });

    // TC-91891 [step 4]: Сохранить
    await coachPage.createButton.click();
    // Ждем возврата на страницу списка после создания
    await expect(coachPage.heading).toBeVisible({ timeout: TIMEOUTS.long });

    // TC-91891 [step 4.1] exp: коач отобразился в таблице
    await coachPage.search(COACH_EMAIL);
    await expect(coachPage.getRowByEmail(COACH_EMAIL)).toBeVisible({ timeout: TIMEOUTS.long });
    // Очистить поиск
    await coachPage.searchInput.clear();
  });

  /**
   * @TC-91895 View coach
   * TC-91895 [step 1-4]: Verify coach table, search, pagination
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
   */
  test('should view coach details and search', async ({ page }) => {
    const coachPage = new CoachPage(page);
    const COACH_EMAIL = `testcoach+view${Date.now()}@gmail.com`;

    // Создать coach для просмотра
    await coachPage.goto();
    await coachPage.createCoach({
      firstName: 'View',
      lastName: 'Coach',
      email: COACH_EMAIL,
      password: 'Test123456',
      confirmPassword: 'Test123456',
    });

    // TC-91895 [step 1]: Перейти в coach
    // TC-91895 [step 1.1] exp: есть таблица с коачами с информацией Name, Email, Phone number, action view + edit
    await expect(coachPage.heading).toBeVisible({ timeout: TIMEOUTS.medium });

    // TC-91895 [step 1.2] exp: Есть кнопки view
    await coachPage.search(COACH_EMAIL);
    await expect(coachPage.getRowByEmail(COACH_EMAIL)).toBeVisible({ timeout: TIMEOUTS.long });
    const row = coachPage.getRowByEmail(COACH_EMAIL);
    const viewButton = row.getByRole('button', { name: 'View' });
    await expect(viewButton).toBeVisible({ timeout: TIMEOUTS.medium });

    // TC-91895 [step 1.3] exp: Есть также new coach
    await expect(coachPage.newCoachButton).toBeVisible({ timeout: TIMEOUTS.medium });

    // TC-91895 [step 2]: Попробовать поиск по name
    await coachPage.search('View Coach');
    // TC-91895 [step 2.1] exp: поиск работает
    await expect(row).toBeVisible({ timeout: TIMEOUTS.medium });

    // TC-91895 [step 3]: Попробовать поиск по email
    await coachPage.search(COACH_EMAIL);
    // TC-91895 [step 3.1] exp: поиск работает
    await expect(row).toBeVisible({ timeout: TIMEOUTS.medium });

    // Очистить поиск
    await coachPage.searchInput.clear();
  });

  /**
   * @TC-91852 Edit coach
   * TC-91852 [step 1-4]: Navigate to Coaches → Edit coach → verify
   * [step 1] Перейти в coach
   *   [step 1.1] exp: открылась таблица со всеми коачами
   * [step 2] Нажать edit на выбранном юзере
   *   [step 2.1] exp: открылась таблица с редактированием first name, last name, email, phone
   *   [step 2.2] exp: Email нельзя отредактировать
   * [step 3] Отредактировать first name, last name и phone
   * [step 4] Сохранить
   *   [step 4.1] exp: информация отредактирована
   */
  test('should edit an existing coach', async ({ page }) => {
    const coachPage = new CoachPage(page);
    const COACH_EMAIL = `testcoach+edit${Date.now()}@gmail.com`;

    // Создать coach для редактирования
    await coachPage.goto();
    await coachPage.createCoach({
      firstName: 'Edit',
      lastName: 'Coach',
      email: COACH_EMAIL,
      password: 'Test123456',
      confirmPassword: 'Test123456',
    });

    // Ждём загрузки таблицы
    await coachPage.waitForLoading();

    // TC-91852 [step 1]: Перейти в coach
    // TC-91852 [step 1.1] exp: открылась таблица со всеми коачами
    await expect(coachPage.heading).toBeVisible({ timeout: TIMEOUTS.medium });

    // TC-91852 [step 2]: Нажать edit на выбранном юзере
    // Ищем coach
    await coachPage.search(COACH_EMAIL);
    const row = coachPage.getRowByEmail(COACH_EMAIL);
    await expect(row).toBeVisible({ timeout: TIMEOUTS.long });
    const moreActions = row.getByRole('button', { name: 'More actions' });
    await expect(moreActions).toBeVisible({ timeout: TIMEOUTS.medium });
    await moreActions.click();
    await expect(coachPage.page.getByRole('menuitem', { name: 'Edit' })).toBeVisible({ timeout: TIMEOUTS.medium });
    await coachPage.page.getByRole('menuitem', { name: 'Edit' }).click();

    // TC-91852 [step 2.1] exp: открылась форма с редактированием first name, last name, email, phone
    await expect(coachPage.firstNameInput).toBeVisible({ timeout: TIMEOUTS.medium });
    await expect(coachPage.lastNameInput).toBeVisible({ timeout: TIMEOUTS.medium });
    await expect(coachPage.emailInput).toBeVisible({ timeout: TIMEOUTS.medium });
    await expect(coachPage.phoneInput).toBeVisible({ timeout: TIMEOUTS.medium });

    // TC-91852 [step 2.2] exp: Email нельзя отредактировать (readonly)
    await expect(coachPage.emailInput).toHaveAttribute('readonly', { timeout: TIMEOUTS.medium });

    // TC-91852 [step 3]: Отредактировать first name, last name и phone
    await coachPage.editCoach({
      firstName: 'Edited',
      lastName: `Coach${Date.now()}`,
      phone: '555-0123',
    });

    // TC-91852 [step 4]: Сохранить
    // TC-91852 [step 4.1] exp: информация отредактирована
    await expect(coachPage.heading).toBeVisible({ timeout: TIMEOUTS.long });
    // Ищем по уникальному имени
    await coachPage.search('Edited Coach');
    await expect(coachPage.getRowByName('Edited Coach')).toBeVisible({ timeout: TIMEOUTS.long });
  });
});
