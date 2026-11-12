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
- [x] **0.4 Настроить Claude Code доступ к Allure TestOps (MCP).** Сейчас MCP TestOps настроен только для GigaCode (`.gigacode_vsc/gigacode.jsonc`); у Claude Code доступа нет, и сверка тест-кейсов идёт по ручной выгрузке `report (1).csv`. Сделано (2026-11-12): `.mcp.json` (HTTP напрямую, без mcp-remote; токен из `${TESTOPS_AUTH_HEADER}`), сервер отвечает, 13 инструментов. Сервер одобрен, проверено: кейс 71600 читается со всеми шагами через MCP. `.claude/settings.json` с правами не нужен (решено 2026-11-12): чтение и так идёт без подтверждений, удаление — только по явной просьбе в чате, удалённый кейс восстанавливается из корзины TestOps.
  - **Что сделать:** добавить сервер `allure-testops` в конфиг MCP Claude Code проекта (`.mcp.json` в корне) — та же команда `npx mcp-remote https://rallyup.testops.cloud/api/mcp` с заголовком `Authorization:${TESTOPS_AUTH_HEADER}` из уже заведённой переменной окружения (токен в файл не пишется). При первом запуске Claude Code спросит разрешение на проектный MCP-сервер.
  - **Проверить:** `claude mcp list` видит сервер; поиск кейса по `test_case_id` (например, 71600) возвращает шаги.
  - **Затем:** в скиллах (`testops-integration.md`, 01) указать, что сверка шагов и номеров идёт через MCP, а CSV-выгрузка — запасной вариант.
  - **Готово, когда:** агент сам находит шаги тест-кейса по номеру без выгрузки.

---

## Этап 1. Критичные баги инфраструктуры и данных

- [x] **1.1 Перенести тесты sysadmin из папки owner.** Сделано: блок перенесён без изменений в `tests/specs/sysadmin/13-plans.spec.ts`, `npm run test:sysadmin` — 6 passed, 1 skipped (TC-71957, skip был и раньше).
  - **Где:** блок `Sysadmin Plan Tests` в [tests/specs/owner/13-plans.spec.ts:71-180](tests/specs/owner/13-plans.spec.ts#L71-L180).
  - **Проблема:** блок логинится как sysadmin внутри проекта owner. При `test:all` он идёт параллельно с проектом sysadmin, и оба процесса пишут в `tests/.auth/sysadmin.json`.
  - **Что сделать:** перенести блок в `tests/specs/sysadmin/13-plans.spec.ts`.
  - **Готово, когда:** в `tests/specs/owner/` нет `loginAs('sysadmin')`.

- [x] **1.2 🔒 Исправить гонку в `loginAs`.** Сделано: `loginAs` ждёт ссылку Home (`BasePage.navHome`) или заголовок страницы входа, при UI-логине кэш пишется только после появления Home.
  - Эксперимент показал другую реальную проблему: `restoreAuthFromCache` делал `reload()` уже на `/sign-in` (куда приложение уводит пустой браузер), поэтому старая фикстура **никогда** не использовала кэш — UI-логин в каждом тесте (15–17 с против 8,4 с с кэшем).
  - Проверено на `coach/02-homepage`: первый запуск → UI-логин; валидный кэш → восстановлен (файл не перезаписан); кэш с отозванной на сервере сессией → UI-логин, тест проходит.
  - Исходное описание ниже оставлено для истории.
  - **Где:** [tests/fixtures.ts:101-104](tests/fixtures.ts#L101-L104).
  - **Проблема:** после `reload()` сразу проверяется `page.url()`, а редирект SPA на `/sign-in` асинхронный. Отозванный токен успевает сойти за рабочую сессию.
  - **Что сделать:** после восстановления дождаться признака авторизации (например, видимости `profileButton`) или редиректа на `/sign-in`, и только потом решать.
  - **Готово, когда:** при отозванном токене `loginAs` уходит в UI-логин, а не падает позже в тесте.

- [x] **1.3 Перестать портить данные в тесте родителей.** Сделано:
  - Вход созданного родителя проверяется в отдельном контексте браузера; logout owner убран. Проверено: после `07-parents` кэш-сессия owner открывает приложение без 401/403.
  - Создаётся родитель с уникальным именем `TestParent<ts>`; тест Edit находит его поиском по этому имени и переименовывает в `EditedTestParent<ts>`. Основной parent из `.env` больше не затрагивается (проверено входом под ним).
  - Инлайн `page.getByText('Owner')` заменён проверками через PO: виден дашборд родителя, не видны карточки owner.
  - Удалён пустой «Шаг 5.2» (переход на Parents без проверки).
  - Найдено: основной parent из `.env` был переименован прошлыми прогонами в `EditedParent EditedUser` — имя возвращено на `Parent User` (2026-11-11). У owner ~140 тестовых родителей (пункт 3.11).
  - Доделка 1.2: `restoreAuthFromCache` теперь делает `goto('/')` вместо `reload()` — кэш owner переиспользуется 5/5 (было 0/4).

  Исходное описание:
  - **Строки 54-57:** logout сделан через `BasePage` в обход фикстуры, поэтому токен owner отозван, а `owner.json` остался. К тому же это ручной `signInPage.login()` посреди серии.
    - Вариант А: вынести вход созданного родителя в отдельный `browser.newContext()`.
    - Вариант Б: сделать этот тест последним и использовать фикстуру `logout()`.
  - **Строка 67:** `parentEmail = 'dtimokhin+parent'` — это префикс, под него попадает основной пользователь parent из `.env`. Нужно передать email, созданный в первом тесте, через переменную describe (или искать по уникальному имени).
  - **Готово, когда:** тест не трогает пользователя `CREDENTIALS.parent`, и после файла `owner.json` остаётся валидным.

- [x] **1.4 Экранировать спецсимволы в `new RegExp(...)`.** Сделано без хелпера: `new RegExp(x, 'i')` заменён строкой в `name`/`hasText` (Playwright и так ищет подстроку без учёта регистра, но не интерпретирует `+`, `.`, `(`). Пол в `fillAthleteForm` — `exact: true` (`Male` совпадал с `Female`). Проверено спеком только на чтение: `getCoachRow(<email с +>)` находит строку, старая RegExp — 0 строк; регрессия permissions/homepage всех ролей зелёная.
  - **Проблема:** все email вида `dtimokhin+…`, а `+` в регулярке — квантификатор. Поэтому `getCoachRow(CREDENTIALS.coach.email)` никогда не находит строку.
  - **Затронутые места:** [coach-page.ts:110](tests/pages/coach-page.ts#L110), `getRow` в drill / evaluation / scorecard, `getPlanCard` / `getPlanRow`, [organization-page.ts:39-40](tests/pages/organization-page.ts#L39-L40), `verifyReportExists`, `deleteAllByTemplate`.
  - **Что сделать:** добавить хелпер `escapeRegExp()` или перейти на `filter({ hasText })`.
  - **Готово, когда:** в `tests/pages/` нет `new RegExp(<переменная>)` без экранирования.

- [~] **1.5 Переписать cleanup оценок и сократить Submit.** Код cleanup сделан (2026-11-12): `deleteDraftsCreatedSince(testStartedAt)` удаляет только свои черновики, проверено — черновик создан и удалён. Тесты переделаны (2026-11-12): Submit остался только в тесте отчёта (71562 + 71528) — 1 неудаляемый отчёт за прогон вместо 4; view/edit (71567, 71600) и rating below 3 (71494) — на черновиках; исправлен `submit()` (не ждал отправки); новый отчёт определяется по смене самого свежего отчёта — список показывает только последние 20, счётчик «(20)» не растёт. 71563 (workout) сделан (2026-11-12): отдельная оценка ниже 3 и второй Submit (+1 отчёт за прогон, выбор пользователя), своя группа без ретраев; workout — блок отчёта «Recommended drills», проверяется у owner и у самого атлета («Athlete Last», `EVALUATED_ATHLETE`, вход в отдельном контексте). Отложен 71493 (нужен шаблон с 6 категориями).
  - **Где:** `deleteAllByTemplate` в [tests/pages/evaluation-page.ts](tests/pages/evaluation-page.ts), вызывается из `afterEach` в [12-evaluations.spec.ts](tests/specs/owner/12-evaluations.spec.ts).
  - **Найдено (2026-11-12):** cleanup **никогда ничего не удалял**. `EvaluationPage.goto()` не вызывает `waitForLoading()`, и `deleteAllByTemplate` считал строки до загрузки таблицы: 0 строк → выход (замер: сразу после `goto()` — 0, после `waitForLoading()` — 10). Из-за этого у owner накопилось 72 черновика In Progress.
  - **Сделано:** все 72 черновика удалены через UI (⋮ → Delete → подтверждение), каждое удаление подтверждено уменьшением счётчика; итог — 0.
  - **Правила стенда (от пользователя):** оценки In Progress удалять можно; отчёты Evaluation Reports в интерфейсе удалить нельзя — Submit создаёт их навсегда (сейчас 20 отчётов).
  - **Что сделать в коде** (🔒 `evaluation-page.ts`):
    - `goto()` / `gotoReports()` — ждать загрузки (`waitForLoading()`, см. 1.8).
    - Удалять только своё: строки In Progress с датой CREATED не раньше начала теста (колонки: CREATED, TEAM, SCORECARD, STATUS, ACTION).
    - После каждого удаления ждать уменьшения числа строк; учитывать, что при ≤10 записях подпись «1-10 of N» не показывается.
    - Не чистить в тестах, которые ничего не сохраняют.
  - **Что сделать в тестах** (меняет поведение — по согласованию):
    - Сейчас Submit делают 4 теста из 6 (rating below 3, rating above 3, view/edit, report) → 4 неудаляемых отчёта за прогон owner.
    - **Найдено:** отправленная оценка уходит из списка Evaluations в отчёты, а 3 теста после Submit ищут строку в списке — проходили только за счёт старых черновиков (ложный PASS). После удаления черновиков они, вероятно, упадут.
    - **Решения пользователя (2026-11-12):**

      | Тест / TC | Решение |
      |---|---|
      | save as draft — 71460, 71561 | без изменений (черновик удаляется) |
      | block rating above 5 — 71495 | без изменений (ничего не сохраняет) |
      | rating below 3 — 71494, 71493 | Save as draft вместо Submit. 71493 («не больше 5 категорий ниже 3») требует шаблон с 6 категориями и сейчас не проверяется — см. этап 2 |
      | view and edit — 71567, 71600 | на черновике: оба TC по предусловию — «не submitted evaluation». 71600 также требует шаг «изменить и НЕ сохранить → данные не сохранены» |
      | rating above 3 — 71528 | объединить с тестом отчёта: в шагах TC оценка проверяется именно в отчёте |
      | generate report — 71562 (+71528, 71563) | **тест с Submit** (второй — workout 71563): новый отчёт каждый прогон — это и есть проверка создания. Проверять сам отчёт в Evaluation Reports (и оценки подскиллов из 71528), а не строку в списке оценок |
      | workout — 71563 | Workout генерируется только после Submit — без Submit проверить нечего. Совместить с 71528 в одной оценке нельзя: в Team01 один атлет («Athlete Last»), у `!Default Template` одна категория (проверено 2026-11-12). **Отложено (решение пользователя 2026-11-12: тестовыми данными займёмся позже).** Варианты: А) второй Submit отдельным тестом — 2 отчёта за прогон; Б) второй атлет в Team01 — один Submit на оба кейса (атлету 1 > 3, атлету 2 < 3), рекомендуемый; В) проверять workout в уже существующем отчёте — без проверки генерации. **Сделано 2026-11-12 по варианту А (выбор пользователя):** отдельный тест, своя группа без ретраев; workout = блок «Recommended drills» |
      | max 5 categories below 3 — 71493 | Нужен **отдельный шаблон с 6 категориями** (решение пользователя). **Отложено вместе с тестовыми данными.** Создать один раз с фиксированным именем и переиспользовать (3.12); проверку можно делать на черновике — Submit не нужен |
    - Итог: 2 неудаляемых отчёта за прогон owner вместо 4 (71562 и 71563).
  - **Готово, когда:** прогон owner не оставляет черновиков, а новых отчётов создаёт не больше, чем тестов, которым нужен именно Submit.

- [x] **1.8 Ждать загрузки данных после каждого перехода на страницу.** Сделано (2026-11-12): `waitForLoading()` сначала ждёт появления спиннера (появляется через 150–215 мс), затем исчезновения; добавлен во все методы из таблиц ниже; сохранение в 07-parents/09-skills/12-evaluations переведено на методы PO. Попутно: исправлены 4 сломанных локатора меню (`navScorecards` давал ложный PASS в coach/90-permissions), `.first()` у всех кнопок создания (дубль на пустом списке).
  - **Правило (от пользователя):** спиннеры загрузки есть на всех страницах, кроме входа и регистрации; после перехода или возврата на страницу нужно вызывать `BasePage.waitForLoading()`. Без этого тест читает пустую таблицу (так сломался cleanup в 1.5).
  - **Аудит (2026-11-12) — методы PO, которые переходят на страницу и НЕ ждут загрузки:**

    | PO | Методы |
    |---|---|
    | `base-page.ts` | `goToSkills`, `goToDrills`, `goToEasyJoin` и остальные `goTo*` (только клик по меню) |
    | `evaluation-page.ts` | `goto`, `gotoReports`, `createEvaluation`, `deleteEvaluation`, `deleteAllByTemplate` |
    | `plan-page.ts` | `goto`, `createPlan`, `savePlanAndReturnToMyPlans`, `editPlanFromCard`, `saveDrillEdit`; переключение вкладок `goToMyPlans/Invited/Prebuilt/OrgPlans` — проверить, грузят ли данные |
    | `drill-page.ts` | `goto`, `clickCreate`, `goToDrillsList` |
    | `scorecard-template-page.ts` | `goto`, `createScorecard`, `toggleActive` |
    | `team-page.ts` | `goto` (переход через меню) |
    | `organization-page.ts` | `gotoOrganizationsList` |

    Уже ждут: `goto` у athlete/coach/parent/skill/home/organization, `create*`/`edit*` у athlete/coach/parent/team/skill.
  - **Возврат после создания / редактирования / удаления (от пользователя):** после сохранения записи или пользователя приложение возвращает на страницу с данными, и она снова грузится со спиннером — здесь тоже нужен `waitForLoading()`.

    | Где | Сохранение без ожидания загрузки после возврата |
    |---|---|
    | `plan-page.ts` | `createPlan`, `savePlanAndReturnToMyPlans` |
    | `scorecard-template-page.ts` | `createScorecard`, `toggleActive` |
    | `evaluation-page.ts` | `createEvaluation`, `deleteEvaluation`, `deleteAllByTemplate` |
    | `drill-page.ts` | `clickCreate` (после создания — детальная страница дрилла) |
    | `owner/07-parents.spec.ts` | `clickCreateInDialog()` → сразу поиск по списку |
    | `owner/09-skills.spec.ts` | `createButton.click()` → только ожидание заголовка |
    | `owner/12-evaluations.spec.ts` | `saveAsDraftButton.click()`, 5× `submitButton.click()` → сразу поиск строки |

    Уже ждут: `createAthlete`, `createCoach`, `editCoach`, `createParent`, `editParent`, `createTeam`, `createSkill`, `OrganizationPage.save`, сохранение в `06-coaches`. Не относятся: сохранение во всплывающем окне (`saveSubskillRatings`), открытие формы (`clickCreateSkill`), вход и регистрация (нет спиннеров).
  - **Как чинить спеки:** сохранение из теста перенести в метод PO (`createParent`, `createSkill`, `saveEvaluationAsDraft`, `submitEvaluation`), который сам ждёт загрузки — заодно уходят прямые клики по кнопкам (3.1).
  - **В спеках напрямую:** `homePage.goToSkills/Drills/EasyJoin()` во всех `90-permissions`; `page.getByRole('link', { name: 'Back' }).click()` в `12-evaluations`; `page.goto('/practice-plans/new')` в `parent/90-permissions`.
  - **Тонкость:** `waitForLoading()` проверяет «спиннеров 0». Если вызвать его сразу после клика, когда спиннер ещё не появился, проверка пройдёт мгновенно. Надёжный порядок: дождаться признака страницы (заголовок/кнопка), затем `waitForLoading()` — так работает `goto()` у athlete/coach (на Evaluations этот порядок проверен 3/3).
  - **Что сделать** (🔒 PO): добавить `waitForLoading()` во все методы из таблицы; `goTo*` в `BasePage` — тоже; правило — в AGENTS.md §4 и чек-лист скилла 04.
  - **Готово, когда:** каждый метод PO, который приводит на страницу со спиннером, заканчивается ожиданием загрузки.

- [x] **1.6 Включить проверку типов TypeScript.** Сделано: `typescript@5.9`, `@types/node@24`, `tsconfig.json` (strict, noEmit), `npm run typecheck`. Первый запуск — 244 ошибки (разбор в 1.7); скрипт красный до завершения 1.7.
  - **Проблема:** нет `tsconfig.json` и пакета `typescript`. Playwright только транспилирует код, поэтому ошибки типов не видны.
  - **Что сделать:**
    - Добавить `typescript` в devDependencies.
    - Создать `tsconfig.json` (`strict`, `noEmit`).
    - Добавить скрипт `"typecheck": "tsc --noEmit"`.
  - **Готово, когда:** `npm run typecheck` проходит без ошибок.

- [x] **1.7 Исправить ошибки, которые найдёт `tsc`.** Сделано (2026-11-12): 244 → 0 ошибок. Первый запуск `npm run typecheck` (2026-11-11): 244 ошибки.
  - TS2322 ×203 — тип `ReturnType<this['page']['getByRole']>` не сводится к `Locator`; заменить на `Locator`.
  - TS2339/TS2551/TS2564 ×32 — необъявленные / неприсвоенные поля (ниже).
  - TS2353 ×8 — `filter({ hasText, exact: false })`: у `filter` нет опции `exact`, Playwright её молча игнорирует (athlete, coach ×3, parent ×2, team, `getAthleteRow`/`isAthleteExists`). Убрать.
  - TS7006 ×1 — параметр без типа в `isTokenValid` (`fixtures.ts`).
  - **Регулярный запуск включён (2026-11-12):** `pretest:<роль>` и `pretest:all` → `npm run typecheck`; правило в скиллах 03 (шаги 3–4) и 04 (F5), AGENTS.md §15. Проверено: при ошибке типов тесты не стартуют. Git-хук `pre-commit` — не включён (по желанию).

  Известные заранее:
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

- [x] **2.1** Сделано (2026-11-12): parent при прямом заходе на `/practice-plans/new` перенаправляется на список — проверяется `toHaveURL(/\/practice-plans\/?$/)` и отсутствие поля Plan name. [parent/90-permissions.spec.ts:68](tests/specs/parent/90-permissions.spec.ts#L68): регулярка `/sign-in|dashboard|practice-plans/` совпадает с самим `/practice-plans/new`. Нужно проверять `not.toHaveURL(/practice-plans\/new/)` или отсутствие формы.
- [x] **2.2** ~~plan-tabs.factory.ts~~ — фабрика удалена (3.8): была пропущена у всех ролей, вкладки проверяют тесты с кейсами 71645, 72617, 72622.
  - Пропускать только athlete, через параметр фабрики.
  - Убрать дубли с явными тестами: owner `@TC-71645`, parent `@TC-71643`/`@TC-72622`, athlete `@TC-72622`.
- [x] **2.3** Сделано (2026-11-12): тест включён целиком — все шаги, включая Plan, проходят; единственное расхождение было в Prebuilt Plans: у атлета вкладка теперь есть (намеренно), ожидание изменено на visible. Ручной кейс 72625 устарел. [athlete/90-permissions.spec.ts:25](tests/specs/athlete/90-permissions.spec.ts#L25): весь блок прав пропущен. Пропускать только шаг Plan, остальные шаги включить.
- [x] **2.4** Сделано (2026-11-12): план `Athlete Invited Plan` (owner, приглашён атлет) создан один раз через `tests/setup`; тест 72609 сначала проверяет, что карточка видна на Invited, потом — что в ней нет Edit (ссылки или кнопки). [athlete/13-plans.spec.ts:27](tests/specs/athlete/13-plans.spec.ts#L27): при пустой вкладке Invited ассерт проходит всегда. Сначала проверить, что карточка есть (предусловие: план, на который приглашён атлет).
- [x] **2.5** Сделано (2026-11-12): после remove — `toHaveText(/Segments \(0\)/)`; `15 min` уже ищется в карточке плана (`getPlanCard`). [coach/13-plans.spec.ts:35,56](tests/specs/coach/13-plans.spec.ts#L35):
  - После remove проверять `Segments (0)`.
  - Длительность `15 min` искать внутри карточки `getPlanRow(planName)`, а не по всей странице.
- [x] **2.6** Сделано (2026-11-12): рейтинг 6 — проверяется предупреждение «…from 1 to 5» и что ячейка Category1 осталась `—` (`getCategoryRatingCell` вместо «первой ячейки с —», которая перескакивала). Остальное закрыто раньше (1.5): тест отчёта переименован (71562, workout 71563 — отдельно), черновики — по статусу `In Progress` и удаляются в afterEach. [12-evaluations.spec.ts](tests/specs/owner/12-evaluations.spec.ts):
  - **Строка 235:** название обещает report и workout — добавить их проверки или переименовать тест.
  - **Строка 84:** `not.toContainText('6')` — сначала дождаться финального состояния ячейки (ожидаемое значение или сообщение-предупреждение).
  - **Draft:** проверять статус Draft в строке.
  - **`getRow(TEMPLATE_NAME)`:** находит старые строки. Нужен уникальный признак созданной оценки.
- [x] **2.7** Закрыт переписыванием 06-coaches (3.8): имена с `Date.now()`, строка ищется по email. [06-coaches.spec.ts](tests/specs/owner/06-coaches.spec.ts): имя `'View Coach'` не уникально. Использовать `Coach${Date.now()}` и искать строку по email.
- [x] **2.8** Сделано (2026-11-12): дрилл создаёт только 74151 (1 за прогон вместо 3), 72683 открывает его; валидация — `aria-invalid` у Drill name и Segment + остаёмся на `/drills/new` (текст под именем — сырое сообщение zod); «verify role permissions» → `should show all drill fields in the create form` (72684), без сохранения, `test.skip` с TODO — кейс про 5 шагов для разных ролей. [10-drills.spec.ts](tests/specs/owner/10-drills.spec.ts):
  - Сейчас 3 теста создают 3 дрилла с одинаковым именем. Создавать один дрилл с уникальным именем в первом тесте, остальные тесты переиспользуют его (минимум новых сущностей, см. 3.11).
  - Тест «verify role permissions» переименовать или вынести проверку прав в спеки ролей.
  - «Валидация» — проверять сообщение об ошибке, а не видимость поля.
- [x] **2.9** Сделано (2026-11-12): названия owner/sysadmin/coach — по реальным проверкам («see create actions…» вместо «full CRUD»); owner — строка своей организации и всего одна (заголовок + 1); sysadmin — поиском находятся две разные организации (aiorg01 и aiorg01sysedit); все `toBeHidden` во всех пяти спеках уже идут после положительной проверки на той же странице (заголовок/вкладка) — правка не нужна. `*-permissions.spec.ts`:
  - Привести названия к реальным проверкам (например, «sees Create buttons…» вместо «full CRUD access»).
  - Добавить проверки «только своя организация» (owner) и «все организации» (sysadmin).
  - Перед каждым `toBeHidden` ждать загрузки страницы, иначе негативная проверка проходит раньше рендера.
- [x] **2.10** Сделано (2026-11-12): после деактивации строка шаблона содержит `Inactive` (колонка Status), в обоих тестах. [11-scorecard-templates.spec.ts:48,79](tests/specs/owner/11-scorecard-templates.spec.ts#L48): проверять статус Inactive в строке.
- [x] **2.11** Закрыт в 3.8: неверный пароль проверяет текст ошибки `Invalid login credentials`; тест пустой формы и describe `Sign Up` удалены. [01-signin.spec.ts](tests/specs/owner/01-signin.spec.ts):
  - Для невалидных данных и пустой формы проверять сообщения об ошибке.
  - Удалить дублирующий describe `Sign Up`.
- [x] **2.12** Закрыт: первый тест — `test.skip` с TODO(71116) (профиль не проверяется); откат имени — к константе `ORGANIZATIONS` (PR #2), поэтому упавший прогон чинится следующим, `finally` не нужен. [04-organization.spec.ts](tests/specs/owner/04-organization.spec.ts):
  - Первый тест проверяет только «не sign-in» — проверять профиль.
  - Откат имени перенести в `afterEach`/`finally`.
- [x] **2.13** Сделано (2026-11-12): scorecard — только `getByRole('row')`; drill — список карточками, `getCard` по `article` (раньше работала только ветка getByText); evaluation — неиспользуемые `getRow`/`getEditButton` удалены; шаблон в AGENTS.md §4 заменён. `getRow = byRole.or(byCell).or(getByText(name))` (drill, evaluation, scorecard): ветка `getByText` находит имя в toast и заголовках. Убрать её. Строка таблицы — только `getByRole('row')` с фильтром.
- [x] **2.14** (причина skip добавлена аннотацией, видна в отчётах; остальная часть пункта — в этапе 2) [sysadmin/04-organization.spec.ts:31](tests/specs/sysadmin/04-organization.spec.ts#L31): у `test.skip` нет причины — добавить её. Тест `@TC-71922` проверяет только загрузку страницы, а обещает «все организации».

---

## Этап 3. Page Objects и спеки: привести к правилам

- [x] **3.1 Убрать прямые локаторы из спеков (28 мест).** Сделано (2026-11-12): часть ушла в 1.3/1.8/1.5, оставшиеся 13 мест в 6 спеках переведены на PO; в спеках прямых локаторов 0. Попутно исправлен `PlanPage.viewPlan` (искал кнопку, а View — ссылка); в coach/13-plans «15 min» ищется в карточке созданного плана (часть 2.5).
  - **Где больше всего:** 12-evaluations (44, 103–111, 198–217), 06-coaches (105, 132–136), 13-plans, 10-drills, 07-parents:59, coach/90-permissions:80.
  - **Что сделать:** использовать уже существующие `openEditCoach()`, `getRatingInput()`, `getRatingCell()` и добавить недостающие методы.
  - **Готово, когда:** `grep -rnE "page\.(getByRole|locator|getByText|keyboard)" tests/specs` пуст.
- [x] **3.2 Удалить `HomePage.logout()`.** Он перекрывает `BasePage.logout()`, а его локатор `/logout/` не находит «Log Out». Удалить вместе с `userProfile`/`logoutButton`.
- [x] **3.3 Разделить кнопки в PlanPage.** Сделано: `createButton` → `saveButton` (в форме одна кнопка Save), `getPlanRow` удалён в пользу `getPlanCard`. `createButton` сейчас ищет `'Save'`. Объявить отдельные `saveButton`/`createButton`. `getPlanCard` и `getPlanRow` одинаковы — оставить один метод.
- [x] **3.4 SignUpPage.** Сделано: PO не соответствовал реальной форме (выдуманные шаги Next/Back, поиск по плейсхолдерам-примерам `Jose`/`••••••••`). Локаторы переписаны по подписям полей (каждый находит ровно 1 элемент); удалены `registerAthlete` (выдуманный сценарий) и `gotoWithCode` (`?code=` не заполняет Join code). Отправка формы не проверялась — она создаёт пользователя.
  - `passwordInput` (`/password/`) найдёт и «Confirm password» → strict mode violation.
  - `gotoWithCode` переходит на страницу дважды.
- [x] **3.5 Убрать спекулятивные русские варианты из регулярок** (`Редактировать`, `Сохранить`, `Отмена`, `Далее`, `Назад`, `Вход`, `выйти`). UI английский.
- [x] **3.6 Удалить мёртвый код:** Сделано: обёртки BasePage, `get*Count` и `logout` в HomePage, неиспользуемые поля PlanPage/OrganizationPage, `BASE_URL` и `DATA_TEST` в config. Оставлены: `ROLES`, `EVALUATION` (константы предметной области), методы-заготовки PO, `isXExists` (нужны `00-create-users`).
  - **🔒** в `config.ts`: `DATA_TEST`, `ROLES`, `EVALUATION`, `BASE_URL`.
  - Неиспользуемые методы PO: `isAthleteExists`/`isCoachExists`/`isParentExists` (возвращают boolean — антипаттерн), `getText`, `getCount`, `waitForElement*`, `getUrl`, `getPathname`.
  - Тест `00-create-users` перевести на фикстуру `loginAs` или явно задокументировать как ручной.
- [x] **3.7 Привести нумерацию файлов к таблице §6:** Сделано: `02-homepage` у всех ролей, `90-permissions`, `99-auth` (logout последним); таблица AGENTS.md обновлена (`13-plans`, 90, 99). Найдено: без `--workers 1` (`fullyParallel: true`) тесты одного запуска идут параллельно и logout рвёт соседние — во все команды запуска файлов добавлен `--workers 1`.
  - **owner:** развести `90-permissions`/`01-signin` и `99-auth`/`02-homepage`.
  - **coach:** `02-homepage` → `03-homepage`, как у athlete/parent.
  - Logout-тесты (`99-auth`) должны идти последними в серии роли: переименовать, например, в `99-logout.spec.ts`.
- [x] **3.8 Единый формат ID тест-кейсов.** Сделано (2026-11-12): `allure-js-commons`, `allure.allureId('<test_case_id>')` первой строкой теста, `@TC-` убран из названий; разделены 06-coaches (71990/72057/71991), 11-scorecard (71292/71393/71293), 12-evaluations (8 тестов); 70941 — тест переписан на существующий email + неверный пароль; 70943, 70897 — номер + `test.skip` с TODO (тест покрывает только переход). Удалены тесты без кейсов: display/empty form/sign-up link в 01-signin, вход в 99-auth и logout у coach/parent/athlete (остался logout owner), фабрика вкладок, заглушка 03-signup; `00-create-users` → `tests/setup/` (проект `setup`, вне test:all и CI). Правила — AGENTS.md §6.
  - [x] **Связать результаты с кейсами TestOps** (проверено через MCP 2026-11-12): `test_case_id` = ID кейса в TestOps (71600 есть, 91877 — нет), но `@TC-…` в названии TestOps не распознаёт — кейс 71600 `automated: false`, а кейс коллеги 70936 привязан (`automated: true`) через `allure.allureId('70936')` / `@allure.id:70936` в названии. Сделать: добавить `allure-js-commons`, в каждом тесте `allure.allureId('<test_case_id>')`; у результата может быть только один ID — тесты на несколько кейсов (06-coaches, тест отчёта оценок и др.) разделить. Без этого 5.4 бесполезен.
  - [x] Заменить allure_id на test_case_id — сделано (2026-11-12) по выгрузке `report (1).csv`: 16 номеров `91XXX` в 06-coaches, 08-teams, 10-drills, 12-evaluations, owner/13-plans; `71835` (нет в TestOps) → 72683 (YouTube в дрилле); `72612` → 72604 (owner «non-sysadmin roles do not see Prebuilt checkbox»).
  - [x] `sysadmin/13-plans` «sysadmin sees all plan tabs»: `72679` (Home page) → **72617** «Prebuilt Plans and Org Plans tabs visible to Administrator / Owner / System Administrator» (от пользователя; в CSV-выгрузке этого кейса нет — выгрузка неполная).
- [x] **3.9 Убрать `test.use({ storageState: undefined })`** — сейчас это no-op. Либо реально сбрасывать контекст, либо удалить вместе с описанием в AGENTS.md §9. Сделано (2026-11-12): убрано из 01-signin, описание исправлено в AGENTS.md §9 и fixtures.ts.
- [x] **3.10 Удалить явные `{ timeout: TIMEOUTS.medium }`** там, где они равны дефолтному expect timeout (10 с). Сделано (2026-11-12): 137 мест в 27 файлах (только expect-матчеры; в click/waitFor оставлены). Найдено: `saveAsDraft()` ждал 10 с, а сохранение оценки занимает до ~10 с — дан `TIMEOUTS.long`, как у `submit()`.
- [x] **3.11 Минимизировать создание данных на стенде.** Сделано (2026-11-12): проверено, что удаляется в интерфейсе (только Teams и черновики оценок — AGENTS.md §10); 08-teams удаляет созданную команду (`TeamPage.deleteTeam`, в `finally`). Деактивация пользователей (2026-11-12): `ManageUsersPage`; 06-coaches и 07-parents в `afterAll` деактивируют созданного в этом прогоне (под owner, отдельный контекст) и забывают его в хранилище; разовая чистка накопленных — служебный `tests/setup/deactivate-test-users.spec.ts` (только owner, только шаблоны email тестов).
  - **Ограничение стенда:** удалять можно Teams; у оценок в меню есть Delete (работает ли — не проверено). Пользователей любых ролей (athletes, coaches, parents) удалить нельзя — только деактивировать через Manage Users, после чего они пропадают из своих списков.
  - **Правило:** новые пользователи создаются только в тестах, проверяющих само создание (TC-71252 Create parent, TC-91891 Add coach). Edit/View/права — на уже существующей сущности или созданной ранее в той же serial-серии.
  - **Teams:** созданные командами удалять в `afterEach`/`finally`.
  - **Пользователи:** при необходимости деактивировать созданных через Manage Users. Накопленных (~140 тестовых родителей у owner на 2026-11-11) — деактивировать разово.
  - **Уточнить:** можно ли удалять drills, plans, skills, scorecard templates и evaluations (в коде есть удаление evaluations).
  - **При проверке правок** использовать спеки, которые ничего не создают (`02-homepage`, `90-permissions`).

- [x] **3.12 Убрать лишние создания и переиспользовать сущности между прогонами.** Сделано (2026-11-12): drills 3→1, evaluations — 2 отчёта (71562 и 71563, решение пользователя), sysadmin-планы 3→1 (71716 — skip с TODO, роль coach); хранилище `tests/helpers/test-data-store.ts` (`tests/.data/<роль>/<сущность>.json`) для coach, parent, шаблона, дрилла, отчёта 71528 — зависимые тесты проходят по отдельности (проверено на drill/шаблоне).
  - **Принцип:** запись создаёт только тест, который проверяет само создание. Остальные тесты (view, edit, invite, права, валидация) берут сущность, созданную этим тестом.
  - **Аудит (2026-11-11), сколько записей создаёт один прогон:**

    | Спек | Создаёт за прогон | Лишнее | Что сделать |
    |---|---|---|---|
    | owner/06-coaches | 1 коуч | — (create + view + edit в одном тесте) | При разбиении на тесты — view/edit на коуче из create |
    | owner/07-parents | 1 родитель | — (edit уже берёт созданного) | Перевести на хранилище между прогонами (пилот) |
    | owner/08-teams | 1 команда | Команды не удаляются | Удалять созданную команду после теста (Teams удалять можно) |
    | owner/09-skills | 1 скилл | — | — |
    | owner/10-drills | 3 дрилла | 2 (тесты permissions и YouTube создают свои) | Создать 1 дрилл с YouTube URL в create, остальные — его |
    | owner/11-scorecard-templates | 2 шаблона | 0–1: обе проверки — создание (TC-71292, TC-71293) | Деактивацию (TC-71393) делать на шаблоне из create. Уже накоплено 167 шаблонов |
    | owner/12-evaluations | 4 оценки | 3 (view/edit, «below 3», «report» создают свои) | Одна оценка в create; view/edit/report — на ней. Проверки рейтинга — без Submit |
    | owner/13-plans | 1 план | — | — |
    | sysadmin/13-plans | 3 плана | 2 (invite и uncheck Prebuilt создают свои) | Invite — на плане из create; uncheck — на плане из TC-72611 |
    | coach/13-plans | 1 план | — | — |

  - **Хранилище между прогонами** — чтобы зависимые тесты работали, даже если тест создания в этом прогоне не запускался (`--grep`, падение, skip):
    - Тест создания после успешного создания пишет данные в `tests/.data/<role>/<entity>.json` (папка в `.gitignore`, как `tests/.auth/`). Файл на роль и сущность — проекты ролей идут параллельно и не пишут в один файл.
    - Хранить **стабильный ключ** (email для пользователей, уникальное имя для остальных) и **текущее отображаемое имя**. Тест, который меняет сущность (edit), обновляет файл: иначе следующий прогон будет искать по старому имени (поиск в Parents работает только по имени).
    - Зависимый тест берёт сущность так: из текущего прогона → из файла прошлого прогона → иначе падает с понятным сообщением «запустите тест создания». Перед использованием проверяет, что сущность существует (могли деактивировать через Manage Users).
    - Реализация — небольшой хелпер `tests/helpers/test-data-store.ts` (`saveEntity` / `loadEntity`) 🔒, без изменения существующих общих файлов.
  - **Готово, когда:** прогон owner создаёт не больше записей, чем в нём тестов создания; зависимые тесты проходят при запуске по отдельности (`--grep`).

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

- [x] **4.2 Удалить вредный совет** (сделано: удалены #1 и #6, остальные пункты перенумерованы 1–11) в [test-antipatterns.md](.gigacode_vsc/skills/test-antipatterns.md) #6 (`Promise.all` над `loginAs`): `loginAs` работает с одной общей `page` и вызов сломает сессию. Удалить и #1 про «звонки».
- [x] **4.3 Удалить чужие и устаревшие примеры:** (сделано: примеры заменены на примеры из проекта)
  - `AUTO-112`, `getReadValue`, `temp-files`, `cdk-overlay`/`mat-dialog`, appointments, video call.
  - «waitForTimeout в 13-plans.spec.ts lines 38, 102…».
  - Несуществующие методы BasePage: `clickButton`, `fillInput`, `isVisible`, `getValue`.
  - Старый код `openProfileMenu` и номера строк base-page в [test-pom-review.md](.gigacode_vsc/skills/test-pom-review.md).
- [x] **4.4 Исправить нумерацию:** (сделано, включая скиллы 01, 02 и workflow.md)
  - Tie-break правила в [test-reliability.md](.gigacode_vsc/skills/test-reliability.md) сдвинуты на единицу (race — это #1, fragile — #2).
  - Счётчики: реально 17 надёжностных паттернов и 13 антипаттернов, в тексте 16 и 10.
  - Список антипаттернов в скилле 04 привести к содержимому файла.
  - Раздел использования в reliability: «пройти 1–17».
  - В workflow.md исправить имя `test-harvester.md` → `05-test-harvester.md`.
- [x] **4.5 Обновить AGENTS.md:** (сделано; §9 описывает фикстуру после 1.2, §10 — ограничение стенда)
  - §7, §15: добавить sysadmin (5 ролей) и `npm run test:sysadmin`.
  - §14: заменить устаревшую структуру на реальную (папки ролей, factories).
  - §9: удалить исторический лог «42 passed…».
  - §1: убрать дубли с workflow.md и скиллом 01 (оставить ссылки).
- [~] **4.6 Починить команды:** (команды исправлены; npm-скрипты lint не добавлены — на Windows нужен ESLint или Node-скрипт, отдельная задача). Проверки §16 автоматически идут на каждый PR — `.github/workflows/pr-checks.yml` (2026-11-12); локальный lint-скрипт по-прежнему не сделан.
  - §16: lint-grep не работает — `(` литерал в BRE, `GetByText` с заглавной G. Использовать `grep -rE "page\.(getByRole|locator|getByText)"`.
  - На Windows npm запускает скрипты через cmd без `grep`. Lint-скрипты лучше сделать на Node или ESLint (`eslint-plugin-playwright`) и реально добавить в `package.json`.
  - Скилл 03, шаг 6: `npm run test:owner -- --grep "…"` (нужен `--`).
  - Блок «Очистка мусора»: fence ` ```bash ` → ` ```powershell `.
- [ ] **4.7 Снизить нагрузку на контекст агента.** Вместо «читать все скиллы перед каждым сценарием» (около 1700 строк):
  - 01–03 читать сразу.
  - Чек-листы reliability, antipatterns и pom-review читать только на шаге 04.
  - Для простых сценариев объединить утверждения 01 и 02 в одно.
- [~] **4.8 Исправить опечатки и стиль:** (в скиллах, AGENTS.md и 06-coaches исправлено; `fixtures.ts` исправлен в пакете 1.7; единое написание и тон — вместе с 4.1)
  - **Опечатки:**
    - `origen` → origin ([fixtures.ts:38,44,52](tests/fixtures.ts#L38)) 🔒.
    - `воркерех` → воркерах; `ревокан`/`ревокал` → отозван.
    - `suger` → suggest ([test-antipatterns.md:363](.gigacode_vsc/skills/test-antipatterns.md#L363)).
    - «самая влияющая баг» → «самый влияющий баг».
    - «а имайл пришло велком письмо» ([06-coaches.spec.ts:23](tests/specs/owner/06-coaches.spec.ts#L23)).
  - **Единое написание:** коуч, дрилл, ждём.
  - **Чек-листы:** убрать суржик («флажить», «ассертит», «эвалюирует») — один язык на документ.
  - **Тон:** сократить КАПС, 🔴 и «СТОП». Оставить выделение только для действительно критичных правил.
- [ ] **4.9 Отдельный проход: убрать лишнее из памяти и скиллов.** После 4.1 и 4.7 ещё раз пересмотреть всё, что агент читает в контекст, с вопросом «что здесь лишнее или просто перегружает файл».
  - **Что смотреть:** AGENTS.md, `workflow.md`, все скиллы в `.gigacode_vsc/skills/`, память агента (`MEMORY.md` и файлы памяти), `PLAN.md`.
  - **Признаки лишнего:** одно правило в нескольких файлах; история и отчёты о прогонах вместо правил; длинные BAD/GOOD-примеры там, где хватает одной строки; разделы для неиспользуемых скиллов (06-SKIP, 07-SKIP); описания кода, которые устаревают при каждой правке (номера строк, перечни методов).
  - **Принцип:** у каждого правила — одно место; остальные файлы ссылаются на него.
  - **Готово, когда:** у каждого файла понятная роль, нет дублей правил, суммарный объём того, что читается перед каждым сценарием, заметно меньше текущих ~1700 строк.

---

## Этап 5. Эффективность прогона

- [x] **5.1 🔒 Развести HTML-отчёты по ролям.** Сделано (2026-11-12): роль из `--project=` (воркерам — через `ANKOR_PW_ROLE`), отчёт `reports/html/<роль>`, артефакты `test-results/<роль>`; в `test:all` строки лога подписаны именем роли (`concurrently -n`).
  - Было: `test:all` запускает 5 процессов, и все пишут в одну `reports/html`: остаётся отчёт последнего процесса или битый.
  - Вариант А: свой `outputFolder` на роль через переменную окружения.
  - Вариант Б: один процесс с проектами и детерминированным распределением.
- [x] **5.2 🔒 (опционально) Перейти на стандартный storageState.** Setup-проект на роль + `use.storageState` в проекте вместо собственного restore-механизма. Это меньше кода и закрывает п.1.2. Logout-тесты — в отдельном `browser.newContext()`.
  - **Отклонено после эксперимента (2026-11-12).** В отдельной рабочей копии: setup-проект `auth-<роль>` (один вход на прогон) + `use.storageState`, `loginAs` → только `goto('/')`.
    - Скорость: тот же набор (01/02/04/90 у ролей, 13-plans parent/athlete), 5 ролей параллельно — **85 с против 86 с** у текущей фикстуры; выигрыша нет: тест всё равно открывает приложение и ждёт меню, а вход добавляет ~6 с на роль.
    - `01-signin` — работает только с `test.use({ storageState: пусто })`; отдельный `browser.newContext()` — чистый, не наследует сессию (07-parents, sysadmin-планы, деактивация — без изменений); 5 ролей параллельно — без проблем.
    - **Тест роли после logout в том же прогоне падает:** logout отзывает сессию на сервере, storageState не восстанавливается. Текущая `loginAs` замечает отозванную сессию и входит через форму (1.2).
    - Итог: ни скорости, ни надёжности; текущая фикстура остаётся. Возвращаться, только если появится реальная причина (например, долгий вход).
- [x] **5.3 🔒 Проверить конфликт `test-output.log`.** Сделано (2026-11-12): конфликта не было — `line` не поддерживает `outputFile` и пишет в консоль; лог пишет только перенаправление. Убран бесполезный `outputFile`, `line` + `list` оставлены намеренно ([N/M] прогресс + ok/x результат), причина — в комментарии конфига.
  - Было: Его пишет и reporter в `playwright.config.ts`, и перенаправление в shell из AGENTS.md. Оставить один источник.
- [x] **5.4 CI на GitHub Actions + выгрузка результатов в Allure TestOps.** Образец — репозиторий коллеги `kurgulana/ankor_autotests`, `.github/workflows/playwrightStaging.yml`. **Workflow создан (2026-11-12):** `.github/workflows/playwrightMain.yml` — ручной запуск, выбор ролей, роли параллельно с `--workers 1`, учётки из Secrets, `typecheck`, `allurectl watch` при наличии `ALLURE_TOKEN`, артефакты; скрипт запуска проверен локально на роли parent. Secrets заведены, первый запуск (parent) зелёный; `ALLURE_TOKEN` добавлен (2026-11-12). Полный запуск с выгрузкой (2026-11-12, launch 15744): 46 passed, 5 skipped, 0 failed; 50 результатов легли в свои ручные кейсы, logout owner — в автоматический кейс 74820. Лишний кейс 74819 (от `test.skip('title')` без allureId) удалён.
  - **Как там устроено:** запуск вручную (`workflow_dispatch`, параметры `ALLURE_JOB_RUN_ID` / `ALLURE_USERNAME` для запуска из TestOps), `allurectl watch -- npx playwright test` с репортером `allure-playwright`, затем `allurectl upload allure-results` в `https://rallyup.testops.cloud`, проект TestOps **366**; токен — GitHub Secret `ALLURE_TOKEN`.
  - **Что адаптировать под этот проект:**
    - запуск по ролям (`npm run test:<роль>` / `test:all`) вместо одного `npx playwright test`; `--workers 1` внутри роли;
    - учётные данные — GitHub Secrets, из которых workflow собирает `.env.d333afta2q6llv` (в репозитории его нет);
    - `npm run typecheck` первым шагом (уже есть как `pretest:*`);
    - Node 24, `npm ci`, `npx playwright install chromium --with-deps`.
  - **Связать результаты с тест-кейсами TestOps:** `allure-js-commons` — `allure.allureId('<test_case_id>')` и `epic/feature/story` в тестах (надёжнее тега `@TC-…` в названии; связано с 3.8).
  - **Учесть данные стенда:** запуск из CI — это такие же прогоны со всеми созданиями записей (3.11, 3.12); не запускать по каждому push, только вручную или по расписанию.
  - **Готово, когда:** прогон из GitHub Actions (или из TestOps) появляется в TestOps как launch с результатами, привязанными к тест-кейсам.
  - **Синхронизация кейсов (решено 2026-11-12):** по умолчанию выгрузка перезаписывает связанный кейс данными автотеста — название → название теста, Epic/Feature/Story → только Suite с путём к файлу (кейс выпадает в корень дерева). Решение — в TestOps: Settings → Upload → Meta data update policies, источник `from_test_case` для **Name** и **Custom Fields** (Epic/Feature/Story/Suite — пользовательские поля, по отдельности в списке их нет). Проверено запуском 15777 (parent): названия, поля и шаги кейсов не изменились, результаты легли в свои кейсы. Путь в дереве в тестах прописывать не нужно.

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
