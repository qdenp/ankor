# AGENTS.md — Правила написания тестов для Ankor

## Запуск E2E тестов — решение для Bash tool (120 сек лимит)

Bash tool убивает процессы через 120 секунд по умолчанию. E2E тесты (~10-15 мин) не успевают.

### Решение: параметр `timeout`

**Параметр `timeout` в миллисекундах** — переопределяет дефолтные 120 секунд.

```powershell
# Запуск с таймаутом 30 минут (1800000 мс):
Stop-Process -Name npx, node -Force -ErrorAction SilentlyContinue
Remove-Item "test-output.log" -ErrorAction SilentlyContinue
# Оболочка агента задаёт NO_COLOR=1, Playwright даёт воркерам FORCE_COLOR — Node на каждый воркер
# пишет в лог предупреждение о конфликте. Цветов в файле нет в любом случае.
Remove-Item Env:NO_COLOR -ErrorAction SilentlyContinue
npm run test:all 2>&1 > test-output.log
# timeout: 1800000
```

**Рабочие значения:**
- `timeout: 600000` (10 мин) — для одной роли
- `timeout: 1800000` (30 мин) — для полного прогона всех ролей

**Формат прогресса:** `list` reporter из конфига показывает `ok N` (прошёл), `x N` (упал), `- N` (пропущен) для каждого теста.

### Мониторинг

```
# Короткая сводка по всем ролям (обновляется после каждого теста):
# Read tool → reports/progress.txt → строка на роль: N/M, ok/x/-, текущий тест; ниже — упавшие попытки с ошибкой
# Первая строка RUNNING / FINISHED — идёт ли ещё прогон

# Подробности — полный лог через Read tool:
# Read tool → test-output.log → offset=1, limit=200 → offset=201, limit=200 ...
# Формат: [N/M] — тест N из M стартовал (line), ok N / x N / - N — прошёл / упал / пропущен (list)
# test:all: перед каждой строкой имя роли — [owner], [coach] …; одна роль в логе — поиск по [coach]

# Проверка завершены ли:
# Read tool → test-output.log → если последняя строка "npm run test:* exited with code 0" → завершены
# (test:all — такая строка для каждой из 5 ролей)
```

### Очистка мусора

**Обязательно очищать ПЕРЕД запуском тестов и ПОСЛЕ генерации Allure отчёта:**

```powershell
# Перед запуском тестов:
Remove-Item allure-results\* -Recurse -ErrorAction SilentlyContinue
Remove-Item test-results\* -Recurse -ErrorAction SilentlyContinue
Remove-Item Env:NO_COLOR -ErrorAction SilentlyContinue
npm run test:owner 2>&1 > test-output.log

# После генерации отчёта:
npx allure generate --clean -o allure-report
Compress-Archive -Path "allure-results" -DestinationPath "allure-results.zip" -Force
Remove-Item allure-results\* -Recurse -ErrorAction SilentlyContinue
Remove-Item test-results\* -Recurse -ErrorAction SilentlyContinue
```

- `allure-results` — сырые результаты Playwright (накапливаются при каждом прогоне)
- `test-results` — скриншоты, видео, трейсы (накапливаются при каждом прогоне)
- `allure-results.zip` — архив для загрузки в TestOps (перезаписывается каждый раз)
- **Никогда не оставлять эти папки неочищенными**

### ❌ Не работает:
- `npm run test:all` без `timeout` — убьётся через 120 сек
- `Start-Job` — изоляция, файл не пишется
- `Tee-Object` — блокируется

### PowerShell hidden process — памятка

Запуск через `Start-Process` обходит Bash tool полностью. **Не использовать без запроса пользователя.**

```powershell
Stop-Process -Name npx, node -Force -ErrorAction SilentlyContinue
Remove-Item "test-output.log" -ErrorAction SilentlyContinue
Remove-Item Env:NO_COLOR -ErrorAction SilentlyContinue   # дочерний процесс наследует окружение
$proc = Start-Process powershell -ArgumentList "-NoProfile", "-Command", "Set-Location 'C:\projects\aexsoft\ankor'; npm run test:all 2>&1 > test-output.log" -WindowStyle Hidden -PassThru
Write-Output "Started PID: $($proc.Id)"
```

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

### Где детали
- Команды проверки дублей и формат плана для утверждения — в `01-test-scenario-analyst.md` (шаги 2 и 4).
- Пошаговый чеклист старта и запреты — в `.gigacode_vsc/agent/workflow.md`.

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
- **Ожидание загрузки данных — `await this.waitForLoading()`** (спиннеры загрузки есть на всех страницах, кроме входа и регистрации; без ожидания тест читает пустую таблицу):
  - после любого перехода на страницу: меню, `goto`, ссылка Back;
  - **после создания, редактирования или удаления записи/пользователя** — по завершении приложение возвращает на страницу с данными, и она грузится заново;
  - сохранение делать методом PO (`createX`, `editX`, `saveX`), который сам ждёт загрузки, а не кликом по кнопке Create/Save/Submit в тесте;
  - спиннер появляется через ~150–215 мс после клика, поэтому `waitForLoading()` сначала коротко ждёт его появления (`TIMEOUTS.spinnerAppear`), затем исчезновения — вызывать можно сразу после клика (REVIEW-PLAN 1.8)

### Кнопки создания на страницах списков
- На **пустом** списке (нет записей/пользователей) рядом с кнопкой в шапке появляется вторая такая же кнопка создания (пустое состояние) — это на всех страницах с созданием записей.
- Поэтому локатор кнопки создания на странице списка всегда с `.first()`: `getByRole('button', { name: 'Create evaluation' }).first()`. Без него на пустом списке тест падает со strict mode violation (обе кнопки открывают одну форму).

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
  // Строка в name — подстрока без учёта регистра. Не строить new RegExp из данных: "+" в email — квантификатор
  getAthleteRow(email: string): Locator {
    const byRole = this.page.getByRole('row', { name: email });
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
  const byRole = this.page.getByRole('row', { name });
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

### Привязка к тест-кейсу TestOps — `allure.allureId`

Первая строка теста — номер кейса (`test_case_id` из TestOps, не allure_id 91XXX). По нему TestOps записывает результат прогона в кейс.

```ts
import * as allure from 'allure-js-commons';

test('should create plan and see in My Plans', async ({ page }) => {
  await allure.allureId('72600');
  ...
});
```

- Один тест — один кейс: у результата только один ID. Тест на несколько кейсов — разделить.
- `@TC-…` в названии TestOps **не** распознаёт — не использовать.
- Тест без номера при выгрузке создаёт в TestOps новый автоматический кейс — номер ставить всем тестам, у которых есть кейс; тесты без кейса не держать.
- Тест покрывает кейс не полностью — номер ставить, тест пропускать: `test.skip(true, 'TODO(<id>): …')` **после** `allureId` (иначе метка не запишется), над тестом — комментарий `TODO(<id>)`, чего не хватает.

### Правила нумерации файлов

Номера файлов соответствуют **пунктам бокового меню** приложения. Это обеспечивает синхронизацию между ролями.

**Пункты меню (owner — полный набор):**

| № | Пункт меню | Файл |
|---|------------|------|
| 01 | Авторизация (страница входа) | `01-signin.spec.ts` |
| 02 | Home (главная страница роли) | `02-homepage.spec.ts` |
| 03 | Регистрация (join-код) | `03-signup.spec.ts` |
| 04 | Organizations | `04-organization.spec.ts` |
| 05 | Athletes | `05-athletes.spec.ts` |
| 06 | Coaches | `06-coaches.spec.ts` |
| 07 | Parents | `07-parents.spec.ts` |
| 08 | Teams | `08-teams.spec.ts` |
| 09 | Skills | `09-skills.spec.ts` |
| 10 | Drills | `10-drills.spec.ts` |
| 11 | Scorecard Templates | `11-scorecard-templates.spec.ts` |
| 12 | Evaluations | `12-evaluations.spec.ts` |
| 13 | Practice Plans | `13-plans.spec.ts` |
| 14 | Easy Join | `14-easy-join.spec.ts` |
| 15 | Manage Users | `15-manage-users.spec.ts` |
| 16 | Notifications | `16-notifications.spec.ts` |
| 90 | Права роли (сквозная проверка разделов) | `90-permissions.spec.ts` |
| 99 | Выход (logout) — только owner | `99-auth.spec.ts` |

**Правила:**
- ✅ `99-auth` — всегда последний файл owner: logout отзывает сессию, и всё, что идёт после него, логинится заново (§8). Кнопка выхода одна для всех ролей, поэтому logout проверяется только у owner; вход отдельно не проверяется — его проходит каждый тест через `loginAs`, а вход через форму — `01-signin`
- ✅ Подготовка данных для нового стенда — `tests/setup/create-users.spec.ts`, отдельный проект `setup` (`npm run test:setup`), в `test:all` и CI не входит
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
├── sysadmin/  ← тесты System Administrator
├── coach/     ← тесты Coach
├── parent/    ← тесты Parent
└── athlete/   ← тесты Athlete
```

Тест лежит в папке той роли, под которой логинится. Проект Playwright определяется папкой: `loginAs('sysadmin')` в `owner/` выполнится в проекте owner, параллельно с проектом sysadmin, и оба будут писать в один `tests/.auth/sysadmin.json`.

### Запуск тестов

**Каждая роль запускается на отдельном воркере — не пересекаются.**

```bash
# Запустить все 5 ролей параллельно (каждая на своём воркере)
npm run test:all

# Запустить только одну роль
npm run test:owner
npm run test:sysadmin
npm run test:coach
npm run test:parent
npm run test:athlete

# Один тест
npx playwright test tests/specs/owner/01-signin.spec.ts --project=owner --workers 1
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
- Ручной `signInPage.login()` только в `01-signin` (проверка формы входа) и `tests/setup/create-users.spec.ts` (подготовка данных)

### ⚠️ Logout в конце serial-последовательности

- Supabase отзывает сессию при logout — токен становится невалидным на сервере
- Проверять вход другого пользователя (например, только что созданного) — в отдельном контексте `browser.newContext({ baseURL })`, а не через logout текущей роли (пример — `owner/07-parents.spec.ts`)
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
- `isTokenValid(storagePath)` — проверяет `exp` access-токена в storageState (токен не истёк). Access-токен живёт час, после этого — UI-логин.
- `restoreAuthFromCache(page, storagePath)` — кладёт cookies + localStorage в контекст `page` и открывает `/` через `goto('/')`. Именно `goto`, а не `reload`: к этому моменту приложение уже увело пустой браузер на `/sign-in`, и `reload` рендерит страницу входа, которая мелькает и сбивает проверку.
- `loginAs(role)` — если кэш валиден → восстанавливает сессию и ждёт ссылку **Home** в меню (`BasePage.navHome`) или заголовок страницы входа. Приложению нужно ~3–4 с, чтобы решить судьбу сессии; отозванный на сервере токен уводит на `/sign-in` → UI-логин. При UI-логине кэш пишется только после появления Home.
- `logout()` — удаляет **только файл кэша той роли, которая была залогинена** (отслеживается через модульную переменную `currentRole`). Кэши других ролей не трогаются — они живут на своих воркерах.
- `currentRole` — устанавливается в `loginAs(role)`, сбрасывается в `logout()`. Нужно для корректной инвалидации кэша только своей роли.
- Тесты sign-in/sign-up не вызывают `loginAs` — их браузер чистый (Playwright создаёт новый контекст на каждый тест, storageState в конфиге не задан); `test.use({ storageState: undefined })` для этого не нужен.

### tests/pages/base-page.ts — селекторы профиля и логаута

- `profileButton` — комбинированный локатор через `.or()`:
  - `getByRole('button', { name: /profile|user|account|username/i })`
  - `[role="button"]:has(svg)`, `[role="button"]:has(img)`, `[role="button"]:has(.MuiAvatar-root)`
  - `.first()`
- `logoutMenuItem` — `getByRole('menuitem', { name: /log out/i })` (совпадает с `<h6>Log Out</h6>` внутри `<li role="menuitem">`)
- `openProfileMenu()` — ждёт `profileButton`visible, кликает, затем ждёт `logoutMenuItem`visible. Убран сломанный fallback, где `click()` вызывался без проверки `isVisible()`.

## 10. Создание тестовых данных

### Ограничение стенда
- **Удалять можно Teams.** У оценок (Evaluations) в меню есть Delete, но работает ли удаление — не проверено. Drills, plans, skills, шаблоны — не проверено. Пользователей любых ролей удалить нельзя — только деактивировать через Manage Users (после этого они пропадают из своих списков).
- Поэтому новые записи создаёт **только тест, который проверяет само создание**. Остальные тесты (view, edit, invite, права, валидация) переиспользуют созданную им сущность (REVIEW-PLAN 3.12).
- Проверять правки инфраструктуры — на спеках, которые ничего не создают (`*-homepage`, `*-permissions`).

### Основные тестовые пользователи
- Пользователи ролей из `.env` уже созданы на стенде; `tests/setup/create-users.spec.ts` (`npm run test:setup`) нужен только для разворачивания нового стенда
- Тесты не должны менять этих пользователей (имя, email, связи) — на них держатся тесты ролей
- Каждый email может быть использован только один раз — повторная попытка создаст ошибку
- Порядок создания: Athlete → Coach → Parent (так как Parent требует Athlete)
- Для создания пользователей используем:
  - Athlete: First name, Last name, Email, Password, Confirm password, Graduation year (2010), Position, Team, Gender
  - Coach: First name, Last name, Email, Password, Confirm password
  - Parent: First name, Last name, Email, Password, Confirm password, Relationship, Athlete

### Организации, которые меняют тесты (`ORGANIZATIONS` в `config.ts`)
- `aiorg01` — организация owner, имя меняет `owner/04-organization`; `aiorg01sysedit` — отдельная, для `sysadmin/04-organization` (создана `tests/setup`, пароль админа — `ANKOR_SYSEDIT_ORG_PASSWORD` в `.env`)
- Тесты разных ролей не должны менять одну и ту же запись: роли идут параллельно и сбивают друг друга
- После правки тест возвращает имя к **константе**, а не к прочитанному в начале значению: упавший до возврата прогон иначе оставляет временное имя «исходным» для всех следующих

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
├── config.ts           # URL, константы, credentials (из .env.d333afta2q6llv)
├── fixtures.ts         # Фикстуры: loginAs(role), logout(), кэш сессий
├── .auth/              # Кэш сессий по ролям (gitignored)
├── pages/              # Page Objects (base-page.ts + по одному на раздел)
│   ├── base-page.ts
│   ├── sign-in-page.ts
│   ├── athlete-page.ts
│   └── ...
├── setup/              # Подготовка данных для нового стенда (проект setup, npm run test:setup)
└── specs/              # Тесты по папкам ролей
    ├── owner/          # 01-signin … 13-plans, 90-permissions, 99-auth
    ├── sysadmin/       # 04-organization, 13-plans, 90-permissions
    ├── coach/
    ├── parent/
    └── athlete/
```

## 15. Команды для запуска

### ВАЖНО: всегда используй npm скрипты для запуска тестов

```bash
# Все тесты (5 ролей параллельно, каждая на своём воркере)
npm run test:all

# Одна роль
npm run test:owner
npm run test:sysadmin
npm run test:coach
npm run test:parent
npm run test:athlete

# Один тест по названию (-- обязателен, иначе npm заберёт --grep себе)
npm run test:owner -- --grep "should edit parent"

# Один или несколько файлов — обязательно --project и --workers 1
# (в конфиге fullyParallel: true; без --workers 1 тесты пойдут параллельно,
#  и logout из 99-auth отзовёт сессию посреди соседнего теста)
npx playwright test tests/specs/owner/01-signin.spec.ts --project=owner --workers 1

# Проверка типов
npm run typecheck

# HTML-отчёт роли (у каждой роли своя папка; артефакты — test-results/<роль>)
npx playwright show-report reports/html/owner
```

**❌ НЕ используй** `npx playwright test` без аргументов — он запустит тесты без учёта ролей и они пересекутся!

### Проверка типов перед прогоном — автоматически
- `npm run test:<роль>` и `npm run test:all` сначала выполняют `npm run typecheck` (npm-хуки `pretest:*`, 3–6 с). Есть ошибки типов — тесты не стартуют, в выводе файл и строка ошибки.
- `test:all` проверяет типы один раз и вызывает роли с `--ignore-scripts` (отключает только pre-хуки).
- `npx playwright test …` идёт в обход хуков — перед ним запускать `npm run typecheck` вручную.

## 16. Pre-commit / CI проверки

Автоматические проверки перед коммитом:

```bash
# Типы без ошибок
npm run typecheck

# Тесты находятся (нет ошибок загрузки)
# ⚠️ allure-playwright из локального конфига пишет на --list «skipped» на каждый тест — потом очистить allure-results
npx playwright test --list

# Нет прямых локаторов в тестах (должно быть пусто)
grep -rnE "page\.(getByRole|getByText|locator|keyboard)" tests/specs

# Нет хардкодных ожиданий (должно быть пусто)
grep -rn "waitForTimeout(" tests/

# Нет глушения ошибок (должно быть пусто)
grep -rn "\.catch(() =>" tests/
```

Команды выше — для Git Bash. Как npm-скрипты они на Windows не работают: npm запускает скрипты через `cmd.exe`, где нет `grep`. Для автоматизации — ESLint (`eslint-plugin-playwright`) или скрипт на Node (REVIEW-PLAN 4.6).

**На GitHub те же проверки идут автоматически на каждый PR** — `.github/workflows/pr-checks.yml` (типы, `--list`, три grep выше; около минуты, без браузера и стенда). Красный PR не мержить. Это не ревью: логику тестов проверка не оценивает.
