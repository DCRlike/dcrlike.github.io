import { isValidElement, type ReactNode } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import { ArrowRight } from 'lucide-react';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';

import { headingId } from '@/lib/markdown';
import { pagePath, postPath, sitePath } from '@/lib/paths';
import { posts } from '@/lib/posts';

function textOf(children: ReactNode): string {
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(textOf).join('');
  if (isValidElement<{ children?: ReactNode }>(children)) return textOf(children.props.children);
  return '';
}

function HomePosts() {
  return (
    <>
      <ul className="compact-post-list">
        {posts.map((post) => (
          <li key={post.slug}>
            <a className="compact-post" href={postPath(post.slug)}>
              <time dateTime={post.date}>{post.displayDate.replaceAll('.', '-')}</time>
              <span className="compact-post-title">{post.title}</span>
              <ArrowRight className="compact-post-arrow" size={16} aria-hidden="true" />
            </a>
          </li>
        ))}
      </ul>
      <a className="small-button align-end" href={sitePath('/#posts')}><span>More posts</span><ArrowRight size={16} /></a>
    </>
  );
}

const components: Components = {
  p({ children }) {
    if (textOf(children).trim() === '{{posts}}') return <HomePosts />;
    return <p>{children}</p>;
  },
  a({ href = '', children }) {
    const external = /^https?:\/\//.test(href);
    const target = href.startsWith('/') ? pagePath(href) : href;
    return (
      <a className="small-button" href={target} target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined}>
        <span>{children}</span><ArrowRight size={16} />
      </a>
    );
  },
};

function sectionsFrom(source: string) {
  const matches = [...source.matchAll(/^##\s+(.+)$/gm)];
  return matches.map((match, index) => {
    const title = match[1].replace(/\s+#+$/, '').trim();
    const start = (match.index ?? 0) + match[0].length;
    const end = matches[index + 1]?.index ?? source.length;
    return { title, id: headingId(title), source: source.slice(start, end).trim() };
  });
}

export function HomeMarkdown({ source }: { source: string }) {
  return (
    <div className="home-content home-markdown">
      {sectionsFrom(source).map((section) => (
        <section className="profile-section" id={section.id} key={section.id}>
          <div className="section-title"><h2>{section.title}</h2></div>
          <div className={`section-content home-section-${section.id}`}>
            <ReactMarkdown components={components} remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{section.source}</ReactMarkdown>
          </div>
        </section>
      ))}
    </div>
  );
}
