import { getAllPosts } from '@/lib/blog';
import BlogCard from '@/components/BlogCard';

export const metadata = {
  title: 'Журнал — Tanar',
  description: 'Истории, гайды и заметки команды Tanar.',
};

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-12 text-center">
        <h1 className="font-display text-4xl font-bold tracking-tight text-stone-900 sm:text-5xl">
          Журнал
        </h1>
        <p className="mt-4 text-lg text-stone-500">
          Истории с высоты
        </p>
      </div>

      {posts.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map(post => (
            <BlogCard key={post.slug} post={post} />
          ))}
        </div>
      ) : (
        <p className="text-center text-stone-400">
          Скоро здесь появятся истории
        </p>
      )}
    </section>
  );
}
