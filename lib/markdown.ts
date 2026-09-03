export type Frontmatter = Record<string, string | string[]>;

export function parseMarkdownFile(source: string) {
  const normalized = source.replace(/\r\n/g, '\n');
  if (!normalized.startsWith('---\n')) return { data: {} as Frontmatter, content: normalized.trim() };

  const end = normalized.indexOf('\n---\n', 4);
  if (end === -1) return { data: {} as Frontmatter, content: normalized.trim() };

  const data: Frontmatter = {};
  for (const line of normalized.slice(4, end).split('\n')) {
    const separator = line.indexOf(':');
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    const rawValue = line.slice(separator + 1).trim();
    if (rawValue.startsWith('[') && rawValue.endsWith(']')) {
      data[key] = rawValue.slice(1, -1).split(',').map((item) => stripQuotes(item.trim())).filter(Boolean);
    } else {
      data[key] = stripQuotes(rawValue);
    }
  }

  return { data, content: normalized.slice(end + 5).trim() };
}

function stripQuotes(value: string) {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

export function headingId(heading: string) {
  return heading
    .toLowerCase()
    .trim()
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function markdownToc(content: string) {
  return [...content.matchAll(/^##\s+(.+)$/gm)].map((match) => ({
    href: `#${headingId(match[1])}`,
    label: match[1].replace(/\s+#+$/, '').trim(),
  }));
}
