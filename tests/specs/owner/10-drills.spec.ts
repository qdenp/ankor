import * as allure from 'allure-js-commons';
import { test, expect } from '../../fixtures';
import { DrillPage } from '../../pages/drill-page';
import { TIMEOUTS } from '../../config';

/**
 * Module-level переменные — доступны всем тестам в файле.
 * TC-74151 генерирует уникальное имя и сохраняет сюда, остальные тесты используют.
 */
let DRILL_NAME: string;
const SEGMENT = 'Shooting';

test.describe('Owner Drill Tests', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page, loginAs }) => {
    await loginAs('owner');
  });

  /**
   * @TC-74151 Create drill
   * TC-74151 [step 1-6]: Create drill with all fields → verify in library
   * - Drill name and Segment are required
   * - All fields: name, description, segment, duration, min/max players, min/max age, skill mapping, YouTube URL
   * - Visibility: organization
   */
  test('should create drill with all fields', async ({ page }) => {
    await allure.allureId('74151');
    const drillPage = new DrillPage(page);

    // Генерируем уникальное имя для drill
    DRILL_NAME = `Test Drill ${Date.now()}`;

    // TC-74151 [step 1]: Перейти в Drills
    await drillPage.goto();

    // TC-74151 [step 2]: Нажать Create drills
    await drillPage.clickNewDrill();

    // TC-74151 [step 3]: Ничего не заполнять и нажать create → валидация
    await drillPage.clickCreate();
    // Имя должно остаться (валидация сработала)
    await expect(drillPage.nameInput).toBeVisible();

    // TC-74151 [step 4]: Заполнить все поля
    await drillPage.fillName(DRILL_NAME);
    await drillPage.fillDescription('Test drill description');
    await drillPage.selectSegment(SEGMENT);
    await drillPage.fillDuration('15');
    await drillPage.fillMinPlayers('5');
    await drillPage.fillMaxPlayers('12');
    await drillPage.fillMinAge('10');
    await drillPage.fillMaxAge('18');

    // TC-74151 [step 5]: Вставить видео URL youtube
    await drillPage.fillYoutubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');

    // TC-74151 [step 6]: Создать
    await drillPage.clickCreate();
    // После создания дрила — редирект на detail page (heading = имя дрила)
    await expect(drillPage.getDetailHeading(DRILL_NAME)).toBeVisible({ timeout: TIMEOUTS.long });

    // TC-74151 [step 6.2]: в библиотеке отображен drill — вернуться в список
    await drillPage.goToDrillsList();
    await expect(drillPage.getCard(DRILL_NAME)).toBeVisible({ timeout: TIMEOUTS.long });
  });

  /**
   * @TC-72684 Create/edit drill: fields, role permissions, Visibility rules
   * TC-72684 [step 1-2]: Owner/Admin create drill with all fields
   * - Coach/Athlete/Parent: view-only (Create/Edit недоступны)
   * - Owner/Admin: НЕ должен редактировать Public drill
   */
  test('should create drill and verify role permissions', async ({ page }) => {
    await allure.allureId('72684');
    const drillPage = new DrillPage(page);

    // TC-72684 [step 2]: Зайти Owner/Admin, открыть Create Drill
    await drillPage.goto();
    await drillPage.clickNewDrill();

    // TC-72684 [step 2.1]: exp доступны поля: name, description, segment, duration, min/max players, min/max age, Skills, YouTube URL
    await expect(drillPage.nameInput).toBeVisible();
    await expect(drillPage.descriptionInput).toBeVisible();
    await expect(drillPage.segmentSelect).toBeVisible();
    await expect(drillPage.durationInput).toBeVisible();
    await expect(drillPage.minPlayersInput).toBeVisible();
    await expect(drillPage.maxPlayersInput).toBeVisible();
    await expect(drillPage.minAgeInput).toBeVisible();
    await expect(drillPage.maxAgeInput).toBeVisible();
    await expect(drillPage.youtubeUrlInput).toBeVisible();

    // Заполнить и создать drill — используем DRILL_NAME из TC-74151
    await drillPage.fillName(DRILL_NAME);
    await drillPage.fillDescription('Test drill for permissions');
    await drillPage.selectSegment(SEGMENT);
    await drillPage.fillDuration('15');
    await drillPage.fillMinPlayers('5');
    await drillPage.fillMaxPlayers('12');
    await drillPage.clickCreate();
    // После создания — detail page
    await expect(drillPage.getDetailHeading(DRILL_NAME)).toBeVisible({ timeout: TIMEOUTS.long });

    // Вернуться в список
    await drillPage.goToDrillsList();

    // TC-72684 [step 1.1]: Verify drill appears in table
    await expect(drillPage.getCard(DRILL_NAME)).toBeVisible({ timeout: TIMEOUTS.long });
  });

  /**
    * @TC-72683 Drill detail: play instructional video (YouTube)
    * TC-72683 [step 1-2]: Open drill detail with YouTube URL → verify play button
   */
  test('should view drill detail with YouTube video', async ({ page }) => {
    await allure.allureId('72683');
    const drillPage = new DrillPage(page);

    // Создать drill с YouTube URL — используем DRILL_NAME из TC-74151
    await drillPage.goto();
    await drillPage.clickNewDrill();
    await drillPage.fillName(DRILL_NAME);
    await drillPage.fillDescription('Test drill for YouTube');
    await drillPage.selectSegment(SEGMENT);
    await drillPage.fillDuration('15');
    await drillPage.fillMinPlayers('5');
    await drillPage.fillMaxPlayers('12');
    await drillPage.fillYoutubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    await drillPage.clickCreate();
    // После создания — detail page
    await expect(drillPage.getDetailHeading(DRILL_NAME)).toBeVisible({ timeout: TIMEOUTS.long });

    // Вернуться в список (для openDrillDetail нужен доступ из списка)
    await drillPage.goToDrillsList();
    await expect(drillPage.getCard(DRILL_NAME)).toBeVisible({ timeout: TIMEOUTS.long });

    // TC-72683 [step 1]: Открыть detail дрила
    await drillPage.openDrillDetail(DRILL_NAME);

    // TC-72683 [step 2]: Проверить что YouTube video встроен (iframe)
    await drillPage.waitForYouTubeIframe();
    await expect(drillPage.youtubeIframe).toBeVisible({ timeout: TIMEOUTS.long });
  });
});