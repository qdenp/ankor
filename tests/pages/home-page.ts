import { Page, expect } from '@playwright/test';
import { BasePage } from './base-page';
import { PAGES, TIMEOUTS } from '../config';

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

  // Athlete Home page elements
  readonly welcomeHeading: ReturnType<this['page']['getByRole']>;
  readonly todayWorkoutHeading: ReturnType<this['page']['getByRole']>;
  readonly sessionSummaryHeading: ReturnType<this['page']['getByText']>;
  readonly totalEvaluationsMetric: ReturnType<this['page']['getByText']>;
  readonly sharedPlansMetric: ReturnType<this['page']['getByText']>;
  readonly assignedDrillsMetric: ReturnType<this['page']['getByText']>;
  readonly lastEvaluationMetric: ReturnType<this['page']['getByText']>;

  // Coach Home page elements
  readonly coachWelcomeHeading: ReturnType<this['page']['getByRole']>;
  readonly teamSnapshotHeading: ReturnType<this['page']['getByRole']>;
  readonly teamsMetric: ReturnType<this['page']['getByRole']>;
  readonly athletesMetric: ReturnType<this['page']['getByRole']>;
  readonly evaluationsMetric: ReturnType<this['page']['getByRole']>;
  readonly practicePlansMetric: ReturnType<this['page']['getByRole']>;

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

    // Athlete Home page elements
    this.welcomeHeading = page.getByRole('heading', { name: /Welcome back/i });
    this.todayWorkoutHeading = page.getByText(/Today.*Workout/, { exact: false });
    this.sessionSummaryHeading = page.getByText('Session Summary', { exact: true });
    this.totalEvaluationsMetric = page.getByText('Total Evaluations', { exact: true });
    this.sharedPlansMetric = page.getByText('Shared Plans', { exact: true });
    this.assignedDrillsMetric = page.getByText('Assigned Drills', { exact: true });
    this.lastEvaluationMetric = page.getByText('Last Evaluation', { exact: true });

    // Coach Home page elements
    this.coachWelcomeHeading = page.getByRole('heading', { name: /Welcome back/i });
    this.teamSnapshotHeading = page.getByRole('heading', { name: 'Team Snapshot', exact: true });
    this.teamsMetric = page.getByRole('heading', { name: 'Teams', exact: true });
    this.athletesMetric = page.getByRole('heading', { name: 'Athletes', exact: true });
    this.evaluationsMetric = page.getByRole('heading', { name: 'Evaluations', exact: true });
    this.practicePlansMetric = page.getByRole('heading', { name: 'Practice plans', exact: true });
  }

  /** Переход на главную страницу */
  async goto(): Promise<void> {
    await super.goto(PAGES.home);
    await this.waitForLoadState();
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
