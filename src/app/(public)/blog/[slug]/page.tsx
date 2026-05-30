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
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return { title: 'Пост не найден — Tanar' };
  return {
    title: `${post.title} — Tanar`,
    description: post.excerpt,
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
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
