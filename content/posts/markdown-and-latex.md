---
title: 让 Markdown 与 LaTeX 在 React 里好好相处
excerpt: 从解析链路到公式排版，记录这个博客如何把文字、代码和数学放进同一张纸里。
date: 2026-08-31
readingTime: 6 min read
tags: [React, Markdown, LaTeX]
---

写技术文章时，我希望**文字、代码与公式**能自然地待在同一个页面里，而不需要为每篇文章重复处理格式。

## 从一段 Markdown 开始

博客把文章保存为纯文本，再交给统一的渲染链路。于是列表、引用和表格都可以保持最朴素的写法：

> 好的写作工具应该在需要时出现，在思考开始时隐身。

| 内容 | 写法 | 渲染器 |
| --- | --- | --- |
| 正文 | Markdown | react-markdown |
| 数学 | LaTeX | KaTeX |
| 表格与删除线 | GFM | remark-gfm |

代码块也会保留适合阅读的层次：

```tsx
export function Equation({ value }: { value: string }) {
  return <span className="math">{value}</span>;
}
```

## 一点数学

行内公式适合嵌在句子里，例如欧拉恒等式 $e^{i\pi}+1=0$。更重要的推导则单独占一行：

$$
\int_{-\infty}^{+\infty} e^{-x^2} \, dx = \sqrt{\pi}
$$

对于一个简单的梯度下降过程：

$$
\theta_{t+1} = \theta_t - \eta \nabla_\theta \mathcal{L}(\theta_t)
$$

这些公式仍然是文章源码的一部分，可以和普通 Markdown 一起进入版本控制。

## 为什么这样做

1. **内容可迁移**：文章没有被锁在某个编辑器里。
2. **样式可统一**：标题、代码和公式共享同一套排版规则。
3. **部署够简单**：静态页面很适合放到 GitHub Pages。

现在每篇文章已经是独立的 `.md` 文件，新增内容只需要复制一份模板并修改 frontmatter。
