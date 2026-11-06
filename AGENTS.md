# AGENTS.md — Правила написания тестов для Ankor

## 1. Процесс автоматизации тестов через скиллы (ОБЯЗАТЕЛЬНО — ПЕРВЫМ ДЕЛОМ)

Для **любого нового тестового сценария** соблюдай цепочку скиллов из `.gigacode_vsc/skills/`:

```
01-test-scenario-analyst.md  →  Анализ требований, проверка дублей, план шагов
           ↓ (утверждение пользователем)
02-test-step-planner.md      →  Детальная таблица шагов с PO методами
           ↓ (утверждение пользователем)
03-test-code-writer.md       →  Написание кода, запуск, рефакторинг до PASS
           ↓ (работающий тест)
04-test-review-and-fixes.md  →  Финальный ревью, правки, отдача результата
```

### Правила процесса:
1. **Никакого кода до прохождения 01 и утверждения плана**
2. **Всегда начинай с `glob(".gigacode_vsc/skills/**")`** при старте работы по тестам
3. **Прочитай ВСЕ скиллы** в папке `.gigacode_vsc/skills/` перед началом — ОБЯЗАТЕЛЬНО
4. **Запроси подтверждение плана** у пользователя (шаг 5 в 01-test-scenario-analyst)
5. **Следуй цепочке 01→02→03→04** для каждого нового сценария
6. **Скилл 4 — ОБЯЗАТЕЛЬНЫЙ ФИНАЛЬНЫЙ ШАГ.** Без прохождения 04 сценарий НЕ считается завершённым. Запускай 04 после каждого проходящего теста, затем обновляй PLAN.md

### 🔴 КРИТИЧЕСКОЕ ПРАВИЛО — перед каждым новым тестовым сценарием:
1. **ОБЯЗАТЕЛЬНО прочитай ВСЕ скиллы** из `.gigacode_vsc/skills/` — не пропускай ни один
2. **Используй todo list** для отслеживания цепочки 01→02→03→04 — каждый шаг должен быть отдельным todo item
3. **Не пиши код** пока не утверждён план от скилла 01
4. **Не запускай скилл 04** пока не завершён скилл 03
5. **Скилл 04 — финальный шаг.** Без него сценарий НЕ считается завершённым

### Нарушение правил = остановка:
- ❌ Код без утверждённого плана → СТОП
- ❌ Пропущенный скилл → СТОП
- ❌ Пропущенный todo item → СТОП
- ❌ Скилл 04 не запущен → СЦЕНАРИЙ НЕ ЗАВЕРШЁН

### Команды проверки дублей (из 01-test-scenario-analyst):
```bash
# Поиск по методам PO:
grep -r "createAthlete" tests/specs/
grep -r "createCoach" tests/specs/
grep -r "createParent" tests/specs/
grep -r "createPlan" tests/specs/
grep -r "getAthleteRow\|getCoachRow\|getParentRow\|getPlanRow" tests/specs/

# Список существующих тестов по ролям:
ls tests/specs/owner/
ls tests/specs/coach/
ls tests/specs/parent/
ls tests/specs/athlete/
```

### Формат плана для утверждения (01-test-scenario-analyst):
```
## Тестовый сценарий: [Название]

**Роль:** [owner/coach/parent/athlete/sysadmin]
**Файл:** [NN-topic.spec.ts]
**Связанный PO:** [page-object.ts]

### Предварительные условия
- Пользователь авторизован как [роль]
- [Любые необходимые настройки данных]

### Шаги теста
1. Перейти на [страницу/маршрут]
2. [Действие через PO метод]
3. [Действие через PO метод]
...

### Ассерты (web-first, ТОЛЬКО через PO)
- await expect(po.getRow(name)).toBeVisible({ timeout: TIMEOUTS.long })
- await expect(page).toHaveURL(/expected-route/)

- [Новые методы PO / новый тестовый файл / расширение существующего]

**Утверждаете ли вы этот план?**
```

---

## 🔴 Запрет на изменение общих методов без подтверждения

**ОБЩИЕ (shared) файлы проекта:**
- `tests/pages/base-page.ts` — базовый PO с общими методами (logout, openProfileMenu и т.д.)
- `tests/fixtures.ts` — фикстуры авторизации (loginAs, logout, storageState)
- `tests/config.ts` — конфигурация, константы, таймауты
- Любые другие файлы, используемые **несколькими тестами или ролями**

### 🔴 ПРАВИЛО: Не изменять общие методы без подтверждения пользователя

- **Никаких правок в shared-файлы без явного одобрения пользователя**
- Перед любым изменением — показать diff и объяснить, зачем это нужно
- Если общий метод используется в нескольких тестах — правка может сломать работающие тесты
- **Нарушение = остановка и откат изменений**

---

## 2. Web-first ассерты — единственный допустимый способ

```ts
// ✅ ПРАВИЛЬНО — авто-ретрай, ждёт условие
await expect(page.locator('.athlete-count')).toHaveText('12');
await expect(page).toHaveURL(/\/organizations/);
await expect(evaluationPage.scorecardGrid).toHaveCount(1);

// ❌ НЕПРАВИЛЬНО — одна попытка
expect(await page.locator('.badge').count()).toBe(6);
```

## 3. Запрещённые анти-паттерны

- `page.waitForTimeout(...)` — вместо этого `expect(...).toHaveCount()`, `locator.waitFor()`, `page.waitForLoadState('networkidle')`
- `try/catch` для глушения ошибок
- `.catch(() => {})` или `.catch(() => false)` в ассертах — пусть тест упадёт с понятной ошибкой
- Хардкод таймаутов — только из `config.ts`
- Логин в `beforeEach` для всех тестов — только если тесту нужен
- Прямой доступ к `this.page` в методах PO (кроме `goto`, `waitForLoadState`, `reload`)
- Создание локаторов в методах PO — только в конструкторе

## 4. Page Object Discipline

- В тестах **нет** `page.locator(...)` — только методы и свойства PO
- Локаторы живут в PO один раз, дублирование запрещено
- Предпочтительно `[data-test="..."]` или стабильные селекторы по `getByRole` / `getByPlaceholder`. CSS/XPath допустимы только когда `getByRole` невозможен: iframe без доступного имени, сторонние виджеты без семантического HTML, декоративные элементы без роли
- Все `readonly` локаторы объявляются в конструкторе
- Методы PO: actions (`click`, `fill`, `goto`) — не возвращают `boolean`
- Проверки (`expect`) только в тестах, не в PO

### Кнопки в разных режимах
- Create mode → кнопка "Create"
- Edit mode → кнопка "Save"
- Всегда объявлять отдельные локаторы: `createButton` и `saveButton`
- Не использовать один локатор для разных режимов
- Текст кнопок проверять на реальном UI, не угадывать

### Шаблон Page Object (см. `pages/base-page.ts`, `pages/athlete-page.ts`)

```ts
export class AthletePage extends BasePage {
  readonly heading = page.getByRole('heading', { name: 'Athletes', level: 3 });
  readonly newAthleteButton = page.getByRole('button', { name: /^New\s+\w+$/i }).first();
  readonly searchInput = page.getByRole('textbox', { name: /search.*name|search.*email/i });
  readonly createButton = page.getByRole('button', { name: 'Create' });
  
  // Form fields
  readonly firstNameInput = page.getByRole('textbox', { name: 'First name', exact: true });
  // ...
  
  // Table rows
  readonly athleteRows = page.getByRole('row');

  constructor(page: Page) {
    super(page);
    // все локаторы здесь
  }

  async goto(): Promise<void> { ... }
  async createAthlete(params: {...}): Promise<void> { ... }
  
  // Robust row lookup — multiple strategies
  getAthleteRow(email: string): Locator {
    const byRole = this.page.getByRole('row', { name: new RegExp(email, 'i') });
    const byCell = this.page.locator('tr', { hasText: email }).first();
    const byText = this.page.getByText(email, { exact: false }).first();
    return byRole.or(byCell).or(byText).first();
  }
}
```

### Поиск строк в таблицах — robust pattern

```ts
// В PO конструкторе:
readonly tableRows = page.getByRole('row');

// Метод:
getRow(name: string): Locator {
  const byRole = this.page.getByRole('row', { name: new RegExp(name, 'i') });
  const byCell = this.page.locator('tr', { hasText: name }).first();
  const byText = this.page.getByText(name, { exact: false }).first();
  return byRole.or(byCell).or(byText).first();
}
```

## 5. Данные и конфигурация

- Все credentials — из `.env` (не коммитить!)
- Числа (кол-во атлетов и т.д.) — именованные константы из `config.ts`

## 6. Названия тестов

- Описывают **поведение и ожидаемый результат**
- Номер только в префиксе имени файла `NN-topic.spec.ts`
- В заголовках `test(...)` номера **не** используются — ни тикетов, ни файлов

```ts
// ✅ ПРАВИЛЬНО
test('should display error with invalid credentials', () => { ... });

// ❌ НЕПРАВИЛЬНО
test('01 - should display error with invalid credentials', () => { ... });
test('91859 should create plan', () => { ... });
test('13 should create plan', () => { ... });
```

Allure ID допустим через аннотацию:
```ts
test('@TC-91859 should create plan and see in My Plans', () => { ... });
```

### Правила нумерации файлов

Номера файлов соответствуют **пунктам бокового меню** приложения. Это обеспечивает синхронизацию между ролями.

**Пункты меню (owner — полный набор):**

| № | Пункт меню | Файл |
|---|------------|------|
| 00 | Подготовка | `00-create-users.spec.ts` |
| 01 | Авторизация | `01-signin.spec.ts` |
| 02 | Логин под ролью | `02-auth.spec.ts` |
| 03 | Регистрация | `03-signup.spec.ts` |
| 04 | Organizations | `04-organization.spec.ts` |
| 05 | Athletes | `05-athletes.spec.ts` |
| 06 | Coaches | `06-coaches.spec.ts` |
| 07 | Parents | `07-parents.spec.ts` |
| 08 | Teams | `08-teams.spec.ts` |
| 09 | Skills | `09-skills.spec.ts` |
| 10 | Drills | `10-drills.spec.ts` |
| 11 | Scorecard Templates | `11-scorecard-templates.spec.ts` |
| 12 | Evaluations | `12-evaluations.spec.ts` |
| 13 | Practice Plans | `13-practice-plans.spec.ts` |
| 14 | Easy Join | `14-easy-join.spec.ts` |
| 15 | Manage Users | `15-manage-users.spec.ts` |
| 16 | Notifications | `16-notifications.spec.ts` |

**Правила:**
- ✅ Нумерация одинаковая для всех ролей
- ✅ Каждая роль содержит только те файлы, которые ей доступны
- ✅ Файлы с одной ролью в одной папке идут последовательно (`serial`)
- ❌ Не объединять разные сущности в одном файле (organization ≠ teams ≠ plans)

## 7. Параллельность и последовательность по ролям

### Структура по ролям

Тесты разбиты по подпапкам — по одной на роль:

```
tests/specs/
├── owner/     ← тесты Owner/Admin
├── coach/     ← тесты Coach
├── parent/    ← тесты Parent
└── athlete/   ← тесты Athlete
```

### Запуск тестов

**Каждая роль запускается на отдельном воркере — не пересекаются.**

```bash
# Запустить все 4 роли параллельно (каждая на своём воркере)
npm run test:all

# Запустить только одну роль
npm run test:owner
npm run test:coach
npm run test:parent
npm run test:athlete

# Один тест
npx playwright test tests/specs/owner/01-signin.spec.ts
```

**Важно:** внутри каждой роли тесты идут последовательно (через `serial`), между ролями — параллельно.

```ts
// ✅ ПРАВИЛЬНО — serial внутри роли
test.describe('Owner Plan Tests', () => {
  test.describe.configure({ mode: 'serial' });

  test('should create plan and see in My Plans', async ({ page }) => { ... });
  test('should see all plan tabs as owner', async ({ page }) => { ... });
});
```

### Ретраи

- `retries: 2` в `playwright.config.ts` — автоматически ретраит упавшие тесты (сетевые ошибки, тайминги)
- Не нужно добавлять retry вручную

## 8. Авторизация через фикстуры

- Всегда используй `loginAs(role)` fixture из `fixtures.ts`
- Логаут — `logout()` fixture (через `BasePage.logout()`)
- Ручной `signInPage.login()` только в `00-create-users.spec.ts` (data setup)

### ⚠️ Logout в конце serial-последовательности

- Supabase ревокает JWT-токен при logout — токен становится невалидным на сервере
- Параллельные тесты с тем же email могут потерять сессию
- **Правило:** тесты logout должны идти последними в serial-последовательности

```ts
// ✅ ПРАВИЛЬНО — logout в конце
test.describe('Owner Auth Tests', () => {
  test.describe.configure({ mode: 'serial' });

  test('should login as owner and see dashboard', async ({ loginAs }) => { ... });
  // logout — последний тест
  test('should logout as owner', async ({ loginAs, logout }) => { ... });
});
```

```ts
// ❌ НЕПРАВИЛЬНО — logout до других тестов
test.describe('Owner Auth Tests', () => {
  test.describe.configure({ mode: 'serial' });

  test('should logout as owner', async ({ loginAs, logout }) => { ... });
  test('should login as owner and see dashboard', async ({ loginAs }) => { ... }); // упадёт
});
```

## 9. Инфраструктура тестов — кэш авторизации (localStorage)

### tests/fixtures.ts — per-role storageState кэш

- Кэш: `tests/.auth/{role}.json` (каждая роль — свой файл: owner, sysadmin, coach, parent, athlete)
- `isTokenValid(storagePath)` — проверяет `exp` JWT в storageState (токен не истёк)
- `restoreAuthFromCache(page, storagePath)` — восстанавливает cookies + localStorage в существующий контекст `page`, затем `reload`
- `loginAs(role)` — если кэш валиден → восстанавливает сессию из файла; иначе UI-логин с `clearCookies()` + fallback очистки `localStorage` при редиректе на dashboard (старый отозванный токен в localStorage может редиректить на dashboard вместо sign-in)
- `logout()` — удаляет **только файл кэша той роли, которая была залогинена** (отслеживается через модульную переменную `currentRole`). Кэши других ролей не трогаются — они живут на своих воркерех.
- `currentRole` — устанавливается в `loginAs(role)`, сбрасывается в `logout()`. Нужно для корректной инвалидации кэша только своей роли.
- Тесты sign-in/sign-up используют `test.use({ storageState: undefined })` для сброса кэша и чистого браузера.

### tests/pages/base-page.ts — селекторы профиля и логаута

- `profileButton` — комбинированный локатор через `.or()`:
  - `getByRole('button', { name: /profile|user|account|username/i })`
  - `[role="button"]:has(svg)`, `[role="button"]:has(img)`, `[role="button"]:has(.MuiAvatar-root)`
  - `.first()`
- `logoutMenuItem` — `getByRole('menuitem', { name: /log out/i })` (совпадает с `<h6>Log Out</h6>` внутри `<li role="menuitem">`)
- `openProfileMenu()` — ждёт `profileButton`visible, кликает, затем ждёт `logoutMenuItem`visible. Убран сломанный fallback, где `click()` вызывался без проверки `isVisible()`.

### Результаты проверки

- 42 passed, 0 failed, 4 flaky (пройдены на ретрае), logout стабилен 9/9 прогонов
- Полный прогон без logout-тестов: ~3.9 мин (было ~5.8 мин)

## 10. Создание тестовых данных


- Пользователи создаются через `00-create-users.spec.ts` перед основными тестами
- Каждый email может быть использован только один раз — повторная попытка создаст ошибку
- Порядок создания: Athlete → Coach → Parent (так как Parent требует Athlete)
- Для создания пользователей используем:
  - Athlete: First name, Last name, Email, Password, Confirm password, Graduation year (2010), Position, Team, Gender
  - Coach: First name, Last name, Email, Password, Confirm password
  - Parent: First name, Last name, Email, Password, Confirm password, Relationship, Athlete

## 11. Роли и права доступа

5 ролей с разными правами:
- **System Administrator** — полный доступ ко всему
- **Owner/Admin** — управление организацией, пользователями, командами
- **Coach** — управление атлетами, планами тренировок
- **Athlete** — просмотр своих оценок, планов
- **Parent** — просмотр атлетов, связанных с родителем

## 12. Email-уведомления

- Тесты, проверяющие письма, пока пропускаем
- Проверяем только in-app уведомления

## 13. Особенности валидации

- Оценки 1-5: нельзя поставить < 3 более чем для 5 категорий
- Deep links из email — проверять редирект и права доступа (когда реализуем)
- Prebuilt plans — доступны только для SysAdmin
- Org Plans — видны только Owner/Admin/SysAdmin

## 14. Структура тестов

```
tests/
├── config.ts           # URL, константы, credentials
├── fixtures.ts         # Базовые фикстуры (login, roles)
├── pages/              # Page Objects
│   ├── base-page.ts
│   ├── sign-in-page.ts
│   ├── sign-up-page.ts
│   └── ...
└── specs/              # Тесты
    ├── 00-create-users.spec.ts   # Создание тестовых пользователей
    ├── 01-signin.spec.ts         # Авторизация
    ├── 02-signup.spec.ts         # Регистрация
    ├── 03-organization.spec.ts   # CRUD организаций
    └── ...
```

## 15. Команды для запуска

### ВАЖНО: всегда используй npm скрипты для запуска тестов

```bash
# Все тесты (4 роли параллельно, каждая на своём воркере)
npm run test:all

# Одна роль
npm run test:owner
npm run test:coach
npm run test:parent
npm run test:athlete

# Один тест
npx playwright test tests/specs/owner/01-signin.spec.ts

# Show report
npx playwright show-report
```

**❌ НЕ используй** `npx playwright test` без аргументов — он запустит тесты без учёта ролей и они пересекутся!

## 16. Pre-commit / CI проверки

Автоматические проверки перед коммитом:

```bash
# Тесты компилируются
npx playwright test --list

# Нет прямых локаторов в тестах
grep -r "page\.(getByRole\|locator\|getByText)" tests/specs

# Нет хардкодных ожиданий
grep -r "waitForTimeout" tests/

# Нет глушения ошибок
grep -r "\.catch(() =>" tests/
```

Добавить в `package.json` scripts:
```json
{
  "scripts": {
    "lint:tests": "grep -r \"page\\.(getByRole|locator|getByText)\" tests/specs && exit 1 || exit 0",
    "lint:waits": "grep -r \"waitForTimeout\" tests/ && exit 1 || exit 0",
    "lint:catches": "grep -r \"\\.catch(() =>\" tests/ && exit 1 || exit 0",
    "pre-commit": "npm run lint:tests && npm run lint:waits && npm run lint:catches"
  }
}
```
5. **Следуй цепочке 01→02→03→04** для каждого нового сценария

### Команды проверки дублей (из 01-test-scenario-analyst):
```bash
# Поиск по методам PO:
grep -r "createAthlete" tests/specs/
grep -r "createCoach" tests/specs/
grep -r "createParent" tests/specs/
grep -r "createPlan" tests/specs/
grep -r "getAthleteRow\|getCoachRow\|getParentRow\|getPlanRow" tests/specs/

# Список существующих тестов по ролям:
ls tests/specs/owner/
ls tests/specs/coach/
ls tests/specs/parent/
ls tests/specs/athlete/
```

### Формат плана для утверждения (01-test-scenario-analyst):
```
## Тестовый сценарий: [Название]

**Роль:** [owner/coach/parent/athlete/sysadmin]
**Файл:** [NN-topic.spec.ts]
**Связанный PO:** [page-object.ts]

### Предварительные условия
- Пользователь авторизован как [роль]
- [Любые необходимые настройки данных]

### Шаги теста
1. Перейти на [страницу/маршрут]
2. [Действие через PO метод]
3. [Действие через PO метод]
...

### Ассерты (web-first, ТОЛЬКО через PO)
- await expect(po.getRow(name)).toBeVisible({ timeout: TIMEOUTS.long })
- await expect(page).toHaveURL(/expected-route/)

- [Новые методы PO / новый тестовый файл / расширение существующего]

**Утверждаете ли вы этот план?**
```

---

## 🔴 Запрет на изменение общих методов без подтверждения

**ОБЩИЕ (shared) файлы проекта:**
- `tests/pages/base-page.ts` — базовый PO с общими методами (logout, openProfileMenu и т.д.)
- `tests/fixtures.ts` — фикстуры авторизации (loginAs, logout, storageState)
- `tests/config.ts` — конфигурация, константы, таймауты
- Любые другие файлы, используемые **несколькими тестами или ролями**

### 🔴 ПРАВИЛО: Не изменять общие методы без подтверждения пользователя

- **Никаких правок в shared-файлы без явного одобрения пользователя**
- Перед любым изменением — показать diff и объяснить, зачем это нужно
- Если общий метод используется в нескольких тестах — правка может сломать работающие тесты
- **Нарушение = остановка и откат изменений**
