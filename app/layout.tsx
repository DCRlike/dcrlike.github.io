import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import 'katex/dist/katex.min.css';
import './globals.css';

const geistSans = Geist({ variable: '--font-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-mono', subsets: ['latin'] });
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
const ogImage = new URL('og.png', `${siteUrl.replace(/\/?$/, '/')}`);

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Dorian's ink", template: "%s — Dorian's ink" },
  description: '一个关于 Web、工程与思考的个人博客。支持 Markdown 与 LaTeX。',
  openGraph: { title: "Dorian's ink", description: '写代码，也写下代码之外的事。', type: 'website', images: [{ url: ogImage, width: 1200, height: 630, alt: "Dorian's ink" }] },
  twitter: { card: 'summary_large_image', title: "Dorian's ink", description: '写代码，也写下代码之外的事。', images: [ogImage] },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
