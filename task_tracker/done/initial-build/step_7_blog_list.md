# Шаг 7: Blog list

> Зависит от: шаги 1–4 (заглушка `src/lib/blog.ts` создана в step_4)
> Статус: [ ] pending

## Задача

Страница `/blog` — листинг постов из `content/blog/*.mdx`. Переписать утилиту `blog.ts` с заглушки step_4 на реальное чтение файлов.

### Порядок действий

1. **Директория `content/blog/`** — создать:
   ```bash
   mkdir -p content/blog
   ```
   Добавить один placeholder-пост `content/blog/_placeholder.mdx` чтобы `fs.readdirSync` не упал на пустой директории и чтобы проверить фильтр underscore:
   ```mdx
   ---
   title: "Заглушка"
   slug: "_placeholder"
   date: "2026-01-01"
   excerpt: "Этот пост не отображается — фильтруется по underscore-префиксу."
   gradient: "from-stone-600 to-stone-900"
   author: "Команда Tanar"
   ---

   Placeholder.
   ```
   Файлы с именем начинающимся с `_` игнорируются утилитой. В step_9 `_placeholder.mdx` будет удалён.

2. **Перезаписать `src/lib/blog.ts`** полностью (сейчас там заглушка из step_4):
   ```ts
   import fs from 'node:fs';
   import path from 'node:path';
   import matter from 'gray-matter';

   export type BlogFrontmatter = {
     title: string;
     slug: string;
     date: string;        // ISO YYYY-MM-DD
     excerpt: string;
     gradient: string;
     author: string;
   };

   export type BlogPost = BlogFrontmatter & {
     content: string;
   };

   const CONTENT_DIR = path.join(process.cwd(), 'content', 'blog');

   export function getAllPosts(): BlogPost[] {
     if (!fs.existsSync(CONTENT_DIR)) return [];
     const files = fs.readdirSync(CONTENT_DIR).filter(f =>
       f.endsWith('.mdx') && !f.startsWith('_')
     );
     const posts = files.map(file => {
       const raw = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf8');
       const { data, content } = matter(raw);
       return { ...(data as BlogFrontmatter), content };
     });
     return posts.sort((a, b) => b.date.localeCompare(a.date));
   }

   export function getPostBySlug(slug: string): BlogPost | undefined {
     return getAllPosts().find(p => p.slug === slug);
   }

   export function getAllPostSlugs(): string[] {
     return getAllPosts().map(p => p.slug);
   }

   export function formatPostDate(iso: string): string {
     const d = new Date(iso);
     return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
   }
   ```

   **Важно:** API (`getAllPosts`, `formatPostDate`) сохранён из step_4. Компонент `LatestPosts` на главной продолжит работать без изменений.

3. **Компонент `src/components/BlogCard.tsx`**:
   - Props: `post: BlogPost`
   - Link на `/blog/${post.slug}`
   - `<Placeholder aspect="landscape" label={post.title} gradient={post.gradient}>`
   - Под картинкой: дата (`formatPostDate(post.date)`, маленький opacity-60), заголовок (H3), excerpt, автор
   - `data-testid="blog-card"`
   - Server component

4. **Страница `src/app/blog/page.tsx`**:
   ```tsx
   import { getAllPosts } from '@/lib/blog';
   import BlogCard from '@/components/BlogCard';

   export const metadata = {
     title: 'Журнал — Tanar',
     description: 'Истории, гайды и заметки команды Tanar.',
   };

   export default function BlogPage() {
     const posts = getAllPosts();
     // ...
   }
   ```
   - Hero-блок: заголовок "Журнал", подзаголовок "Истории с высоты"
   - Grid `<BlogCard>`: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`, gap-6
   - Если `posts.length === 0` — сообщение "Скоро здесь появятся истории"
   - Server component

5. **LatestPosts из step_4 — НЕ трогать**. `getAllPosts()` теперь возвращает реальные посты (когда они появятся в step_9), компонент автоматически покажет их без изменений.

6. **Playwright spec `e2e/blog-list.spec.ts`**:
   - Тест 1: `/blog` → ответ 200, заголовок "Журнал" виден
   - Тест 2: на странице отсутствует текст "Заглушка" (placeholder-пост отфильтрован)
   - Тест 3: либо видны `data-testid="blog-card"`, либо сообщение "Скоро" — оба валидны на этом этапе (до step_9)
   - Тест 4: нет page errors / console errors (тот же паттерн что в step_5 через `page.on('pageerror')`)

7. Коммит:
   ```bash
   git add -A
   git commit -m "feat(blog): real blog.ts with MDX reader, BlogCard, /blog page"
   ```

## Команды для верификации

```bash
npm run typecheck
npm run lint
npm run build
npx playwright test e2e/blog-list.spec.ts
```

Файлы:

```bash
test -f src/lib/blog.ts
test -f src/components/BlogCard.tsx
test -f src/app/blog/page.tsx
test -f content/blog/_placeholder.mdx
test -f e2e/blog-list.spec.ts

# blog.ts — реальная имплементация, не заглушка
grep -q "node:fs" src/lib/blog.ts
grep -q "gray-matter" src/lib/blog.ts
grep -q "getAllPosts" src/lib/blog.ts
grep -q "getPostBySlug" src/lib/blog.ts
grep -q "getAllPostSlugs" src/lib/blog.ts
grep -q "startsWith('_')" src/lib/blog.ts
```

## Критерии готовности

- [ ] `src/lib/blog.ts` — реальная имплементация с `node:fs` + gray-matter
- [ ] API (`getAllPosts`, `formatPostDate`) сохранён — LatestPosts из step_4 не трогаем
- [ ] BlogCard + /blog страница
- [ ] Пост с префиксом `_` не появляется в списке (проверяется grep-ом фильтра)
- [ ] Playwright blog-list.spec.ts проходит
- [ ] Нет page/console errors на `/blog`
- [ ] Build, typecheck, lint зелёные
- [ ] Коммит
