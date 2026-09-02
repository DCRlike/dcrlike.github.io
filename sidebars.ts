import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

/** 文档信息架构：快速开始 / 用户手册 / 使用示例 / 参考手册。 */
const sidebars: SidebarsConfig = {
  docs: [
    {
      type: 'category',
      label: '快速开始',
      collapsed: false,
      items: [
        'getting-started/intro',
        'getting-started/installation',
        'getting-started/core-concepts',
        'getting-started/architecture',
      ],
    },
    {
      type: 'category',
      label: '用户手册',
      collapsed: false,
      items: [
        'user/sandbox-lifecycle',
        'user/snapshot-start',
        'user/suspend-resume',
        'user/template-management',
        'user/storage-management',
        'user/network-management',
      ],
    },
    {
      type: 'category',
      label: '使用示例',
      collapsed: true,
      items: [
        'examples/openclaw',
        'examples/all-in-one-sandbox',
        'examples/android-sandbox',
        'examples/windows-sandbox',
      ],
    },
    {
      type: 'category',
      label: '参考手册',
      collapsed: true,
      items: [
        'reference/python-sdk',
        'reference/sandbox',
        'reference/template',
        'reference/conch-init',
        'reference/storage',
        'reference/network',
      ],
    },
  ],
};

export default sidebars;
