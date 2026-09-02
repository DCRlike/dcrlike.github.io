# Conch 文档站点

这是 Conch 的 Docusaurus 文档站点，提供简体中文与英文技术文档、技术博客、本地全文搜索和定制首页。

## 站点内容

中文内容按以下信息架构维护：

```text
docs/
├── getting-started/   # 快速开始、安装、核心概念与架构
├── user/              # Sandbox、Template、存储和网络等用户手册
├── examples/          # 基于真实使用场景整理的端到端示例
└── reference/         # Python SDK、接口、模块和实现参考

blog/                  # 中文技术博客
i18n/en/               # 英文文档、博客和界面翻译
```

侧边栏在 `sidebars.ts` 中使用显式列表维护。Front Matter 中的 `sidebar_position` 不会覆盖该顺序；新增页面需要出现在导航中时，应同时更新 `sidebars.ts`。

## 本地运行

需要 Node.js 18 或更高版本。

```bash
# 首次安装依赖
npm install

# 启动开发服务器，默认访问 http://localhost:3000
npm start

# 构建全部 locale，并生成搜索索引
npm run build

# 预览生产构建产物，需先完成构建
npm run serve
```

本地搜索会索引文档、博客和普通页面，索引只在 `npm run build` 时生成。需要验证搜索时，请先构建再运行 `npm run serve`。

端口被占用时可以显式指定其他端口：

```bash
npm start -- --port 3005
npm run serve -- --port 3005
```

## 内容维护

新增文档时应包含 Docusaurus Front Matter：

```yaml
---
title: 页面标题
sidebar_position: 3
slug: /getting-started/example # 仅在需要稳定 URL 时添加
---
```

站内文档链接可以使用 `/docs/...` 绝对路径或可靠的相对路径，例如：

```markdown
[Sandbox 生命周期](/docs/user/sandbox-lifecycle)
[核心概念](../getting-started/core-concepts.md)
```

中文文档是默认内容源。修改已有中文页面的事实、接口或操作流程时，应同步更新对应英文页面：

```text
i18n/en/docusaurus-plugin-content-docs/current/<docs-relative-path>
```

已有英文博客位于 `i18n/en/docusaurus-plugin-content-blog/`。导航栏、页脚与 Docusaurus UI 翻译分别位于 `i18n/en/docusaurus-theme-classic/` 和 `i18n/en/code.json`。

## 写博客

中文博客放在 `blog/`，文件名使用 `YYYY-MM-DD-kebab-case-title.md`，例如：

```text
blog/2026-09-02-conch-example.md
```

文章开头需要添加 Front Matter：

```yaml
---
slug: conch-example
title: 文章标题
authors: [conch]
tags: [Conch, Sandbox]
description: 用一句话概括文章内容。
---
```

- `slug` 应保持唯一，并使用小写 kebab-case。
- `authors` 引用 `blog/authors.yml` 中的作者 ID；新增作者时先在该文件中登记。
- `tags` 使用稳定、可复用的主题名称，不要为同一概念创建大小写不同的标签。
- 摘要结束处插入 `<!-- truncate -->`，博客列表只展示该标记之前的内容。
- 图片放在 `static/img/blog/<article-slug>/`，正文使用 `/img/blog/<article-slug>/<file-name>` 引用；文件名使用小写 kebab-case。
- 已有对应英文文章时，在 `i18n/en/docusaurus-plugin-content-blog/` 下维护同名文件，并同步事实、链接和图片说明。

示例：

```markdown
---
slug: conch-example
title: 使用 Conch 创建第一个 Sandbox
authors: [conch]
tags: [Conch, Sandbox]
description: 介绍如何使用 Conch 创建并操作 Sandbox。
---

这里是会出现在博客列表中的摘要。

<!-- truncate -->

## 正文标题

![示例图片](/img/blog/conch-example/overview.png)
```

## 站点配置

- `docusaurus.config.ts`：站点地址、locale、文档与博客插件、搜索、导航栏和页脚。
- `sidebars.ts`：快速开始、用户手册、使用示例和参考手册的显式顺序。
- `src/pages/index.tsx`：中英文首页内容与页面结构。
- `src/pages/index.module.css`：首页样式和响应式布局。
- `src/css/custom.css`：全局主题样式及导航栏图标布局。
- `static/img/`：Logo、博客插图等静态资源。

当前顶部导航包含文档四个分组与博客入口；受限宽度下保留语言、GitHub、主题和搜索四个图标。页脚提供主要文档、Conch 社区与博客链接。

普通文档任务不应顺带修改首页、导航栏、页脚或全局视觉设计。完整 Agent 工作边界见 `AGENTS.md`。

## 验证与提交

提交前至少执行：

```bash
npm run build
```

该命令会构建 `zh-CN` 与 `en` 两个 locale，并执行断链检查和搜索索引生成。只提交源码与配置，不要提交 `node_modules/`、`build/` 或 `.docusaurus/`。

推荐在个人分支完成修改，通过 Pull Request 合入 [`ConchSandbox/ConchSandbox.github.io`](https://github.com/ConchSandbox/ConchSandbox.github.io) 的 `main` 分支。`.github/workflows/deploy.yaml` 会在 `main` 更新后使用 Node.js 20 构建并部署 GitHub Pages。
