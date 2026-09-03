# GitHub Pages 部署教程

这份教程对应当前博客和仓库：

- GitHub 仓库：`DCRlike/dcrlike.github.io`
- 线上地址：<https://dcrlike.github.io/>
- 默认分支：`main`
- 部署方式：GitHub Actions
- 构建产物：`dist/client`

这是一个 GitHub 用户站点仓库，因此网站直接发布在域名根路径 `https://dcrlike.github.io/`，不需要额外的仓库名前缀。

## 部署是怎样工作的

每次把代码推送到 `main` 分支后，`.github/workflows/deploy.yml` 会自动完成以下工作：

1. 检出最新代码。
2. 安装 Node.js 22 和 npm 依赖。
3. 读取 GitHub Pages 的正式网址与路径。
4. 运行 `npm run build`，生成静态网站。
5. 将 `dist/client` 上传为 Pages 部署产物。
6. 发布到 `https://dcrlike.github.io/`。

部署文件由 GitHub Pages 的官方 Actions 处理，不需要把 `dist` 提交进 Git 仓库。

## 第一次部署前的仓库设置

打开仓库的 **Settings → Pages**，在 **Build and deployment** 中将 **Source** 设为 **GitHub Actions**。

本仓库目前已经完成这项设置。如果以后新建了同类仓库，或 Pages 设置被改动，再按上面的步骤恢复即可。

建议同时确认：

- 仓库默认分支是 `main`。
- 仓库 **Actions** 功能没有被禁用。
- **Settings → Environments → github-pages** 中没有无法满足的审批规则。
- **Enforce HTTPS** 已开启。

## 发布一篇新文章

先按照 [博客写作教程](./WRITING_GUIDE.md) 在 `content/posts` 中添加文章；如果文章包含本站图片，把图片放进 `public/images`。

发布前，在项目根目录运行：

```bash
npm ci
npm run build
```

构建通过后提交并推送：

```bash
git status
git add content/posts public/images
git commit -m "Add a new blog post"
git push
```

如果还修改了其他网站文件，需要把它们一并加入 `git add`。不确定时可以使用 `git add -A`，但提交前一定先运行 `git status`，确认没有把 `.env`、日志或本地生成文件加入提交。

推送完成后，打开仓库的 **Actions** 页面，查看 `Deploy blog to GitHub Pages`。绿色对勾表示发布成功；网站通常会在随后的一两分钟内更新。

## 发布网站代码更新

修改页面、样式或组件后的流程与发布文章相同：

```bash
npm run build
git status
git add -A
git commit -m "Update blog site"
git push
```

`git add -A` 会包含文件新增、修改和删除，所以提交前要认真检查 `git status` 的列表。

## 手动重新部署

部署工作流支持手动运行：

1. 打开仓库的 **Actions** 页面。
2. 选择 **Deploy blog to GitHub Pages**。
3. 点击 **Run workflow**。
4. 选择 `main` 分支并确认运行。

手动部署仍然使用 `main` 分支当前的代码，不会发布本地尚未推送的修改。

如果已安装并登录 GitHub CLI，可以查看部署记录：

```bash
gh run list --workflow deploy.yml
```

找到运行编号后查看详情：

```bash
gh run view 运行编号
```

## GitHub Actions 配置说明

部署配置位于 `.github/workflows/deploy.yml`。其中几个设置不能随意删除：

| 配置 | 用途 |
| --- | --- |
| `push.branches: [main]` | 推送到主分支时自动发布 |
| `workflow_dispatch` | 允许在 Actions 页面手动部署 |
| `actions: read` | 允许部署任务读取本次构建产物 |
| `pages: write` | 允许工作流创建 Pages 部署 |
| `id-token: write` | 让 GitHub 验证部署来源 |
| `configure-pages` | 获取网站正式 URL 和路径 |
| `NEXT_PUBLIC_BASE_PATH` | 保证页面与静态资源使用正确路径 |
| `NEXT_PUBLIC_SITE_URL` | 生成正确的 SEO 与社交分享地址 |
| `upload-pages-artifact` | 上传 `dist/client` 静态文件 |
| `deploy-pages` | 把静态文件发布到 Pages |

当前仓库名是 `dcrlike.github.io`，所以 `NEXT_PUBLIC_BASE_PATH` 通常为空。仍然保留这个环境变量，是为了让同一份构建配置迁移到普通项目仓库时也能正确工作。

## 如何确认部署成功

依次检查：

1. `npm run build` 在本地通过。
2. GitHub Actions 中的 build 和 deploy 两个任务都是绿色。
3. 打开 <https://dcrlike.github.io/> 后，首页正常显示。
4. 随机打开一篇 `/posts/...html` 文章，确认链接可访问。
5. 强制刷新浏览器，确认看到的是最新内容。
6. 检查图片、字体、深色模式和移动端布局。

浏览器或 CDN 可能暂时保留旧文件。部署成功但内容未更新时，先等待一分钟，再使用强制刷新；不要立即重复提交相同内容。

## 常见问题

### Actions 没有自动运行

确认提交已经推送到 `main`，而不是只保存在本地或推送到其他分支。还要确认 `.github/workflows/deploy.yml` 已存在于远程仓库，以及仓库没有禁用 Actions。

### `npm ci` 失败

`npm ci` 要求 `package.json` 和 `package-lock.json` 保持一致。添加或升级依赖后，应在本地使用 `npm install` 更新锁文件，并把两个文件一起提交。

### 构建成功，但上传阶段找不到文件

当前静态文件应生成在 `dist/client`。如果将来修改了构建工具或输出目录，需要同步修改工作流中 `upload-pages-artifact` 的 `path`。

### 首页能打开，图片或链接却是 404

不要在代码里写死 `/Blog` 或其他仓库名。页面链接应继续使用项目里的路径工具；文章图片放到 `public/images`，并按照写作教程使用相对路径。

还要检查文件名大小写。macOS 本地文件系统通常不区分大小写，但 GitHub Pages 的 Linux 环境会区分：`Photo.png` 与 `photo.png` 是两个不同的文件名。

### GitHub Pages 显示 404

先在 **Settings → Pages** 确认 Source 为 **GitHub Actions**，再检查最新的部署任务是否成功。刚启用 Pages 或更改域名时，DNS 和缓存更新可能需要一些时间。

### deploy 任务提示权限不足

确认工作流仍包含 `pages: write` 与 `id-token: write`，并检查仓库或组织的 Actions 权限策略。如果 `github-pages` 环境要求人工审批，需要到对应工作流运行页面完成审批。

## 安全地撤回一次发布

如果最新提交有问题，不要强制推送或改写主分支历史。使用 `git log --oneline` 找到有问题的提交，然后创建一次反向提交：

```bash
git revert 提交编号
git push
```

新的 push 会自动触发部署，把站点恢复到撤销后的状态。原来的提交仍保留在历史中，之后也容易查明发生了什么。

## 域名与 HTTPS

当前站点使用 GitHub 提供的 `dcrlike.github.io` 域名，不需要配置 DNS。GitHub Pages 已开启 HTTPS，文章中引用的外部图片和资源也应使用 `https://`，否则浏览器可能阻止混合内容。

如果以后配置自定义域名，需要同时完成：

1. 在域名服务商处配置 DNS。
2. 在 **Settings → Pages → Custom domain** 中填写域名。
3. 等待 GitHub 验证 DNS。
4. 验证成功后重新开启 **Enforce HTTPS**。
5. 确认构建时的 `NEXT_PUBLIC_SITE_URL` 已由 GitHub Pages 返回为新域名。

## 不应提交到仓库的内容

`.gitignore` 已排除依赖、构建产物、缓存、日志、本地环境变量和编辑器文件。尤其不要提交：

- `.env`、`.env.local` 等环境变量文件。
- `node_modules`。
- `dist`、`.next`、`.vinext`、`out`。
- `.wrangler` 本地状态。
- 日志、测试覆盖率和 TypeScript 构建缓存。
- 私钥、证书或任何访问令牌。

如果项目需要说明环境变量名称，可以提交不含真实密钥的 `.env.example`。
