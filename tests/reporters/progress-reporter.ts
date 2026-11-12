import * as fs from 'fs';
import * as path from 'path';
import type { FullConfig, FullResult, Reporter, Suite, TestCase, TestResult } from '@playwright/test/reporter';

/**
 * Короткая сводка прогона в реальном времени: reports/progress.txt — строка на роль + упавшие тесты.
 *
 * test:all запускает роли отдельными процессами. Каждый процесс пишет своё состояние в
 * reports/progress/<роль>.json и пересобирает progress.txt из всех JSON — процессы не перетирают
 * строки друг друга. Роли, стартовавшие заметно раньше самой свежей (прошлый прогон), в сводку не попадают.
 */

const PROGRESS_DIR = path.join('reports', 'progress');
const SUMMARY_FILE = path.join('reports', 'progress.txt');
/** Роли одного запуска test:all стартуют в пределах секунд; всё, что старше, — прошлый прогон */
const SAME_RUN_WINDOW_MS = 5 * 60 * 1000;

interface Failure {
  title: string;
  attempt: string;
  error: string;
}

interface RoleState {
  role: string;
  startedAt: number;
  finishedAt?: number;
  status: 'running' | 'passed' | 'failed' | 'interrupted' | 'timedout';
  total: number;
  done: number;
  ok: number;
  failed: number;
  skipped: number;
  flaky: number;
  current?: string;
  failures: Failure[];
}

const stripAnsi = (s: string): string => s.replace(/\x1B\[[0-9;]*[A-Za-z]/g, '');

const formatDuration = (ms: number): string => {
  const sec = Math.round(ms / 1000);
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
};

/** Название без корня и проекта: "07-parents.spec.ts › Owner Parents Tests › should edit parent" */
const shortTitle = (test: TestCase): string => {
  const [, , file, ...rest] = test.titlePath();
  return [path.basename(file ?? ''), ...rest].join(' › ');
};

class ProgressReporter implements Reporter {
  private state!: RoleState;

  onBegin(config: FullConfig, suite: Suite): void {
    const role = process.env.ANKOR_PW_ROLE ?? config.projects.map((p) => p.name).join(',');
    this.state = {
      role,
      startedAt: Date.now(),
      status: 'running',
      total: suite.allTests().length,
      done: 0,
      ok: 0,
      failed: 0,
      skipped: 0,
      flaky: 0,
      failures: [],
    };
    this.write();
  }

  onTestBegin(test: TestCase, result: TestResult): void {
    this.state.current = shortTitle(test) + (result.retry ? ` (retry ${result.retry}/${test.retries})` : '');
    this.write();
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const failedAttempt = result.status === 'failed' || result.status === 'timedOut' || result.status === 'interrupted';
    if (failedAttempt) {
      this.state.failures.push({
        title: shortTitle(test),
        attempt: `${result.retry + 1}/${test.retries + 1}`,
        error: stripAnsi(result.error?.message ?? result.status).split('\n')[0].slice(0, 160),
      });
    }

    // Тест закончен окончательно: прошёл/пропущен или упал на последней попытке
    const final = !failedAttempt || result.retry >= test.retries;
    if (final) {
      this.state.done++;
      const outcome = test.outcome();
      if (outcome === 'skipped') this.state.skipped++;
      else if (outcome === 'unexpected') this.state.failed++;
      else {
        this.state.ok++;
        if (outcome === 'flaky') this.state.flaky++;
      }
    }
    this.state.current = undefined;
    this.write();
  }

  onEnd(result: FullResult): void {
    this.state.status = result.status;
    this.state.finishedAt = Date.now();
    this.write();
  }

  private write(): void {
    fs.mkdirSync(PROGRESS_DIR, { recursive: true });
    // Без tmp + rename: на Windows rename поверх файла, который читает другая роль, падает у пишущего.
    // Недописанный JSON читатель пропускает (readState).
    fs.writeFileSync(path.join(PROGRESS_DIR, `${this.state.role}.json`), JSON.stringify(this.state, null, 2));
    fs.writeFileSync(SUMMARY_FILE, renderSummary(readStates(this.state)));
  }
}

/** Состояния всех ролей; своё — из памяти, чужие — из их JSON */
function readStates(own: RoleState): RoleState[] {
  const others = fs
    .readdirSync(PROGRESS_DIR)
    .filter((f) => f.endsWith('.json') && f !== `${own.role}.json`)
    .map((f) => readState(path.join(PROGRESS_DIR, f)))
    .filter((s): s is RoleState => s !== undefined);
  const states = [own, ...others];
  const newest = Math.max(...states.map((s) => s.startedAt));
  return states.filter((s) => newest - s.startedAt < SAME_RUN_WINDOW_MS).sort((a, b) => a.startedAt - b.startedAt);
}

/**
 * Файл другой роли может быть записан наполовину (её процесс пишет его в этот же момент).
 * Это не ошибка прогона: роль просто попадёт в сводку при следующем обновлении.
 */
function readState(file: string): RoleState | undefined {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8')) as RoleState;
  } catch {
    return undefined;
  }
}

function renderSummary(states: RoleState[]): string {
  const now = Date.now();
  const roleWidth = Math.max(...states.map((s) => s.role.length));
  const lines = states.map((s) => {
    const counts =
      `${`${s.done}/${s.total}`.padStart(5)}  ok ${String(s.ok).padEnd(3)} x ${String(s.failed).padEnd(3)} - ${String(s.skipped).padEnd(3)}` +
      (s.flaky ? ` flaky ${s.flaky}` : '');
    const tail =
      s.status === 'running'
        ? `▶ ${formatDuration(now - s.startedAt)}  ${s.current ?? ''}`
        : `${s.status === 'passed' ? '✓' : '✗'} ${s.status} ${formatDuration((s.finishedAt ?? now) - s.startedAt)}`;
    return `${s.role.padEnd(roleWidth)}  ${counts}  ${tail}`;
  });

  const failures = states.flatMap((s) => s.failures.map((f) => `  ${s.role.padEnd(roleWidth)}  x ${f.title} (attempt ${f.attempt})\n${' '.repeat(roleWidth + 6)}${f.error}`));
  const running = states.some((s) => s.status === 'running');

  return [
    `${running ? 'RUNNING' : 'FINISHED'} — updated ${new Date(now).toLocaleTimeString()}`,
    '',
    ...lines,
    ...(failures.length ? ['', 'FAILED ATTEMPTS:', ...failures] : []),
    '',
  ].join('\n');
}

export default ProgressReporter;
