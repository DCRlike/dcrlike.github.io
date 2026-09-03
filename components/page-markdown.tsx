import { isValidElement, type ReactNode } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';

import { CopySiteInfo } from '@/components/copy-site-info';
import { headingId } from '@/lib/markdown';

function textOf(children: ReactNode): string {
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(textOf).join('');
  if (isValidElement<{ children?: ReactNode }>(children)) return textOf(children.props.children);
  return '';
}

const components: Components = {
  h2({ children }) {
    const label = textOf(children);
    const id = headingId(label);
    return <h2 id={id}><a href={`#${id}`}>{children}</a></h2>;
  },
  a({ href = '', children }) {
    const external = /^https?:\/\//.test(href);
    return <a href={href} target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined}>{children}</a>;
  },
  pre({ children }) {
    if (isValidElement<{ className?: string; children?: ReactNode }>(children) && children.props.className === 'language-site-info') {
      return <CopySiteInfo value={textOf(children.props.children).replace(/\n$/, '')} />;
    }
    return <pre>{children}</pre>;
  },
};

export function PageMarkdown({ source, variant }: { source: string; variant: 'about' | 'projects' | 'links' }) {
  return (
    <div className={`page-markdown page-markdown-${variant}`}>
      <ReactMarkdown components={components} remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{source}</ReactMarkdown>
    </div>
  );
}
