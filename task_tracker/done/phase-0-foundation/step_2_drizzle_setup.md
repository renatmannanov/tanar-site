# Шаг 2: Drizzle setup (клиент, env, drizzle-kit)

> Зависит от: шаг 1
> Статус: [ ] pending

## Задача

Подключить Drizzle ORM + drizzle-kit, описать конфиг, env-переменные, создать клиент. Схема и миграции — в шаге 3.

### Зависимости

```powershell
npm install drizzle-orm postgres
npm install -D drizzle-kit
```

(`postgres` — драйвер `postgres.js`, рекомендуется Drizzle для serverless и обычных нод.)

### Env

`.env.example` в корне:
```
# Local Postgres via docker-compose
DATABASE_URL=postgres://tanar:tanar_dev_pw@localhost:5432/tanar_dev
DATABASE_TEST_URL=postgres://tanar:tanar_test_pw@localhost:5433/tanar_test
```

`.env.local` (gitignored) — туда же эти значения. Создаётся вручную; в плане не комитим.

### `drizzle.config.ts` в корне

```ts
import { defineConfig } from 'drizzle-kit';
import dotenv from 'dotenv';

// Next.js сам грузит .env.local, но drizzle-kit CLI этого не знает — грузим явно.
// (По умолчанию `dotenv/config` читает `.env`, а наш канон — `.env.local`.)
dotenv.config({ path: '.env.local' });

export default defineConfig({
  schema: './src/core/db/schema.ts',          // создастся в шаге 3
  out: './src/core/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  strict: true,
  verbose: true,
});
```

Установить `dotenv`:
```powershell
npm install -D dotenv
```

### Клиент `src/core/db/client.ts`

Создать **папку и файл сейчас**, даже если папка `src/core/` ещё не оформлена (полноценный скелет модулей — шаг 4):

```ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');

const queryClient = postgres(url, { max: 10 });
export const db = drizzle(queryClient);
```

В шаге 3 этот клиент будет привязан к схеме (`drizzle(queryClient, { schema })`).

### `package.json` scripts

Добавить:
```json
"db:generate": "drizzle-kit generate",
"db:migrate": "drizzle-kit migrate",
"db:push": "drizzle-kit push"
```

(`db:migrate` — применяет SQL-миграции к БД из DATABASE_URL. `db:generate` — генерирует SQL после изменения схемы. `db:push` — для быстрых итераций в dev, не использовать в проде.)

### `.gitignore`

Не игнорировать `src/core/db/migrations/` — миграции должны быть в git.

## Тесты

- В этом шаге БД ещё пустая (схемы нет). Smoke — `db:generate` без схемы ничего не сгенерит; проверка реального коннекта — в шаге 3 после первой миграции.
- Существующие e2e не затрагиваются.

## Команды для верификации (PowerShell)

```powershell
npm run db:up                                        # должен быть запущен из шага 1
# проверить что drizzle-kit видит конфиг (без схемы выдаст пустоту, но не упадёт):
npx drizzle-kit --help                                # отрабатывает без ошибок
# проверить что клиент компилируется:
npm run typecheck                                     # без ошибок (db/client.ts не имеет неразрешённых импортов)
```

## Критерии готовности

- [ ] `drizzle-orm`, `postgres`, `drizzle-kit`, `dotenv` установлены (drizzle-kit и dotenv в devDependencies)
- [ ] `drizzle.config.ts` в корне создан, `schema` указывает на `./src/core/db/schema.ts`
- [ ] `.env.example` в корне создан с двумя переменными
- [ ] `src/core/db/client.ts` создан и экспортирует `db`
- [ ] `package.json` имеет `db:generate`, `db:migrate`, `db:push`
- [ ] `npm run typecheck` зелёный
- [ ] Коммит: `chore(db): wire drizzle orm + drizzle-kit + env`
