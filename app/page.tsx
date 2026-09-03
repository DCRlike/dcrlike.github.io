import { Code2, MapPin } from 'lucide-react';

import { HomeMarkdown } from '@/components/home-markdown';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { getPage } from '@/lib/pages';

const page = getPage('home');

export default function Home() {
  const name = String(page.data.title ?? 'DoorChi');
  const avatar = String(page.data.avatar ?? name.slice(0, 1));
  const location = String(page.data.location ?? 'China / Shanghai');
  const github = String(page.data.github ?? 'https://github.com/');
  const quote = String(page.data.quote ?? '保持好奇，保持记录。');

  return (
    <div className="page-frame">
      <div className="highlight-gradient" aria-hidden="true" />
      <SiteHeader />

      <main className="home-main">
        <section className="profile-hero">
          <div className="profile-avatar" aria-label={`${name} 的头像`}>
            {avatar}
          </div>
          <div className="profile-identity">
            <h1>{name}</h1>
            <div className="identity-links">
              <span>
                <MapPin size={20} aria-hidden="true" /> {location}
              </span>
              <a href={github} target="_blank" rel="noreferrer">
                <Code2 size={20} aria-hidden="true" /> GitHub
              </a>
            </div>
          </div>
        </section>

        <HomeMarkdown source={page.content} />

        <div className="quote-pill">
          <span className="status-dot" />
          <p>{quote}</p>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
