import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base-page';
import { TIMEOUTS } from '../config';

/**
 * Page Object для страницы Drills (Библиотека дриллов).
 * Навигация через левое меню (Drills).
 * Поддерживает: Create, View, Edit, Delete.
 */
export class DrillPage extends BasePage {
  readonly heading: Locator;
  readonly newDrillButton: ReturnType<this['page']['getByRole']>;
  readonly createButton: ReturnType<this['page']['getByRole']>;

  // Form fields
  readonly nameInput: ReturnType<this['page']['getByRole']>;
  readonly descriptionInput: ReturnType<this['page']['getByRole']>;
  readonly segmentSelect: ReturnType<this['page']['getByRole']>;
  readonly durationInput: ReturnType<this['page']['getByRole']>;
  readonly minPlayersInput: ReturnType<this['page']['getByRole']>;
  readonly maxPlayersInput: ReturnType<this['page']['getByRole']>;
  readonly minAgeInput: ReturnType<this['page']['getByRole']>;
  readonly maxAgeInput: ReturnType<this['page']['getByRole']>;
  readonly youtubeUrlInput: ReturnType<this['page']['getByRole']>;
  readonly visibilitySelect: ReturnType<this['page']['getByRole']>;

  constructor(page: Page) {
    super(page);

    this.heading = page.getByRole('heading', { name: 'Drills' }).or(
      page.getByRole('heading', { name: 'Create drill' }).or(
        page.getByRole('heading', { name: 'Edit drill' })
      )
    );
    this.newDrillButton = page.getByRole('button', { name: 'Create drill' }).or(
      page.getByRole('button', { name: 'New drill' })
    );
    this.createButton = page.getByRole('button', { name: 'Create' }).or(
      page.getByRole('button', { name: 'Save' })
    );

    // Form fields — duration/players/age are spinbuttons, not textboxes
    this.nameInput = page.getByRole('textbox', { name: 'Drill name' });
    this.descriptionInput = page.getByRole('textbox', { name: 'Description' });
    this.segmentSelect = page.getByRole('combobox', { name: 'Segment' });
    this.durationInput = page.getByRole('spinbutton', { name: 'Duration' });
    this.minPlayersInput = page.getByRole('spinbutton', { name: 'Min players' });
    this.maxPlayersInput = page.getByRole('spinbutton', { name: 'Max players' });
    this.minAgeInput = page.getByRole('spinbutton', { name: 'Min age' });
    this.maxAgeInput = page.getByRole('spinbutton', { name: 'Max age' });
    this.youtubeUrlInput = page.getByRole('textbox', { name: 'YouTube URL' });
    this.visibilitySelect = page.getByRole('combobox', { name: /visibility/i });

    // Skill mapping
    this.addSkillMappingButton = page.getByRole('button', { name: /add.*skill|Add skill/i }).first();
    this.skillMappingPopup = page.getByRole('dialog', { name: /select.*skill|skill mapping/i }).or(
      page.getByRole('dialog', { name: /skills/i })
    );
    this.skillMappingPopupTitle = page.getByRole('heading', { name: /select.*skill|skill mapping/i }).or(
      page.getByRole('heading', { name: /skills/i })
    );
    this.doneButton = page.getByRole('button', { name: 'Done' }).or(
      page.getByRole('button', { name: 'Save' })
    );

    // Table
    this.tableRows = page.getByRole('row');

    // YouTube iframe — getByRole не подходит, у iframe нет доступного имени (aria-label/title)
    // CSS селектор оправдан по AGENTS.md §4: iframe без доступного имени
    this.youtubeIframe = page.locator('iframe');
  }

  /** Переход на страницу Drills через левое меню */
  async goto(): Promise<void> {
    const drillNav = this.page.getByRole('link', { name: /drills|Drills/i, exact: false });
    await drillNav.click();
    await this.page.waitForLoadState('domcontentloaded');
    await expect(this.heading).toBeVisible({ timeout: TIMEOUTS.medium });
  }

  /** Нажатие кнопки Create drill */
  async clickNewDrill(): Promise<void> {
    await this.newDrillButton.click();
    await expect(this.nameInput).toBeVisible({ timeout: TIMEOUTS.medium });
  }

  /** Заполнение имени дрила */
  async fillName(name: string): Promise<void> {
    await this.nameInput.fill(name);
  }

  /** Заполнение описания */
  async fillDescription(description: string): Promise<void> {
    await this.descriptionInput.fill(description);
  }

  /** Выбор сегмента */
  async selectSegment(segment: string): Promise<void> {
    await this.segmentSelect.click();
    // Segment dropdown uses listbox with option elements
    const segmentOption = this.page.getByRole('option', { name: segment, exact: true }).first();
    await expect(segmentOption).toBeVisible({ timeout: TIMEOUTS.medium });
    await segmentOption.click();
  }

  /** Заполнение duration */
  async fillDuration(duration: string): Promise<void> {
    await this.durationInput.fill(duration);
  }

  /** Заполнение min players */
  async fillMinPlayers(value: string): Promise<void> {
    await this.minPlayersInput.fill(value);
  }

  /** Заполнение max players */
  async fillMaxPlayers(value: string): Promise<void> {
    await this.maxPlayersInput.fill(value);
  }

  /** Заполнение min age */
  async fillMinAge(value: string): Promise<void> {
    await this.minAgeInput.fill(value);
  }

  /** Заполнение max age */
  async fillMaxAge(value: string): Promise<void> {
    await this.maxAgeInput.fill(value);
  }

  /** Заполнение YouTube URL */
  async fillYoutubeUrl(url: string): Promise<void> {
    await this.youtubeUrlInput.fill(url);
  }

  /** Добавление skill mapping через popup */
  async addSkillMapping(skillName: string): Promise<void> {
    await this.addSkillMappingButton.click();
    await expect(this.skillMappingPopupTitle).toBeVisible({ timeout: TIMEOUTS.medium });

    // Выбрать скилл — кликаем на текст навыка
    const skillText = this.page.getByRole('button', { name: skillName, exact: true });
    await expect(skillText).toBeVisible({ timeout: TIMEOUTS.medium });
    await skillText.click();

    // Сохранить
    await this.doneButton.click();
    await expect(this.skillMappingPopup).toBeHidden({ timeout: TIMEOUTS.medium });
  }

  /** Нажатие кнопки Create/Save */
  async clickCreate(): Promise<void> {
    await this.createButton.click();
  }

  /** Получить локатор строки дрила в таблице */
  getRow(drillName: string): Locator {
    const byRole = this.page.getByRole('row', { name: drillName });
    const byCell = this.page.locator('tr', { hasText: drillName }).first();
    const byText = this.page.getByText(drillName, { exact: false }).first();
    return byRole.or(byCell).or(byText).first();
  }

  /** YouTube iframe на detail странице дрила */
  readonly youtubeIframe: Locator;

  /** Вернуться в список дриллов */
  async goToDrillsList(): Promise<void> {
    await this.page.getByRole('link', { name: 'Drills' }).click();
    await expect(this.heading).toBeVisible({ timeout: TIMEOUTS.long });
  }

  /** Открыть detail дрила */
  async openDrillDetail(drillName: string): Promise<void> {
    // Drill card — article с кнопкой "View"
    const drillCard = this.page.getByRole('article', { name: drillName, exact: false }).first();
    await expect(drillCard).toBeVisible({ timeout: TIMEOUTS.medium });
    const viewButton = drillCard.getByRole('button', { name: 'View' });
    await expect(viewButton).toBeVisible({ timeout: TIMEOUTS.medium });
    await viewButton.click();
    await expect(this.page.getByRole('heading', { name: drillName, exact: false })).toBeVisible({ timeout: TIMEOUTS.long });
  }

  /** Ждать появления YouTube iframe на странице деталей дрила */
  async waitForYouTubeIframe(): Promise<void> {
    await this.youtubeIframe.waitFor({ state: 'visible', timeout: TIMEOUTS.long });
  }
}
