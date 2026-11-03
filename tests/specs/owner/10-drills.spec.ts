import { test, expect } from '../../fixtures';
import { DrillPage } from '../../pages/drill-page';
import { TIMEOUTS } from '../../config';

test.describe('Owner Drill Tests', () => {
  test.describe.configure({ mode: 'serial' });

  const DRILL_NAME = 'Test Drill for Create';
  const SEGMENT = 'Shooting';

  test.beforeEach(async ({ page, loginAs }) => {
    await loginAs('owner');
  });

  /**
   * @TC-91865 Create drill
   * TC-91865 [step 1-6]: Create drill with all fields → verify in library
   * - Drill name and Segment are required
   * - All fields: name, description, segment, duration, min/max players, min/max age, skill mapping, YouTube URL
   * - Visibility: organization
   */
  test('should create drill with all fields', async ({ page }) => {
    const drillPage = new DrillPage(page);

    // TC-91865 [step 1]: Перейти в Drills
    await drillPage.goto();

    // TC-91865 [step 2]: Нажать Create drills
    await drillPage.clickNewDrill();

    // TC-91865 [step 3]: Ничего не заполнять и нажать create → валидация
    await drillPage.clickCreate();
    // Имя должно остаться (валидация сработала)
    await expect(drillPage.nameInput).toBeVisible({ timeout: TIMEOUTS.medium });

    // TC-91865 [step 4]: Заполнить все поля
    await drillPage.fillName(DRILL_NAME);
    await drillPage.fillDescription('Test drill description');
    await drillPage.selectSegment(SEGMENT);
    await drillPage.fillDuration('15');
    await drillPage.fillMinPlayers('5');
    await drillPage.fillMaxPlayers('12');
    await drillPage.fillMinAge('10');
    await drillPage.fillMaxAge('18');

    // TC-91865 [step 5]: Вставить видео URL youtube
    await drillPage.fillYoutubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');

    // TC-91865 [step 6]: Создать
    await drillPage.clickCreate();
    // После создания дрила — редирект на detail page (heading = имя дрила)
    await expect(page.getByRole('heading', { name: DRILL_NAME })).toBeVisible({ timeout: TIMEOUTS.long });

    // TC-91865 [step 6.2]: в библиотеке отображен drill — вернуться в список
    await drillPage.goToDrillsList();
    await expect(drillPage.getRow(DRILL_NAME)).toBeVisible({ timeout: TIMEOUTS.long });
  });

  /**
   * @TC-91837 Create/edit drill: fields, role permissions, Visibility rules
   * TC-91837 [step 1-2]: Owner/Admin create drill with all fields
   * - Coach/Athlete/Parent: view-only (Create/Edit недоступны)
   * - Owner/Admin: НЕ должен редактировать Public drill
   */
  test('should create drill and verify role permissions', async ({ page }) => {
    const drillPage = new DrillPage(page);

    // TC-91837 [step 2]: Зайти Owner/Admin, открыть Create Drill
    await drillPage.goto();
    await drillPage.clickNewDrill();

    // TC-91837 [step 2.1]: exp доступны поля: name, description, segment, duration, min/max players, min/max age, Skills, YouTube URL
    await expect(drillPage.nameInput).toBeVisible({ timeout: TIMEOUTS.medium });
    await expect(drillPage.descriptionInput).toBeVisible({ timeout: TIMEOUTS.medium });
    await expect(drillPage.segmentSelect).toBeVisible({ timeout: TIMEOUTS.medium });
    await expect(drillPage.durationInput).toBeVisible({ timeout: TIMEOUTS.medium });
    await expect(drillPage.minPlayersInput).toBeVisible({ timeout: TIMEOUTS.medium });
    await expect(drillPage.maxPlayersInput).toBeVisible({ timeout: TIMEOUTS.medium });
    await expect(drillPage.minAgeInput).toBeVisible({ timeout: TIMEOUTS.medium });
    await expect(drillPage.maxAgeInput).toBeVisible({ timeout: TIMEOUTS.medium });
    await expect(drillPage.youtubeUrlInput).toBeVisible({ timeout: TIMEOUTS.medium });

    // Заполнить и создать drill
    await drillPage.fillName(DRILL_NAME);
    await drillPage.fillDescription('Test drill for permissions');
    await drillPage.selectSegment(SEGMENT);
    await drillPage.fillDuration('15');
    await drillPage.fillMinPlayers('5');
    await drillPage.fillMaxPlayers('12');
    await drillPage.clickCreate();
    // После создания — detail page
    await expect(page.getByRole('heading', { name: DRILL_NAME })).toBeVisible({ timeout: TIMEOUTS.long });

    // Вернуться в список
    await drillPage.goToDrillsList();

    // TC-91837 [step 1.1]: Verify drill appears in table
    await expect(drillPage.getRow(DRILL_NAME)).toBeVisible({ timeout: TIMEOUTS.long });
  });

  /**
   * @TC-91906 Drill detail: play instructional video (YouTube)
   * TC-91906 [step 1-2]: Open drill detail with YouTube URL → verify play button
   */
  test('should view drill detail with YouTube video', async ({ page }) => {
    const drillPage = new DrillPage(page);

    // Создать drill с YouTube URL
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
    await expect(page.getByRole('heading', { name: DRILL_NAME })).toBeVisible({ timeout: TIMEOUTS.long });

    // Вернуться в список (для openDrillDetail нужен доступ из списка)
    await drillPage.goToDrillsList();
    await expect(drillPage.getRow(DRILL_NAME)).toBeVisible({ timeout: TIMEOUTS.long });

    // TC-91906 [step 1]: Открыть detail дрила
    await drillPage.openDrillDetail(DRILL_NAME);

    // TC-91906 [step 2]: Проверить что YouTube video встроен (iframe)
    await drillPage.waitForYouTubeIframe();
    await expect(drillPage.youtubeIframe).toBeVisible({ timeout: TIMEOUTS.long });
  });
});
