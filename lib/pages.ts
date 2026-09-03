import aboutRaw from '@/content/pages/about.md?raw';
import homeRaw from '@/content/pages/home.md?raw';
import linksRaw from '@/content/pages/links.md?raw';
import projectsRaw from '@/content/pages/projects.md?raw';
import { markdownToc, parseMarkdownFile } from '@/lib/markdown';

export type PageName = 'home' | 'about' | 'projects' | 'links';

const sources: Record<PageName, string> = {
  home: homeRaw,
  about: aboutRaw,
  projects: projectsRaw,
  links: linksRaw,
};

export function getPage(name: PageName) {
  const { data, content } = parseMarkdownFile(sources[name]);
  return {
    data,
    title: String(data.title ?? name),
    description: String(data.description ?? ''),
    intro: String(data.intro ?? ''),
    content,
    toc: markdownToc(content),
  };
}
