import Link from 'next/link';
import Placeholder from '@/components/Placeholder';
import { getAllPosts, formatPostDate } from '@/lib/blog';

export default function LatestPosts() {
  const posts = getAllPosts().slice(0, 3);

  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <h2 className="font-display text-3xl font-bold tracking-tight text-stone-900">
        Журнал
      </h2>
      <div className="mt-8 grid gap-8 md:grid-cols-3">
        {posts.length > 0
          ? posts.map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`} className="group">
                <Placeholder
                  label={post.title}
                  gradient={post.gradient}
                  aspect="landscape"
                />
                <p className="mt-3 text-xs text-stone-400">
                  {formatPostDate(post.date)}
                </p>
                <h3 className="mt-1 text-lg font-semibold text-stone-900 group-hover:text-stone-600">
                  {post.title}
                </h3>
                <p className="mt-1 text-sm text-stone-500 line-clamp-2">
                  {post.excerpt}
                </p>
              </Link>
            ))
          : Array.from({ length: 3 }).map((_, i) => (
              <div key={i}>
                <Placeholder
                  label="Скоро здесь появятся истории"
                  gradient="from-slate-700 to-stone-900"
                  aspect="landscape"
                />
              </div>
            ))}
      </div>
      <div className="mt-10 text-center">
        <Link
          href="/blog"
          className="inline-flex h-10 items-center rounded-md border border-stone-300 px-6 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100"
        >
          Все посты
        </Link>
      </div>
    </section>
  );
}
