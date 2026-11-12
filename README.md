# Ankor — E2E-тесты

Автотесты веб-приложения **Ankor Athletics** на [Playwright](https://playwright.dev) + TypeScript.
Тесты гоняются против тестового стенда `https://d333afta2q6llv.cloudfront.net` под пятью ролями:
owner, sysadmin, coach, parent, athlete.

## Быстрый старт

Нужны: Node.js 24, Git. Для Allure-отчёта дополнительно Java.

```bash
npm ci                          # зависимости ровно по package-lock.json
npx playwright install chromium # браузер для тестов
```

**Учётные данные.** Скопируйте `.env.example` в **`.env.d333afta2q6llv`** (именно это имя читает `tests/config.ts`)
и заполните email/пароли пяти тестовых пользователей. Значения передаются лично, в git не коммитятся
(`.env.*` в `.gitignore`).

**Проверка, что всё настроено:**

```bash
npm run typecheck                                            # 0 ошибок
npx playwright test tests/specs/owner/02-homepage.spec.ts --project=owner --workers 1
```

## Запуск тестов

```bash
npm run test:owner        # одна роль: owner | sysadmin | coach | parent | athlete
npm run test:all          # все роли параллельно (~10 мин)
npm run test:owner -- --grep "should edit parent"   # один тест; "--" обязателен
npx playwright show-report reports/html/owner       # HTML-отчёт роли (у каждой роли своя папка)
# во время прогона: reports/progress.txt — сводка по ролям (N/M, ok/x/-, текущий тест, упавшие попытки)
```

- Перед каждым `npm run test:*` автоматически запускается `npm run typecheck`. При ошибке типов тесты не стартуют.
- Запуская файлы напрямую через `npx playwright test …`, всегда добавляйте `--project=<роль> --workers 1`.
  В конфиге `fullyParallel: true`: без `--workers 1` тесты пойдут параллельно, и logout из `99-auth`
  отзовёт сессию посреди соседнего теста.

## CI (GitHub Actions)

Workflow [.github/workflows/playwrightMain.yml](.github/workflows/playwrightMain.yml) запускается **только вручную**:
Actions → «E2E tests» → Run workflow (можно выбрать роли). Каждый прогон создаёт данные на общем стенде,
поэтому на push и PR он не срабатывает; два прогона одновременно не запускаются.

- Учётные данные тестовых пользователей — в GitHub Secrets (`ANKOR_OWNER_EMAIL`, `ANKOR_OWNER_PASSWORD`, … для всех пяти ролей).
- С секретом `ALLURE_TOKEN` результаты уходят в Allure TestOps (проект 366). Без него тесты идут без выгрузки.
- Логи ролей, трейсы упавших тестов и результаты Allure — в артефактах запуска.

## Как устроен проект

```
tests/
├── config.ts        # роли, таймауты, адреса страниц; читает .env.d333afta2q6llv
├── fixtures.ts      # loginAs(role), logout(), кэш сессий в tests/.auth/
├── pages/           # Page Objects — все локаторы и действия
├── setup/           # подготовка данных для нового стенда: npm run test:setup (не входит в test:all и CI)
└── specs/<роль>/    # тесты; папка = Playwright-проект = роль
```

- **Номера файлов** — пункты бокового меню: `02-homepage`, `04-organization` … `13-plans`;
  `90-permissions` — права роли, `99-auth` — выход, только у owner (всегда последний: logout отзывает сессию).
- **В тестах нет локаторов**: только методы и свойства Page Objects.
- **После перехода на страницу и после create/edit/delete** Page Object вызывает `waitForLoading()`:
  данные грузятся со спиннером, без ожидания тест читает пустую таблицу.
- **Номер тест-кейса** — первая строка теста: `await allure.allureId('71600')` (`test_case_id` из Allure TestOps,
  не allure_id). По нему TestOps записывает результат в кейс; тест без номера создаёт в TestOps новый кейс.

## Правила стенда — прочитать до первого прогона

- **Стенд и тестовые пользователи общие.** Не запускайте одну и ту же роль одновременно с коллегой:
  logout в `owner/99-auth` отзывает сессию пользователя на сервере и роняет чужой прогон.
- **Удалить можно только Teams и черновики оценок (In Progress).** Пользователей — только деактивировать
  (Manage Users), отчёты Evaluation Reports интерфейс удалить не даёт. Всё, что тест создал, остаётся на стенде.
  Поэтому записи создаёт только тест, который проверяет само создание; остальные переиспользуют существующие.
- **Не меняйте основных пользователей из `.env`** (имя, email, связи): на них держатся тесты ролей.

## Документы проекта

| Файл | Что в нём |
|---|---|
| [AGENTS.md](AGENTS.md) | Правила написания тестов — для людей и ИИ-агентов (GigaCode, Claude Code) |
| [.gigacode_vsc/skills/](.gigacode_vsc/skills/) | Процесс 01→04: анализ сценария → план шагов → код → ревью; чек-листы ревью |
| [PLAN.md](PLAN.md) | Покрытие тест-кейсов из TestOps |
| [REVIEW-PLAN.md](REVIEW-PLAN.md) | Ревью от 2026-11-11 и план исправлений: что сделано, что осталось |
| `report (1).csv` | Выгрузка тест-кейсов из Allure TestOps (неполная) |

## Allure TestOps

Тест-кейсы — в [rallyup.testops.cloud](https://rallyup.testops.cloud). Для MCP-интеграции агента
нужна пользовательская переменная окружения с вашим токеном:

```powershell
[Environment]::SetEnvironmentVariable('TESTOPS_AUTH_HEADER', 'api-token <ваш токен>', 'User')
```

После этого перезапустите VS Code. Токен выпускается в профиле TestOps; в файлы проекта его не писать.

## Текущее состояние

Ревью и большая часть исправлений сделаны в ноябре 2026. Что осталось
(ложные срабатывания в части тестов, противоречия в правилах, тестовые данные), — в [REVIEW-PLAN.md](REVIEW-PLAN.md).
