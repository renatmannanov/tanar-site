import Link from 'next/link';
import Placeholder from '@/components/Placeholder';
import { formatPostDate, type BlogPost } from '@/lib/blog';

export default function BlogCard({ post }: { post: BlogPost }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group transition-transform duration-300 hover:-translate-y-1"
      data-testid="blog-card"
    >
      <Placeholder label={post.title} gradient={post.gradient} aspect="landscape" />
      <p className="mt-3 text-xs text-stone-500/60">
        {formatPostDate(post.date)}
      </p>
      <h3 className="mt-2 text-base font-medium text-stone-900 group-hover:text-stone-600">
        {post.title}
      </h3>
      <p className="mt-1 text-sm text-stone-500 line-clamp-2">
        {post.excerpt}
      </p>
      <p className="mt-2 text-xs font-medium text-stone-400">
        {post.author}
      </p>
    </Link>
  );
}
