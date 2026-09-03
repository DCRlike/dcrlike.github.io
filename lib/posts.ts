import { parseMarkdownFile } from '@/lib/markdown';

export type Post = {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  displayDate: string;
  readingTime: string;
  tags: string[];
  content: string;
};

function createPost(slug: string, source: string): Post {
  const { data, content } = parseMarkdownFile(source);
  const date = String(data.date ?? '');
  return {
    slug,
    title: String(data.title ?? slug),
    excerpt: String(data.excerpt ?? ''),
    date,
    displayDate: date.replaceAll('-', '.'),
    readingTime: String(data.readingTime ?? ''),
    tags: Array.isArray(data.tags) ? data.tags : [],
    content,
  };
}

const postFiles = import.meta.glob<string>('../content/posts/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
});

export const posts: Post[] = Object.entries(postFiles)
  .map(([path, source]) => createPost(path.split('/').pop()!.replace(/\.md$/, ''), source))
  .sort((a, b) => b.date.localeCompare(a.date));

export function getPost(slug: string) {
  return posts.find((post) => post.slug === slug);
}
