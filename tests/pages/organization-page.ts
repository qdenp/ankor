import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base-page';
import { TIMEOUTS } from '../config';

/**
 * Page Object для страницы Organization Profile.
 * Поддерживает: View, Edit (Owner, SysAdmin), List (SysAdmin).
 * Навигация через левое меню (Organization Profile / Organizations).
 */
export class OrganizationPage extends BasePage {
  readonly sidebarOrgLink: ReturnType<this['page']['getByRole']>;
  readonly orgListLink: ReturnType<this['page']['getByRole']>;
  readonly editButton: ReturnType<this['page']['getByRole']>;
  readonly nameInput: ReturnType<this['page']['getByRole']>;
  readonly saveButton: ReturnType<this['page']['getByRole']>;
  readonly cancelButton: ReturnType<this['page']['getByRole']>;
  readonly searchInput: ReturnType<this['page']['getByRole']>;
  readonly orgRows: ReturnType<this['page']['getByRole']>;
  readonly firstDataRow: Locator;

  constructor(page: Page) {
    super(page);

    // Sidebar links
    this.sidebarOrgLink = page.getByRole('link', { name: 'Organization Profile' });
    this.orgListLink = page.getByRole('link', { name: 'Organizations' }).first();

    // Form elements - multiple fallback strategies
    this.editButton = page.getByRole('button', { name: /Edit|Редактировать/i }).first();
    this.nameInput = page.getByLabel('Organization name').or(page.getByRole('textbox', { name: 'Organization name' })).or(page.locator('input[name="name"]').first());
    this.saveButton = page.getByRole('button', { name: /Save|Сохранить/i }).first();
    this.cancelButton = page.getByRole('button', { name: /Cancel|Отмена/i }).first();

// Search & list
    this.searchInput = page.getByRole('textbox', { name: /search/i });
    // MUI DataGrid rows
    this.orgRows = page.getByRole('row');
    this.firstDataRow = page.locator('[role="row"][data-rowindex="0"]').first();
    this.orgRowByName = (name: string) => page.getByRole('row', { name: new RegExp(name, 'i') });
    this.orgRowEditButton = (name: string) => page.getByRole('row', { name: new RegExp(name, 'i') }).getByRole('button', { name: /Edit|Редактировать/i });
    // DataGrid column headers - use data-field attribute for reliability
    this.orgHeaderOrganization = page.locator('[role="columnheader"][data-field="name"]');
  }

  /** Переход на страницу Organization Profile через левое меню */
  async goto(): Promise<void> {
    // Use direct URL for reliability
    await this.page.goto('/settings/organization', { waitUntil: 'domcontentloaded' });
    await this.waitForLoading();
    // Wait for edit button to be visible (profile view has edit button)
    await expect(this.editButton).toBeVisible({ timeout: TIMEOUTS.long });
  }

  /** Переход на список организаций (SysAdmin) */
  async gotoOrganizationsList(): Promise<void> {
    await this.page.goto('/settings/organization', { waitUntil: 'domcontentloaded' });
  }

  /** Нажать Edit */
  async clickEdit(): Promise<void> {
    await expect(this.editButton).toBeVisible({ timeout: TIMEOUTS.long * 2 });
    await this.editButton.click();
    await expect(this.nameInput).toBeVisible({ timeout: TIMEOUTS.medium });
  }

  /** Заполнить форму организации */
  async fillOrgForm(params: { name: string }): Promise<void> {
    await expect(this.nameInput).toBeVisible({ timeout: TIMEOUTS.medium });
    await this.nameInput.fill(params.name);
  }

  /** Сохранить изменения */
  async save(): Promise<void> {
    await this.saveButton.click();
    // Ждем исчезновения спиннеров загрузки после сохранения
    await this.waitForLoading();
  }

  /** Отменить редактирование */
  async cancel(): Promise<void> {
    await this.cancelButton.click();
  }

  /** Wait for DataGrid first data row to be visible (after navigation or search) */
  async waitForDataGridLoaded(): Promise<void> {
    await expect(this.firstDataRow).toBeVisible({ timeout: TIMEOUTS.long });
  }

  /** Поиск по имени (клиентская фильтрация, Enter не нужен) */
  async search(text: string): Promise<void> {
    await this.searchInput.click();
    await this.searchInput.fill(text);
  }

  /** Получить строку организации по имени (robust search for MUI DataGrid) */
  getOrgRow(name: string): Locator {
    // Use DataGrid row with name column matching - use first cell text for exact match
    const nameCell = this.page.locator('[role="gridcell"][data-field="name"]').filter({ hasText: name }).first();
    return nameCell.locator('..'); // parent row
  }

  /** Получить строку организации по email (для надёжной идентификации) */
  getOrgRowByEmail(email: string): Locator {
    // Email находится в колонке Admin, ищем по тексту во всей строке
    return this.page.locator('[role="row"]').filter({ hasText: email }).first();
  }

  /** Получить имя организации из строки таблицы */
  async getOrgNameFromRow(row: Locator): Promise<string> {
    const nameCell = row.locator('[role="gridcell"][data-field="name"]');
    return await nameCell.textContent();
  }

  /** Кликнуть Edit на строке DataGrid (через More actions menu) */
  async clickEditOnRow(row: Locator): Promise<void> {
    const moreActions = row.getByRole('button', { name: 'More actions' });
    await expect(moreActions).toBeVisible({ timeout: TIMEOUTS.medium });
    await moreActions.click();
    await this.page.getByRole('menuitem', { name: 'Edit' }).click();
  }

  /** Проверка что страница загружена (heading visible) */
  async expectPageLoaded(): Promise<void> {
    await expect(this.page.locator('h1, h2, h3').first()).toBeVisible({ timeout: TIMEOUTS.medium });
  }
}
