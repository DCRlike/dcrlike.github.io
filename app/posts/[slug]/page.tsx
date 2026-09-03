import type { Metadata } from 'next';
import { ArrowLeft, CalendarDays, Clock3 } from 'lucide-react';
import { notFound } from 'next/navigation';

import { MarkdownArticle } from '@/components/markdown-article';
import { SiteHeader } from '@/components/site-header';
import { sitePath } from '@/lib/paths';
import { getPost, posts } from '@/lib/posts';

export function generateStaticParams() { return posts.map((post) => ({ slug: post.slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  return { title: post.title, description: post.excerpt, openGraph: { title: post.title, description: post.excerpt, images: [] }, twitter: { card: 'summary', title: post.title, description: post.excerpt, images: [] } };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();
  return (
    <div className="page-frame"><div className="highlight-gradient" aria-hidden="true" /><SiteHeader /><main className="article-page">
      <a className="back-link" href={sitePath('/#posts')}><ArrowLeft size={15} aria-hidden="true" /> 返回文章列表</a>
      <header className="article-header">
        <div className="article-kicker">NOTE / {post.tags[0].toUpperCase()}</div><h1>{post.title}</h1><p>{post.excerpt}</p>
        <div className="article-meta"><span><CalendarDays size={14} />{post.displayDate}</span><span><Clock3 size={14} />{post.readingTime}</span></div>
      </header>
      <MarkdownArticle source={post.content} />
      <footer className="article-end"><span aria-hidden="true">∎</span><p>感谢阅读。愿这些笔记也能给你一点启发。</p><a href={sitePath('/#posts')}>继续浏览其他文章</a></footer>
    </main></div>
  );
}
