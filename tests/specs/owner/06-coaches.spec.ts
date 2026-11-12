import * as allure from 'allure-js-commons';
import { test, expect } from '../../fixtures';
import { CoachPage } from '../../pages/coach-page';
import { CREDENTIALS, TIMEOUTS } from '../../config';
import { forgetEntity, recallEntity, rememberEntity } from '../../helpers/test-data-store';
import { deactivateCreatedUser } from '../../helpers/deactivate-user';

/**
 * 06 — Coaches для Owner.
 * Три теста — три тест-кейса TestOps (create → view → edit) на ОДНОМ коуче:
 * создаёт его только первый тест (пользователей нельзя удалить, только деактивировать).
 */
test.describe('Owner Coach Tests', () => {
  test.describe.configure({ mode: 'serial' });

  // Коуч, созданный первым тестом; уникальное имя — поиск в таблице идёт по имени
  // Коуча создаёт только 71990; view/edit берут его из хранилища — и из прошлого прогона (REVIEW-PLAN 3.12)
  type Coach = { firstName: string; fullName: string; email: string };
  const CREATE_COACH_TEST = 'should create a coach and show it in the table';
  // Коуч, созданный ЭТИМ прогоном: после view/edit деактивируется, чтобы тестовые коучи не копились (3.11)
  let createdThisRunEmail: string | undefined;

  test.afterAll(async ({ browser }, testInfo) => {
    if (!createdThisRunEmail) return;
    await deactivateCreatedUser(browser, testInfo.project.use.baseURL, createdThisRunEmail);
    forgetEntity('owner', 'coach');
  });

  test.beforeEach(async ({ loginAs }) => {
    await loginAs('owner');
  });

  /**
   * TC-71990 Add coach manually
   * [step 1] Перейти в coach → [step 1.1] открылась таблица со всеми коучами, если есть
   * [step 2] Нажать "New coach" → [step 2.1] открылась форма; [step 2.2] поля full name, email, password, confirm password, phone (optional)
   * [step 3] Заполнить все поля
   * [step 4] Сохранить → [step 4.1] коуч отобразился в таблице; [step 4.2] велком-письмо (пропускаем — проверка email)
   */
  test('should create a coach and show it in the table', async ({ page }) => {
    await allure.allureId('71990');
    const coachPage = new CoachPage(page);
    const stamp = Date.now();
    const coach = { firstName: `Coach${stamp}`, fullName: `Coach${stamp} Auto`, email: `dtimokhin+temp-coach-${stamp}@aexsoft.com` }; // +temp- — маркер для чистки (AGENTS.md §9)

    // [step 1]
    await coachPage.goto();
    await expect(coachPage.heading).toBeVisible();

    // [step 2]
    await coachPage.clickNewCoach();
    await expect(coachPage.newCoachHeading).toBeVisible();
    await expect(coachPage.firstNameInput).toBeVisible();
    await expect(coachPage.lastNameInput).toBeVisible();
    await expect(coachPage.emailInput).toBeVisible();
    await expect(coachPage.passwordInput).toBeVisible();
    await expect(coachPage.confirmPasswordInput).toBeVisible();
    await expect(coachPage.phoneInput).toBeVisible();

    // [step 3]
    await coachPage.fillCoachForm({
      firstName: coach.firstName,
      lastName: 'Auto',
      email: coach.email,
      // Общий пароль тестовых аккаунтов — из .env, не из кода (AGENTS.md §5)
      password: CREDENTIALS.coach.password,
      confirmPassword: CREDENTIALS.coach.password,
    });
    await coachPage.phoneInput.fill('+1234567890');

    // [step 4]
    await coachPage.createButton.click();
    await coachPage.waitForLoading();

    // [step 4.1]
    await coachPage.search(coach.firstName);
    await expect(coachPage.getRowByName(coach.fullName)).toBeVisible({ timeout: TIMEOUTS.long });
    rememberEntity('owner', 'coach', coach);
    createdThisRunEmail = coach.email;
  });

  /**
   * TC-72057 View coach (на коуче из TC-71990)
   * [step 1] Перейти в coach → [step 1.1] таблица Name, Email, Phone, действия view + edit; [step 1.2] есть кнопки view; [step 1.3] есть new coach
   * [step 2] Поиск по name → [step 2.1] работает
   * [step 3] Поиск по email → [step 3.1] работает
   * [step 4] Пагинация — пропускаем (нет данных для пагинации)
   */
  test('should show coaches table with View action and search by name and email', async ({ page }) => {
    await allure.allureId('72057');
    const coach = recallEntity<Coach>('owner', 'coach', CREATE_COACH_TEST);
    const coachPage = new CoachPage(page);

    // [step 1]
    await coachPage.goto();
    await expect(coachPage.heading).toBeVisible();
    await expect(coachPage.newCoachButton).toBeVisible();

    // [step 2]
    await coachPage.search(coach.firstName);
    await expect(coachPage.getRowByName(coach.fullName)).toBeVisible({ timeout: TIMEOUTS.long });
    await expect(coachPage.getViewButton(coach.fullName)).toBeVisible();

    // [step 3]
    await coachPage.search(coach.email);
    await expect(coachPage.getRowByName(coach.fullName)).toBeVisible();
  });

  /**
   * TC-71991 Edit coach (на коуче из TC-71990)
   * [step 1] Перейти в coach → [step 1.1] открылась таблица
   * [step 2] Нажать edit → [step 2.1] форма first name, last name, email, phone; [step 2.2] email нельзя редактировать
   * [step 3] Отредактировать first name, last name и phone
   * [step 4] Сохранить → [step 4.1] информация отредактирована
   */
  test('should edit coach name and phone, email is read-only', async ({ page }) => {
    await allure.allureId('71991');
    const coach = recallEntity<Coach>('owner', 'coach', CREATE_COACH_TEST);
    const coachPage = new CoachPage(page);
    const editedFirstName = `Edited${coach.firstName}`;

    // [step 1]
    await coachPage.goto();
    await expect(coachPage.heading).toBeVisible();

    // [step 2]
    await coachPage.search(coach.firstName);
    await coachPage.openEditCoach(coach.fullName);
    await expect(coachPage.firstNameInput).toBeVisible();
    await expect(coachPage.lastNameInput).toBeVisible();
    await expect(coachPage.emailInput).toBeVisible();
    await expect(coachPage.phoneInput).toBeVisible();
    await expect(coachPage.emailInput).toHaveAttribute('readonly');

    // [step 3-4]
    await coachPage.editCoach({ firstName: editedFirstName, lastName: 'Edited', phone: '555-0123' });

    // [step 4.1]
    await expect(coachPage.heading).toBeVisible({ timeout: TIMEOUTS.long });
    await coachPage.search(editedFirstName);
    await expect(coachPage.getRowByName(`${editedFirstName} Edited`)).toBeVisible({ timeout: TIMEOUTS.long });
    // Имя изменилось — следующий прогон ищет коуча по новому имени
    rememberEntity('owner', 'coach', { ...coach, firstName: editedFirstName, fullName: `${editedFirstName} Edited` });
  });
});
