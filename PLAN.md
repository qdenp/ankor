# PLAN.md — покрытие тест-кейсов Ankor автотестами

Снимок кейсов Allure TestOps (проект 366, https://rallyup.testops.cloud) на **2026-11-12**, сопоставленный с автотестами в `tests/specs` по `allure.allureId(...)`. Источник правды по кейсам — TestOps; этот файл — обзор покрытия.

**Как обновлять:** после нового автотеста — поменять статус его кейса здесь (скилл 04 / AGENTS §1). Полная пересборка — попросить агента собрать кейсы через MCP `testops_find_testcases` и сопоставить с `allureId` в коде.

Статусы: ✅ есть автотест · ⏭️ автотест есть, но пропущен (`test.skip` с TODO — покрывает кейс не полностью) · ❌ автотеста нет.

## Очередь

С чего продолжать. Новый тест — по цепочке скиллов 01→04 (AGENTS §1); после него — поменять статус кейса ниже и убрать строку отсюда.

| Кейс | Сейчас | Чего не хватает | Что нужно |
|---|---|---|---|
| 71116 owner / admin view own organization | ⏭️ `owner/04-organization` | проверить данные профиля своей организации и что чужие не видны | ничего — можно сразу |
| 70943 Forgot password | ⏭️ `owner/01-signin` | ввести email, отправить запрос, проверить сообщение (письмо не проверяем — AGENTS §10) | ничего — можно сразу |
| 72684 Create/edit drill: fields, role permissions, Visibility | ⏭️ `owner/10-drills` | шаги ролей: SysAdmin — выбор Visibility при создании и смена на Edit; Owner не правит Public-дрилл | шаги SysAdmin — тестом в `sysadmin/`; Public-дрилл на стенде |
| 71716 Invite multiple user to plan by coach | ⏭️ `sysadmin/13-plans` | перенести в `coach/13-plans`: выбрать 5–10 пользователей, Send invites, сообщение «Invites saved. Emails sent: N» | **решение пользователя:** кому уходят реальные приглашения (письма) |
| 70897 Успешная регистрация организации Lacrosse | ⏭️ `owner/01-signin` | полная регистрация через `/org-signup` (`OrgSignUpPage` уже есть) | каждая регистрация — неудаляемая организация и админ; согласовать частоту |
| 71493 Не больше 5 категорий ниже 3 | ❌ | новый тест в `owner/12-evaluations` на черновике (Submit не нужен) | шаблон оценки с 6 категориями — создать один раз через `tests/setup` |


## Итого

| Feature | Кейсов | ✅ | ⏭️ | ❌ |
|---|---|---|---|---|
| Ankor - 1 version | 179 | 45 | 5 | 129 |
| 2 version | 52 | 0 | 0 | 52 |
| (автоматический кейс) | 1 | 1 | 0 | 0 |
| **Всего** | **232** | **46** | **5** | **181** |

## Ankor - 1 version

### Athlete (0/8)

| Кейс | Название | Статус | Автотест |
|---|---|---|---|
| 71149 | Manually Add Athlete by coach | ❌ |  |
| 71182 | Add athlete + parent | ❌ |  |
| 71215 | Add athlete + parent  existing | ❌ |  |
| 71216 | Add manual > check email | ❌ |  |
| 71217 | Add manual > check email already registrated | ❌ |  |
| 71218 | Пароль валидация | ❌ |  |
| 71219 | edit athlete | ❌ |  |
| 71253 | Delete athlete | ❌ |  |

### Coach (3/7)

| Кейс | Название | Статус | Автотест |
|---|---|---|---|
| 71990 | Add coach manually | ✅ | owner/06-coaches.spec.ts |
| 71991 | Edit coach | ✅ | owner/06-coaches.spec.ts |
| 72024 | Delete coach | ❌ |  |
| 72057 | View coach | ✅ | owner/06-coaches.spec.ts |
| 72058 | Add manual > check email | ❌ |  |
| 72059 | Add manual > check email already registrated | ❌ |  |
| 72060 | Пароль валидация | ❌ |  |

### Drill (2/8)

| Кейс | Название | Статус | Автотест |
|---|---|---|---|
| 71835 | View drill | ❌ |  |
| 71836 | Filters | ❌ |  |
| 71837 | Search | ❌ |  |
| 71838 | Pagination | ❌ |  |
| 72682 | [NEW] Drill Library scope: only Public + own organization's drills | ❌ |  |
| 72683 | [NEW] Drill detail: play instructional video (YouTube) | ✅ | owner/10-drills.spec.ts |
| 72684 | [NEW] Create/edit drill: fields, role permissions, Visibility rules | ⏭️ | owner/10-drills.spec.ts — пропущен: covers only step 2 (create form fields); role and visibility steps are not implemented |
| 74151 | Create drill | ✅ | owner/10-drills.spec.ts |

### Easy join (0/4)

| Кейс | Название | Статус | Автотест |
|---|---|---|---|
| 71847 | Easy Join Codes | ❌ |  |
| 71848 | disabled, inactive, or expired code | ❌ |  |
| 71849 | Copy | ❌ |  |
| 71850 | Delete code | ❌ |  |

### Evaluation (9/12)

| Кейс | Название | Статус | Автотест |
|---|---|---|---|
| 71460 | create evaluation | ✅ | owner/12-evaluations.spec.ts |
| 71493 | Можно сделать оценку менее 3 только для 5 | ❌ |  |
| 71494 | Рейтинг категории ниже 3 раскрывает под-скиллы | ✅ | owner/12-evaluations.spec.ts |
| 71495 | Ввод рейтинга выше 5 блокируется с предупреждением | ✅ | owner/12-evaluations.spec.ts |
| 71528 | Оценка категории подтягивает оценку на все сабскилы | ✅ | owner/12-evaluations.spec.ts |
| 71561 | Просмотр not submitted evaluation | ✅ | owner/12-evaluations.spec.ts |
| 71562 | После submit генерируется evaluation report | ✅ | owner/12-evaluations.spec.ts |
| 71563 | После submit генерируется персонализированный workout | ✅ | owner/12-evaluations.spec.ts |
| 71564 | После submit атлет получает notification и email | ❌ |  |
| 71565 | После submit родитель атлета получает notification и email | ❌ |  |
| 71567 | View evaluation | ✅ | owner/12-evaluations.spec.ts |
| 71600 | Edit evaluation | ✅ | owner/12-evaluations.spec.ts |

### Evaluation report (0/6)

| Кейс | Название | Статус | Автотест |
|---|---|---|---|
| 71601 | Athlete видит свои репорты | ❌ |  |
| 71602 | Parent видит отчёты привязанных к нему атлетов | ❌ |  |
| 71603 | Coach/Administrator/Owner видят все завершённые отчёты организации | ❌ |  |
| 71604 | Родитель нескольких атлетов может перейти к отчётам конкретного ребёнка | ❌ |  |
| 71605 | Переход по deep-link из уведомления/письма открывает отчёт напрямую | ❌ |  |
| 71606 | Переход по deep-link из уведомления/письма открывает отчёт напрямую родителя | ❌ |  |

### Login (2/26)

| Кейс | Название | Статус | Автотест |
|---|---|---|---|
| 70897 | Успешная регистрация организации Lacrosse | ⏭️ | owner/01-signin.spec.ts — пропущен: covers only navigation; the organization registration itself is not implemented yet |
| 70930 | Невалидный формат email | ❌ |  |
| 70931 | Регистрация с уже зарегистрированным email не создаёт организацию | ❌ |  |
| 70932 | Пароль валидация | ❌ |  |
| 70933 | Невалидный номер телефона | ❌ |  |
| 70934 | Успешная регистрация организации Basketball | ❌ |  |
| 70935 | Успешная регистрация организации Soccer | ❌ |  |
| 70936 | Успешный вход зарегистрированного пользователя | ✅ | owner/01-signin.spec.ts |
| 70937 | Уже авторизованный пользователь при открытии Sign In | ❌ |  |
| 70938 | Неавторизованный пользователь перенаправляется на Sign In | ❌ |  |
| 70939 | Пустые поля | ❌ |  |
| 70940 | Невалидный формат email | ❌ |  |
| 70941 | Неверный  пароль | ✅ | owner/01-signin.spec.ts |
| 70942 | Несуществующий имайл | ❌ |  |
| 70943 | Forgot password | ⏭️ | owner/01-signin.spec.ts — пропущен: covers only navigation; request submission and confirmation are not checked yet |
| 70944 | Forgot password несуществующий юзер | ❌ |  |
| 70977 | Athlete по join-коду без email родителя | ❌ |  |
| 70979 | Athlete по join-коду с email родителя | ❌ |  |
| 70980 | Parent регистрация по имайлу | ❌ |  |
| 71013 | регистрация Coach по join-коду | ❌ |  |
| 71046 | Валидация на имайл | ❌ |  |
| 71047 | Athlete + existing parent | ❌ |  |
| 71048 | Пароль валидация | ❌ |  |
| 71081 | experied code | ❌ |  |
| 71082 | not active | ❌ |  |
| 71083 | fully used | ❌ |  |

### Manage user (0/6)

| Кейс | Название | Статус | Автотест |
|---|---|---|---|
| 72061 | View user | ❌ |  |
| 72062 | Edit user | ❌ |  |
| 72063 | Пароль валидация | ❌ |  |
| 72064 | active organization membership | ❌ |  |
| 72065 | Deactivate | ❌ |  |
| 74184 | Edit email | ❌ |  |

### Notification / email (0/8)

| Кейс | Название | Статус | Автотест |
|---|---|---|---|
| 71824 | Invation athlete | ❌ |  |
| 71825 | Invation coach | ❌ |  |
| 71826 | Evaluation reports | ❌ |  |
| 71827 | Shared practice plans | ❌ |  |
| 71828 | welcome email | ❌ |  |
| 71829 | Evaluation reports | ❌ |  |
| 71830 | shared plan | ❌ |  |
| 71831 | Forgot email | ❌ |  |

### Organization Profile (3/4)

| Кейс | Название | Статус | Автотест |
|---|---|---|---|
| 71116 | owner / admin view own organization | ⏭️ | owner/04-organization.spec.ts — пропущен: checks only that the page opens; organization profile data is not verified yet |
| 71922 | sys admin see all organization | ✅ | sysadmin/04-organization.spec.ts |
| 71924 | Edit own organization | ✅ | owner/04-organization.spec.ts |
| 71957 | Edit organization as sysadmin | ✅ | sysadmin/04-organization.spec.ts |

### Parent (2/8)

| Кейс | Название | Статус | Автотест |
|---|---|---|---|
| 71252 | Carete parent | ✅ | owner/07-parents.spec.ts |
| 71254 | Carete parent 2more athlete | ❌ |  |
| 71255 | Пароль валидация | ❌ |  |
| 71256 | edit parent | ✅ | owner/07-parents.spec.ts |
| 71257 | Delete parent | ❌ |  |
| 71258 | Parent check email | ❌ |  |
| 71426 | Activate from signup | ❌ |  |
| 71427 | Do not activate parent | ❌ |  |

### Plan (10/51)

| Кейс | Название | Статус | Автотест |
|---|---|---|---|
| 71639 | 007 Create Plan athlete | ❌ |  |
| 71640 | 008 Create Plan: filters athlete | ❌ |  |
| 71641 | 016 Create plan: notes | ✅ | coach/13-plans.spec.ts |
| 71642 | 001 View Plan athlete | ❌ |  |
| 71643 | 002 View Plan Parent | ✅ | parent/13-plans.spec.ts |
| 71644 | 014 View Plan coach | ❌ |  |
| 71645 | 020 View Plan  Owner / Admin | ✅ | owner/13-plans.spec.ts |
| 71646 | 011 Edit plan athlete | ❌ |  |
| 71647 | 006  Athlete Cant edit invited plan | ❌ |  |
| 71649 | 009 Delete plan athlete | ❌ |  |
| 71650 | 026 Edit  Plan  as Owner / Admin | ❌ |  |
| 71683 | Invite user to plan  by athlete | ❌ |  |
| 71716 | Invite multiple user to plan  by coach | ⏭️ | sysadmin/13-plans.spec.ts — пропущен: case is for coach and needs 5-10 real invites + "Invites saved" toast; the test only opened the dialog |
| 71717 | View invited plan as athlete | ❌ |  |
| 71718 | View invited plan as parent | ❌ |  |
| 71719 | View invited plan as coach | ❌ |  |
| 71752 | View edited plan | ❌ |  |
| 72600 | 025 Create Plan as Administrator / Owner | ✅ | owner/13-plans.spec.ts |
| 72601 | 019 Reorder drills via drag-and-drop | ❌ |  |
| 72602 | 030 Parent cannot create plan | ❌ |  |
| 72603 | Prebuilt checkbox visible only for System Administrator on own plan | ❌ |  |
| 72604 | 028 Non-sysadmin roles do not see Prebuilt checkbox | ✅ | owner/13-plans.spec.ts |
| 72605 | Prebuilt save blocked when plan contains Organization-scoped drill | ❌ |  |
| 72606 | Prebuilt plan appears in Prebuilt Plans for organizations of the same sport | ❌ |  |
| 72607 | Edit plan as System Administrator | ❌ |  |
| 72608 | 033 Parent is blocked from Edit screen | ❌ |  |
| 72609 | 004 Athlete cannot edit a plan they were only invited to | ✅ | athlete/13-plans.spec.ts |
| 72610 | 021 CHECK: Coach can edit a plan they were only invited to (documented divergence) | ❌ |  |
| 72611 | Prebuilt checkbox available to System Administrator on own plan in Edit | ✅ | sysadmin/13-plans.spec.ts |
| 72612 | System Administrator does not see Prebuilt checkbox on a plan they did not create | ❌ |  |
| 72613 | 027 Non-sysadmin roles do not see Prebuilt checkbox in Edit | ❌ |  |
| 72614 | Unchecking Prebuilt removes plan from Prebuilt everywhere | ✅ | sysadmin/13-plans.spec.ts |
| 72615 | Prebuilt save blocked when plan contains Organization-scoped drill (Edit) | ❌ |  |
| 72616 | 022 Prebuilt Plans tab visible to Coach | ❌ |  |
| 72617 | 026 Prebuilt Plans and Org Plans tabs visible to Administrator / Owner / System Administrator | ✅ | sysadmin/13-plans.spec.ts |
| 72618 | 023 Search by plan name filters only the active tab | ❌ |  |
| 72619 | 000 Empty tab shows empty state, not another user's plans | ❌ |  |
| 72620 | 018 Opening own plan row navigates to view screen, not edit | ❌ |  |
| 72621 | 013 Opening invited plan row navigates to view screen | ❌ |  |
| 72622 | 002 Athlete and Parent do not see Org Plans tab | ✅ | athlete/13-plans.spec.ts, parent/13-plans.spec.ts |
| 72623 | 015 Coach does not see Org Plans tab | ❌ |  |
| 72624 | 032 Parent does not see Prebuilt Plans tab | ❌ |  |
| 72625 | 005 Athlete sees Prebuilt Plans tab, Parent does not | ❌ |  |
| 72627 | 029 CHECK: Duplicating a Prebuilt plan creates a custom copy on My Plans, original unchanged | ❌ |  |
| 72628 | 017 Duplicate creates a copy with exact name format | ❌ |  |
| 72630 | System Administrator can duplicate a plan when acting as Owner in an organization | ❌ |  |
| 72631 | 003 Athlete cannot duplicate a plan | ❌ |  |
| 72632 | 031 Parent cannot duplicate a plan | ❌ |  |
| 72717 | Invite on prebuild plan | ❌ |  |
| 72750 | 030  Create own plan with private drill | ❌ |  |
| 72783 | Sysy admin create personal plan | ❌ |  |

### Roles (9/16)

| Кейс | Название | Статус | Автотест |
|---|---|---|---|
| 71360 | Soccer card | ❌ |  |
| 71818 | Home page | ✅ | coach/02-homepage.spec.ts |
| 71821 | homepage | ✅ | athlete/02-homepage.spec.ts |
| 71822 | homepage | ✅ | parent/02-homepage.spec.ts |
| 71823 | Home page | ✅ | owner/02-homepage.spec.ts |
| 71843 | Permission | ✅ | owner/90-permissions.spec.ts |
| 71844 | Permission | ✅ | coach/90-permissions.spec.ts |
| 71845 | Permission | ✅ | athlete/90-permissions.spec.ts |
| 71846 | Permission | ✅ | parent/90-permissions.spec.ts |
| 71889 | Permission | ✅ | sysadmin/90-permissions.spec.ts |
| 72667 | Workout drills come from every mapped drill on Primary Development Focus skills, no duplicates | ❌ |  |
| 72668 | No workout shows empty state | ❌ |  |
| 72674 | [NEW] Coach Home: quick actions set without Add Drill | ❌ |  |
| 72679 | [NEW] Home page (System Administrator) | ❌ |  |
| 73162 | Drill/ skill | ❌ |  |
| 74719 | Permission TO OTHER ORG | ❌ |  |

### Score Card Template (3/5)

| Кейс | Название | Статус | Автотест |
|---|---|---|---|
| 71292 | Create Template | ✅ | owner/11-scorecard-templates.spec.ts |
| 71293 | Create Template with 2+ category | ✅ | owner/11-scorecard-templates.spec.ts |
| 71294 | Delete template | ❌ |  |
| 71327 | Edit template | ❌ |  |
| 71393 | Make inactive | ✅ | owner/11-scorecard-templates.spec.ts |

### Skill (1/5)

| Кейс | Название | Статус | Автотест |
|---|---|---|---|
| 71785 | view skill lab | ❌ |  |
| 71832 | Search | ❌ |  |
| 71833 | Filter | ❌ |  |
| 71834 | Пагниация | ❌ |  |
| 74217 | Create  skill | ✅ | owner/09-skills.spec.ts |

### Team (1/5)

| Кейс | Название | Статус | Автотест |
|---|---|---|---|
| 71851 | Create team | ✅ | owner/08-teams.spec.ts |
| 71852 | Create team non lacrose | ❌ |  |
| 71854 | Create inactive | ❌ |  |
| 71855 | Delete team | ❌ |  |
| 71856 | Delete team with athlete and code | ❌ |  |

## 2 version

### Import athlete (0/29)

| Кейс | Название | Статус | Автотест |
|---|---|---|---|
| 74319 | Download CSV template — скачивание шаблона без запуска импорта (alt course 2a) | ❌ |  |
| 74324 | Team и position в CSV сопоставляются регистронезависимо | ❌ |  |
| 74326 | Email принадлежит деактивированному атлету в этой организации — строка пропускается | ❌ |  |
| 74327 | Пропущенные (skip) строки не учитываются ни в success, ни в fail счётчике тостера | ❌ |  |
| 74328 | Fail-строки: пропущены обязательные поля | ❌ |  |
| 74329 | Fail-строка: Невалидный формат email атлета | ❌ |  |
| 74330 | Fail-строка: Неизвестное значение gender (не Female/Male/Non-binary/Other) | ❌ |  |
| 74331 | Fail-строка: Неизвестное значение position (не существует в организации) | ❌ |  |
| 74332 | Fail-строка: Неизвестное значение team (не существует в организации) | ❌ |  |
| 74333 | Fail-строка: Email атлета повторяется повторно в этом же файле | ❌ |  |
| 74334 | Fail-строка: Email атлета принадлежит логину Coach/Parent/другому не-athlete логину | ❌ |  |
| 74335 | Fail-строка: parent_email совпадает с email атлета в этой же строке | ❌ |  |
| 74336 | Fail-строка: parent_email принадлежит логину, который не является parent-only (например, тот же email — Coach/Athlete) | ❌ |  |
| 74337 | Невалидный формат | ❌ |  |
| 74339 | Backend не откатывает успешные строки при наличии fail-строк в том же файле | ❌ |  |
| 74340 | Все поля Parent пустые — атлет добавлен без опекуна | ❌ |  |
| 74341 | Parent уже существует и поля не затираются | ❌ |  |
| 74342 | Частично заполненные поля Parent (например, указан parent_first_name, но пуст parent_email) — строка fail | ❌ |  |
| 74343 | parent_email совпадает с существующим parent-only логином — связывание без создания нового | ❌ |  |
| 74344 | создаётся новый parent-логин и отправляется приглашение | ❌ |  |
| 74346 | Импорт CSV со 101 строкой данных — поведение при превышении лимита | ❌ |  |
| 74347 | Импорт CSV только с заголовком, без строк данных (0 строк) | ❌ |  |
| 74404 | Email принадлежит деактивированному атлету в другой организации — строка пропускается(clone) | ❌ |  |
| 74437 | Все поля Parent пустые — атлет добавлен без опекуна в другую организацю | ❌ |  |
| 74472 | 1 athlete in 2 org | ❌ |  |
| 74474 | 1 athlete in 2 org + manual | ❌ |  |
| 74507 | Частично заполненные поля Athlete | ❌ |  |
| 74508 | Different Parent in different organization | ❌ |  |
| 74541 | Second Parent | ❌ |  |

### Other changed (0/8)

| Кейс | Название | Статус | Автотест |
|---|---|---|---|
| 74368 | Существующий атлет не может присоединиться ко второй организации через Easy Join (UC-1a) | ❌ |  |
| 74438 | к импортированному добавить родителя | ❌ |  |
| 74439 | сделать ev атлету | ❌ |  |
| 74473 | add manual athlete | ❌ |  |
| 74680 | Add manual + import | ❌ |  |
| 74681 | add coach | ❌ |  |
| 74683 | Athlete уже существует в другой организации | ❌ |  |
| 74685 | 2 athlete different orgs | ❌ |  |

### Switch organization (0/12)

| Кейс | Название | Статус | Автотест |
|---|---|---|---|
| 74351 | Athlete с одной активной организацией — контрол показывает только название, без списка | ❌ |  |
| 74352 | Athlete с двумя и более активными организациями — клик по контролу открывает список | ❌ |  |
| 74353 | Роль Coach не видит контрол переключения организации | ❌ |  |
| 74354 | Роль Parent не видит контрол переключения организации | ❌ |  |
| 74355 | Роль Owner не видит контрол переключения организации | ❌ |  |
| 74356 | Роль Administrator не видит контрол переключения организации | ❌ |  |
| 74358 | Контрол расположен внизу Athlete-сайдбара, над профилем, и всегда показывает текущую организацию | ❌ |  |
| 74363 | Браузер запоминает последнее успешное переключение | ❌ |  |
| 74364 | Выбор организации, которая деактивировала атлета | ❌ |  |
| 74365 | После ошибки "You don't have access to this organization." пользователь остаётся на экране с актуальным контекстом предыдущей организации | ❌ |  |
| 74366 | Вход с нового устройства/браузера без запомненного выбора — контекст по умолчанию: первая добавленная организация | ❌ |  |
| 74574 | Роль Sys admin не видит контрол переключения организации(clone) | ❌ |  |

### Sysadmin switch organization (0/2)

| Кейс | Название | Статус | Автотест |
|---|---|---|---|
| 74607 | Sysadmin see all organization | ❌ |  |
| 74684 | Браузер запоминает последнее успешное переключение(clone) | ❌ |  |

### (без раздела) (0/1)

| Кейс | Название | Статус | Автотест |
|---|---|---|---|
| 74686 | Проверить соответствие дизайну/верстке | ❌ |  |

## (автоматический кейс)

### Logout (1/1)

| Кейс | Название | Статус | Автотест |
|---|---|---|---|
| 74820 | should logout as owner | ✅ | owner/99-auth.spec.ts |
