---
title: 重新理解 CSS 的布局上下文
excerpt: Grid、Flexbox 与普通文档流，并不是互相替代的三种答案。
date: 2026-07-26
readingTime: 7 min read
tags: [CSS, Layout]
---

布局问题往往不是某个属性没记住，而是没有先判断元素所在的布局上下文。

## 从文档流开始

先让内容自然排列，再用 Grid 和 Flexbox 解决明确的二维或一维关系。
