'use client';

import { Menu, Moon, Search, Sun, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { pagePath, sitePath } from '@/lib/paths';

export function SiteHeader() {
  const [dark, setDark] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const nextDark = stored ? stored === 'dark' : prefersDark;
    setDark(nextDark);
    document.documentElement.classList.toggle('dark', nextDark);

    let lastY = window.scrollY;
    const onScroll = () => {
      const currentY = window.scrollY;
      setScrolled(currentY > 16);
      setHidden(currentY > 96 && currentY > lastY && !menuOpen);
      lastY = currentY;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [menuOpen]);

  function toggleTheme() {
    const nextDark = !dark;
    setDark(nextDark);
    document.documentElement.classList.toggle('dark', nextDark);
    window.localStorage.setItem('theme', nextDark ? 'dark' : 'light');
  }

  return (
    <header id="top" className={`site-header ${menuOpen ? 'expanded' : ''} ${scrolled ? 'not-top' : ''} ${hidden ? 'is-hidden' : ''}`}>
      <a className="wordmark" href={sitePath('/')} aria-label="Dorian 的博客首页">Dorian&apos;s ink</a>
      <div className="header-actions">
        <nav className="main-nav" aria-label="主导航">
          <a href={sitePath('/#posts')}>Blog</a>
          <a href={pagePath('/projects')}>Projects</a>
          <a href={pagePath('/links')}>Links</a>
          <a href={pagePath('/about')}>About</a>
          <a className="search-link" href={sitePath('/#posts')} aria-label="Search"><Search size={20} /></a>
        </nav>
        <button className="icon-button" type="button" onClick={toggleTheme} aria-label={dark ? '切换到浅色模式' : '切换到深色模式'}>{dark ? <Sun size={20} /> : <Moon size={20} />}</button>
        <button className="icon-button menu-button" type="button" onClick={() => setMenuOpen((open) => !open)} aria-label={menuOpen ? '关闭菜单' : '打开菜单'}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
      </div>
      <div className="mobile-nav" aria-hidden={!menuOpen}>
        <a href={sitePath('/#posts')} onClick={() => setMenuOpen(false)}>Blog</a>
        <a href={pagePath('/projects')} onClick={() => setMenuOpen(false)}>Projects</a>
        <a href={pagePath('/links')} onClick={() => setMenuOpen(false)}>Links</a>
        <a href={pagePath('/about')} onClick={() => setMenuOpen(false)}>About</a>
      </div>
    </header>
  );
}
