import { test, expect, Locator } from '@playwright/test';
import { SignInPage } from '../pages/sign-in-page';
import { AthletePage } from '../pages/athlete-page';
import { CoachPage } from '../pages/coach-page';
import { ParentPage } from '../pages/parent-page';
import { OrgSignUpPage } from '../pages/org-signup-page';
import { OrganizationPage } from '../pages/organization-page';
import { PlanPage } from '../pages/plan-page';
import { TeamPage } from '../pages/team-page';
import { EvaluationPage } from '../pages/evaluation-page';
import { CREDENTIALS, MULTI_CHILD_PARENT, ORGANIZATIONS, PLANS, SECOND_TEAM_ATHLETE, TIMEOUTS } from '../config';

/**
 * Тест для создания пользователей через интерфейс сайта.
 *
 * Порядок создания: Athlete → Coach → Parent
 * (Parent требует Relationship + Athlete)
 *
 * Каждый email может быть использован только один раз.
 * Тест проверяет, существуют ли пользователи, и создаёт только отсутствующих.
 * Не тест, а подготовка данных для нового стенда: отдельный проект setup, в test:all и CI не входит.
 * Запуск: npm run test:setup
 */
/**
 * Поиск в списках фильтрует на сервере, с задержкой: дождаться, что кроме строки заголовков остались только
 * строки с искомым текстом (или ни одной) — иначе проверка «уже есть» читает ещё полный список.
 */
async function waitForSearchApplied(rows: Locator, text: string): Promise<void> {
  await expect(rows.filter({ hasNotText: text }), `List should be filtered by "${text}"`).toHaveCount(1, { timeout: TIMEOUTS.long });
}

test.describe('Create Test Users', () => {
  // Без ретраев: повтор регистрации организации с тем же email упал бы на дубликате и скрыл настоящую причину
  test.describe.configure({ mode: 'serial', retries: 0 });

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
    await expect(coachPage.getCoachRow(CREDENTIALS.coach.email)).toBeVisible();

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
    await expect(parentPage.getParentRow(CREDENTIALS.parent.email)).toBeVisible();
  });

  /**
   * Отдельная организация для sysadmin/04-organization (редактирование имени): с организацией owner
   * тесты owner и sysadmin правили одно имя параллельно и сбивали друг друга.
   * Запускать один раз: повторная регистрация с тем же email не пройдёт, удалить организацию нельзя.
   *   npm run test:setup -- --grep "organization for sysadmin"
   */
  test('should create organization for sysadmin edit test', async ({ page, browser, baseURL }) => {
    const org = ORGANIZATIONS.sysadminEdit;
    const password = process.env.ANKOR_SYSEDIT_ORG_PASSWORD;
    if (!password) throw new Error('ANKOR_SYSEDIT_ORG_PASSWORD is required. Set it in .env file.');

    // Регистрация — в чистом контексте, без чьей-либо сессии
    const signUpContext = await browser.newContext({ baseURL });
    const signUpPage = await signUpContext.newPage();
    const orgSignUpPage = new OrgSignUpPage(signUpPage);
    await orgSignUpPage.goto();
    await orgSignUpPage.createOrganization({
      adminFirstName: 'Sysadmin',
      adminLastName: 'Edit Test',
      adminEmail: org.adminEmail,
      adminPhone: '5555550102',
      password,
      organizationName: org.name,
      sport: 'Lacrosse',
      gender: 'Coed',
      teamName: `${org.name} Team`,
    });
    await expect(signUpPage).not.toHaveURL(/org-signup/, { timeout: TIMEOUTS.long });
    await signUpContext.close();

    // Проверка: sysadmin находит новую организацию по email админа
    const signInPage = new SignInPage(page);
    const orgPage = new OrganizationPage(page);
    await signInPage.goto();
    await signInPage.login(CREDENTIALS.sysadmin.email, CREDENTIALS.sysadmin.password);
    await expect(page).not.toHaveURL(/sign-in/);
    await orgPage.gotoOrganizationsList();
    await orgPage.waitForDataGridLoaded();
    await orgPage.search(org.adminEmail);
    await expect(orgPage.getOrgRowByEmail(org.adminEmail)).toBeVisible({ timeout: TIMEOUTS.long });
  });

  /**
   * План owner, в который приглашён атлет — для тестов вкладки Invited (athlete/13-plans, 72609).
   * Запускать один раз: npm run test:setup -- --grep "invite athlete"
   */
  test('should create a plan and invite athlete', async ({ page }) => {
    const plan = PLANS.athleteInvited;
    const signInPage = new SignInPage(page);
    const planPage = new PlanPage(page);

    await signInPage.goto();
    await signInPage.login(CREDENTIALS.owner.email, CREDENTIALS.owner.password);
    await expect(page).not.toHaveURL(/sign-in/);

    await planPage.goto();
    await planPage.clickNewPlan();
    await planPage.fillPlanForm({ name: plan.name });
    await planPage.addFirstDrill();
    await planPage.savePlanAndReturnToMyPlans();

    await planPage.search(plan.name);
    await expect(planPage.getPlanCard(plan.name)).toBeVisible({ timeout: TIMEOUTS.long });
    await planPage.viewPlan(plan.name);
    await planPage.inviteUser(plan.invitee);
  });

  /**
   * Родитель двух атлетов из разных команд с отчётами у обоих — для 71604 (parent/17-evaluation-reports).
   * Создаёт команду Team02, атлета Athlete Second в ней, ОДИН неудаляемый отчёт на него (Submit — согласовано
   * с пользователем 2026-11-23) и Parent Multi с детьми Athlete Last (Team01) и Athlete Second.
   * Запускать один раз: npm run test:setup -- --grep "parent of two athletes"
   * Повторный запуск пропускается, если Parent Multi уже есть. Submit — только для только что созданного атлета.
   */
  test('should create a parent of two athletes from different teams', async ({ page }) => {
    // Команда, атлет, оценка с Submit и родитель — дольше общего таймаута 60 с
    test.setTimeout(TIMEOUTS.long * 6);
    const athlete = SECOND_TEAM_ATHLETE;
    const parent = MULTI_CHILD_PARENT;
    // Пароль у всех тестовых аккаунтов один (AGENTS §5)
    const password = CREDENTIALS.parent.password;
    const signInPage = new SignInPage(page);
    const teamPage = new TeamPage(page);
    const athletePage = new AthletePage(page);
    const evaluationPage = new EvaluationPage(page);
    const parentPage = new ParentPage(page);

    await signInPage.goto();
    await signInPage.login(CREDENTIALS.owner.email, CREDENTIALS.owner.password);
    await expect(page).not.toHaveURL(/sign-in/);

    // Поиск родителей — только по имени; строка — по email
    const parentName = `${parent.firstName} ${parent.lastName}`;
    await parentPage.goto();
    await parentPage.search(parentName);
    await waitForSearchApplied(parentPage.parentRows, parentName);
    test.skip(await parentPage.isParentExists(parent.email), `${parent.email} already exists`);

    // --- Команда Team02 ---
    await teamPage.goto();
    await teamPage.search(athlete.team);
    await waitForSearchApplied(teamPage.teamRows, athlete.team);
    const teamExisted = await teamPage.getTeamRow(athlete.team).isVisible();
    if (!teamExisted) {
      await teamPage.createTeam({ name: athlete.team, active: true });
    }

    // --- Атлет в Team02 и его единственный отчёт ---
    await athletePage.goto();
    await athletePage.search(athlete.email);
    await waitForSearchApplied(athletePage.athleteRows, athlete.email);
    if (!(await athletePage.isAthleteExists(athlete.email))) {
      // Submit оценивает всю команду: в уже существующей Team02 могут быть другие атлеты — их отчёты были бы
      // лишними и неудаляемыми. Такой стенд — разобрать вручную.
      if (teamExisted) {
        throw new Error(`${athlete.team} already exists without ${athlete.name}: check its athletes manually before Submit`);
      }
      await athletePage.createAthlete({
        firstName: athlete.firstName,
        lastName: athlete.lastName,
        email: athlete.email,
        password,
        confirmPassword: password,
        graduationYear: '2010',
        team: athlete.team,
        gender: 'Male',
      });

      await evaluationPage.goto();
      await evaluationPage.clickNewEvaluation();
      await evaluationPage.selectScorecardTemplate(athlete.evaluationTemplate);
      await evaluationPage.selectTeam(athlete.team);
      await evaluationPage.addSkill('Skill4');
      await evaluationPage.rateCategory(4);
      await evaluationPage.waitForSubmitEnabled();
      await evaluationPage.submit();

      await evaluationPage.gotoReports();
      await expect(evaluationPage.getReportCardsOfAthlete(athlete.name).first()).toBeVisible({ timeout: TIMEOUTS.long });
    }

    // --- Родитель двух детей ---
    await parentPage.goto();
    await parentPage.clickNewParent();
    await parentPage.fillParentForm({ firstName: parent.firstName, lastName: parent.lastName, email: parent.email, password, confirmPassword: password });
    await parentPage.selectRelationship('Mother');
    for (const child of parent.children) await parentPage.selectAthlete(child);
    await parentPage.submitNewParent();

    await parentPage.search(parentName);
    await expect(parentPage.getParentRow(parent.email)).toContainText('2');
  });
});
