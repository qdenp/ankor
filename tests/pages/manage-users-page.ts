import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base-page';
import { TIMEOUTS } from '../config';

/**
 * Page Object для Manage Users (/settings/users, ссылка "Manage Users" в меню owner).
 * Реальная структура:
 * - heading "Manage users", textbox "Search by name or email..." (поиск на сервере, по имени и email)
 * - grid: NAME / ROLE / PHONE NUMBER / GRAD YEAR / ACTION; email в строке не показывается
 * - у строки кнопки "Edit" и "More actions" → menuitem "Deactivate"
 *   → dialog "Deactivate <имя>?" ("They will lose access until you activate them again.") → "Deactivate"
 * - деактивированный остаётся в списке, к имени добавляется "(Deactivated)"
 * - пагинация по 10: "Go to next page"
 *
 * Деактивация — только под owner: owner видит пользователей только своей организации.
 */
export class ManageUsersPage extends BasePage {
  readonly heading: Locator;
  readonly searchInput: Locator;
  readonly userRows: Locator;
  readonly activeUserRows: Locator;
  readonly deactivateMenuItem: Locator;
  readonly deactivateDialog: Locator;
  readonly confirmDeactivateButton: Locator;
  readonly nextPageButton: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { name: 'Manage users', level: 3 });
    this.searchInput = page.getByRole('textbox', { name: 'Search by name or email...' });
    // Строки пользователей — без строки заголовка таблицы
    this.userRows = page
      .getByRole('main')
      .getByRole('grid')
      .getByRole('row')
      .filter({ hasNot: page.getByRole('columnheader') });
    this.activeUserRows = this.userRows.filter({ hasNotText: '(Deactivated)' });
    this.deactivateMenuItem = page.getByRole('menuitem', { name: 'Deactivate' });
    this.deactivateDialog = page.getByRole('dialog', { name: /^Deactivate / });
    this.confirmDeactivateButton = this.deactivateDialog.getByRole('button', { name: 'Deactivate' });
    this.nextPageButton = page.getByRole('button', { name: 'Go to next page' });
  }

  async goto(): Promise<void> {
    await this.page.goto('/settings/users');
    await expect(this.heading).toBeVisible({ timeout: TIMEOUTS.long });
    await this.waitForLoading();
  }

  /** Поиск на сервере: после ввода список перезагружается */
  async search(text: string): Promise<void> {
    await this.searchInput.fill(text);
    await this.waitForLoading();
  }

  /** Деактивировать пользователя в строке: More actions → Deactivate → подтвердить */
  async deactivateRow(row: Locator): Promise<void> {
    await row.getByRole('button', { name: 'More actions' }).click();
    await this.deactivateMenuItem.click();
    await this.confirmDeactivateButton.click();
    await expect(this.deactivateDialog).toBeHidden({ timeout: TIMEOUTS.long });
    await this.waitForLoading();
  }

  /** Деактивировать одного пользователя по точному email (email уникален: поиск находит ровно его) */
  async deactivateUserByEmail(email: string): Promise<void> {
    await this.search(email);
    await expect(this.activeUserRows, `Exactly one active user should match ${email}`).toHaveCount(1, { timeout: TIMEOUTS.long });
    await this.deactivateRow(this.activeUserRows.first());
  }
}
