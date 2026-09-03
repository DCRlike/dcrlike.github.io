import type { Metadata } from 'next';

import { ContentPageShell } from '@/components/content-page-shell';
import { PageMarkdown } from '@/components/page-markdown';
import { getPage } from '@/lib/pages';

const page = getPage('links');
export const metadata: Metadata = { title: page.title, description: page.description };

export default function LinksPage() {
  return (
    <ContentPageShell title={page.title} intro={page.intro} toc={page.toc}>
      <PageMarkdown source={page.content} variant="links" />
    </ContentPageShell>
  );
}
