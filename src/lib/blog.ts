export type BlogPost = {
  title: string;
  slug: string;
  date: string;
  excerpt: string;
  gradient: string;
  author: string;
  content: string;
};

export function getAllPosts(): BlogPost[] {
  return [];
}

export function formatPostDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
