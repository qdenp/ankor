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
  readonly newEvaluationButton: ReturnType<this['page']['getByRole']>;
  readonly submitButton: ReturnType<this['page']['getByRole']>;
  readonly saveAsDraftButton: ReturnType<this['page']['getByRole']>;
  readonly editButton: ReturnType<this['page']['getByRole']>;

  // Sidebar links
  readonly sidebarLink: ReturnType<this['page']['getByRole']>;
  readonly sidebarReportLink: ReturnType<this['page']['getByRole']>;

  // Form fields
  readonly scorecardTemplateSelect: ReturnType<this['page']['getByRole']>;
  readonly filterByTeamSelect: ReturnType<this['page']['getByRole']>;
  readonly filterByPositionSelect: ReturnType<this['page']['getByRole']>;
  readonly athletesToEvaluateChip: Locator;
  readonly addSkillButton: ReturnType<this['page']['getByRole']>;

  // Subskills popup
  readonly subskillsPopup: Locator;
  readonly subskillsPopupTitle: Locator;
  readonly doneButton: ReturnType<this['page']['getByRole']>;
  readonly saveSubskillsButton: ReturnType<this['page']['getByRole']>;
  readonly subskillCheckboxes: Locator;
  readonly subskillRatingButtons: ReturnType<this['page']['getByRole']>;

  // Category rating fields (динамические)
  readonly categoryRatingInputs: Locator;
  readonly categoryRatingCells: Locator;

  // Table
  readonly tableRows: ReturnType<this['page']['getByRole']>;

  // Create button (visible/hidden check)
  readonly createButton: ReturnType<this['page']['getByRole']>;

  constructor(page: Page) {
    super(page);

    this.heading = page.getByRole('heading', { name: 'New evaluation' }).or(
      page.getByRole('heading', { name: 'Evaluations', level: 3 })
    );
    this.newEvaluationButton = page.getByRole('button', { name: 'Create evaluation' });
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
  }

  /** Переход на страницу Evaluations через левое меню */
  async goto(): Promise<void> {
    await this.sidebarLink.click();
    await this.page.waitForLoadState('domcontentloaded');
    await expect(this.newEvaluationButton).toBeVisible({ timeout: TIMEOUTS.medium });
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
    await this.page.waitForLoadState('domcontentloaded');
    await expect(this.page.getByRole('heading', { name: 'Evaluation Reports', level: 3 })).toBeVisible({ timeout: TIMEOUTS.medium });
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

    await this.submitButton.click();
    await expect(this.page).toHaveURL(/\/evaluations/, { timeout: TIMEOUTS.long });
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

  /** Удалить оценку через More actions → Delete */
  async deleteEvaluation(templateName: string): Promise<void> {
    const row = this.getRow(templateName);
    await expect(row).toBeVisible({ timeout: TIMEOUTS.medium });
    const moreActions = row.getByRole('button', { name: 'More actions' });
    await expect(moreActions).toBeVisible({ timeout: TIMEOUTS.medium });
    await moreActions.click();
    await expect(this.page.getByRole('menuitem', { name: 'Delete' })).toBeVisible({ timeout: TIMEOUTS.medium });
    await this.page.getByRole('menuitem', { name: 'Delete' }).click();
    // Confirm delete — ищем кнопку подтверждения
    const confirmButton = this.page.getByRole('button', { name: /Delete|Confirm|Yes/i }).first();
    await expect(confirmButton).toBeVisible({ timeout: TIMEOUTS.medium });
    await confirmButton.click();
    // Вернуться на страницу списка
    await expect(this.page.getByRole('heading', { name: 'Evaluations' })).toBeVisible({ timeout: TIMEOUTS.long });
  }

  /** Удалить все оценки по имени шаблона (cleanup) */
  async deleteAllByTemplate(templateName: string): Promise<void> {
    let remaining = true;
    while (remaining) {
      const rows = this.page.getByRole('row', { name: templateName });
      const count = await rows.count();
      if (count === 0) {
        remaining = false;
        break;
      }
      const row = rows.first();
      await expect(row).toBeVisible({ timeout: TIMEOUTS.medium });
      await row.getByRole('button', { name: 'More actions' }).click();
      await this.page.getByRole('menuitem', { name: 'Delete' }).click();
      const confirmButton = this.page.getByRole('button', { name: /Delete|Confirm|Yes/i }).first();
      await confirmButton.click();
    }
  }
}
