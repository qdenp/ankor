// Запрещённые шаблоны в тестах (AGENTS.md §3, §4, §16). Node, а не grep: на Windows npm запускает
// скрипты через cmd.exe, где grep нет. Тот же скрипт вызывает проверка PR (.github/workflows/pr-checks.yml).
// Запуск: npm run lint
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const RULES = [
  {
    dir: 'tests/specs',
    pattern: /page\.(getByRole|getByText|locator|keyboard)\b/,
    message: 'Локатор в спеке — вынести в Page Object (AGENTS.md §4)',
  },
  {
    dir: 'tests',
    pattern: /waitForTimeout\(/,
    message: 'waitForTimeout запрещён — ждать условие через expect / waitFor (AGENTS.md §3)',
  },
  {
    dir: 'tests',
    pattern: /\.catch\(\(\) =>/,
    message: '.catch(() => …) глушит ошибки — пусть тест падает с понятной ошибкой (AGENTS.md §3)',
  },
];

function* tsFiles(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* tsFiles(path);
    else if (path.endsWith('.ts')) yield path;
  }
}

let problems = 0;
for (const rule of RULES) {
  for (const file of tsFiles(rule.dir)) {
    readFileSync(file, 'utf-8')
      .split('\n')
      .forEach((line, i) => {
        if (rule.pattern.test(line)) {
          problems++;
          console.error(`${relative('.', file)}:${i + 1}: ${rule.message}\n    ${line.trim()}`);
        }
      });
  }
}

if (problems) {
  console.error(`\n${problems} problem(s)`);
  process.exit(1);
}
console.log('lint: ok');
