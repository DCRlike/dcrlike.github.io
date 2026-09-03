import { Code2, Mail, Rss } from 'lucide-react';

import { sitePath } from '@/lib/paths';

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div>
        <span>© 2026 Dorian</span>
        <span className="footer-note">Built with React &amp; TypeScript</span>
      </div>
      <div className="footer-links">
        <a href="https://github.com/" target="_blank" rel="noreferrer" aria-label="GitHub"><Code2 size={21} /></a>
        <a href="mailto:hello@example.com" aria-label="Email"><Mail size={21} /></a>
        <a href={sitePath('/#posts')} aria-label="RSS"><Rss size={21} /></a>
      </div>
    </footer>
  );
}
