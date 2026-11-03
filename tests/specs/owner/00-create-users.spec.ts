import { test, expect } from '@playwright/test';
import { SignInPage } from '../../pages/sign-in-page';
import { AthletePage } from '../../pages/athlete-page';
import { CoachPage } from '../../pages/coach-page';
import { ParentPage } from '../../pages/parent-page';
import { CREDENTIALS, TIMEOUTS } from '../../config';

/**
 * Тест для создания пользователей через интерфейс сайта.
 *
 * Порядок создания: Athlete → Coach → Parent
 * (Parent требует Relationship + Athlete)
 *
 * Каждый email может быть использован только один раз.
 * Тест проверяет, существуют ли пользователи, и создаёт только отсутствующих.
 * Пропускается в CI (describe.skip) — пользователи создаются вручную на стенде.
 */
test.describe.skip('Create Test Users', () => {
  test.describe.configure({ mode: 'serial' });

  test('should create coach, parent, athlete via their respective pages', async ({ page }) => {
    const signInPage = new SignInPage(page);
    const athletePage = new AthletePage(page);
    const coachPage = new CoachPage(page);
    const parentPage = new ParentPage(page);

    // Логинимся как owner
    await signInPage.goto();
    await signInPage.login(CREDENTIALS.owner.email, CREDENTIALS.owner.password);
    await expect(page).not.toHaveURL(/sign-in/);

    // --- Создаём Athlete (если не существует) ---
    await athletePage.goto();

    const athleteExists = await athletePage.isAthleteExists(CREDENTIALS.athlete.email);
    if (!athleteExists) {
      await athletePage.createAthlete({
        firstName: 'Athlete',
        lastName: 'User',
        email: CREDENTIALS.athlete.email,
        password: CREDENTIALS.athlete.password,
        confirmPassword: CREDENTIALS.athlete.password,
        graduationYear: '2010',
        team: 'Team01',
        gender: 'Female',
      });
    }

    // Проверяем athlete через PO метод
    await expect(athletePage.getAthleteRow(CREDENTIALS.athlete.email)).toBeVisible({ timeout: TIMEOUTS.long });

    // --- Создаём Coach (если не существует) ---
    await coachPage.goto();

    const coachExists = await coachPage.isCoachExists(CREDENTIALS.coach.email);
    if (!coachExists) {
      await coachPage.createCoach({
        firstName: 'Coach',
        lastName: 'User',
        email: CREDENTIALS.coach.email,
        password: CREDENTIALS.coach.password,
        confirmPassword: CREDENTIALS.coach.password,
      });
    }

    // Проверяем coach через PO метод
    await expect(coachPage.getCoachRow(CREDENTIALS.coach.email)).toBeVisible({ timeout: TIMEOUTS.medium });

    // --- Создаём Parent (если не существует) ---
    await parentPage.goto();

    const parentExists = await parentPage.isParentExists(CREDENTIALS.parent.email);
    if (!parentExists) {
      await parentPage.createParent({
        firstName: 'Parent',
        lastName: 'User',
        email: CREDENTIALS.parent.email,
        password: CREDENTIALS.parent.password,
        confirmPassword: CREDENTIALS.parent.password,
        relationship: 'Mother',
        athleteName: 'Athlete',
      });
    }

    // Проверяем parent через PO метод
    await expect(parentPage.getParentRow(CREDENTIALS.parent.email)).toBeVisible({ timeout: TIMEOUTS.medium });
  });
});
