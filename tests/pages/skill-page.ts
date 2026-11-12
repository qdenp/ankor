import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base-page';
import { TIMEOUTS } from '../config';

/**
 * Page Object для страницы Skills.
 */
export class SkillPage extends BasePage {
  readonly heading: Locator;
  readonly newSkillHeading: Locator;
  readonly createSkillButton: Locator;
  readonly searchInput: Locator;

  // Form fields
  readonly nameInput: Locator;
  readonly categorySelect: Locator;
  readonly levelSelect: Locator;
  readonly descriptionInput: Locator;
  readonly videoUrlInput: Locator;

  // Dialog
  readonly createButton: Locator;

  constructor(page: Page) {
    super(page);

    this.heading = page.getByRole('heading', { name: 'Skills', level: 3 });
    // На пустом списке есть вторая такая же кнопка (пустое состояние) — берём первую
    this.createSkillButton = page.getByRole('button', { name: /Create.*Skill|New.*Skill/i }).first();
    this.newSkillHeading = page.getByRole('heading', { name: 'New Skill', level: 3 });
    this.searchInput = page.getByRole('textbox', { name: /search.*skill|search.*name/i });

    // Form fields
    this.nameInput = page.getByRole('textbox', { name: 'Skill title' });
    this.categorySelect = page.getByRole('combobox', { name: 'Category' });
    this.levelSelect = page.getByRole('combobox', { name: 'Level' });
    this.descriptionInput = page.getByRole('textbox', { name: 'Description' });
    this.videoUrlInput = page.getByRole('textbox', { name: 'YouTube URL' });

    // Dialog
    this.createButton = page.getByRole('button', { name: 'Create' });
  }

  /** Переход на страницу Skills */
  async goto(): Promise<void> {
    await super.goto('/skills');
    await expect(this.heading).toBeVisible();
  }

  /** Нажать Create Skill */
  async clickCreateSkill(): Promise<void> {
    await this.createSkillButton.click();
    await expect(this.newSkillHeading).toBeVisible();
  }

  /** Заполнение формы создания Skill */
  async fillSkillForm(params: {
    name: string;
    category: string;
    level: string;
    description?: string;
    videoUrl?: string;
  }): Promise<void> {
    await this.nameInput.fill(params.name);
    await this.categorySelect.click();
    await this.page.getByRole('option', { name: params.category }).first().click();
    await this.levelSelect.click();
    await this.page.getByRole('option', { name: params.level }).first().click();
    if (params.description) {
      await this.descriptionInput.fill(params.description);
    }
    if (params.videoUrl) {
      await this.videoUrlInput.fill(params.videoUrl);
    }
  }

  /** Создание Skill (форма уже открыта) */
  async createSkill(params: {
    name: string;
    category: string;
    level: string;
    description?: string;
    videoUrl?: string;
  }): Promise<void> {
    await this.fillSkillForm(params);
    await this.createButton.click();
    // Ждем исчезновения спиннеров загрузки после создания
    await this.waitForLoading();
    await expect(this.heading).toBeVisible({ timeout: TIMEOUTS.long });
  }

  /** Поиск по имени (клиентская фильтрация, Enter не нужен) */
  async search(text: string): Promise<void> {
    await this.searchInput.click();
    await this.searchInput.fill(text);
  }

  /** Проверка что skill появился в списке (skills — articles, не rows) */
  async waitForSkillVisible(skillName: string): Promise<void> {
    await expect(this.getSkillCard(skillName)).toBeVisible({ timeout: TIMEOUTS.long });
  }

  /** Получить локатор skill карточки */
  getSkillCard(name: string): Locator {
    return this.page.getByRole('article', { name, includeHidden: false });
  }
}
