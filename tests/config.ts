/**
 * Ankor Athletics App — тестовые константы и конфигурация.
 */

import dotenv from 'dotenv';

// Загружаем переменные окружения из файла, названного по серверу
dotenv.config({ path: '.env.d333afta2q6llv' });

/* Base URL задаётся в playwright.config.ts (use.baseURL, переменная ANKOR_BASE_URL) */

/* ======================== Credentials ======================== */
/**
 * Все логины по шаблону dtimokhin+{role}@aexsoft.com
 * Пароль задаётся в .env файле.
 *
 * Роли:
 *   - owner       → Owner/Admin организации (уже создан)
 *   - sysadmin    → System Administrator
 *   - coach       → Coach (создаётся через сайт)
 *   - parent      → Parent (создаётся через сайт)
 *   - athlete     → Athlete (создаётся через сайт)
 */

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required. Set it in .env file.`);
  }
  return value;
}

export const CREDENTIALS = {
  owner: {
    email: requiredEnv('ANKOR_OWNER_EMAIL'),
    password: requiredEnv('ANKOR_OWNER_PASSWORD'),
  },
  sysadmin: {
    email: requiredEnv('ANKOR_SYSADMIN_EMAIL'),
    password: requiredEnv('ANKOR_SYSADMIN_PASSWORD'),
  },
  coach: {
    email: requiredEnv('ANKOR_COACH_EMAIL'),
    password: requiredEnv('ANKOR_COACH_PASSWORD'),
  },
  parent: {
    email: requiredEnv('ANKOR_PARENT_EMAIL'),
    password: requiredEnv('ANKOR_PARENT_PASSWORD'),
  },
  athlete: {
    email: requiredEnv('ANKOR_ATHLETE_EMAIL'),
    password: requiredEnv('ANKOR_ATHLETE_PASSWORD'),
  },
};

/* ======================== Roles ======================== */
export const ROLES = {
  SYSTEM_ADMIN: 'System Administrator',
  OWNER: 'Owner',
  ADMIN: 'Admin',
  COACH: 'Coach',
  ATHLETE: 'Athlete',
  PARENT: 'Parent',
} as const;

/* ======================== Timeouts ======================== */
export const TIMEOUTS = {
  short: 5000,
  medium: 10000,
  long: 30000,
  pageLoad: 30000,
  navigation: 30000,
  /** Сколько ждать ПОЯВЛЕНИЯ спиннера после перехода: по замеру он появляется через 150–215 мс */
  spinnerAppear: 1000,
} as const;

/* ======================== Page URLs ======================== */
export const PAGES = {
  signIn: '/sign-in',
  signUp: '/sign-up',
  home: '/',
  organizations: '/organizations',
  athletes: '/athletes',
  coaches: '/coaches',
  parents: '/parents',
  teams: '/teams',
  skills: '/skills',
  drills: '/drills',
  scorecards: '/scorecard-templates',
  evaluations: '/evaluations',
  practicePlans: '/practice-plans',
  easyJoin: '/easy-join',
  manageUsers: '/manage-users',
  notifications: '/notifications',
} as const;

/* ======================== Evaluation Rules ======================== */
export const EVALUATION = {
  minScore: 1,
  maxScore: 5,
  maxCategoriesBelowThree: 5,
} as const;
