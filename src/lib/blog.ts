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
