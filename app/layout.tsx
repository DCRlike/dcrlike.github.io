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
  title: { default: "DoorChi's ink", template: "%s — DoorChi's ink" },
  description:
    '一个关于后端、基础设施与技术探索的个人博客。支持 Markdown 与 LaTeX。',
  openGraph: {
    title: "DoorChi's ink",
    description: '记录后端、基础设施与计算机世界的探索。',
    type: 'website',
    images: [{ url: ogImage, width: 1200, height: 630, alt: "DoorChi's ink" }],
  },
  twitter: {
    card: 'summary_large_image',
    title: "DoorChi's ink",
    description: '记录后端、基础设施与计算机世界的探索。',
    images: [ogImage],
  },
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
