import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base-page';
import { TIMEOUTS } from '../config';

/**
 * Page Object для страницы Evaluations и Evaluation Reports.
 * Навигация через левое меню (Evaluations, Evaluation Reports).
 * Поддерживает: Create, View, Edit, Reports.
 */
export class EvaluationPage extends BasePage {
  readonly heading: Locator;
  readonly newEvaluationButton: Locator;
  readonly submitButton: Locator;
  readonly saveAsDraftButton: Locator;
  readonly editButton: Locator;

  // Sidebar links
  readonly sidebarLink: Locator;
  readonly sidebarReportLink: Locator;

  // Form fields
  readonly scorecardTemplateSelect: Locator;
  readonly filterByTeamSelect: Locator;
  readonly filterByPositionSelect: Locator;
  readonly athletesToEvaluateChip: Locator;
  readonly addSkillButton: Locator;

  // Subskills popup
  readonly subskillsPopup: Locator;
  readonly subskillsPopupTitle: Locator;
  readonly doneButton: Locator;
  readonly saveSubskillsButton: Locator;
  readonly subskillCheckboxes: Locator;
  readonly subskillRatingButtons: Locator;

  // Category rating fields (динамические)
  readonly categoryRatingInputs: Locator;
  readonly categoryRatingCells: Locator;
  readonly ratingInput: Locator;

  // Table
  readonly tableRows: Locator;

  // Create button (visible/hidden check)
  readonly createButton: Locator;

  // List navigation and row deletion
  readonly backLink: Locator;
  readonly paginationSummary: Locator;
  readonly deleteMenuItem: Locator;
  readonly deleteDialog: Locator;
  readonly confirmDeleteButton: Locator;

  // View / Edit evaluation screens
  readonly viewEvaluationHeading: Locator;
  readonly editEvaluationHeading: Locator;
  readonly scorecardHeading: Locator;
  readonly teamHeading: Locator;
  readonly athletesEvaluatedHeading: Locator;
  readonly editEvaluationButton: Locator;
  readonly editMenuItem: Locator;

  // Evaluation Reports
  readonly reportsHeading: Locator;
  readonly viewReportButtons: Locator;
  readonly reportContent: Locator;

  constructor(page: Page) {
    super(page);

    this.heading = page.getByRole('heading', { name: 'New evaluation' }).or(
      page.getByRole('heading', { name: 'Evaluations', level: 3 })
    );
    // На пустом списке есть вторая кнопка «Create evaluation» (пустое состояние) — обе открывают форму
    this.newEvaluationButton = page.getByRole('button', { name: 'Create evaluation' }).first();
    this.submitButton = page.getByRole('button', { name: 'Submit' });
    this.saveAsDraftButton = page.getByRole('button', { name: 'Save as draft' });
    this.editButton = page.getByRole('button', { name: 'Edit' });

    // Sidebar links
    this.sidebarLink = page.getByRole('link', { name: 'Evaluations' });
    this.sidebarReportLink = page.getByRole('link', { name: 'Evaluation Reports' });

    // Form fields
    this.scorecardTemplateSelect = page.getByRole('combobox', { name: 'Scorecard template' });
    this.filterByTeamSelect = page.getByRole('combobox', { name: 'Filter by team' });
    this.filterByPositionSelect = page.getByRole('combobox', { name: 'Filter by position' });
    this.athletesToEvaluateChip = page.getByRole('button', { name: /Athlete User|athlete/i });
    this.addSkillButton = page.getByRole('button', { name: 'Add focus skill' }).or(
      page.getByRole('button', { name: 'Add +' })
    );

    // Subskills popup
    this.subskillsPopup = page.getByRole('dialog', { name: 'Rate subskills for Category1' }).or(
      page.getByRole('dialog', { name: 'Select 1-3 skills' }).or(
        page.getByRole('dialog', { name: /Rate subskills/i })
      )
    );
    this.subskillsPopupTitle = page.getByRole('heading', { name: 'Rate subskills for Category1' }).or(
      page.getByRole('heading', { name: 'Select 1-3 skills' }).or(
        page.getByRole('heading', { name: /Rate subskills/i })
      )
    );
    this.doneButton = page.getByRole('button', { name: 'Done' }).or(
      page.getByRole('button', { name: 'Save' })
    );
    this.saveSubskillsButton = page.getByRole('button', { name: 'Save' });
    this.subskillCheckboxes = page.getByRole('checkbox');
    this.subskillRatingButtons = page.getByRole('button', { name: /^(1|2|3|4|5)$/ });

    // Category rating inputs (динамические)
    this.categoryRatingInputs = page.getByRole('textbox', { name: /^(1|2|3|4|5)$/ }).first();
    this.categoryRatingCells = page.getByRole('gridcell').filter({ hasText: '—' });
    this.ratingInput = page.locator('input[type="number"]').first();

    // Table
    this.tableRows = page.getByRole('row');

    // Create button (visible/hidden check)
    this.createButton = page.getByRole('button', { name: /Create|New/i });

    // List navigation and row deletion
    this.backLink = page.getByRole('link', { name: 'Back' });
    // "1-10 of 72 evaluations"; при ≤10 записях (одна страница) подписи нет
    this.paginationSummary = page.getByText(/of \d+ evaluations/);
    this.deleteMenuItem = page.getByRole('menuitem', { name: 'Delete' });
    // Диалог подтверждения: "Delete Team01? This action cannot be undone." [Cancel] [Delete]
    this.deleteDialog = page.getByRole('dialog');
    this.confirmDeleteButton = this.deleteDialog.getByRole('button', { name: 'Delete', exact: true });

    // View / Edit evaluation screens
    this.viewEvaluationHeading = page.getByRole('heading', { name: 'View Evaluation', level: 3 });
    this.editEvaluationHeading = page.getByRole('heading', { name: 'Edit evaluation' });
    this.scorecardHeading = page.getByRole('heading', { name: 'Scorecard', exact: true });
    this.teamHeading = page.getByRole('heading', { name: 'Team', exact: true });
    this.athletesEvaluatedHeading = page.getByRole('heading', { name: 'Athletes evaluated' });
    this.editEvaluationButton = page.getByRole('button', { name: 'Edit Evaluation' });
    this.editMenuItem = page.getByRole('menuitem', { name: 'Edit' });

    // Evaluation Reports: последние 20 отчётов карточками с кнопкой "View Report", новые — первыми.
    // Счётчик «(N)» не больше 20 и реальное число отчётов не отражает.
    this.reportsHeading = page.getByRole('heading', { name: 'Evaluation Reports', level: 3 });
    this.viewReportButtons = page.getByRole('button', { name: 'View Report' });
    // Детали отчёта: шаблон, атлет, дата, категории и подскиллы с оценками ("Skill1 4.0")
    this.reportContent = page.getByRole('main');
  }

  /** Переход на страницу Evaluations через левое меню */
  async goto(): Promise<void> {
    await this.sidebarLink.click();
    await expect(this.newEvaluationButton).toBeVisible({ timeout: TIMEOUTS.medium });
    await this.waitForLoading();
  }

  /** Нажатие кнопки New Evaluation */
  async clickNewEvaluation(): Promise<void> {
    await this.newEvaluationButton.click();
    await expect(this.scorecardTemplateSelect).toBeVisible({ timeout: TIMEOUTS.medium });
  }

  /** Выбор Score Card Template */
  async selectScorecardTemplate(templateName: string): Promise<void> {
    await this.scorecardTemplateSelect.click();
    await expect(this.page.getByRole('option', { name: templateName })).toBeVisible({ timeout: TIMEOUTS.long });
    await this.page.getByRole('option', { name: templateName }).click();
    await expect(this.filterByTeamSelect).toBeVisible({ timeout: TIMEOUTS.medium });
  }

  /** Выбор команды в Filter by team */
  async selectTeam(teamName: string): Promise<void> {
    await this.filterByTeamSelect.click();
    // Dropdown подгружается пару секунд
    await expect(this.page.getByRole('option', { name: teamName })).toBeVisible({ timeout: TIMEOUTS.long });
    await this.page.getByRole('option', { name: teamName }).click();

    // Атлеты автоматически выбираются после загрузки команды
    // Просто ждём появления атлетов в секции "Athletes to evaluate"
    await expect(this.athletesToEvaluateChip).toBeVisible({ timeout: TIMEOUTS.long });
  }

  /** Добавление скилла через popup (скиллы выбираются кликом на текст) */
  async addSkill(skillName: string): Promise<void> {
    // Ждём появления кнопки Add +
    await expect(this.addSkillButton).toBeVisible({ timeout: TIMEOUTS.long });
    await this.addSkillButton.click();
    await expect(this.subskillsPopupTitle).toBeVisible({ timeout: TIMEOUTS.medium });

    // Найти и выбрать скилл — кликаем на текст навыка
    const skillText = this.page.getByRole('button', { name: skillName, exact: true });
    await expect(skillText).toBeVisible({ timeout: TIMEOUTS.medium });
    await skillText.click();

    // Сохранить
    await this.doneButton.click();
    await expect(this.subskillsPopup).toBeHidden({ timeout: TIMEOUTS.medium });
  }

  /** Выставление оценки для скилла в popup */
  async setSubskillRating(skillName: string, rating: number): Promise<void> {
    // Rating buttons найдены для всех скиллов — берём первый найденный
    const ratingButton = this.page.getByRole('button', { name: String(rating) }).first();
    await expect(ratingButton).toBeVisible({ timeout: TIMEOUTS.medium });
    await ratingButton.click();
  }

  /** Сохранение оценок в popup */
  async saveSubskillRatings(): Promise<void> {
    await this.saveSubskillsButton.click();
    await expect(this.subskillsPopup).toBeHidden({ timeout: TIMEOUTS.medium });
  }

  /** Клик на rating-ячейку категории ("—") и ввод оценки */
  async rateCategory(rating: number): Promise<void> {
    const cell = this.categoryRatingCells.first();
    await expect(cell).toBeVisible({ timeout: TIMEOUTS.medium });
    await cell.click();
    // Ждём появления input
    const input = this.ratingInput;
    await expect(input).toBeVisible({ timeout: TIMEOUTS.medium });
    await input.fill(String(rating));
    await this.page.keyboard.press('Tab');
  }

  /** Изменение существующей оценки в rating-ячейке (когда уже есть значение) */
  async updateCategoryRating(rating: number): Promise<void> {
    // Клик на ячейку с текущей оценкой (не на "—")
    const ratingCell = this.page.getByRole('gridcell').filter({ hasText: /^\d+$/ }).first();
    await expect(ratingCell).toBeVisible({ timeout: TIMEOUTS.medium });
    await ratingCell.click();
    // Ждём появления input
    const input = this.ratingInput;
    await expect(input).toBeVisible({ timeout: TIMEOUTS.medium });
    await input.fill(String(rating));
    await this.page.keyboard.press('Tab');
  }

  /** Подождать пока кнопка Submit станет enabled */
  async waitForSubmitEnabled(): Promise<void> {
    await expect(this.submitButton).toBeEnabled({ timeout: TIMEOUTS.long });
  }

  /** Rating ячейка с "—" для ввода оценки */
  getRatingCell(): Locator {
    return this.page.getByRole('gridcell').filter({ hasText: '—' }).first();
  }

  /** Number input для ввода оценки */
  getRatingInput(): Locator {
    return this.ratingInput;
  }

  /** Переход на страницу Evaluation Reports */
  async gotoReports(): Promise<void> {
    await this.sidebarReportLink.click();
    await expect(this.reportsHeading).toBeVisible({ timeout: TIMEOUTS.medium });
    await this.waitForLoading();
  }

  /** Открыть самый новый отчёт (первый в списке) */
  async openNewestReport(): Promise<void> {
    await this.viewReportButtons.first().click();
    await expect(this.page).toHaveURL(/\/reports\/evaluation-reports\/.+/, { timeout: TIMEOUTS.long });
    await this.waitForLoading();
  }

  /** Строка категории в сетке оценок (создание, просмотр, редактирование): "Category1 4" */
  getCategoryRow(categoryName: string): Locator {
    return this.tableRows.filter({ hasText: categoryName });
  }

  /** Открыть просмотр самого нового черновика (In Progress) из списка */
  async openNewestDraftView(): Promise<void> {
    await this.tableRows.filter({ hasText: 'In Progress' }).first().getByRole('button', { name: 'View' }).click();
    await expect(this.viewEvaluationHeading).toBeVisible({ timeout: TIMEOUTS.long });
    await this.waitForLoading();
  }

  /** Открыть редактирование самого нового черновика через More actions → Edit */
  async openNewestDraftEdit(): Promise<void> {
    await this.tableRows.filter({ hasText: 'In Progress' }).first().getByRole('button', { name: 'More actions' }).click();
    await this.editMenuItem.click();
    await expect(this.editEvaluationHeading).toBeVisible({ timeout: TIMEOUTS.long });
    await this.waitForLoading();
  }

  /** Проверить что evaluation report существует в таблице */
  async verifyReportExists(templateName: string): Promise<void> {
    // Report row should contain the template name
    const reportRow = this.page.getByRole('row', { name: templateName });
    await expect(reportRow).toBeVisible({ timeout: TIMEOUTS.long });
  }

  /** Создание оценки */
  async createEvaluation(params: {
    templateName: string;
    teamName: string;
    skillName: string;
  }): Promise<void> {
    await this.clickNewEvaluation();
    await this.selectScorecardTemplate(params.templateName);
    await this.selectTeam(params.teamName);
    await this.addSkill(params.skillName);
    await this.submit();
  }

  /**
   * Отправить оценку (Submit) и дождаться списка.
   * ВНИМАНИЕ: Submit создаёт Evaluation Report, который в интерфейсе удалить нельзя —
   * вызывать только в тестах, которым нужна именно отправленная оценка/отчёт.
   */
  async submit(): Promise<void> {
    await this.submitButton.click();
    // Ждём именно список (/evaluations), а не любой адрес с "/evaluations": форма открыта на
    // /evaluations/create или /evaluations/<id>/edit, и /\/evaluations/ совпадал до отправки
    await expect(this.page).toHaveURL(/\/evaluations\/?(\?.*)?$/, { timeout: TIMEOUTS.long });
    await this.waitForLoading();
  }

  /** Сохранить оценку как черновик (In Progress) и дождаться списка. Черновик удаляется — см. deleteDraftsCreatedSince */
  async saveAsDraft(): Promise<void> {
    await this.saveAsDraftButton.click();
    await expect(this.page.getByRole('heading', { name: 'Evaluations', level: 3 })).toBeVisible({ timeout: TIMEOUTS.medium });
    await this.waitForLoading();
  }

  /** Вернуться со страницы оценки в список (ссылка Back) */
  async backToList(): Promise<void> {
    await this.backLink.click();
    await expect(this.newEvaluationButton).toBeVisible({ timeout: TIMEOUTS.long });
    await this.waitForLoading();
  }

  /** Получить локатор строки оценки в таблице.
   * Ищет по имени шаблона или имени команды (имя скилла не отображается в таблице).
   */
  getRow(templateOrTeam: string): Locator {
    const byRole = this.page.getByRole('row', { name: templateOrTeam });
    const byCell = this.page.locator('tr', { hasText: templateOrTeam }).first();
    const byText = this.page.getByText(templateOrTeam, { exact: false }).first();
    return byRole.or(byCell).or(byText).first();
  }

  /** Получить кнопку Edit в строке таблицы */
  getEditButton(name: string): Locator {
    return this.getRow(name).getByRole('button', { name: 'Edit' });
  }

  /**
   * Сколько оценок в списке (данные уже загружены).
   * Берётся из подписи "1-10 of N evaluations"; при ≤10 записях подписи нет — тогда считаем строки данных.
   */
  async countEvaluations(): Promise<number> {
    if (await this.paginationSummary.count()) {
      const match = (await this.paginationSummary.first().innerText()).match(/of (\d+) evaluations/);
      return match ? Number(match[1]) : 0;
    }
    return Math.max(0, (await this.tableRows.count()) - 1); // минус строка заголовка
  }

  /**
   * Cleanup: удалить черновики (In Progress), созданные начиная с `since` (точность колонки CREATED — минута).
   * Чужие и более старые записи не трогает. Отправленные оценки в этом списке не видны (они в Evaluation Reports).
   * Новые записи — в начале списка, поэтому достаточно первой страницы.
   */
  async deleteDraftsCreatedSince(since: Date): Promise<void> {
    // Запас в 1 минуту: CREATED ставит сервер, `since` — машина с тестами; часы могут расходиться
    const fromMinute = new Date(since.getTime() - 60_000);
    fromMinute.setSeconds(0, 0);
    await this.goto();

    const drafts = this.tableRows.filter({ hasText: 'In Progress' });
    for (let attempt = 0; attempt < 20; attempt++) {
      const texts = await drafts.allInnerTexts();
      const index = texts.findIndex((text) => {
        const created = EvaluationPage.parseCreated(text);
        return created !== null && created >= fromMinute;
      });
      if (index < 0) return;

      const before = await this.countEvaluations();
      await drafts.nth(index).getByRole('button', { name: 'More actions' }).click();
      await this.deleteMenuItem.click();
      await this.confirmDeleteButton.click();
      await expect(this.deleteDialog).toBeHidden({ timeout: TIMEOUTS.medium });
      await this.waitForLoading();
      await expect.poll(() => this.countEvaluations(), { timeout: TIMEOUTS.long }).toBe(before - 1);
    }
    throw new Error('deleteDraftsCreatedSince: more than 20 drafts created by one test — check the test');
  }

  /** Дата из колонки CREATED строки: "Nov 09, 2026 at 11:48pm" (часовой пояс браузера = системный) */
  private static parseCreated(rowText: string): Date | null {
    const m = rowText.match(/([A-Z][a-z]{2}) (\d{1,2}), (\d{4}) at (\d{1,2}):(\d{2})(am|pm)/);
    if (!m) return null;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    let hours = Number(m[4]) % 12;
    if (m[6] === 'pm') hours += 12;
    return new Date(Number(m[3]), months.indexOf(m[1]), Number(m[2]), hours, Number(m[5]));
  }
}
