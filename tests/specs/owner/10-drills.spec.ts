import * as allure from 'allure-js-commons';
import { test, expect } from '../../fixtures';
import { DrillPage } from '../../pages/drill-page';
import { TIMEOUTS } from '../../config';

/**
 * Дрилл создаёт только TC-74151 (удалить дрилл на стенде нельзя): уникальное имя сохраняется сюда,
 * TC-72683 открывает этот же дрилл. Раньше каждый тест файла создавал свой дрилл с тем же именем (REVIEW-PLAN 2.8).
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

    // TC-74151 [step 3]: Ничего не заполнять и нажать create → Drill name и Segment обязательны.
    // Проверяем состояние полей, а не текст: сейчас под именем сырое сообщение валидатора
    // «String must contain at least 1 character(s)», его, вероятно, заменят
    await drillPage.clickCreate();
    await expect(drillPage.nameInput, 'Drill name should be required').toHaveAttribute('aria-invalid', 'true');
    await expect(drillPage.segmentSelect, 'Segment should be required').toHaveAttribute('aria-invalid', 'true');
    await expect(page, 'Empty drill should not be created').toHaveURL(/\/drills\/new/);

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
   * TC-72684 Create/edit drill: fields, role permissions, Visibility rules — тест покрывает только шаг 2.
   * TODO(72684): не хватает шагов кейса —
   *   [1] Coach/Athlete/Parent: Create/Edit недоступны (частично есть в *-permissions);
   *   [3] SysAdmin: при создании есть дропдаун Visibility (Public / Organization);
   *   [4] Owner/Admin не может редактировать Public-дрилл;
   *   [5] SysAdmin меняет Visibility Organization → Public на Edit.
   * Шаг 2 проверяется без сохранения формы — дрилл не создаётся.
   */
  test('should show all drill fields in the create form', async ({ page }) => {
    await allure.allureId('72684');
    test.skip(true, 'TODO(72684): covers only step 2 (create form fields); role and visibility steps are not implemented');
    const drillPage = new DrillPage(page);

    // [step 2] Owner/Admin открывает Create Drill → доступны поля: name, description, segment, duration,
    // min/max players, min/max age, YouTube URL
    await drillPage.goto();
    await drillPage.clickNewDrill();
    await expect(drillPage.nameInput).toBeVisible();
    await expect(drillPage.descriptionInput).toBeVisible();
    await expect(drillPage.segmentSelect).toBeVisible();
    await expect(drillPage.durationInput).toBeVisible();
    await expect(drillPage.minPlayersInput).toBeVisible();
    await expect(drillPage.maxPlayersInput).toBeVisible();
    await expect(drillPage.minAgeInput).toBeVisible();
    await expect(drillPage.maxAgeInput).toBeVisible();
    await expect(drillPage.youtubeUrlInput).toBeVisible();
  });

  /**
   * TC-72683 Drill detail: play instructional video (YouTube)
   * Дрилл с YouTube URL создан в TC-74151 — здесь только открываем его.
   */
  test('should view drill detail with YouTube video', async ({ page }) => {
    await allure.allureId('72683');
    expect(DRILL_NAME, 'Requires the drill created by TC-74151 (serial mode)').toBeDefined();
    const drillPage = new DrillPage(page);

    // [step 1] Открыть detail дрила с YouTube URL
    await drillPage.goto();
    await expect(drillPage.getCard(DRILL_NAME)).toBeVisible({ timeout: TIMEOUTS.long });
    await drillPage.openDrillDetail(DRILL_NAME);

    // [step 2] Видео встроено (iframe YouTube)
    await drillPage.waitForYouTubeIframe();
    await expect(drillPage.youtubeIframe).toBeVisible({ timeout: TIMEOUTS.long });
  });
});
