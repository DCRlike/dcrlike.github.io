import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const PROJECT_ORG = 'ConchSandbox';
const SITE_OWNER = 'ConchSandbox';
const SITE_REPO = 'ConchSandbox.github.io';
const SITE_BRANCH = 'main';

// ============================================================
// 自定义域名支持（暂未启用）
//
// 域名协商好后：
//   1. 把 CUSTOM_DOMAIN 改为真实域名，例如 'https://docs.conch.dev'
//   2. 取消下方 ① 处 url 的注释，并注释掉 GitHub Pages 默认 url
//   3. 取消下方 ② 处 navbar 文档 Logo/href 中的域名相关注释（如需要）
//   4. 在仓库 Settings → Pages → Custom domain 填入该域名
//   5. 按部署工作流（.github/workflows/deploy.yaml）里的 CNAME 步骤，
//      或参考归档工具，把包含域名的文件加入静态目录
//
// 说明：启用自定义域名后，仍会保留 GitHub Pages 访问入口；
// 两个 URL 都可访问。DNS 由域名服务商（如 12fz.cn）配置 CNAME 到
// https://conchsandbox.github.io/。
// ============================================================
// const CUSTOM_DOMAIN = 'https://docs.conch.example';

const config: Config = {
  title: 'Conch',
  tagline: 'Agent Sandbox Engine — 面向 Agent 的容器沙箱引擎',
  favicon: 'img/conch-logo.jpg',

  // 部署地址：GitHub Organization Pages。
  // 如果你的站点是项目页面（例如 https://conchsandbox.github.io/conch/），
  // 请把 baseUrl 改成 '/conch/'。
  // ① 启用自定义域名时替换成：url: CUSTOM_DOMAIN,
  url: `https://${SITE_OWNER.toLowerCase()}.github.io`,
  baseUrl: '/',

  organizationName: SITE_OWNER,
  projectName: SITE_REPO,

  onBrokenLinks: 'throw',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  // 中文为默认语言，UI 使用 Docusaurus 官方提供的 zh-CN 翻译包。
  i18n: {
    defaultLocale: 'zh-CN',
    locales: ['zh-CN', 'en'],
    localeConfigs: {
      'zh-CN': {
        label: '简体中文',
        htmlLang: 'zh-CN',
      },
      en: {
        label: 'English',
        htmlLang: 'en',
      },
    },
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editCurrentVersion: true,
          editUrl: `https://github.com/${SITE_OWNER}/${SITE_REPO}/tree/${SITE_BRANCH}/docs/`,
        },
        blog: {
          showReadingTime: false,
          blogTitle: 'Conch 博客',
          blogDescription: 'Conch 项目组的技术文章与社区分享。',
          blogSidebarCount: 2,
          blogSidebarTitle: '博客文章',
          editUrl: `https://github.com/${SITE_OWNER}/${SITE_REPO}/tree/${SITE_BRANCH}/blog/`,
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  // 离线本地搜索（内置中文分词，无需 Algolia 账号）
  themes: [
    [
      require.resolve('@easyops-cn/docusaurus-search-local'),
      {
        hashed: true,
        language: ['zh', 'en'],
        indexDocs: true,
        indexBlog: true,
        indexPages: true,
        docsRouteBasePath: '/docs',
        blogRouteBasePath: '/blog',
      },
    ],
  ],

  themeConfig: {
    // 替换为你项目的真实社交卡片
    image: 'img/conch-logo.jpg',
    navbar: {
      title: 'Conch',
      logo: {
        alt: 'Conch Logo',
        src: 'img/conch-logo.jpg',
      },
      items: [
        {
          to: '/docs/getting-started/intro',
          position: 'left',
          label: '快速开始',
        },
        {
          to: '/docs/user/sandbox-lifecycle',
          position: 'left',
          label: '用户手册',
        },
        {
          to: '/docs/examples/openclaw',
          position: 'left',
          label: '使用示例',
        },
        {
          to: '/docs/reference/python-sdk',
          position: 'left',
          label: '参考手册',
        },
        {
          to: '/blog',
          position: 'left',
          label: '博客',
        },
        {
          type: 'localeDropdown',
          position: 'right',
        },
        {
          href: `https://github.com/${PROJECT_ORG}/Conch`,
          position: 'right',
          label: 'Star on GitHub',
          'aria-label': 'Star Conch on GitHub',
          className: 'navbar-github-icon',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: '文档',
          items: [
            {
              label: '快速开始',
              to: '/docs/getting-started/intro',
            },
            {
              label: '安装',
              to: '/docs/getting-started/installation',
            },
            {
              label: '模板管理',
              to: '/docs/user/template-management',
            },
            {
              label: 'Python SDK',
              to: '/docs/reference/python-sdk',
            },
          ],
        },
        {
          title: '社区',
          items: [
            {
              label: 'GitHub Organization',
              href: `https://github.com/${PROJECT_ORG}`,
            },
            {
              label: 'Conch 源码仓库',
              href: `https://github.com/${PROJECT_ORG}/Conch`,
            },
            {
              label: '博客',
              to: '/blog',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} ConchSandbox. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
