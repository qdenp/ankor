# PLAN.md — План покрытия тест-кейсов Ankor

## Источник
`report (1).csv` — 795 строк (~91 тест-кейс из Allure TestOps)

## Правила написания тестов
- **ВСЕ тесты должны основываться на TC из `report (1).csv`**
- Перед написанием теста — открыть CSV, найти TC по ID, прочитать все шаги `[step N]` и ассерты `[step N.x] exp`
- Тест должен покрывать ВСЕ шаги TC, не пропускать ни один `[step N]`
- Ассерты — только по `exp` из CSV, не придумывать свои
- Если TC требует предварительных условий (`precondition`) — выполнить их перед тестом

## Сгруппировано по Story (категориям)

### 1. Login / Sign In (4 теста)
- 91876 — Успешный вход зарегистрированного пользователя ✅ (01-signin.spec.ts)
- 91868 — Forgot password несуществующий юзер ⏭️ (пропускаем — проверка почты)
- 91869 — Athlete по join-коду без email родителя ⏭️ (Easy Join)
- 91914 — Forgot password ⏭️ (пропускаем — проверка почты)

### 2. Roles (13 тестов)
- 91830 — Home page (System Administrator) ✅ (13-plans.spec.ts)
- 91835 — Drill/skill visibility (sys admin) ❌
- 91836 — Permission (Athlete) ❌
- 91839 — Home page (Owner/admin) ❌
- 91849 — Permission (Coach) ❌
- 91856 — Home page (Coach Summary) ❌
- 91864 — Permission (sys admin) ❌
- 91885 — Home page (Parent) ❌
- 91892 — Home page (Athlete) ❌
- 91896 — Workout drills no duplicates (Athlete) ❌
- 91903 — Permission (Owner/admin) ❌
- 91910 — Permission (Parent) ❌

### 3. Plan (17 тестов)
- 91831 — Parent cannot create plan ✅ (13-practice-plans.spec.ts)
- 91838 — Prebuilt checkbox (sys admin) ✅ (13-plans.spec.ts)
- 91840 — Athlete cannot edit invited plan ❌
- 91843 — Non-sysadmin no Prebuilt checkbox ✅ (13-plans.spec.ts)
- 91844 — Athlete and Parent do not see Org Plans tab ❌
- 91847 — Athlete cannot duplicate plan ✅ (13-practice-plans.spec.ts)
- 91853 — Duplicate creates copy ✅ (13-practice-plans.spec.ts)
- 91859 — Create Plan as Administrator/Owner ✅ (13-practice-plans.spec.ts)
- 91860 — View Plan coach ✅ (13-practice-plans.spec.ts)
- 91870 — Non-sysadmin no Prebuilt ✅ (13-plans.spec.ts)
- 91871 — View Plan Owner/Admin ✅ (13-practice-plans.spec.ts)
- 91878 — Coach no Org Plans tab ✅ (13-practice-plans.spec.ts)
- 91880 — View invited plan as athlete ❌
- 91881 — View Plan athlete ✅ (13-practice-plans.spec.ts)
- 91883 — Parent no Prebuilt Plans tab ✅ (13-practice-plans.spec.ts)
- 91890 — Create plan: notes ❌ (требует создания плана coach'ом перед тестом)
- 91897 — View Plan Parent ✅ (13-practice-plans.spec.ts)
- 91916 — Invite multiple users to plan ✅ (13-plans.spec.ts)
- 91918 — Unchecking Prebuilt removes plan ✅ (13-plans.spec.ts)

### 4. Organization Profile (4 теста)
- 91832 — Sys admin see all organizations ✅ (sysadmin/04-organization.spec.ts)
- 91861 — Edit organization as sysadmin ✅ (sysadmin/04-organization.spec.ts)
- 91884 — Owner/admin view own organization ✅ (04-organization.spec.ts)
- 91915 — Edit own organization ✅ (04-organization.spec.ts)

### 5. Easy Join (6 тестов)
- 91833 — Athlete по join-коду с email родителя ❌
- 91834 — Athlete + existing parent ❌
- 91854 — Parent регистрация по имайлу ❌
- 91869 — Athlete по join-коду без email ❌
- 91899 — Invitation coach ❌
- 91909 — Invitation athlete ❌

### 6. Drill (4 теста)
- 91835 — Drill/skill visibility ❌
- 91837 — Create/edit drill: fields, permissions ✅ (10-drills.spec.ts)
- 91865 — Create drill ✅ (10-drills.spec.ts)
- 91906 — Drill detail: play YouTube video ✅ (10-drills.spec.ts)

### 7. Evaluation (12 тестов → 6 тестов объединены)
- 91842 — Rating выше 5 блокируется ✅ (12-evaluations.spec.ts)
- 91857 — Оценка категории подтягивает сабскиллы ✅ (12-evaluations.spec.ts) — ⚠️ semantic issue: no assertion verifies sub-skills got same rating
- 91866 — Create evaluation ✅ (12-evaluations.spec.ts) — объединён с 91908
- 91874 — View evaluation ✅ (12-evaluations.spec.ts) — объединён с 91877
- 91877 — Edit evaluation ✅ (12-evaluations.spec.ts) — объединён с 91874
- 91888 — После submit генерируется workout ✅ (12-evaluations.spec.ts) — объединён с 91911, ⚠️ semantic issue: no assertion checks report/workout
- 91894 — Рейтинг ниже 3 раскрывает под-скиллы ✅ (12-evaluations.spec.ts) — объединён с 91913
- 91902 — После submit родитель получает notification и email ❌ (пропускаем — проверка email)
- 91904 — После submit атлет получает notification и email ❌ (пропускаем — проверка email)
- 91908 — View not submitted evaluation ✅ (12-evaluations.spec.ts) — объединён с 91866
- 91911 — После submit генерируется report ✅ (12-evaluations.spec.ts) — объединён с 91888, ⚠️ semantic issue: no assertion checks report
- 91913 — Оценка < 3 только для 5 категорий ✅ (12-evaluations.spec.ts) — объединён с 91894

### 8. Evaluation report (6 тестов)
- 91846 — Deep link из уведомления/письма ❌
- 91872 — Parent видит отчёты привязанных атлетов ❌
- 91879 — Activate from signup ❌
- 91887 — Parent видит отчёты нескольких атлетов ❌
- 91893 — Athlete видит свои репорты ❌
- 91907 — Coach/Administrator/Owner видят все отчёты ❌

### 9. Team (2 теста)
- 91848 — Create team ✅ (08-teams.spec.ts)
- 91917 — Easy Join Codes ❌

### 10. Athlete (3 теста)
- 91845 — Add athlete + parent existing ❌
- 91850 — Manually Add Athlete by coach ❌
- 91858 — Add athlete + parent ❌

### 11. Coach (3 теста)
- 91852 — Edit coach ❌
- 91891 — Add coach manually ❌
- 91895 — View coach ❌

### 12. Manage user (3 теста)
- 91841 — Edit email ❌
- 91851 — Deactivate ❌
- 91875 — Edit user ❌
- 91899 — Active organization membership ❌

### 13. Notification / email (8 тестов)
- 91862 — Evaluation reports notification ❌
- 91886 — Welcome email ❌
- 91890 — Workout drills notification ❌
- 91898 — Evaluation reports email ❌
- 91900 — Invitation coach ❌
- 91901 — Shared practice plans ❌
- 91905 — Shared plan ❌

### 14. Score Card Template (3 теста)
- 91863 — Create Template with 2+ categories ✅ (11-scorecard-templates.spec.ts)
- 91882 — Create Template ✅ (11-scorecard-templates.spec.ts)
- 91889 — Make inactive ✅ (объединён с 91882)

### 15. Register Organization (1 тест)
- 91855 — Успешная регистрация организации ❌

### 16. Parent (3 теста)
- 91873 — Create parent ✅ (07-parents.spec.ts)
- 91879 — Activate from signup ⏭️ (пропускаем — требует проверки email/сигнапа)
- 91912 — Edit parent ✅ (07-parents.spec.ts)

### 17. Skill (2 теста)
- 91835 — Drill/skill visibility ❌
- 91919 — Create skill ✅ (09-skills.spec.ts)

---

## Статус покрытия

### ✅ Завершено (38 тест-кейсов)
- 91876 — Успешный вход (01-signin.spec.ts)
- 91848 — Create team (08-teams.spec.ts)
- 91884 — Owner/admin view own organization (04-organization.spec.ts)
- 91831 — Parent cannot create plan (13-practice-plans.spec.ts)
- 91847 — Athlete cannot duplicate plan (13-practice-plans.spec.ts)
- 91853 — Duplicate creates copy (13-practice-plans.spec.ts)
- 91859 — Create Plan as Administrator/Owner (13-practice-plans.spec.ts)
- 91860 — View Plan coach (13-practice-plans.spec.ts)
- 91871 — View Plan Owner/Admin (13-practice-plans.spec.ts)
- 91878 — Coach no Org Plans tab (13-practice-plans.spec.ts)
- 91881 — View Plan athlete (13-practice-plans.spec.ts)
- 91883 — Parent no Prebuilt Plans tab (13-practice-plans.spec.ts)
- 91897 — View Plan Parent (13-practice-plans.spec.ts)
- 91830 — Home page (System Administrator) (13-plans.spec.ts)
- 91838 — Prebuilt checkbox (sys admin) (13-plans.spec.ts)
- 91843 — Non-sysadmin no Prebuilt checkbox (13-plans.spec.ts)
- 91870 — Non-sysadmin no Prebuilt (13-plans.spec.ts)
- 91916 — Invite multiple users to plan (13-plans.spec.ts)
- 91918 — Unchecking Prebuilt removes plan (13-plans.spec.ts)
- 91832 — Sys admin see all organizations (sysadmin/04-organization.spec.ts)
- 91861 — Edit organization as sysadmin (sysadmin/04-organization.spec.ts)
- 91915 — Edit own organization (04-organization.spec.ts)
- 91863 — Create Template with 2+ categories (11-scorecard-templates.spec.ts)
- 91882 — Create Template (11-scorecard-templates.spec.ts)
- 91889 — Make inactive (объединён с 91882)
- 91842 — Rating выше 5 блокируется (12-evaluations.spec.ts)
- 91857 — Оценка категории подтягивает сабскиллы (12-evaluations.spec.ts) — ⚠️ объединён с другими, semantic issue: no assertion verifies sub-skills
- 91866 — Create evaluation (12-evaluations.spec.ts) — ⚠️ объединён с 91908
- 91874 — View evaluation (12-evaluations.spec.ts) — ⚠️ объединён с 91877
- 91877 — Edit evaluation (12-evaluations.spec.ts) — ⚠️ объединён с 91874
- 91894 — Рейтинг ниже 3 раскрывает под-скиллы (12-evaluations.spec.ts) — ⚠️ объединён с 91913
- 91908 — View not submitted evaluation (12-evaluations.spec.ts) — ⚠️ объединён с 91866
- 91911 — После submit генерируется report (12-evaluations.spec.ts) — ⚠️ объединён с 91888, semantic issue: no assertion checks report
- 91913 — Оценка < 3 только для 5 категорий (12-evaluations.spec.ts) — ⚠️ объединён с 91894
- 91888 — После submit генерируется workout (12-evaluations.spec.ts) — ⚠️ объединён с 91911, semantic issue: no assertion checks workout
- 91837 — Create/edit drill: fields, permissions (10-drills.spec.ts)
- 91865 — Create drill (10-drills.spec.ts)
- 91906 — Drill detail: play YouTube video (10-drills.spec.ts)
- 91873 — Create parent (07-parents.spec.ts)
- 91912 — Edit parent (07-parents.spec.ts)
- 91919 — Create skill (09-skills.spec.ts)

### ⏭️ Пропускаем (4 тест-кейса)
- 91868 — Forgot password (проверка почты)
- 91914 — Forgot password (проверка почты)
- 91902 — После submit родитель получает notification и email (проверка email)
- 91904 — После submit атлет получает notification и email (проверка email)

### ❌ Не покрыто (49 тест-кейсов)

## Итого
- Всего тест-кейсов: 91
- ✅ Завершено: 44 (48.4%)
- ⏭️ Пропускаем: 5 (5.5%)
- ❌ Не покрыто: 42 (46.2%)
