import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base-page';
import { PAGES, TIMEOUTS } from '../config';

/**
 * Page Object для главной страницы (Dashboard).
 * Содержит разные элементы в зависимости от роли пользователя.
 */
export class HomePage extends BasePage {
  readonly sidebar: Locator;

  // Dashboard cards (System Administrator view)
  readonly totalAthletesCard: Locator;
  readonly submittedEvaluationsCard: Locator;
  readonly sharedPlansCard: Locator;
  readonly activeCoachesCard: Locator;

  // Athlete Home page elements
  readonly welcomeHeading: Locator;
  readonly todayWorkoutHeading: Locator;
  readonly sessionSummaryHeading: Locator;
  readonly totalEvaluationsMetric: Locator;
  readonly sharedPlansMetric: Locator;
  readonly assignedDrillsMetric: Locator;
  readonly lastEvaluationMetric: Locator;

  // Coach Home page elements
  readonly coachWelcomeHeading: Locator;
  readonly teamSnapshotHeading: Locator;
  readonly teamsMetric: Locator;
  readonly athletesMetric: Locator;
  readonly evaluationsMetric: Locator;
  readonly practicePlansMetric: Locator;

  constructor(page: Page) {
    super(page);

    this.sidebar = page.getByRole('navigation', { name: /navigation/i });

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

}
