import { ArrowLeft } from 'lucide-react';

import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { sitePath } from '@/lib/paths';

type TocItem = {
  href: string;
  label: string;
};

export function ContentPageShell({
  title,
  intro,
  toc,
  children,
}: {
  title: string;
  intro?: string;
  toc: TocItem[];
  children: React.ReactNode;
}) {
  return (
    <div className="page-frame">
      <div className="highlight-gradient" aria-hidden="true" />
      <SiteHeader />

      <main className="content-page-layout">
        <aside className="page-toc" aria-label="页面目录">
          <a className="toc-back" href={sitePath('/')}>
            <ArrowLeft size={15} /> Back
          </a>
          <p>TABLE OF CONTENTS</p>
          <nav>
            {toc.map((item) => (
              <a key={item.href} href={item.href}>
                {item.label}
              </a>
            ))}
          </nav>
        </aside>

        <article className="content-document">
          <header className="content-page-header">
            <h1>{title}</h1>
            <div className="content-page-meta">
              <span>DoorChi&apos;s ink</span>
              <span aria-hidden="true">·</span>
              <span>持续更新</span>
            </div>
            {intro ? <p>{intro}</p> : null}
          </header>
          <div className="content-sections">{children}</div>
        </article>
      </main>

      <SiteFooter />
    </div>
  );
}

export function ContentSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="content-section" id={id}>
      <h2>
        <a href={`#${id}`}>{title}</a>
      </h2>
      {children}
    </section>
  );
}
