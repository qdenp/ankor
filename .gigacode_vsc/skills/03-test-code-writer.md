# Скилл: Писатель Тестового Кода

## Назначение
Написание кода теста и методов page object, запуск тестов и первичный рефакторинг до получения работающего теста.

## Когда использовать
После того как Планировщик Шагов Теста составил детальный план и пользователь его утвердил.

## Порядок выполнения

### Шаг 0: Per-test breakdown table (ОБЯЗАТЕЛЬНО до написания кода)

Для каждого теста составить таблицу:

| Step | UI / PO method | Why | PO method (existing / new) |
|------|----------------|-----|----------------------------|
| Login | UI | One login per test | signInPage.login() — existing |
| Create athlete | PO method | Precondition | athletePage.createAthlete() — **new** |
| Verify count | UI assertion | Outcome | expect(athletePage.athleteRows).toHaveCount(N) — existing |

**Правило:** каждый UI row должен быть justified. Если шаг — precondition → PO method. Если шаг — action under test → UI через PO. Если шаг — assertion → web-first expect через PO свойство.

### Шаг 1: Создание/обновление Page Objects (если нужно)
- Добавить новые локаторы в конструктор PO (readonly)
- Добавить новые методы в PO (только действия, без ассертов)
- Следовать точному шаблону PO из AGENTS.md

### Шаг 2: Написание тестового файла
- Создать новый тестовый файл или дополнить существующий
- Использовать правильный импорт: `import { test, expect } from '../../fixtures'`
- Настроить serial mode при необходимости
- Добавить beforeEach с loginAs, если требуется аутентификация
- Написать тест с описательным именем (без номеров тикетов в строке test())
- Добавить аннотацию @TC-XXXXX при необходимости

### Шаг 3: Проверка качества кода
Перед запуском:
- [ ] Все локаторы в PO, а не в тесте
- [ ] Используются web-first ассерты (expect с авто-ретраем)
- [ ] Нет waitForTimeout
- [ ] Нет try/catch для глушения ошибок
- [ ] Нет хардкодных таймаутов
- [ ] Имя теста описательное, без номеров
- [ ] Правильный импорт фикстур
- [ ] Serial mode настроен, если тесты изменяют состояние
- [ ] Методы PO возвращают Promise<void>, а не boolean
- [ ] `npm run typecheck` — без ошибок (новые поля PO объявлены в классе, опции методов Playwright существуют)

### Шаг 4: Запуск тестов
```bash
npm run typecheck
npx playwright test tests/specs/{role}/{file}.spec.ts --list
```
Убедиться, что ошибок типов нет и тесты обнаружены. `npm run test:{role}` и так запускает `typecheck` перед тестами (хук `pretest:{role}`) и при ошибке типов тесты не стартуют.

```bash
npm run test:{role}   # owner, sysadmin, coach, parent, athlete, или all
```
Запустить тестовый файл через npm script (AGENTS.md §15).

### Шаг 5: Анализ результатов и рефакторинг

**Если тест ПРОХОДИТ:**
- Перейти к Шагу 6 — финальная проверка

**Если тест НЕ ПРОХОДИТ:**
Анализировать ошибку и вносить минимальные исправления:

#### Категория 1: Локатор не найден
- **Симптом:** `Locator does not exist` или `Timeout exceeded`
- **Действие:** Проверить селектор, убедиться, что элемент на странице, скорректировать PO

#### Категория 2: Ассерт не прошёл
- **Симптом:** `Expected to have text 'X' but got 'Y'`
- **Действие:** Проверить ожидаемое значение, проблемы с таймингом, скорректировать ассерт

#### Категория 3: Проблема навигации/маршрута
- **Симптом:** `URL should be '/x' but was '/y'`
- **Действие:** Проверить шаг навигации, маршрут, дополнительные шаги

#### Категория 4: Проблема пользователя/аутентификации
- **Симптом:** `Redirected to sign-in` или `403 Forbidden`
- **Действие:** Проверить существование пользователя, email, роли/права

#### Категория 5: Нестабильный/сетевой сбой
- **Симптом:** `Network error`, `timeout`, прерывистые сбои
- **Действие:** Пусть ретраи обработают (retries: 2 в конфиге), при сохранении — добавить `locator.waitFor()`

### Шаг 6: Повторный запуск после исправления
```bash
npm run test:{role} -- --grep "название теста"
```
`--` обязателен: без него npm заберёт `--grep` себе и запустит все тесты роли.
Перезапустить конкретный упавший тест для проверки исправления.

### Шаг 7: Финальная проверка
- Если тест прошёл → **отдать работающий тест**
- Если тест снова упал → повторить Шаги 5-6 (максимум 3 попытки)
- Если > 3 попыток → остановиться и запросить clarification у пользователя

---

## Код шаблоны

### Новый тестовый файл (PO-only asserts)
```ts
import { test, expect } from '../../fixtures';
import { AthletePage } from '../../pages/athlete-page';
import { TIMEOUTS } from '../../config';

test.describe('Owner Athletes Tests', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ loginAs }) => {
    await loginAs('owner');
  });

  test('should create athlete and see in list', async ({ page }) => {
    const athletePage = new AthletePage(page);
    
    // Шаг 1: Переход
    await athletePage.goto();
    
    // Шаг 2: Взаимодействие через PO методы
    await athletePage.createAthlete({
      firstName: 'Test',
      lastName: 'Athlete',
      email: 'test.athlete@example.com',
      password: 'Password123',
      confirmPassword: 'Password123',
      graduationYear: '2010',
      team: 'Team01',
      gender: 'Female',
    });
    
    // Шаг 3: Проверка (web-first ассерты ТОЛЬКО через PO свойства)
    await expect(athletePage.getAthleteRow('test.athlete@example.com')).toBeVisible({ timeout: TIMEOUTS.long });
    await expect(athletePage.heading).toBeVisible();
    await expect(page).toHaveURL(/athletes/);
  });
});
```

### Новый метод Page Object (Действие)
```ts
async createAthlete(params: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  graduationYear: string;
  team: string;
  gender: string;
}): Promise<void> {
  await this.clickNewAthlete();
  await this.fillAthleteForm(params);
  await this.createButton.click();
  await expect(this.newAthleteHeading).toBeHidden({ timeout: TIMEOUTS.medium });
}
```

### Новый локатор Page Object
```ts
// В конструкторе:
readonly heading = page.getByRole('heading', { name: 'Athletes', level: 3 });
readonly newAthleteButton = page.getByRole('button', { name: /^New\s+\w+$/i }).first();
readonly searchInput = page.getByRole('textbox', { name: /search.*name|search.*email/i });
readonly createButton = page.getByRole('button', { name: 'Create' });
```

### Поиск строк в таблице (Надёжный паттерн)
```ts
getAthleteRow(email: string): Locator {
  return this.athleteRows.filter({ hasText: email }).first(); // строка в hasText — подстрока без учёта регистра
}
```

---

## Правила
- ВСЕГДА строго следовать правилам AGENTS.md
- ВСЕГДА использовать web-first ассерты
- НИКОГДА не помещать ассерты в методы PO
- НИКОГДА не использовать `page.locator()` / `page.getByRole()` / `page.getByText()` напрямую в тестах — только методы и свойства PO
- ВСЕГДА делать так, чтобы методы PO возвращали `Promise<void>`
- ВСЕГДА объявлять локаторы как `readonly` в конструкторе
- Использовать TIMEOUTS из config.ts, если нужен явный wait (редко)
- Использовать надёжные паттерны локаторов (getByRole > data-test > getByText > CSS селекторы)
- Вносить минимальные изменения для исправления ошибок
- НИКОГДА не глушить ошибки через try/catch или .catch()
- Если тест не проходит после 3 попыток → остановиться и спросить пользователя

---

## Формат вывода
После каждого запуска отчитываться:
1. **Page Objects изменены:** [список файлов и что добавлено]
2. **Тестовый файл:** [новый или существующий, путь, что добавлено]
3. **Результат запуска:** PASS / FAIL
4. **Если FAIL:** [ошибка + внесённые исправления]
5. **Статус:** "Тест проходит → переходим к Ревью и Правкам" или "Нужны правки → повторный запуск"

---

## Следующий скилл
После получения проходящего теста → передать результат в **04-test-review-and-fixes** (Ревью и Правки).