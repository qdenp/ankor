import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base-page';
import { TIMEOUTS } from '../config';

/**
 * Page Object для страницы Practice Plans.
 * Навигация через левое меню (Plans).
 * Поддерживает: Create, View, Duplicate, Invite.
 */
export class PlanPage extends BasePage {
  readonly sidebarLink: ReturnType<this['page']['getByRole']>;
  readonly newPlanButton: ReturnType<this['page']['getByRole']>;
  readonly searchInput: ReturnType<this['page']['getByRole']>;

  // Tabs
  readonly myPlansTab: ReturnType<this['page']['getByRole']>;
  readonly invitedTab: ReturnType<this['page']['getByRole']>;
  readonly prebuiltTab: ReturnType<this['page']['getByRole']>;
  readonly orgPlansTab: ReturnType<this['page']['getByRole']>;

  // Form fields
  readonly nameInput: ReturnType<this['page']['getByRole']>;
  readonly createButton: ReturnType<this['page']['getByRole']>;
  readonly cancelButton: ReturnType<this['page']['getByRole']>;

  // Drill mapping
  readonly addDrillButton: ReturnType<this['page']['getByRole']>;
  readonly drillDurationInput: ReturnType<this['page']['getByRole']>;
  readonly drillNotesInput: ReturnType<this['page']['getByRole']>;
  readonly drillMenuButton: ReturnType<this['page']['getByRole']>;
  readonly editDrillOption: ReturnType<this['page']['getByRole']>;
  readonly removeDrillOption: ReturnType<this['page']['getByRole']>;

  // Dialog elements
  readonly addDrillConfirmButton: ReturnType<this['page']['getByRole']>;
  readonly doneButton: ReturnType<this['page']['getByRole']>;

  // Drill edit dialog
  readonly drillSaveButton: ReturnType<this['page']['getByRole']>;
  readonly drillEditSaveButton: ReturnType<this['page']['getByRole']>;

  // Actions
  readonly inviteButton: ReturnType<this['page']['getByRole']>;
  readonly duplicateButton: ReturnType<this['page']['getByRole']>;
  readonly viewButton: ReturnType<this['page']['getByRole']>;
  readonly editButton: ReturnType<this['page']['getByRole']>;
  readonly deleteButton: ReturnType<this['page']['getByRole']>;

  // Toast / success notification
  readonly toast: ReturnType<this['page']['getByRole']>;

  // Prebuilt checkbox (sysadmin only)
  readonly prebuiltCheckbox: ReturnType<this['page']['getByRole']>;

  // Table rows
  readonly planRows: ReturnType<this['page']['getByRole']>;

  // Dialog elements
  readonly newPlanHeading: ReturnType<this['page']['getByRole']>;
  readonly addDrillsHeading: ReturnType<this['page']['getByRole']>;
  readonly segmentsHeading: ReturnType<this['page']['getByRole']>;

  constructor(page: Page) {
    super(page);

    this.sidebarLink = page.getByRole('link', { name: /Plans/i, exact: false });
    this.newPlanButton = page.getByRole('button', { name: /New Plan|New plan/i }).first();
    this.searchInput = page.getByRole('textbox', { name: /search/i });

    // Tabs
    this.myPlansTab = page.getByRole('tab', { name: 'My Plans' });
    this.invitedTab = page.getByRole('tab', { name: 'Invited' });
    this.prebuiltTab = page.getByRole('tab', { name: 'Prebuilt' });
    this.orgPlansTab = page.getByRole('tab', { name: 'Org Plans' });

    // Form fields
    this.nameInput = page.getByRole('textbox', { name: 'Plan name' });
    this.createButton = page.getByRole('button', { name: 'Save' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });

    // Drill mapping
    this.addDrillButton = page.getByRole('button', { name: 'Add Segment' });
    this.drillDurationInput = page.getByRole('spinbutton', { name: /duration/i });
    this.drillNotesInput = page.getByRole('textbox', { name: /notes/i });
    this.drillMenuButton = page.getByRole('button', { name: 'Segment actions' }).first();
    this.editDrillOption = page.getByRole('menuitem', { name: /edit|Редактировать/i }).first();
    this.removeDrillOption = page.getByRole('menuitem', { name: /remove|Удалить/i }).first();

    // Plan card actions (visible in My Plans list)
    this.planCardViewButton = page.getByRole('button', { name: 'View' }).first();
    this.planCardDuplicateButton = page.getByRole('button', { name: 'Duplicate' }).first();
    this.planCardEditLink = page.getByRole('link', { name: 'Edit' }).first();

    // Plan detail actions (after clicking View)
    this.inviteUsersButton = page.getByRole('button', { name: 'Invite users' }).first();
    this.planDetailEditLink = page.getByRole('link', { name: 'Edit' }).first();

    // Drill edit dialog
    this.drillSaveButton = page.getByRole('button', { name: /save|create/i }).first();
    this.drillEditSaveButton = page.getByRole('button', { name: 'Done' });

    // Toast / success notification
    this.toast = page.getByRole('status').or(page.getByRole('alert')).first();

    // Prebuilt checkbox (sysadmin only)
    this.prebuiltCheckbox = page.getByRole('checkbox', { name: /Prebuilt/i });

    // Plan list items (cards/articles)
    this.planCards = page.locator('article, [role="article"]');

    // Dialog elements
    this.newPlanHeading = page.getByRole('heading', { name: /New Plan/i });
    this.addDrillsHeading = page.getByRole('heading', { name: 'Add drills', level: 2 });
    this.addDrillConfirmButton = page.getByRole('button', { name: 'Add' }).first();
    this.doneButton = page.getByRole('button', { name: 'Done' }).first();
    this.segmentsHeading = page.getByRole('heading', { name: /Segments \(\d+\)/i });
  }

  /** Переход на страницу Plans через левое меню */
  async goto(): Promise<void> {
    await this.sidebarLink.click();
    await this.page.waitForLoadState('domcontentloaded');
    await expect(this.myPlansTab).toBeVisible({ timeout: TIMEOUTS.medium });
  }

  /** Нажатие кнопки New Plan */
  async clickNewPlan(): Promise<void> {
    await this.newPlanButton.click();
    await expect(this.newPlanHeading).toBeVisible({ timeout: TIMEOUTS.medium });
  }

  /** Заполнение формы создания Plan */
  async fillPlanForm(params: { name: string }): Promise<void> {
    await this.nameInput.fill(params.name);
  }

  /** Создание Plan */
  async createPlan(params: { name: string }): Promise<void> {
    await this.clickNewPlan();
    await this.fillPlanForm(params);
    await this.createButton.click();
    await expect(this.newPlanHeading).toBeHidden({ timeout: TIMEOUTS.medium });
  }

  /** Переключение на вкладку My Plans */
  async goToMyPlans(): Promise<void> {
    await this.myPlansTab.click();
  }

  /** Переключение на вкладку Invited */
  async goToInvited(): Promise<void> {
    await this.invitedTab.click();
  }

  /** Переключение на вкладку Prebuilt */
  async goToPrebuilt(): Promise<void> {
    await this.prebuiltTab.click();
  }

  /** Переключение на вкладку Org Plans */
  async goToOrgPlans(): Promise<void> {
    await this.orgPlansTab.click();
  }

  /** Добавить drill к плану */
  async addDrill(duration?: string): Promise<void> {
    await this.addDrillButton.click();
    if (duration) {
      await this.drillDurationInput.fill(duration);
    }
  }

  /** Редактировать drill */
  async editDrill(params: { notes?: string; duration?: string }): Promise<void> {
    await this.drillMenuButton.click();
    await this.editDrillOption.click();
    await expect(this.drillNotesInput).toBeVisible({ timeout: TIMEOUTS.medium });
    if (params.notes) {
      await this.drillNotesInput.fill(params.notes);
    }
    if (params.duration) {
      await this.drillDurationInput.fill(params.duration);
    }
  }

  /** Сохранить изменения drill */
  async saveDrillEdit(): Promise<void> {
    await this.drillEditSaveButton.click();
    await expect(this.segmentsHeading).toBeVisible({ timeout: TIMEOUTS.short });
  }

  /** Удалить drill */
  async removeDrill(): Promise<void> {
    await this.drillMenuButton.click();
    await this.removeDrillOption.click();
  }

  /** Кликнуть View на карточке плана */
  async viewPlan(name: string): Promise<void> {
    const card = this.getPlanCard(name);
    await card.getByRole('button', { name: 'View' }).click();
  }

  /** Кликнуть Invite Users в деталях плана */
  async inviteUsers(): Promise<void> {
    await this.inviteUsersButton.click();
  }

  /** Кликнуть Edit в деталях плана */
  async editPlanFromDetail(): Promise<void> {
    await this.planDetailEditLink.click();
  }

  /** Кликнуть Edit на карточке плана */
  async editPlanFromCard(name: string): Promise<void> {
    const card = this.getPlanCard(name);
    await card.getByRole('link', { name: 'Edit' }).click();
  }

  /** Кликнуть Duplicate на карточке плана */
  async duplicatePlanFromCard(name: string): Promise<void> {
    const card = this.getPlanCard(name);
    await card.getByRole('button', { name: 'Duplicate' }).click();
  }

  /** Получить карточку плана по имени — robust selection by role */
  getPlanCard(name: string): Locator {
    // Use getByRole for stable selection by accessible name
    return this.page.getByRole('article', { name }).first();
  }

  /** Добавить первый drill к плану (открыть диалог, добавить первый доступный, закрыть) */
  async addFirstDrill(): Promise<void> {
    await this.addDrillButton.click();
    await expect(this.addDrillsHeading).toBeVisible({ timeout: TIMEOUTS.medium });
    await this.addDrillConfirmButton.click();
    await this.doneButton.click();
    await expect(this.segmentsHeading).toBeVisible({ timeout: TIMEOUTS.short });
  }

  /** Сохранить план и вернуться на My Plans */
  async savePlanAndReturnToMyPlans(): Promise<void> {
    await this.createButton.click();
    await expect(this.newPlanHeading).toBeHidden({ timeout: TIMEOUTS.long });
    await this.goToMyPlans();
    await expect(this.myPlansTab).toBeVisible();
  }

  /** Поиск по имени (клиентская фильтрация, Enter не нужен) */
  async search(text: string): Promise<void> {
    await this.searchInput.click();
    await this.searchInput.fill(text);
  }

  /** Получить локатор карточки плана в My Plans — robust selection by role */
  getPlanRow(name: string): Locator {
    // Use getByRole for stable selection by accessible name
    return this.page.getByRole('article', { name }).first();
  }
}
