const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export function sitePath(path: string) {
  return `${basePath}${path}`;
}

export function pagePath(path: string) {
  if (path === '/') return sitePath('/');
  const extension = process.env.NODE_ENV === 'production' ? '.html' : '';
  return sitePath(`${path}${extension}`);
}

export function postPath(slug: string) {
  const extension = process.env.NODE_ENV === 'production' ? '.html' : '';
  return sitePath(`/posts/${slug}${extension}`);
}
