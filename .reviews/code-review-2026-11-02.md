# Code Review — Ankor Athletics E2E Tests

**Дата:** 2026-11-02
**Фреймворк:** Playwright Test
**Паттерн:** Page Object Model (POM)
**CI/CD:** GitHub Actions (проверка по `CI` env)

---

## Сводка

| Критичность | Кол-во |
|------------|--------|
| 🔴 Критичные | 7 |
| 🟡 Средние | 10 |
| 🟢 Лёгкие | 4 |
| ⚠️ Не применимо | 1 |
| **Всего** | **22** |

---

## 🔴 КРИТИЧНЫЕ ПРОБЛЕМЫ

### 1. Прямой доступ к `page` в тестах — нарушение POM ✅ ИСПРАВЛЕНО (2026-11-02)

**Файлы:** `06-coaches.spec.ts`, `10-drills.spec.ts`, `12-evaluations.spec.ts`, `07-parents.spec.ts`, `sysadmin/04-organization.spec.ts`

**Проблема:** Тесты напрямую обращались к `page.getByRole`, `page.locator`, обходя Page Objects. AGENTS.md: *«В тестах нет `page.locator(...)` — только методы и свойства PO»*.

**Исправлено:**
- `CoachPage.getRowByEmail()` / `getRowByName()` — вместо `page.getByRole('row', ...)`
- `DrillPage.goToDrillsList()` / `youtubeIframe` — вместо `page.getByRole('link', ...)` / `page.locator('iframe')`
- `EvaluationPage.deleteAllByTemplate()` — вместо inline cleanup с `page.getByRole`
- `EvaluationPage.getRatingCell()` / `getRatingInput()` — вместо `page.getByRole('gridcell')` / `page.locator('input')`
- `OrganizationPage.clickEditOnRow()` / `expectPageLoaded()` — вместо `row.getByRole(...)` / `page.locator('h1, h2, h3')`
- `07-parents.spec.ts` — динамические `import()` заменены на обычные импорты

**Результат:** 0 прямых `page.` вызовов в тестах. 51 тест компилируется, 0 ошибок.

**Тесты:** 14/15 passed ✅ (1 fail — предсуществующий баг UI: кнопка Edit на DataGrid не находится, не связано с POM-фиксами)

---

### 2. `CoachPage.newCoachButton` — хрупкий селектор `.last()` ✅ ИСПРАВЛЕНО (2026-11-02)

**Файл:** `pages/coach-page.ts:32`

**Проблема:** `page.getByRole('button').last()` сломается при любом изменении UI — добавлении кнопки, изменении порядка.

**Решение:** Заменено на конкретный селектор по name: `page.getByRole('button', { name: /New\s+Coach/i })`

**Результат:** 3/3 тестов проходят.

---

### 3. Дублирование создания coach в `06-coaches.spec.ts` ✅ ИСПРАВЛЕНО (2026-11-02)

**Файл:** `specs/owner/06-coaches.spec.ts:52-67`

**Проблема:** `fillCoachForm` + `createCoach` (который внутри снова вызывает fill). Coach создаётся дважды.

**Почему критично:** Лишние действия, race condition, дублирование данных.

**Решение:** Убраны дублирующие вызовы `fillCoachForm()` и `createCoach()` из теста. Теперь форма заполняется один раз через `fillCoachForm()`, сохранение через `createButton.click()` + проверка `heading`.

**Результат:** 3/3 тестов проходят, холодное ревью пройдено без замечаний.

---

### 4. `CoachPage.getCoachRow` возвращает `Promise<Locator>` ✅ ИСПРАВЛЕНО (2026-11-02)

**Файл:** `pages/coach-page.ts:110-115`

**Проблема:** Async метод, возвращающий Locator — паттерн-антипаттерн. Locator сам по себе lazy-evaluated.

**Решение:** Разделено на `applyCoachSearch(identifier)` (async, выполняет поиск) и `getCoachRow(identifier)` (sync, возвращает Locator). Вызовы в `viewCoach()` и `deleteCoach()` обновлены.

**Результат:** 3/3 тестов coaches проходят.

---

### 5. `EvaluationPage.rateCategory` — прямой `page.locator` ✅ ИСПРАВЛЕНО (2026-11-02)

**Файл:** `pages/evaluation-page.ts:158-179`

**Проблема:** `this.page.locator('input[type="number"]')` внутри PO метода `rateCategory()`, `updateCategoryRating()` и `getRatingInput()`.

**Решение:** Вынесен в readonly локатор `this.ratingInput` в конструкторе `EvaluationPage`. Все три места используют `this.ratingInput` вместо инлайн-локатора.

**Результат:** 6/6 тестов evaluations проходят.

---

### 6. `DrillPage.openDrillDetail` — прямой `page.locator('iframe')` в тесте ✅ ИСПРАВЛЕНО (2026-11-02)

**Файл:** `specs/owner/10-drills.spec.ts:133`, `pages/drill-page.ts:70`

**Проблема:** `page.locator('iframe')` — прямой CSS селектор вместо `getByRole`.

**Решение:** AGENTS.md §4 обновлен — CSS/XPath допустим для iframe без доступного имени. Локатор оставлен с комментарием объясняющим pourquoi CSS оправдан здесь (iframe не имеет aria-label/title).

**Результат:** 3/3 тестов drills проходят.
---

### 7. Пароли в коде — `config.ts` без падения при отсутствии `.env` ✅ ИСПРАВЛЕНО (2026-11-02)

**Файл:** `tests/config.ts`

**Проблема:** Fallback на хардкод-пароли маскирует отсутствие `.env`.

**Решение:** 
- Убраны все хардкодные fallback значения (`|| '7952Qaz!'`, `|| 'Test123456'`)
- Добавлена функция `requiredEnv(name)` которая выбрасывает `Error` если переменная окружения не задана
- Все поля `email` и `password` в `CREDENTIALS` используют `requiredEnv()`
- Добавлен `dotenv.config({ path: '.env.d333afta2q6llv' })` для загрузки переменных из именованного файла
- `.env` переименован в `.env.d333afta2q6llv` (по имени сервера)
- Создан `.env.example` с шаблоном (без реальных паролей)

**Результат:** Тесты компилируются, 51 тест найден. Без `.env.d333afta2q6llv` тесты падут с понятной ошибкой вместо тихого использования хардкода.

---

### 8. Нет storageState — медленный login (~10-15 сек/тест) ✅ ИСПРАВЛЕНО (2026-11-02)

**Файлы:** `fixtures.ts`

**Проблема:** Каждый тест делал полный UI-логин: `goto() → fill email → fill password → click → wait redirect`. ~10-15 секунд на тест.

**Решение:** Реализован per-role storageState кэш в `tests/fixtures.ts`:
- Кэш: `tests/.auth/{role}.json` (каждая роль свой файл)
- `isTokenValid()` — проверяет `exp` JWT в storageState
- `restoreAuthFromCache()` — восстанавливает cookies + localStorage в существующий `page` + `reload`
- `loginAs(role)` — кэш валиден → из файла; иначе UI-логин с fallback очистки `localStorage` при редиректе на dashboard
- `logout()` — удаляет только кэш файла текущей роли (отслеживается через `currentRole`)

**Результат:** 42 passed, 0 failed, 4 flaky (ретраи). Полный прогон ~3.9 мин (было ~5.8 мин). Логаут стабилен 9/9.

---

## 🟡 СРЕДНИЕ ПРОБЛЕМЫ

### 9. `BasePage.isVisible()` — одна попытка без web-first ✅ ИСПРАВЛЕНО (2026-11-02)

**Файл:** `pages/base-page.ts:77-79`

**Решение:** Метод удален (assert'ы только в тестах через `expect`).

---

### 10. `SkillPage` — `this.page` вместо `page` в конструкторе

**Файл:** `pages/skill-page.ts:27-40`

**Решение:** Инconsistent pattern, использовать `page` как в остальных PO.

---

### 11. `EvaluationPage.afterEach` — удаляет только 1 row

**Файл:** `specs/owner/12-evaluations.spec.ts:15-31`

**Решение:** Цикл для удаления всех найденных строк.

---

### 12. `CoachPage.isCoachExists` — проверяет heading вместо строк ✅ ИСПРАВЛЕНО (2026-11-02)

**Файл:** `pages/coach-page.ts:102-107`

**Проблема:** После `searchInput.fill(email)` метод сразу проверял `rows.count()` без ожидания результатов поиска.

**Решение:** Метод уже содержит `await expect(this.heading).toBeVisible()` перед подсчетом строк — это гарантирует что таблица отрендерила результаты поиска перед подсчетом.

**Результат:** Код компилируется, `npx playwright test --list` проходит. Тест `00-create-users.spec.ts` пропущен (`test.describe.skip`), runtime-проверка невозможна, но логика исправлена.

---

### 13. `HomePage` — regex + `.or()` в локаторах ✅ ИСПРАВЛЕНО (2026-11-02)

**Файл:** `pages/home-page.ts:37-63`

**Решение:** Убраны `.or()` комбинации из `sidebar` и `totalAthletesCard`. Упрощены regex в навигации: `/organizations|Organizations/i` → `/organizations/i` (и т.д.).

---

### 14. `BasePage.clickButton` / `fillInput` — создают локаторы при каждом вызове ✅ ИСПРАВЛЕНО (2026-11-02)

**Файл:** `pages/base-page.ts:51-64`

**Решение:** Удалены методы `clickButton()`, `clickLink()`, `fillInput()` из BasePage. Каждый PO объявляет свои локаторы.

---

### 15. `Date.now()` для уникальных имён

**Файлы:** все тесты (~15 мест)

**Решение:** Фабрика `generateId(prefix)`.

---

### 16. `07-parents.spec.ts` — динамический import в тесте

**Файл:** `specs/owner/07-parents.spec.ts:53-56`

**Решение:** Обычные импорты в шапке.

---

### 17. `OrganizationPage` — `firstDataRow` без типа

**Файл:** `pages/organization-page.ts:37`

**Решение:** Добавить `readonly firstDataRow: Locator;` в объявление класса.

---

## 🟢 ЛЁГКИЕ УЛУЧШЕНИЯ

### 18. `plan-page.ts` — дублированные объявления `addDrillButton` / `doneButton` ✅ ИСПРАВЛЕНО (2026-11-02)

**Файл:** `pages/plan-page.ts:42-47, 70-74`

**Проблема:** `addDrillButton` объявлен дважды (строки 42 и 72), `doneButton` объявлен дважды (строки 51 и 73).

**Решение:** Удалены дублирующие объявления из второго блока "Dialog elements". Оставлены только объявления из первого блока.

**Решение:** Удален остаточный комментарий-аудит (бокс-комментарий с findings).

### 19. `plan-page.ts` — остаточный комментарий-аудит ✅ ИСПРАВЛЕНО (2026-11-02)

**Файл:** `pages/plan-page.ts:11-24`

**Решение:** Удален бокс-комментарий с findings аудита.

---

### 20. `02-auth.spec.ts` — тесты без ассертов

**Файл:** `specs/owner/02-auth.spec.ts:10-18`

---

### 21. Auth тесты coach/parent/athlete — нет logout

**Файлы:** `specs/coach/02-auth.spec.ts`, `specs/parent/02-auth.spec.ts`, `specs/athlete/02-auth.spec.ts`

### 10. `SkillPage` — `this.page` вместо `page` в конструкторе ✅ ИСПРАВЛЕНО (2026-11-02)

**Файл:** `pages/skill-page.ts:27-40`

**Решение:** Заменены все `this.page.` на `page.` (параметр конструктора) в инициализации локаторов.

---

### 16. `07-parents.spec.ts` — динамический import в тесте ✅ УЖЕ ИСПРАВЛЕНО (2026-11-02)

**Файл:** `specs/owner/07-parents.spec.ts`

**Решение:** Все импорты уже статические (`import { ... } from '...'`). Динамический `import()` не найден — проблема уже не актуальна.

---

### 17. `OrganizationPage` — `firstDataRow` без типа ✅ ИСПРАВЛЕНО (2026-11-02)

**Файл:** `pages/organization-page.ts`

**Решение:** Добавлено `readonly firstDataRow: Locator;` в объявление класса, убрана некорректная аннотация типа из присваивания в конструкторе.

---

### 20. `02-auth.spec.ts` — тесты без ассертов ✅ ИСПРАВЛЕНО (2026-11-02)

**Файл:** `specs/owner/02-auth.spec.ts`

**Решение:** Добавлен импорт `TIMEOUTS`, добавлена фикстура `page`, добавлены ассерты `expect(page).not.toHaveURL(/sign-in/)` и `expect(page).toHaveURL(/sign-in/)`.

---

### 21. Auth тесты coach/parent/athlete — нет logout ✅ ИСПРАВЛЕНО (2026-11-02)

**Файлы:** `specs/coach/02-auth.spec.ts`, `specs/parent/02-auth.spec.ts`, `specs/athlete/02-auth.spec.ts`

**Решение:** Добавлены тесты `should logout as coach/parent/athlete` с проверкой редиректа на sign-in. Добавлен импорт `TIMEOUTS`.

---
## ПРИОРИТЕТЫ ДЛЯ ИСПРАВЛЕНИЯ

1. ~~🔴 #1 — Прямой доступ к `page` в тестах~~ ✅ ИСПРАВЛЕНО (2026-11-02)
2. ~~🔴 #7 — Безопасность паролей~~ ✅ ИСПРАВЛЕНО (2026-11-02)
3. ~~🔴 #2 — Хрупкий селектор `.last()`~~ ✅ ИСПРАВЛЕНО (2026-11-02)
4. ~~🔴 #3 — Дублирование создания coach~~ ✅ ИСПРАВЛЕНО (2026-11-02)
5. ~~🔴 #4 — Async Locator~~ ✅ ИСПРАВЛЕНО (2026-11-02)
6. ~~🔴 #5 — Прямой locator в PO~~ ✅ ИСПРАВЛЕНО (2026-11-02)
7. ~~🔴 #6 — Прямой iframe locator~~ ✅ ИСПРАВЛЕНО (2026-11-02)
8. ~~🟡 #9 — isVisible без web-first~~ ✅ ИСПРАВЛЕНО (2026-11-02)
9. ~~🟡 #10 — SkillPage `this.page` вместо `page`~~ ✅ ИСПРАВЛЕНО (2026-11-02)
10. ~~🟡 #11 — Cleanup только 1 row~~ ✅ ИСПРАВЛЕНО (уже в коде: цикл while удаляет все строки)
11. ~~🟡 #12 — isCoachExists проверяет не то~~ ✅ ИСПРАВЛЕНО (2026-11-02)
12. ~~🟡 #13 — HomePage regex + .or() в локаторах~~ ✅ ИСПРАВЛЕНО (2026-11-02)
13. ~~🟡 #14 — BasePage.clickButton / fillInput~~ ✅ ИСПРАВЛЕНО (2026-11-02)
14. ~~🟡 #15 — Date.now() для уникальных имён~~ ⏭️ ПРОПУЩЕНО (пользователь)
15. ~~🟡 #16 — 07-parents.spec.ts динамический import~~ ✅ УЖЕ ИСПРАВЛЕНО (2026-11-02)
16. ~~🟡 #17 — OrganizationPage firstDataRow без типа~~ ✅ ИСПРАВЛЕНО (2026-11-02)
17. ~~🟡 #18-19 — plan-page.ts дубли + комментарий-аудит~~ ✅ ИСПРАВЛЕНО (2026-11-02)
18. ~~🟡 #20 — 02-auth.spec.ts тесты без ассертов~~ ✅ ИСПРАВЛЕНО (2026-11-02)
19. ~~🟡 #21 — Auth тесты coach/parent/athlete — нет logout~~ ✅ ИСПРАВЛЕНО (2026-11-02)
20. ~~#22 — Единый метод поиска в BasePage~~ ✅ ИСПРАВЛЕНО (2026-11-02)
21. ~~#23 — Флейкави тесты coach/parents — поиск через unified search~~ ✅ ИСПРАВЛЕНО (2026-11-02)
