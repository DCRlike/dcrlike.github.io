---
title: 用 React 搭建静态博客的一些记录
excerpt: 从内容模型到静态导出，整理这次搭建过程中的关键选择。
date: 2026-08-03
readingTime: 5 min read
tags: [React, Blog]
---

静态博客的核心很简单：把内容在构建阶段变成 HTML。

## 保持简单

文章数据、页面模板和部署流程各自保持清晰。现在文章已经迁移到独立 Markdown 文件，内容与实现可以分别维护。
