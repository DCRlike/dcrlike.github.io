# Dorian's ink

一个使用 React、TypeScript、Markdown、GFM 与 LaTeX 构建的静态个人博客，可直接部署到 GitHub Pages。

这份 README 是博客的完整维护手册。日常更新文章和页面时，通常只需要编辑 `content` 目录下的 Markdown 文件。

如果你只想开始写一篇新文章，先看 [博客写作教程](./WRITING_GUIDE.md)：它提供可直接复制的模板、Markdown 写法、图片处理方式和发布前清单。准备上线时请看 [GitHub Pages 部署教程](./DEPLOYMENT.md)。

## 1. 本地运行

环境要求：Node.js 22.13 或更高版本。

```bash
npm install
npm run dev
```

打开终端输出的本地地址。默认一般为 `http://localhost:3000`；如果端口被占用，开发服务器会显示实际地址。

常用命令：

```bash
npm run dev      # 启动本地开发服务，修改后自动刷新
npm run build    # 生成静态站点并检查所有页面
npx tsc --noEmit # 只进行 TypeScript 类型检查
npm run lint     # 检查代码
npm run format   # 格式化代码
```

## 2. 项目结构

```text
content/
├── pages/
│   ├── home.md       # 主页
│   ├── about.md      # About 页面
│   ├── projects.md   # Projects 页面
│   └── links.md      # Links 页面
└── posts/            # 每篇博客文章一个 .md 文件

app/
├── globals.css       # 全站颜色、排版、卡片和响应式样式
├── layout.tsx        # 网站标题、简介和社交分享信息
├── page.tsx          # 主页框架
├── about/page.tsx
├── projects/page.tsx
├── links/page.tsx
└── posts/[slug]/page.tsx

components/
├── site-header.tsx   # 顶部名称、导航、深色模式
├── site-footer.tsx   # 页脚、GitHub、邮箱、RSS
├── home-markdown.tsx # 主页 Markdown 的特殊渲染规则
└── page-markdown.tsx # 独立页面 Markdown 的特殊渲染规则

public/
├── favicon.svg       # 浏览器标签图标
├── og.png            # 分享到社交平台时使用的预览图
└── fonts/            # Satoshi 字体及授权说明
```

## 3. 建议的首次修改顺序

第一次把博客改成自己的内容时，建议依次完成：

1. 修改 `content/pages/home.md` 中的姓名、位置、GitHub 和主页介绍。
2. 修改 `content/pages/about.md` 中的个人经历、学校、工具和社交链接。
3. 修改 `content/pages/projects.md` 中的项目名称、简介和仓库地址。
4. 修改 `content/pages/links.md` 中的友链及本站信息。
5. 修改 `components/site-header.tsx` 中的 `Dorian's ink`。
6. 修改 `components/site-footer.tsx` 中的版权、GitHub 和邮箱。
7. 修改 `app/layout.tsx` 中的网站标题、描述和分享文案。
8. 替换 `public/favicon.svg` 和 `public/og.png`。
9. 删除 `content/posts` 中不需要的示例文章，再添加自己的文章。

## 4. 修改主页

主页内容位于 `content/pages/home.md`。

文件开头的 frontmatter 控制个人资料：

```yaml
---
title: Dorian
description: 一个关于 Web、工程与思考的个人博客。
avatar: D
location: China / Shanghai
github: https://github.com/your-name
quote: 保持好奇，保持记录。
---
```

| 字段 | 用途 |
| --- | --- |
| `title` | 主页姓名 |
| `description` | 主页内容说明，目前也可作为维护备注 |
| `avatar` | 圆形头像中显示的文字，建议使用一个汉字或字母 |
| `location` | 姓名下方的位置 |
| `github` | GitHub 按钮地址 |
| `quote` | 主页底部绿色状态点旁的文字 |

主页正文由 `##` 二级标题分成左右两栏区块。左侧显示标题，右侧显示该标题下面的 Markdown 内容。

### 自动文章列表

不要删除以下标记：

```md
## Posts

{{posts}}
```

`{{posts}}` 会自动读取 `content/posts` 中的全部文章，并按日期从新到旧生成列表。可以移动整个 Posts 区块来改变它在主页中的位置。

### 主页教育卡片

Education 使用 Markdown 引用块生成卡片：

```md
> ### 学校名称
>
> 专业或方向
>
> September 2021 - Present
>
> `UNI`
```

最后一行的 `UNI` 会成为卡片右侧的半透明大字，可以替换为学校缩写。

### 主页技能标签

Skills 使用 Markdown 表格。反引号包裹的内容会显示为标签：

```md
| Category | Skills |
| --- | --- |
| Web | `React` `TypeScript` `CSS` |
| Tools | `Git` `Docker` `Linux` |
```

## 5. 写博客文章

面向写作者的完整步骤、可复制模板和常见问题请见 [博客写作教程](./WRITING_GUIDE.md)。下面保留快速参考。

在 `content/posts` 中创建一个 `.md` 文件。文件名就是文章 URL，例如 `content/posts/my-first-post.md` 对应 `/posts/my-first-post`。

文章会被自动发现，不需要修改 TypeScript。首页列表按照 `date` 从新到旧排序。

### 文章模板

```md
---
title: 文章标题
excerpt: 显示在首页和分享信息中的简短摘要
date: 2026-09-01
readingTime: 5 min read
tags: [React, Markdown]
---

这里开始写正文。

## 二级标题

普通段落支持 **粗体**、*斜体*、~~删除线~~ 和 [链接](https://example.com)。

### 三级标题

> 这是一段引用。

- 无序列表
- 第二项

1. 有序列表
2. 第二项
```

| 字段 | 是否必填 | 用途 |
| --- | --- | --- |
| `title` | 是 | 文章标题 |
| `excerpt` | 是 | 首页摘要和页面描述 |
| `date` | 是 | 发布时间，必须使用 `YYYY-MM-DD` |
| `readingTime` | 建议 | 阅读时间，例如 `5 min read` |
| `tags` | 是 | 标签数组，第一个标签会显示在文章标题上方 |

注意事项：

- 文件名建议只使用小写英文字母、数字和连字符。
- 不要创建两个同名文件。
- `date` 应保持 `YYYY-MM-DD` 格式，否则排序可能不符合预期。
- 修改文件名会改变文章 URL，已经发布的旧链接会失效。

### 代码块

````md
```tsx
export function Hello() {
  return <p>Hello</p>;
}
```
````

### 表格

```md
| Name | Value |
| --- | --- |
| React | 19 |
| TypeScript | 5 |
```

### LaTeX 公式

行内公式：

```md
欧拉恒等式是 $e^{i\pi} + 1 = 0$。
```

独立公式：

```md
$$
\int_{-\infty}^{+\infty} e^{-x^2} \, dx = \sqrt{\pi}
$$
```

公式由 KaTeX 渲染。Markdown 中的反斜杠应保留，不需要写成 JavaScript 字符串的双反斜杠。

### 图片

把图片放进 `public/images`，然后在文章中使用：

```md
![图片说明](../images/example.jpg)
```

文章位于 `/posts/...` 下，所以站内图片推荐使用 `../images/文件名`。也可以直接使用完整的 HTTPS 图片地址。

## 6. 修改 About 页面

编辑 `content/pages/about.md`。

- frontmatter 中的 `title` 是页面标题。
- `description` 用作浏览器和搜索引擎的页面描述。
- 每个 `##` 二级标题都会自动出现在左侧目录中。
- Tools、Education、Experience 可以继续使用 Markdown 表格。
- Social Networks 使用无序列表，会被渲染成两列链接卡片。
- About Blog 中的引用块会被渲染成说明卡片。

添加社交链接示例：

```md
- [GitHub — 代码与开源项目](https://github.com/your-name)
- [Email — 联系我](mailto:you@example.com)
```

## 7. 修改 Projects 页面

编辑 `content/pages/projects.md`。frontmatter 中的 `intro` 会显示在大标题下方，每个 `##` 二级标题会成为左侧目录项。

项目使用引用块表示：

```md
> ### [🚀 Project Name](https://github.com/your-name/project)
>
> 一句话介绍这个项目解决了什么问题。
>
> `React` `TypeScript` `Open Source`
```

- `###` 后面的内容是项目名称和链接。
- 标题开头可以放一个 Emoji 作为图标。
- 中间段落是项目简介。
- 最后一行的反引号内容会显示为技术标签。
- 新增项目时复制完整的引用块即可。

## 8. 修改 Links 页面

编辑 `content/pages/links.md`。

普通友链使用无序列表，会自动显示为两列卡片：

```md
- [站点名称](https://example.com/) — 一句话介绍
```

`Apply Links` 中的 `site-info` 代码块会被转换成可以点击复制的本站信息卡片：

````md
```site-info
Name: Your Blog
Desc: 你的博客简介
Link: https://your-name.github.io/your-repo/
Avatar: https://your-name.github.io/your-repo/avatar.png
```
````

请把其中的名称、简介、博客地址和头像地址全部换成自己的信息。

## 9. 修改网站名称、导航和页脚

Markdown 控制页面内容，但以下全站元素由 React 组件控制。

### 顶部网站名称与导航

编辑 `components/site-header.tsx`：

- 修改 `Dorian's ink` 网站名称。
- 修改 `aria-label` 中的姓名。
- 如需增加或删除导航项，同时修改桌面端的 `main-nav` 和移动端的 `mobile-nav`。

导航地址应通过 `sitePath`、`pagePath` 或 `postPath` 生成，不要直接写死 GitHub Pages 的仓库前缀。

### 页脚

编辑 `components/site-footer.tsx`，修改版权年份、姓名、GitHub 地址和邮箱。

当前 RSS 图标暂时链接到主页文章区，并没有生成真正的 RSS 文件；不需要时可以删除。当前搜索图标也只是跳转到主页文章列表，还没有全文搜索功能。

## 10. 修改网站标题、SEO 和分享图片

编辑 `app/layout.tsx`，修改：

- `title.default`：默认网站标题。
- `title.template`：子页面标题格式。
- `description`：默认站点描述。
- `openGraph.title` 和 `openGraph.description`：社交分享文案。
- `twitter.title` 和 `twitter.description`：X/Twitter 分享文案。
- 图片的 `alt` 文本。

资源文件：

```text
public/favicon.svg # 浏览器图标
public/og.png      # 社交分享图，建议尺寸 1200 × 630
```

替换文件时保持文件名不变即可。如果更改文件名，还需要同步修改 `app/layout.tsx`。

## 11. 修改颜色、字体和布局

全站样式位于 `app/globals.css`。

浅色主题变量位于 `:root`，深色主题变量位于 `.dark`：

```css
:root {
  --background: hsl(210 33% 99%);
  --foreground: hsl(240 10% 3.9%);
  --muted: hsl(240 4.8% 95%);
  --muted-foreground: hsl(240 3.8% 28.1%);
  --primary: hsl(200 29% 45%);
  --border: hsl(240 5.9% 88%);
  --highlight: #659eb9;
}
```

| 变量 | 用途 |
| --- | --- |
| `--background` | 页面背景 |
| `--foreground` | 主要文字 |
| `--muted` | 卡片和标签背景 |
| `--muted-foreground` | 次要文字 |
| `--primary` | 链接、强调和交互颜色 |
| `--border` | 边框颜色 |
| `--highlight` | 页面顶部渐变和头像强调色 |

修改主题时应同时调整 `:root` 与 `.dark`，并检查文字和背景是否有足够对比度。

当前字体是 Satoshi，文件位于 `public/fonts`，加载声明位于 `app/globals.css` 顶部。替换字体时：

1. 把新的字体文件放到 `public/fonts`。
2. 修改 `@font-face` 中的文件地址和字体名称。
3. 修改 `body` 的 `font-family`。
4. 确认字体授权允许网页使用，并保留相应授权文件。

主要布局类：

- `.page-frame`：全站最大宽度和左右留白。
- `.site-header`：吸顶导航。
- `.profile-hero`：主页头像和姓名。
- `.home-content`：主页正文宽度。
- `.profile-section`：主页左右两栏区块。
- `.content-page-layout`：About、Projects、Links 的目录和正文。
- `.article-page`：文章正文宽度。
- `@media`：移动端和平板布局。

## 12. 更换为真实头像

目前主页头像是 `home.md` 中 `avatar` 字段指定的文字：

```yaml
avatar: D
```

如果要使用图片：

1. 把正方形图片放到 `public/avatar.jpg`，建议至少 256 × 256 像素。
2. 在 `app/page.tsx` 中把 `profile-avatar` 的文字 `<div>` 替换为 `<img>`。
3. 保留 `profile-avatar` 类名，并在 `app/globals.css` 中为它增加 `object-fit: cover` 和适当内边距。

## 13. GitHub Pages 发布

项目通过 `.github/workflows/deploy.yml` 自动发布到 [https://dcrlike.github.io/](https://dcrlike.github.io/)。完整的首次设置、日常发布、手动重试、回滚和故障排查步骤请见 [GitHub Pages 部署教程](./DEPLOYMENT.md)。

首次发布：

1. 使用 `DCRlike/dcrlike.github.io` 仓库。
2. 把项目推送到该仓库的 `main` 分支。
3. 打开仓库的 **Settings → Pages**。
4. 将 **Source** 设置为 **GitHub Actions**。
5. 再次推送代码，或在 **Actions** 页面手动运行 `Deploy blog to GitHub Pages`。

工作流会自动安装依赖、读取仓库路径、生成带正确资源前缀的静态页面、上传 `dist/client` 并发布。

因此不要在 Markdown、React 或 CSS 中手动写死 `/Blog` 这样的仓库名。站内页面链接应使用现有路径工具，静态资源放到 `public`。

### 自定义域名

如果使用自定义域名，请在 GitHub Pages 设置中配置域名和 DNS。如需在本地构建时指定正式站点地址，可以使用：

```bash
NEXT_PUBLIC_SITE_URL=https://example.com npm run build
```

## 14. 发布前检查清单

- [ ] `home.md` 中的姓名、位置、GitHub 和简介已替换。
- [ ] About 中的学校、经历、工具和社交链接已替换。
- [ ] Projects 中所有示例仓库地址已替换。
- [ ] Links 中的友链和 `site-info` 已替换。
- [ ] Header 和 Footer 中的名称、邮箱、GitHub 已替换。
- [ ] `app/layout.tsx` 中的 SEO 文案已替换。
- [ ] `favicon.svg` 和 `og.png` 已替换。
- [ ] 示例文章已删除或改写。
- [ ] 所有外部链接都能正常打开。
- [ ] 浅色与深色模式下都能正常阅读。
- [ ] 手机宽度下没有横向滚动。
- [ ] `npx tsc --noEmit` 通过。
- [ ] `npm run build` 通过。

## 15. 内容与代码的边界

通常只改 Markdown：

- 主页文字、教育、技能。
- About、Projects、Links 的页面内容。
- 新增、删除和修改博客文章。

需要改 React/TypeScript：

- 顶部导航结构。
- 页脚链接和图标。
- 新增全新的页面类型。
- 新增 Markdown 特殊语法或交互组件。

需要改 CSS：

- 颜色与字体。
- 间距、宽度、卡片和动画。
- 桌面端与移动端布局。

只要保留现有 Markdown 约定，就可以在不改页面组件的情况下持续维护整个博客。
