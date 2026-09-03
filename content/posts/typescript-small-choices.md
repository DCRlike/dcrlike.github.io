---
title: TypeScript 里的小选择，和它们的长期回报
excerpt: 类型不是为了让代码更长，而是把那些容易忘记的约定留在系统里。
date: 2026-08-24
readingTime: 4 min read
tags: [TypeScript, Engineering]
---

TypeScript 最有价值的地方，往往不是复杂的类型体操，而是那些朴素的小约束。

## 让状态说清楚

比起多个互相影响的布尔值，联合类型通常更接近真实业务：

```ts
type RequestState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: Article[] }
  | { status: 'error'; message: string };
```

当状态的形状足够清楚，组件里的分支也会自然变简单。类型不是附加的文档，它就是设计本身。
