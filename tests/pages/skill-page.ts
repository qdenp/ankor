import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base-page';
import { TIMEOUTS } from '../config';

/**
 * Page Object для страницы Skills.
 */
export class SkillPage extends BasePage {
  readonly heading: ReturnType<this['page']['getByRole']>;
  readonly newSkillHeading: ReturnType<this['page']['getByRole']>;
  readonly createSkillButton: ReturnType<this['page']['getByRole']>;
  readonly searchInput: ReturnType<this['page']['getByRole']>;

  // Form fields
  readonly nameInput: ReturnType<this['page']['getByRole']>;
  readonly categorySelect: ReturnType<this['page']['getByRole']>;
  readonly levelSelect: ReturnType<this['page']['getByRole']>;
  readonly descriptionInput: ReturnType<this['page']['getByRole']>;
  readonly videoUrlInput: ReturnType<this['page']['getByRole']>;

  // Dialog
  readonly createButton: ReturnType<this['page']['getByRole']>;

  constructor(page: Page) {
    super(page);

    this.heading = page.getByRole('heading', { name: 'Skills', level: 3 });
    this.createSkillButton = page.getByRole('button', { name: /Create.*Skill|New.*Skill/i });
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
    await expect(this.heading).toBeVisible({ timeout: TIMEOUTS.medium });
  }

  /** Нажать Create Skill */
  async clickCreateSkill(): Promise<void> {
    await this.createSkillButton.click();
    await expect(this.newSkillHeading).toBeVisible({ timeout: TIMEOUTS.medium });
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
    // Ждем загрузки страницы списка после создания
    await this.page.waitForLoadState('networkidle');
    await expect(this.heading).toBeVisible({ timeout: TIMEOUTS.long });
  }

  /** Поиск skill по имени */
  async searchByName(name: string): Promise<void> {
    await this.searchInput.fill(name);
    await expect(this.heading).toBeVisible({ timeout: TIMEOUTS.medium });
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
