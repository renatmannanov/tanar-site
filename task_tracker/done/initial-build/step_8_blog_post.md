# Шаг 8: Blog post page

> Зависит от: шаги 1–3, 7
> Статус: [ ] pending

## Задача

Страница `/blog/[slug]` — рендеринг одного MDX-поста. Типографика — ручная (Tailwind классы на конкретных тегах), **без `prose`**.

### Порядок действий

1. **Компоненты для MDX `src/components/mdx-components.tsx`**:
   - Кастомные рендереры для тегов, стили вручную (НЕ использовать `prose` — `@tailwindcss/typography` уже установлен, но мы его не применяем к постам, чтобы избежать конфликтов с нашей дизайн-системой):
     ```tsx
     import Placeholder from '@/components/Placeholder';
     import type { MDXComponents } from 'mdx/types';

     export const mdxComponents: MDXComponents = {
       h1: (props) => <h1 className="font-display text-4xl mt-12 mb-6" {...props} />,
       h2: (props) => <h2 className="font-display text-3xl mt-10 mb-4" {...props} />,
       h3: (props) => <h3 className="font-display text-2xl mt-8 mb-3" {...props} />,
       p: (props) => <p className="text-lg leading-relaxed mb-5 text-stone-700" {...props} />,
       a: (props) => <a className="underline decoration-stone-400 underline-offset-4 hover:decoration-stone-900" {...props} />,
       ul: (props) => <ul className="list-disc pl-6 mb-5 space-y-2" {...props} />,
       ol: (props) => <ol className="list-decimal pl-6 mb-5 space-y-2" {...props} />,
       li: (props) => <li className="text-lg leading-relaxed text-stone-700" {...props} />,
       blockquote: (props) => <blockquote className="border-l-4 border-stone-300 pl-6 my-8 italic text-stone-600" {...props} />,
       img: ({ alt }) => <Placeholder aspect="landscape" label={alt || 'image'} className="my-8" />,
     };
     ```

   **НИКАКОГО `prose` класса** на странице поста. Типографика полностью управляется этими компонентами.

2. **Страница `src/app/blog/[slug]/page.tsx`**:
   ```tsx
   import { notFound } from 'next/navigation';
   import { MDXRemote } from 'next-mdx-remote/rsc';
   import Link from 'next/link';
   import { getPostBySlug, getAllPostSlugs, formatPostDate } from '@/lib/blog';
   import Placeholder from '@/components/Placeholder';
   import { mdxComponents } from '@/components/mdx-components';

   type Props = { params: Promise<{ slug: string }> };

   export async function generateStaticParams() {
     return getAllPostSlugs().map(slug => ({ slug }));
   }

   export async function generateMetadata({ params }: Props) {
     const { slug } = await params;                   // ← обязательный await
     const post = getPostBySlug(slug);
     if (!post) return { title: 'Пост не найден — Tanar' };
     return {
       title: `${post.title} — Tanar`,
       description: post.excerpt,
     };
   }

   export default async function BlogPostPage({ params }: Props) {
     const { slug } = await params;                   // ← обязательный await
     const post = getPostBySlug(slug);
     if (!post) notFound();

     return (
       <article>
         <div className="w-full">
           <Placeholder aspect="wide" label={post.title} gradient={post.gradient} />
         </div>
         <div className="max-w-3xl mx-auto px-6 py-12">
           <p className="text-sm text-stone-500 mb-4">
             {formatPostDate(post.date)} · {post.author}
           </p>
           <h1 className="font-display text-5xl mb-8">{post.title}</h1>
           <MDXRemote source={post.content} components={mdxComponents} />
           <Link href="/blog" className="inline-block mt-12 text-stone-600 hover:text-stone-900">
             ← Назад к журналу
           </Link>
         </div>
       </article>
     );
   }
   ```

3. **Обработка ошибок MDX**: если в пост случайно попал невалидный MDX — `MDXRemote` бросит на сборке. Это ок (fail-fast). Поэтому контент в step_9 должен быть валидным MDX (без неэкранированных `<`, `{` и т.п.).

4. **Playwright spec `e2e/blog-post.spec.ts`**:
   - Тест 1: `/blog/nonexistent` → 404
     ```ts
     const response = await page.goto('/blog/nonexistent');
     expect(response?.status()).toBe(404);
     ```
   - Без реальных slug'ов — реальная проверка в step_11 smoke-suite после step_9.

5. Коммит:
   ```bash
   git add -A
   git commit -m "feat(blog): /blog/[slug] MDX rendering with custom components"
   ```

## Команды для верификации

```bash
npm run typecheck
npm run lint
npm run build
npx playwright test e2e/blog-post.spec.ts
```

Файлы:

```bash
test -f "src/app/blog/[slug]/page.tsx"
test -f src/components/mdx-components.tsx
test -f e2e/blog-post.spec.ts

grep -q "MDXRemote" "src/app/blog/[slug]/page.tsx"
grep -q "generateStaticParams" "src/app/blog/[slug]/page.tsx"
# Двойной await
grep -c "await params" "src/app/blog/[slug]/page.tsx"   # ≥ 2

# НЕТ prose класса на странице и компонентах
! grep -q 'className="[^"]*prose' "src/app/blog/[slug]/page.tsx"
! grep -q 'className="[^"]*prose' src/components/mdx-components.tsx
```

## Критерии готовности

- [ ] `/blog/[slug]` рендерит MDX через next-mdx-remote
- [ ] Кастомные компоненты для тегов (включая замену `<img>` на Placeholder)
- [ ] `await params` ≥2 раз в page.tsx
- [ ] **Класс `prose` нигде не используется** (типографика вручную)
- [ ] `generateStaticParams` + `generateMetadata`
- [ ] 404 для несуществующего slug
- [ ] Playwright blog-post.spec.ts (минимум 404) проходит
- [ ] Build, typecheck, lint зелёные
- [ ] Коммит
