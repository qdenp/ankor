import { Page, Locator } from '@playwright/test';
import { BasePage } from './base-page';
import { PAGES } from '../config';

/**
 * Page Object для главной страницы (Dashboard).
 * Содержит разные элементы в зависимости от роли пользователя.
 */
export class HomePage extends BasePage {
  readonly sidebar: ReturnType<this['page']['getByRole']>;
  readonly userProfile: ReturnType<this['page']['getByRole']>;
  readonly logoutButton: ReturnType<this['page']['getByRole']>;

  // Dashboard cards (System Administrator view)
  readonly totalAthletesCard: ReturnType<this['page']['getByRole']>;
  readonly submittedEvaluationsCard: ReturnType<this['page']['getByRole']>;
  readonly sharedPlansCard: ReturnType<this['page']['getByRole']>;
  readonly activeCoachesCard: ReturnType<this['page']['getByRole']>;

  // Navigation items
  readonly navOrganizations: ReturnType<this['page']['getByRole']>;
  readonly navAthletes: ReturnType<this['page']['getByRole']>;
  readonly navCoaches: ReturnType<this['page']['getByRole']>;
  readonly navParents: ReturnType<this['page']['getByRole']>;
  readonly navTeams: ReturnType<this['page']['getByRole']>;
  readonly navSkills: ReturnType<this['page']['getByRole']>;
  readonly navDrills: ReturnType<this['page']['getByRole']>;
  readonly navScorecards: ReturnType<this['page']['getByRole']>;
  readonly navEvaluations: ReturnType<this['page']['getByRole']>;
  readonly navPracticePlans: ReturnType<this['page']['getByRole']>;
  readonly navEasyJoin: ReturnType<this['page']['getByRole']>;
  readonly navNotifications: ReturnType<this['page']['getByRole']>;

  constructor(page: Page) {
    super(page);

    this.sidebar = page.getByRole('navigation', { name: /navigation/i });
    this.userProfile = page.getByRole('button', { name: /profile|user|account|username/i }).first();
    this.logoutButton = page.getByRole('menuitem', { name: /sign out|logout|выйти/i });

    // Dashboard cards
    this.totalAthletesCard = page.getByRole('heading', { name: /total athletes/i });
    this.submittedEvaluationsCard = page.getByText(/submitted evaluations/i, { exact: false });
    this.sharedPlansCard = page.getByText(/shared plans/i, { exact: false });
    this.activeCoachesCard = page.getByText(/active coaches/i, { exact: false });

    // Navigation items
    this.navOrganizations = page.getByRole('link', { name: /organizations/i, exact: false });
    this.navAthletes = page.getByRole('link', { name: /athletes/i, exact: false });
    this.navCoaches = page.getByRole('link', { name: /coaches/i, exact: false });
    this.navParents = page.getByRole('link', { name: /parents/i, exact: false });
    this.navTeams = page.getByRole('link', { name: /teams/i, exact: false });
    this.navSkills = page.getByRole('link', { name: /skills/i, exact: false });
    this.navDrills = page.getByRole('link', { name: /drills/i, exact: false });
    this.navScorecards = page.getByRole('link', { name: /scorecard/i, exact: false });
    this.navEvaluations = page.getByRole('link', { name: /evaluations/i, exact: false });
    this.navPracticePlans = page.getByRole('link', { name: /practice.*plan/i, exact: false });
    this.navEasyJoin = page.getByRole('link', { name: /easy.*join/i, exact: false });
    this.navNotifications = page.getByRole('link', { name: /notification/i, exact: false });
  }

  /** Переход на главную страницу */
  async goto(): Promise<void> {
    await super.goto(PAGES.home);
    await this.waitForLoadState();
  }

  /** Переход в раздел организаций */
  async goToOrganizations(): Promise<void> {
    await this.navOrganizations.click();
  }

  /** Переход в раздел атлетов */
  async goToAthletes(): Promise<void> {
    await this.navAthletes.click();
  }

  /** Переход в раздел коучей */
  async goToCoaches(): Promise<void> {
    await this.navCoaches.click();
  }

  /** Переход в раздел родителей */
  async goToParents(): Promise<void> {
    await this.navParents.click();
  }

  /** Переход в раздел команд */
  async goToTeams(): Promise<void> {
    await this.navTeams.click();
  }

  /** Переход в раздел скиллов */
  async goToSkills(): Promise<void> {
    await this.navSkills.click();
  }

  /** Переход в раздел дриллов */
  async goToDrills(): Promise<void> {
    await this.navDrills.click();
  }

  /** Переход в раздел scorecard templates */
  async goToScorecards(): Promise<void> {
    await this.navScorecards.click();
  }

  /** Переход в раздел оценок */
  async goToEvaluations(): Promise<void> {
    await this.navEvaluations.click();
  }

  /** Переход в раздел practice plans */
  async goToPracticePlans(): Promise<void> {
    await this.navPracticePlans.click();
  }

  /** Переход в раздел easy join */
  async goToEasyJoin(): Promise<void> {
    await this.navEasyJoin.click();
  }

  /** Переход в раздел уведомлений */
  async goToNotifications(): Promise<void> {
    await this.navNotifications.click();
  }

  /** Выход из аккаунта */
  async logout(): Promise<void> {
    await this.userProfile.click();
    await this.logoutButton.click();
  }

  /** Получение значения счётчика атлетов */
  async getTotalAthletesCount(): Promise<string> {
    return this.totalAthletesCard.textContent() ?? '';
  }

  /** Получение значения счётчика submitted evaluations */
  async getSubmittedEvaluationsCount(): Promise<string> {
    return this.submittedEvaluationsCard.textContent() ?? '';
  }

  /** Получение значения счётчика shared plans */
  async getSharedPlansCount(): Promise<string> {
    return this.sharedPlansCard.textContent() ?? '';
  }

  /** Получение значения счётчика активных коучей */
  async getActiveCoachesCount(): Promise<string> {
    return this.activeCoachesCard.textContent() ?? '';
  }
}
