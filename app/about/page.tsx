import type { Metadata } from 'next';

import { ContentPageShell } from '@/components/content-page-shell';
import { PageMarkdown } from '@/components/page-markdown';
import { getPage } from '@/lib/pages';

const page = getPage('about');
export const metadata: Metadata = { title: page.title, description: page.description };

export default function AboutPage() {
  return (
    <ContentPageShell title={page.title} intro={page.intro} toc={page.toc}>
      <PageMarkdown source={page.content} variant="about" />
    </ContentPageShell>
  );
}
