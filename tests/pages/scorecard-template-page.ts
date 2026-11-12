import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base-page';
import { TIMEOUTS } from '../config';

/**
 * Page Object для страницы Score Card Templates.
 * Навигация через левое меню (Score Cards Template).
 * Поддерживает: Create, Read, Update (make inactive).
 */
export class ScorecardTemplatePage extends BasePage {
  readonly newScorecardButton: Locator;
  readonly createButton: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly addCategoryButton: Locator;

  // Sidebar link
  readonly sidebarLink: Locator;

  // Scorecard form fields
  readonly scorecardNameInput: Locator;
  readonly activeScorecardToggle: Locator;

  // Table rows
  readonly tableRows: Locator;

  constructor(page: Page) {
    super(page);

    // На пустом списке есть вторая такая же кнопка (пустое состояние) — берём первую
    this.newScorecardButton = page.getByRole('button', { name: 'New template' }).first();
    this.createButton = page.getByRole('button', { name: 'Create' });
    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
    this.addCategoryButton = page.getByRole('button', { name: 'Add category' });

    // Sidebar link
    this.sidebarLink = page.getByRole('link', { name: 'Score Cards Template' });

    // Scorecard form fields
    this.scorecardNameInput = page.getByRole('textbox', { name: 'Scorecard name' });
    this.activeScorecardToggle = page.getByRole('switch', { name: 'Active scorecard' });

    // Table rows
    this.tableRows = page.getByRole('row');
  }

  /** Переход на страницу Scorecard Templates через левое меню */
  async goto(): Promise<void> {
    await this.sidebarLink.click();
    await expect(this.newScorecardButton).toBeVisible();
    await this.waitForLoading();
  }

  /** Нажатие кнопки New template */
  async clickNewScorecard(): Promise<void> {
    await this.newScorecardButton.click();
    await expect(this.scorecardNameInput).toBeVisible();
  }

  /** Заполнение поля Scorecard name */
  async fillScorecardName(name: string): Promise<void> {
    await this.scorecardNameInput.fill(name);
  }

  /** Заполнение первой категории (name + skill + video) */
  async fillFirstCategory(params: {
    categoryName: string;
    skillName: string;
    videoName?: string;
  }): Promise<void> {
    // Заполняем первую Category name
    const categoryInputs = this.page.getByRole('textbox', { name: 'Category name' });
    await categoryInputs.first().fill(params.categoryName);

    // Заполняем первый Skill name
    const skillInputs = this.page.getByRole('textbox', { name: 'Skill name' });
    await skillInputs.first().fill(params.skillName);

    // Video dropdown может подгружаться пару секунд
    const videoSelect = this.page.getByRole('combobox', { name: 'Linked video' }).first();
    await expect(videoSelect, 'Expected video dropdown to be visible').toBeVisible({ timeout: TIMEOUTS.long });

    // Проверяем есть ли опции в dropdown
    await videoSelect.click();
    // Ждём появления опций вместо waitForTimeout
    await expect(this.page.getByRole('option').first()).toBeVisible();

    // Проверяем есть ли опции
    const options = this.page.getByRole('option');
    const optionCount = await options.count();

    if (optionCount > 0) {
      if (params.videoName) {
        // Выбираем конкретную видео
        await options.filter({ hasText: params.videoName }).first().click();
      } else {
        // Выбираем первое доступное
        await options.first().click();
      }
    } else {
      // Нет видео — закрываем dropdown
      await this.page.keyboard.press('Escape');
    }
  }

  /** Добавление новой категории и заполнение */
  async addAndFillCategory(params: {
    categoryName: string;
    skillName: string;
    videoName?: string;
  }): Promise<void> {
    await this.addCategoryButton.click();
    // Ждём появления новой категории вместо waitForTimeout
    const newCategoryInputs = this.page.getByRole('textbox', { name: 'Category name' });
    await expect(newCategoryInputs.last()).toBeVisible();

    // После добавления — последняя категория будет активной
    await newCategoryInputs.last().fill(params.categoryName);

    const skillInputs = this.page.getByRole('textbox', { name: 'Skill name' });
    await skillInputs.last().fill(params.skillName);

    const videoSelect = this.page.getByRole('combobox', { name: 'Linked video' }).last();
    await expect(videoSelect, 'Expected video dropdown to be visible').toBeVisible({ timeout: TIMEOUTS.long });

    await videoSelect.click();
    // Ждём появления опций вместо waitForTimeout
    await expect(this.page.getByRole('option').first()).toBeVisible();

    const options = this.page.getByRole('option');
    const optionCount = await options.count();

    if (optionCount > 0) {
      if (params.videoName) {
        await options.filter({ hasText: params.videoName }).first().click();
      } else {
        await options.first().click();
      }
    } else {
      await this.page.keyboard.press('Escape');
    }
  }

  /** Создание Scorecard Template */
  async createScorecard(params: {
    name: string;
    categoryName?: string;
    skillName?: string;
    videoName?: string;
    active?: boolean;
    categories?: Array<{ name: string; skillName: string; videoName?: string }>;
  }): Promise<void> {
    await this.clickNewScorecard();
    await this.fillScorecardName(params.name);

    // Заполняем первую категорию если указана
    const catName = params.categoryName || 'Fundamentals';
    const skillName = params.skillName || 'Dribbling';
    await this.fillFirstCategory({ categoryName: catName, skillName, videoName: params.videoName });

    // Заполняем дополнительные категории если указаны
    if (params.categories) {
      for (const cat of params.categories) {
        await this.addAndFillCategory({
          categoryName: cat.name,
          skillName: cat.skillName,
          videoName: cat.videoName,
        });
      }
    }

    await this.createButton.click();
    // Ждём редирект на /scorecards и загрузку списка
    await expect(this.page).toHaveURL(/\/scorecards/, { timeout: TIMEOUTS.long });
    await this.waitForLoading();
  }

  /** Получить локатор строки шаблона в таблице */
  getRow(name: string): Locator {
    const byRole = this.page.getByRole('row', { name });
    const byCell = this.page.locator('tr', { hasText: name }).first();
    const byText = this.page.getByText(name, { exact: false }).first();
    return byRole.or(byCell).or(byText).first();
  }

  /** Открытие action menu (3 точки) и выбор Edit */
  async openEditMenu(name: string): Promise<void> {
    const row = this.getRow(name);
    const actionMenu = row.locator('[aria-label="Actions"]').or(
      row.locator('button[aria-haspopup="true"]').or(
        row.locator('button:has(svg)')
      )
    );
    await actionMenu.click();
    await this.page.getByRole('menuitem', { name: 'Edit' }).click();
    await expect(this.scorecardNameInput).toBeVisible();
    await this.waitForLoading();
  }

  /** Переключение статуса Active/Inactive */
  async toggleActive(name: string, active: boolean): Promise<void> {
    await this.openEditMenu(name);
    if (active) {
      await this.activeScorecardToggle.check();
    } else {
      await this.activeScorecardToggle.uncheck();
    }
    await this.saveButton.click();
    await expect(this.page).toHaveURL(/\/scorecards/, { timeout: TIMEOUTS.long });
    await this.waitForLoading();
  }
}
