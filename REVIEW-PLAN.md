# План исправлений по итогам ревью тестов, скиллов и AGENTS.md

**Дата ревью:** 2026-11-11
**Объём:** AGENTS.md, `.gigacode_vsc/agent/workflow.md`, 12 скиллов, `playwright.config.ts`, `tests/config.ts`, `tests/fixtures.ts`, 14 Page Objects, фабрика `plan-tabs`, 25 спеков.

## Итог ревью

**Хорошо:** деление по ролям, web-first ассерты, Page Objects, нет `waitForTimeout` и `.catch(() => …)`.

**Три системные проблемы:**
1. **Ложные PASS.** Ассерты проверяют не то, что обещает название теста, либо выполняются заведомо.
2. **Порча тестовых данных.** Записи накапливаются, имена не уникальны, тесты правят общих пользователей.
3. **Противоречивые правила.** Скиллы противоречат друг другу и AGENTS.md. Многое скопировано из другого проекта с чужими примерами и устаревшими номерами строк.

## Условные обозначения

- **🔒 shared** — задача меняет общий файл (`fixtures.ts`, `base-page.ts`, `config.ts`, `playwright.config.ts`). По правилам AGENTS.md сначала нужно показать diff и получить подтверждение.
- **Готово, когда** — критерий приёмки задачи.

---

## Этап 0. Безопасность (немедленно)

- [x] **0.1 Убрать токен TestOps из [.gigacode_vsc/gigacode.jsonc](.gigacode_vsc/gigacode.jsonc).**
  - Сделано: токен перенесён в пользовательскую переменную окружения `TESTOPS_AUTH_HEADER`, конфиг ссылается на `${TESTOPS_AUTH_HEADER}`. Файл без секрета закоммичен как общий конфиг MCP.
  - Решение: токен оставлен прежним, не перевыпускался (в git он не попадал).
  - Инструкция по настройке — в [testops-integration.md](.gigacode_vsc/skills/testops-integration.md).
- [x] **0.2 Добавить артефакты прогонов в `.gitignore`:** `allure-results/`, `allure-report/`, `allure-results.zip`, `*.log`.
- [x] **0.3 Перестать игнорировать `package-lock.json`.** Убран из `.gitignore`, lock-файл закоммичен (`npm ls` подтвердил, что он совпадает с `node_modules`).

---

## Этап 1. Критичные баги инфраструктуры и данных

- [x] **1.1 Перенести тесты sysadmin из папки owner.** Сделано: блок перенесён без изменений в `tests/specs/sysadmin/13-plans.spec.ts`, `npm run test:sysadmin` — 6 passed, 1 skipped (TC-71957, skip был и раньше).
  - **Где:** блок `Sysadmin Plan Tests` в [tests/specs/owner/13-plans.spec.ts:71-180](tests/specs/owner/13-plans.spec.ts#L71-L180).
  - **Проблема:** блок логинится как sysadmin внутри проекта owner. При `test:all` он идёт параллельно с проектом sysadmin, и оба процесса пишут в `tests/.auth/sysadmin.json`.
  - **Что сделать:** перенести блок в `tests/specs/sysadmin/13-plans.spec.ts`.
  - **Готово, когда:** в `tests/specs/owner/` нет `loginAs('sysadmin')`.

- [ ] **1.2 🔒 Исправить гонку в `loginAs`.**
  - **Где:** [tests/fixtures.ts:101-104](tests/fixtures.ts#L101-L104).
  - **Проблема:** после `reload()` сразу проверяется `page.url()`, а редирект SPA на `/sign-in` асинхронный. Отозванный токен успевает сойти за рабочую сессию.
  - **Что сделать:** после восстановления дождаться признака авторизации (например, видимости `profileButton`) или редиректа на `/sign-in`, и только потом решать.
  - **Готово, когда:** при отозванном токене `loginAs` уходит в UI-логин, а не падает позже в тесте.

- [ ] **1.3 Перестать портить данные в тесте родителей.** Файл [tests/specs/owner/07-parents.spec.ts](tests/specs/owner/07-parents.spec.ts).
  - **Строки 54-57:** logout сделан через `BasePage` в обход фикстуры, поэтому токен owner отозван, а `owner.json` остался. К тому же это ручной `signInPage.login()` посреди серии.
    - Вариант А: вынести вход созданного родителя в отдельный `browser.newContext()`.
    - Вариант Б: сделать этот тест последним и использовать фикстуру `logout()`.
  - **Строка 67:** `parentEmail = 'dtimokhin+parent'` — это префикс, под него попадает основной пользователь parent из `.env`. Нужно передать email, созданный в первом тесте, через переменную describe (или искать по уникальному имени).
  - **Готово, когда:** тест не трогает пользователя `CREDENTIALS.parent`, и после файла `owner.json` остаётся валидным.

- [ ] **1.4 Экранировать спецсимволы в `new RegExp(...)`.**
  - **Проблема:** все email вида `dtimokhin+…`, а `+` в регулярке — квантификатор. Поэтому `getCoachRow(CREDENTIALS.coach.email)` никогда не находит строку.
  - **Затронутые места:** [coach-page.ts:110](tests/pages/coach-page.ts#L110), `getRow` в drill / evaluation / scorecard, `getPlanCard` / `getPlanRow`, [organization-page.ts:39-40](tests/pages/organization-page.ts#L39-L40), `verifyReportExists`, `deleteAllByTemplate`.
  - **Что сделать:** добавить хелпер `escapeRegExp()` или перейти на `filter({ hasText })`.
  - **Готово, когда:** в `tests/pages/` нет `new RegExp(<переменная>)` без экранирования.

- [ ] **1.5 Переписать cleanup оценок.**
  - **Где:** `deleteAllByTemplate` в [tests/pages/evaluation-page.ts:266-282](tests/pages/evaluation-page.ts#L266-L282).
  - **Проблема 1:** цикл `while (count > 0)` не ждёт, пока строка исчезнет, и может зациклиться.
  - **Проблема 2:** удаляются **все** оценки шаблона, включая чужие.
  - **Что сделать:**
    - Запоминать, что создал тест (уникальный маркер или счётчик).
    - Удалять только своё.
    - После каждого удаления ждать `toHaveCount(n - 1)`.
  - **Готово, когда:** cleanup детерминирован и не трогает чужие данные.

- [ ] **1.6 Включить проверку типов TypeScript.**
  - **Проблема:** нет `tsconfig.json` и пакета `typescript`. Playwright только транспилирует код, поэтому ошибки типов не видны.
  - **Что сделать:**
    - Добавить `typescript` в devDependencies.
    - Создать `tsconfig.json` (`strict`, `noEmit`).
    - Добавить скрипт `"typecheck": "tsc --noEmit"`.
  - **Готово, когда:** `npm run typecheck` проходит без ошибок.

- [ ] **1.7 Исправить ошибки, которые найдёт `tsc`.** Известные:
  - **Присваиваются без объявления:**
    - `plan-page`: `planCardViewButton`, `planCardDuplicateButton`, `planCardEditLink`, `inviteUsersButton`, `planDetailEditLink`, `planCards`.
    - `drill-page`: `addSkillMappingButton`, `skillMappingPopup`, `skillMappingPopupTitle`, `doneButton`, `tableRows`.
    - `evaluation-page`: `ratingInput`.
    - `organization-page`: `orgRowByName`, `orgRowEditButton`, `orgHeaderOrganization`.
  - **Объявлены, но не присвоены** (равны `undefined`): `inviteButton`, `duplicateButton`, `viewButton`, `editButton`, `deleteButton` в [plan-page.ts:43-47](tests/pages/plan-page.ts#L43-L47).
  - **🔒** `locator.textContent() ?? ''` применяет `??` к Promise, fallback не срабатывает: [base-page.ts:117](tests/pages/base-page.ts#L117), а также `get*Count` в home-page.
  - **Попутно:** заменить `ReturnType<this['page']['getByRole']>` на `Locator` во всех PO.

---

## Этап 2. Убрать ложные PASS

Каждый пункт — тест, который может пройти, ничего не проверив.

- [ ] **2.1** [parent/01-permissions.spec.ts:68](tests/specs/parent/01-permissions.spec.ts#L68): регулярка `/sign-in|dashboard|practice-plans/` совпадает с самим `/practice-plans/new`. Нужно проверять `not.toHaveURL(/practice-plans\/new/)` или отсутствие формы.
- [ ] **2.2** [plan-tabs.factory.ts:27](tests/factories/plan-tabs.factory.ts#L27): `test.skip(true, …)` выключает тесты вкладок у **всех** ролей.
  - Пропускать только athlete, через параметр фабрики.
  - Убрать дубли с явными тестами: owner `@TC-71645`, parent `@TC-71643`/`@TC-72622`, athlete `@TC-72622`.
- [ ] **2.3** [athlete/01-permissions.spec.ts:25](tests/specs/athlete/01-permissions.spec.ts#L25): весь блок прав пропущен. Пропускать только шаг Plan, остальные шаги включить.
- [ ] **2.4** [athlete/13-plans.spec.ts:27](tests/specs/athlete/13-plans.spec.ts#L27): при пустой вкладке Invited ассерт проходит всегда. Сначала проверить, что карточка есть (предусловие: план, на который приглашён атлет).
- [ ] **2.5** [coach/13-plans.spec.ts:35,56](tests/specs/coach/13-plans.spec.ts#L35):
  - После remove проверять `Segments (0)`.
  - Длительность `15 min` искать внутри карточки `getPlanRow(planName)`, а не по всей странице.
- [ ] **2.6** [12-evaluations.spec.ts](tests/specs/owner/12-evaluations.spec.ts):
  - **Строка 235:** название обещает report и workout — добавить их проверки или переименовать тест.
  - **Строка 84:** `not.toContainText('6')` — сначала дождаться финального состояния ячейки (ожидаемое значение или сообщение-предупреждение).
  - **Draft:** проверять статус Draft в строке.
  - **`getRow(TEMPLATE_NAME)`:** находит старые строки. Нужен уникальный признак созданной оценки.
- [ ] **2.7** [06-coaches.spec.ts](tests/specs/owner/06-coaches.spec.ts): имя `'View Coach'` не уникально. Использовать `Coach${Date.now()}` и искать строку по email.
- [ ] **2.8** [10-drills.spec.ts](tests/specs/owner/10-drills.spec.ts):
  - Уникальное имя для каждого теста.
  - Тест «verify role permissions» переименовать или вынести проверку прав в спеки ролей.
  - «Валидация» — проверять сообщение об ошибке, а не видимость поля.
- [ ] **2.9** `*-permissions.spec.ts`:
  - Привести названия к реальным проверкам (например, «sees Create buttons…» вместо «full CRUD access»).
  - Добавить проверки «только своя организация» (owner) и «все организации» (sysadmin).
  - Перед каждым `toBeHidden` ждать загрузки страницы, иначе негативная проверка проходит раньше рендера.
- [ ] **2.10** [11-scorecard-templates.spec.ts:48,79](tests/specs/owner/11-scorecard-templates.spec.ts#L48): проверять статус Inactive в строке.
- [ ] **2.11** [01-signin.spec.ts](tests/specs/owner/01-signin.spec.ts):
  - Для невалидных данных и пустой формы проверять сообщения об ошибке.
  - Удалить дублирующий describe `Sign Up`.
- [ ] **2.12** [04-organization.spec.ts](tests/specs/owner/04-organization.spec.ts):
  - Первый тест проверяет только «не sign-in» — проверять профиль.
  - Откат имени перенести в `afterEach`/`finally`.
- [ ] **2.13** `getRow = byRole.or(byCell).or(getByText(name))` (drill, evaluation, scorecard): ветка `getByText` находит имя в toast и заголовках. Убрать её. Строка таблицы — только `getByRole('row')` с фильтром.
- [ ] **2.14** [sysadmin/04-organization.spec.ts:31](tests/specs/sysadmin/04-organization.spec.ts#L31): у `test.skip` нет причины — добавить её. Тест `@TC-71922` проверяет только загрузку страницы, а обещает «все организации».

---

## Этап 3. Page Objects и спеки: привести к правилам

- [ ] **3.1 Убрать прямые локаторы из спеков (28 мест).**
  - **Где больше всего:** 12-evaluations (44, 103–111, 198–217), 06-coaches (105, 132–136), 13-plans, 10-drills, 07-parents:59, coach/01-permissions:80.
  - **Что сделать:** использовать уже существующие `openEditCoach()`, `getRatingInput()`, `getRatingCell()` и добавить недостающие методы.
  - **Готово, когда:** `grep -rnE "page\.(getByRole|locator|getByText|keyboard)" tests/specs` пуст.
- [ ] **3.2 Удалить `HomePage.logout()`.** Он перекрывает `BasePage.logout()`, а его локатор `/logout/` не находит «Log Out». Удалить вместе с `userProfile`/`logoutButton`.
- [ ] **3.3 Разделить кнопки в PlanPage.** `createButton` сейчас ищет `'Save'`. Объявить отдельные `saveButton`/`createButton`. `getPlanCard` и `getPlanRow` одинаковы — оставить один метод.
- [ ] **3.4 SignUpPage.**
  - `passwordInput` (`/password/`) найдёт и «Confirm password» → strict mode violation.
  - `gotoWithCode` переходит на страницу дважды.
- [ ] **3.5 Убрать спекулятивные русские варианты из регулярок** (`Редактировать`, `Сохранить`, `Отмена`, `Далее`, `Назад`, `Вход`, `выйти`). UI английский.
- [ ] **3.6 Удалить мёртвый код:**
  - **🔒** в `config.ts`: `DATA_TEST`, `ROLES`, `EVALUATION`, `BASE_URL`.
  - Неиспользуемые методы PO: `isAthleteExists`/`isCoachExists`/`isParentExists` (возвращают boolean — антипаттерн), `getText`, `getCount`, `waitForElement*`, `getUrl`, `getPathname`.
  - Тест `00-create-users` перевести на фикстуру `loginAs` или явно задокументировать как ручной.
- [ ] **3.7 Привести нумерацию файлов к таблице §6:**
  - **owner:** развести `01-permissions`/`01-signin` и `02-auth`/`02-homepage`.
  - **coach:** `02-homepage` → `03-homepage`, как у athlete/parent.
  - Logout-тесты (`02-auth`) должны идти последними в серии роли: переименовать, например, в `99-logout.spec.ts`.
- [ ] **3.8 Единый формат ID тест-кейсов.**
  - Перейти на `test('…', { tag: '@TC-XXXXX' }, …)`.
  - Заменить allure_id (`91XXX`) на test_case_id в 06-coaches, 10-drills, 12-evaluations — их запрещает workflow.md.
  - Проверить соответствие: `@TC-72679` в плане sysadmin — это «Home page (System Administrator)».
- [ ] **3.9 Убрать `test.use({ storageState: undefined })`** — сейчас это no-op. Либо реально сбрасывать контекст, либо удалить вместе с описанием в AGENTS.md §9.
- [ ] **3.10 Удалить явные `{ timeout: TIMEOUTS.medium }`** там, где они равны дефолтному expect timeout (10 с).
- [ ] **3.11 Добавить cleanup или стабильные фикстуры данных** для coaches, parents, drills, teams и plans. Сейчас каждый прогон добавляет записи на стенд.

---

## Этап 4. Скиллы и AGENTS.md

Цель: AGENTS.md — короткие правила (единый источник), скиллы — только процесс. Противоречия и чужие примеры удалить.

- [ ] **4.1 Разрешить противоречия** (выбрать одно правило и поправить все файлы):

  | # | Тема | Что противоречит | Предлагаемое решение |
  |---|---|---|---|
  | 1 | Куда писать результаты ревью | reliability, antipatterns и pom-review: аннотации в код. Скилл 04: только в чат | Только в чат; секции «Аннотация» удалить |
  | 2 | Сообщения в `expect` | reliability #3/#9: обязательны. AGENTS: не требует | Рекомендованы для неочевидных ассертов |
  | 3 | Когда делать cleanup | reliability #7: `beforeEach`. Скилл 04 (D3): `afterEach` | `afterEach` / `finally` + удалять только своё |
  | 4 | `.first()` | reliability #2: хрупкий. Шаблоны AGENTS: повсюду | Допустим только при гарантированном порядке |
  | 5 | Хардкод таймаутов | Хорошие примеры pom-review: `{ timeout: 5000 }` | Заменить на `TIMEOUTS.*` |
  | 6 | Поиск строк | reliability #17 и workflow.md: `coachPage.page.getByRole(...)` в тесте | Метод PO, например `getRowByEmail()` |
  | 7 | Логин в шаге 0 | Скилл 03: `signInPage.login()` | `loginAs` |
  | 8 | Цепочка скиллов | AGENTS 01→04; скилл 04 → 05; скилл 07: 04→07→05 | Зафиксировать одну цепочку в AGENTS |
  | 9 | Ассерты в PO | AGENTS запрещает, все PO используют `expect` для ожиданий | «PO может ждать состояние, но не проверяет бизнес-результат» |
  | 10 | Локаторы в методах PO | AGENTS запрещает, параметризованные локаторы без этого невозможны | Разрешить параметризованные локаторы в методах |
  | 11 | Паттерн `getRow` | AGENTS §4 рекомендует `.or(getByText)` | Заменить паттерн (см. 2.13) |

- [ ] **4.2 Удалить вредный совет** в [test-antipatterns.md](.gigacode_vsc/skills/test-antipatterns.md) #6 (`Promise.all` над `loginAs`): `loginAs` работает с одной общей `page` и вызов сломает сессию. Удалить и #1 про «звонки».
- [ ] **4.3 Удалить чужие и устаревшие примеры:**
  - `AUTO-112`, `getReadValue`, `temp-files`, `cdk-overlay`/`mat-dialog`, appointments, video call.
  - «waitForTimeout в 13-plans.spec.ts lines 38, 102…».
  - Несуществующие методы BasePage: `clickButton`, `fillInput`, `isVisible`, `getValue`.
  - Старый код `openProfileMenu` и номера строк base-page в [test-pom-review.md](.gigacode_vsc/skills/test-pom-review.md).
- [ ] **4.4 Исправить нумерацию:**
  - Tie-break правила в [test-reliability.md](.gigacode_vsc/skills/test-reliability.md) сдвинуты на единицу (race — это #1, fragile — #2).
  - Счётчики: реально 17 надёжностных паттернов и 13 антипаттернов, в тексте 16 и 10.
  - Список антипаттернов в скилле 04 привести к содержимому файла.
  - Раздел использования в reliability: «пройти 1–17».
  - В workflow.md исправить имя `test-harvester.md` → `05-test-harvester.md`.
- [ ] **4.5 Обновить AGENTS.md:**
  - §7, §15: добавить sysadmin (5 ролей) и `npm run test:sysadmin`.
  - §14: заменить устаревшую структуру на реальную (папки ролей, factories).
  - §9: удалить исторический лог «42 passed…».
  - §1: убрать дубли с workflow.md и скиллом 01 (оставить ссылки).
- [ ] **4.6 Починить команды:**
  - §16: lint-grep не работает — `(` литерал в BRE, `GetByText` с заглавной G. Использовать `grep -rE "page\.(getByRole|locator|getByText)"`.
  - На Windows npm запускает скрипты через cmd без `grep`. Lint-скрипты лучше сделать на Node или ESLint (`eslint-plugin-playwright`) и реально добавить в `package.json`.
  - Скилл 03, шаг 6: `npm run test:owner -- --grep "…"` (нужен `--`).
  - Блок «Очистка мусора»: fence ` ```bash ` → ` ```powershell `.
- [ ] **4.7 Снизить нагрузку на контекст агента.** Вместо «читать все скиллы перед каждым сценарием» (около 1700 строк):
  - 01–03 читать сразу.
  - Чек-листы reliability, antipatterns и pom-review читать только на шаге 04.
  - Для простых сценариев объединить утверждения 01 и 02 в одно.
- [ ] **4.8 Исправить опечатки и стиль:**
  - **Опечатки:**
    - `origen` → origin ([fixtures.ts:38,44,52](tests/fixtures.ts#L38)) 🔒.
    - `воркерех` → воркерах; `ревокан`/`ревокал` → отозван.
    - `suger` → suggest ([test-antipatterns.md:363](.gigacode_vsc/skills/test-antipatterns.md#L363)).
    - «самая влияющая баг» → «самый влияющий баг».
    - «а имайл пришло велком письмо» ([06-coaches.spec.ts:23](tests/specs/owner/06-coaches.spec.ts#L23)).
  - **Единое написание:** коуч, дрилл, ждём.
  - **Чек-листы:** убрать суржик («флажить», «ассертит», «эвалюирует») — один язык на документ.
  - **Тон:** сократить КАПС, 🔴 и «СТОП». Оставить выделение только для действительно критичных правил.

---

## Этап 5. Эффективность прогона

- [ ] **5.1 🔒 Развести HTML-отчёты по ролям.** `test:all` запускает 5 процессов, и все пишут в одну `reports/html`: остаётся отчёт последнего процесса или битый.
  - Вариант А: свой `outputFolder` на роль через переменную окружения.
  - Вариант Б: один процесс с проектами и детерминированным распределением.
- [ ] **5.2 🔒 (опционально) Перейти на стандартный storageState.** Setup-проект на роль + `use.storageState` в проекте вместо собственного restore-механизма. Это меньше кода и закрывает п.1.2. Logout-тесты — в отдельном `browser.newContext()`.
- [ ] **5.3 🔒 Проверить конфликт `test-output.log`.** Его пишет и reporter в `playwright.config.ts`, и перенаправление в shell из AGENTS.md. Оставить один источник.

---

## Порядок выполнения

| Порядок | Этап | Зачем первым |
|---|---|---|
| 1 | Этап 0 | Утечка секрета |
| 2 | 1.1, 1.3, 1.4, 1.5 | Тесты портят данные и сессии |
| 3 | 1.6, 1.7 | `tsc` автоматически подсветит часть проблем этапа 3 |
| 4 | Этап 2 | Без этого зелёный прогон ничего не гарантирует |
| 5 | Этап 4 | Иначе агент продолжит писать код по противоречивым правилам |
| 6 | Этап 3, Этап 5 | Чистота и скорость |

**Регресс после каждого этапа:** `npm run typecheck` (после 1.6) и `npm run test:all` с `timeout: 1800000`.
