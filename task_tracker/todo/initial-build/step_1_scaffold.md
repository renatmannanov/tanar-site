# Шаг 1: Scaffold проекта

> Зависит от: нет (первый шаг)
> Статус: [ ] pending

## Задача

Инициализировать Next.js 15 проект с TypeScript + Tailwind v3 + ESLint + Playwright + MDX.

### Порядок действий

1. **Бэкап наших файлов** (create-next-app может их затереть) — в родительскую папку, кросс-платформенно без зависимости от `/tmp`:
   ```bash
   BACKUP_DIR="../tanar-backup-$(date +%s)"
   mkdir -p "$BACKUP_DIR"
   cp CLAUDE.md "$BACKUP_DIR/CLAUDE.md"
   cp ralph.ps1 "$BACKUP_DIR/ralph.ps1"
   cp -r task_tracker "$BACKUP_DIR/task_tracker"
   echo "Backup at $BACKUP_DIR" > .backup-location
   ```
   Путь сохраняется в `.backup-location` чтобы шаг 4 знал откуда восстанавливать.

2. **Переключиться на ветку `dev`** (создать если нет):
   ```bash
   git checkout -b dev 2>/dev/null || git checkout dev
   ```

3. **Запустить `create-next-app@15`** (фиксируем версию — план написан под Next 15):
   ```bash
   npx create-next-app@15 . --yes --typescript --tailwind --eslint --app --src-dir --turbopack --import-alias "@/*" --use-npm --no-git
   ```
   - `.` — инициализация в текущей папке
   - `--yes` применяется к create-next-app (не задаёт вопросов)
   - `--no-git` — уже инициализирован

4. **Восстановить наши файлы из бэкапа — только если они отсутствуют или изменены**:
   ```bash
   BACKUP_DIR=$(cat .backup-location | sed 's/^Backup at //')

   # CLAUDE.md — восстановить если отсутствует или отличается
   if [ ! -f CLAUDE.md ] || ! cmp -s CLAUDE.md "$BACKUP_DIR/CLAUDE.md"; then
     cp "$BACKUP_DIR/CLAUDE.md" CLAUDE.md
     echo "Restored CLAUDE.md"
   fi

   # ralph.ps1 — аналогично
   if [ ! -f ralph.ps1 ] || ! cmp -s ralph.ps1 "$BACKUP_DIR/ralph.ps1"; then
     cp "$BACKUP_DIR/ralph.ps1" ralph.ps1
     echo "Restored ralph.ps1"
   fi

   # task_tracker — восстановить ТОЛЬКО если папка отсутствует (не перезаписывать progress.md с learnings!)
   if [ ! -d task_tracker ]; then
     cp -r "$BACKUP_DIR/task_tracker" task_tracker
     echo "Restored task_tracker"
   fi

   # Убрать метафайл бэкапа
   rm -f .backup-location
   ```
   Ключевая идея: **task_tracker НЕ перезаписываем** — там progress.md с наработками текущих итераций. Только восстанавливаем если папки вообще нет.

5. **Принудительно понизить Tailwind до v3** (v4 ещё нестабилен для автоматизированных прогонов — нет `tailwind.config.ts`, другой синтаксис конфига):
   ```bash
   npm uninstall tailwindcss @tailwindcss/postcss
   # Удалить v4-style postcss config (Next подхватит .mjs раньше .js и упрётся в удалённый пакет):
   rm -f postcss.config.mjs
   npm install -D tailwindcss@^3 postcss autoprefixer @tailwindcss/typography
   npx tailwindcss init -p
   ```
   После этого должен остаться `postcss.config.js` (создан `tailwindcss init -p`), а `postcss.config.mjs` должен отсутствовать.
   После этого:
   - `tailwind.config.ts` создастся в корне
   - `postcss.config.js` создастся в корне
   - `src/app/globals.css` нужно отредактировать — убрать `@import "tailwindcss"` (v4-синтаксис), заменить на три директивы v3:
     ```css
     @tailwind base;
     @tailwind components;
     @tailwind utilities;
     ```
   - В `tailwind.config.ts` в `content` прописать:
     ```ts
     content: ['./src/**/*.{ts,tsx,mdx}', './content/**/*.{md,mdx}']
     ```
   - Подключить typography плагин:
     ```ts
     plugins: [require('@tailwindcss/typography')]
     ```

6. **Установить Playwright**:
   ```bash
   npm install --save-dev @playwright/test
   npx playwright install --with-deps chromium
   ```

7. **Установить MDX** (для блога):
   ```bash
   npm install next-mdx-remote gray-matter
   ```

8. **Создать директорию `e2e/`** (create-next-app её не создаёт):
   ```bash
   mkdir -p e2e
   ```

9. **Создать `playwright.config.ts`** в корне проекта:
   ```ts
   import { defineConfig } from '@playwright/test';

   export default defineConfig({
     testDir: './e2e',
     fullyParallel: false,
     forbidOnly: !!process.env.CI,
     retries: 0,
     workers: 1,
     use: {
       baseURL: 'http://localhost:3000',
       trace: 'on-first-retry',
     },
     webServer: {
       command: 'npm run dev',
       url: 'http://localhost:3000',
       reuseExistingServer: true,
       timeout: 120_000,
       stdout: 'ignore',
       stderr: 'pipe',
     },
     projects: [
       { name: 'chromium', use: { channel: 'chromium' } },
     ],
   });
   ```
   `reuseExistingServer: true` — критично: между итерациями Ralph'а dev-сервер может остаться запущенным, иначе EADDRINUSE.

10. **Добавить npm-скрипты** в `package.json` (дополнить существующие):
    ```json
    "typecheck": "tsc --noEmit",
    "test:e2e": "playwright test"
    ```

11. **Проверить `.gitignore`** — должен содержать (дополнить если чего-то нет):
    ```
    node_modules
    .next
    .env*
    playwright-report
    test-results
    /tmp
    # Ralph runner artifacts — логи прогонов и метаданные бэкапов
    /logs
    .backup-location
    ../tanar-backup-*
    ```
    Логи Ralph'а (`logs/ralph-run-*.log`, `logs/ralph-summary-*.tsv`) — полезны для разбора, но не нужны в репозитории.

12. **Закоммитить scaffold**:
    ```bash
    git add -A
    git commit -m "chore: scaffold next.js 15 + tailwind v3 + playwright + mdx"
    ```

## Команды для верификации

Все должны вернуть exit 0:

```bash
npm run typecheck
npm run lint
npm run build
git log --oneline -1
```

Проверка версий и файлов:

```bash
# Версия Next.js — должна быть 15.x
node -e "const v=require('./package.json').dependencies.next; if(!/^\^?15\./.test(v)){process.exit(1)}"

# Версия Tailwind — должна быть 3.x
node -e "const v=require('./package.json').devDependencies.tailwindcss; if(!/^\^?3\./.test(v)){process.exit(1)}"

# Typography установлен
node -e "require('./package.json').devDependencies['@tailwindcss/typography'] || process.exit(1)"

# Playwright и MDX установлены
node -e "const d=require('./package.json').devDependencies; d['@playwright/test'] || process.exit(1)"
node -e "const d=require('./package.json').dependencies; (d['next-mdx-remote'] && d['gray-matter']) || process.exit(1)"

# Файлы конфигов существуют
test -f next.config.ts -o -f next.config.js -o -f next.config.mjs
test -f tailwind.config.ts -o -f tailwind.config.js
test -f postcss.config.js
# postcss.config.mjs НЕ должен существовать (v4-конфиг удалён в шаге 5)
test ! -f postcss.config.mjs
test -f playwright.config.ts

# Структура Next.js
test -d src/app
test -f src/app/layout.tsx
test -f src/app/page.tsx

# Наши файлы сохранены
test -f CLAUDE.md
test -f ralph.ps1
test -d task_tracker
test -f task_tracker/todo/initial-build/PLAN.md

# e2e директория создана
test -d e2e
```

## Критерии готовности

- [ ] На ветке `dev`
- [ ] `next@15.x` в dependencies
- [ ] `tailwindcss@3.x` в devDependencies
- [ ] `@tailwindcss/typography` в devDependencies
- [ ] `@playwright/test`, `next-mdx-remote`, `gray-matter` установлены
- [ ] `playwright.config.ts` с `reuseExistingServer: true`
- [ ] `tailwind.config.ts` + `postcss.config.js` существуют
- [ ] `postcss.config.mjs` отсутствует (v4-конфиг удалён)
- [ ] `src/app/globals.css` использует `@tailwind base/components/utilities` (v3-синтаксис)
- [ ] `e2e/` директория создана
- [ ] `.gitignore` содержит `/logs` и `.backup-location`
- [ ] CLAUDE.md, ralph.ps1, task_tracker/ на месте (не затёрты)
- [ ] `npm run build`, `npm run typecheck`, `npm run lint` — все exit 0
- [ ] Один коммит с scaffold
