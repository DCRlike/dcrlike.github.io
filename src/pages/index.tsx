import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import styles from './index.module.css';

type Metric = {value: string; label: string};

type LinkCard = {
  eyebrow: string;
  title: string;
  description: string;
  linkLabel: string;
  to: string;
};

type Feature = {title: string; description: string};

type HomeContent = {
  pageTitle: string;
  pageDescription: string;
  heroEyebrow: string;
  heroTitle: string;
  heroDescription: string;
  quickStart: string;
  pythonSdk: string;
  codeTitle: string;
  codeSummary: string;
  metrics: Metric[];
  pathsTitle: string;
  pathsDescription: string;
  paths: LinkCard[];
  featuresEyebrow: string;
  coreFeatures: string;
  featuresDescription: string;
  features: Feature[];
  directionsEyebrow: string;
  directionsTitle: string;
  directionsDescription: string;
  directions: Feature[];
  examplesEyebrow: string;
  examplesTitle: string;
  examplesDescription: string;
  examples: LinkCard[];
};

const homeContent: Record<'zh-CN' | 'en', HomeContent> = {
  'zh-CN': {
    pageTitle: 'Conch — Agent Sandbox Engine',
    pageDescription:
      'Conch 是一个基于 Go 开发的容器沙箱引擎，面向 Agent 的安全隔离、启动性能与弹性、高密部署和运行性能诉求。',
    heroEyebrow: 'Agent Sandbox Engine',
    heroTitle: '面向 Agent 的高性能容器沙箱引擎',
    heroDescription:
      '支持 Agent 原生的沙箱管理 API 和 SDK，以及 StratoVirt、Cloud Hypervisor 等多种 microVM 隔离沙箱。通过快照 Template 实现 60 ms 启动，并面向高密部署和运行性能优化。',
    quickStart: '快速开始',
    pythonSdk: '查看 Python SDK',
    codeTitle: 'Python SDK',
    codeSummary: '创建 · 执行 · 自动清理',
    metrics: [
      {value: '60 ms', label: '快照 Template 启动'},
      {value: '多种', label: 'microVM 隔离沙箱'},
      {value: 'CoW + DAX', label: '消除重复内存占用'},
    ],
    pathsTitle: '从你的目标出发',
    pathsDescription: '选择最适合你的入口，直接进入对应文档。',
    paths: [
      {
        eyebrow: '01 / GET STARTED',
        title: '第一次使用',
        description: '准备环境，安装 Conch，创建第一个 Sandbox。',
        linkLabel: '进入快速开始',
        to: '/docs/getting-started/installation',
      },
      {
        eyebrow: '02 / INTEGRATE',
        title: '集成到 Agent',
        description: '了解 Python SDK、Sandbox 生命周期与命令执行。',
        linkLabel: '查看 SDK',
        to: '/docs/reference/python-sdk',
      },
      {
        eyebrow: '03 / UNDERSTAND',
        title: '理解底层能力',
        description: '了解控制面、Sandbox 运行时和 guest 内 Agent 的整体架构。',
        linkLabel: '阅读架构',
        to: '/docs/getting-started/architecture',
      },
    ],
    featuresEyebrow: 'Why Conch',
    coreFeatures: '为 Agent 负载而构建',
    featuresDescription:
      '围绕安全隔离、启动性能与弹性、高密部署和运行性能，Conch 提供面向 Agent 工作负载的沙箱能力。',
    features: [
      {
        title: '多种安全隔离沙箱',
        description:
          '支持多种隔离沙箱，包括 StratoVirt、Cloud Hypervisor 等 microVM，为 Agent 任务提供安全的执行环境。',
      },
      {
        title: '启动性能与弹性',
        description:
          '通过快照 Template 实现 60 ms 启动，满足 Agent 工作负载对快速启动和弹性伸缩的诉求。',
      },
      {
        title: '高密部署与运行性能',
        description:
          '使用内存快照 CoW 和 rootfs 快照 virtio-pmem DAX 消除重复内存占用，并支持超节点部署形态加速。',
      },
    ],
    directionsEyebrow: 'Core Design',
    directionsTitle: '从接口到部署形态',
    directionsDescription:
      'Conch 将 Agent 原生接口、隔离沙箱、快照技术和超节点部署组合成完整的沙箱引擎。',
    directions: [
      {
        title: 'Agent 原生接口',
        description:
          '提供 Agent 原生的沙箱管理 API 和 SDK，支持在应用中创建、操作和管理 Sandbox。',
      },
      {
        title: '多种隔离后端',
        description:
          '支持多种隔离沙箱，包括 StratoVirt、Cloud Hypervisor 等 microVM 隔离后端。',
      },
      {
        title: '快照与超节点',
        description:
          '使用快照 Template 加速启动，以内存快照 CoW 和 rootfs 快照 virtio-pmem DAX 提升部署密度，并支持超节点部署形态加速。',
      },
    ],
    examplesEyebrow: 'Examples',
    examplesTitle: '查看使用示例',
    examplesDescription: '从 OpenClaw、all-in-one 和 Windows 场景出发，了解 Conch 的使用方式。',
    examples: [
      {
        eyebrow: 'AGENT WORKLOAD',
        title: 'OpenClaw',
        description: '创建 Sandbox、写入配置并启动 OpenClaw TUI，退出时自动清理资源。',
        linkLabel: '查看完整示例',
        to: '/docs/examples/openclaw',
      },
      {
        eyebrow: 'ALL-IN-ONE ENVIRONMENT',
        title: 'All-in-one Sandbox',
        description: '在单个 Sandbox 中运行 SSH、浏览器、桌面和终端服务，并通过统一入口访问。',
        linkLabel: '查看完整示例',
        to: '/docs/examples/all-in-one-sandbox',
      },
      {
        eyebrow: 'DESKTOP ENVIRONMENT',
        title: 'Windows Sandbox',
        description: '查看使用 Conch 部署 Windows 沙箱的示例页面。',
        linkLabel: '查看示例',
        to: '/docs/examples/windows-sandbox',
      },
    ],
  },
  en: {
    pageTitle: 'Conch — Agent Sandbox Engine',
    pageDescription:
      'Conch is a Go-based container sandbox engine designed for agent requirements including secure isolation, startup performance and elasticity, high-density deployment, and runtime performance.',
    heroEyebrow: 'Agent Sandbox Engine',
    heroTitle: 'A high-performance container sandbox engine for agents',
    heroDescription:
      'Conch provides agent-native sandbox management APIs and SDKs, plus multiple isolated sandbox options including StratoVirt and Cloud Hypervisor microVMs. Snapshot-based Templates start in 60 ms, with optimizations for dense deployments and runtime performance.',
    quickStart: 'Quick Start',
    pythonSdk: 'View Python SDK',
    codeTitle: 'Python SDK',
    codeSummary: 'Create · Run · Clean up',
    metrics: [
      {value: '60 ms', label: 'Snapshot Template startup'},
      {value: 'Multiple', label: 'microVM sandbox options'},
      {value: 'CoW + DAX', label: 'Eliminate duplicate memory'},
    ],
    pathsTitle: 'Start with your goal',
    pathsDescription: 'Choose the path that matches what you want to do.',
    paths: [
      {
        eyebrow: '01 / GET STARTED',
        title: 'Use Conch for the first time',
        description: 'Prepare your environment, install Conch, and create a Sandbox.',
        linkLabel: 'Go to Quick Start',
        to: '/docs/getting-started/installation',
      },
      {
        eyebrow: '02 / INTEGRATE',
        title: 'Integrate with an agent',
        description: 'Learn the Python SDK, Sandbox lifecycle, and command execution.',
        linkLabel: 'Explore the SDK',
        to: '/docs/reference/python-sdk',
      },
      {
        eyebrow: '03 / UNDERSTAND',
        title: 'Understand the architecture',
        description: 'Learn how the control plane, Sandbox runtime, and in-guest agent fit together.',
        linkLabel: 'Read the architecture',
        to: '/docs/getting-started/architecture',
      },
    ],
    featuresEyebrow: 'Why Conch',
    coreFeatures: 'Built for agent workloads',
    featuresDescription:
      'Conch addresses secure isolation, startup performance and elasticity, high-density deployment, and runtime performance for agent workloads.',
    features: [
      {
        title: 'Multiple secure sandbox options',
        description:
          'Use multiple isolated sandbox options, including StratoVirt and Cloud Hypervisor microVMs, to provide secure execution environments for agent tasks.',
      },
      {
        title: 'Startup performance and elasticity',
        description:
          'Start snapshot-based Templates in 60 ms to meet the fast-start and elasticity requirements of agent workloads.',
      },
      {
        title: 'High density and runtime performance',
        description:
          'Eliminate duplicate memory usage with memory-snapshot CoW and rootfs snapshots backed by virtio-pmem DAX, while supporting accelerated hypernode deployments.',
      },
    ],
    directionsEyebrow: 'Core Design',
    directionsTitle: 'From interfaces to deployment',
    directionsDescription:
      'Conch combines agent-native interfaces, isolated sandboxes, snapshot technologies, and hypernode deployment into one sandbox engine.',
    directions: [
      {
        title: 'Agent-native interfaces',
        description:
          'Use agent-native sandbox management APIs and SDKs to create, operate, and manage Sandboxes from applications.',
      },
      {
        title: 'Multiple isolation backends',
        description:
          'Choose from multiple isolated sandbox options, including StratoVirt and Cloud Hypervisor microVM backends.',
      },
      {
        title: 'Snapshots and hypernodes',
        description:
          'Accelerate startup with snapshot-based Templates, increase density with memory-snapshot CoW and rootfs snapshots backed by virtio-pmem DAX, and support accelerated hypernode deployments.',
      },
    ],
    examplesEyebrow: 'Examples',
    examplesTitle: 'Explore usage examples',
    examplesDescription:
      'Start with the OpenClaw, all-in-one, and Windows scenarios to learn how Conch is used.',
    examples: [
      {
        eyebrow: 'AGENT WORKLOAD',
        title: 'OpenClaw',
        description: 'Create a Sandbox, write configuration, launch the OpenClaw TUI, and clean up on exit.',
        linkLabel: 'View the full example',
        to: '/docs/examples/openclaw',
      },
      {
        eyebrow: 'ALL-IN-ONE ENVIRONMENT',
        title: 'All-in-one Sandbox',
        description:
          'Run SSH, browser, desktop, and terminal services in one Sandbox and reach them through a single gateway.',
        linkLabel: 'View the full example',
        to: '/docs/examples/all-in-one-sandbox',
      },
      {
        eyebrow: 'DESKTOP ENVIRONMENT',
        title: 'Windows Sandbox',
        description: 'Open the example page for deploying a Windows sandbox with Conch.',
        linkLabel: 'View example',
        to: '/docs/examples/windows-sandbox',
      },
    ],
  },
};

function DirectionItem({title, description}: Feature) {
  return (
    <article className={styles.directionItem}>
      <Heading as="h3">{title}</Heading>
      <p>{description}</p>
    </article>
  );
}

function CodePreview({title, summary}: {title: string; summary: string}) {
  return (
    <div className={styles.codePreview} aria-label={`${title}: ${summary}`}>
      <div className={styles.codePreviewHeader}>
        <span>{title}</span>
        <span>{summary}</span>
      </div>
      <pre className={styles.codeBlock}>
        <code>
          <span className={styles.codeKeyword}>from</span> conch{' '}
          <span className={styles.codeKeyword}>import</span> Sandbox
          {'\n\n'}
          <span className={styles.codeKeyword}>with</span> Sandbox.create(
          {'\n'}    template_id=<span className={styles.codeString}>&quot;&lt;template-id&gt;&quot;</span>
          {'\n'}) <span className={styles.codeKeyword}>as</span> sandbox:
          {'\n'}    result = sandbox.commands.run(
          {'\n'}        cmd=<span className={styles.codeString}>&quot;printf&quot;</span>,
          {'\n'}        args=[<span className={styles.codeString}>&quot;hello Conch\n&quot;</span>]
          {'\n'}    )
          {'\n'}    print(result.stdout)
          {'\n\n'}<span className={styles.codeOutput}>hello Conch</span>
        </code>
      </pre>
    </div>
  );
}

export default function Home(): React.ReactElement {
  const {i18n} = useDocusaurusContext();
  const content = homeContent[i18n.currentLocale === 'en' ? 'en' : 'zh-CN'];

  return (
    <Layout title={content.pageTitle} description={content.pageDescription}>
      <main className={styles.homepage}>
        <header className={styles.hero}>
          <div className={styles.heroContent}>
            <p className={styles.eyebrow}>{content.heroEyebrow}</p>
            <Heading as="h1" className={styles.heroTitle}>{content.heroTitle}</Heading>
            <p className={styles.heroDescription}>{content.heroDescription}</p>
            <div className={styles.buttons}>
              <Link
                className={clsx('button button--primary button--lg', styles.primaryButton)}
                to="/docs/getting-started/intro">
                {content.quickStart}<span aria-hidden="true"> →</span>
              </Link>
              <Link
                className={clsx('button button--secondary button--lg', styles.secondaryButton)}
                to="/docs/reference/python-sdk">
                {content.pythonSdk}
              </Link>
            </div>
            <dl className={styles.metrics}>
              {content.metrics.map((metric) => (
                <div className={styles.metric} key={metric.label}>
                  <dt>{metric.value}</dt>
                  <dd>{metric.label}</dd>
                </div>
              ))}
            </dl>
          </div>
          <CodePreview title={content.codeTitle} summary={content.codeSummary} />
        </header>

        <section className={styles.pathSection}>
          <div className={styles.sectionHeadingRow}>
            <Heading as="h2">{content.pathsTitle}</Heading>
            <p>{content.pathsDescription}</p>
          </div>
          <div className={styles.pathGrid}>
            {content.paths.map((path) => (
              <article className={styles.pathCard} key={path.title}>
                <p className={styles.cardEyebrow}>{path.eyebrow}</p>
                <Heading as="h3">{path.title}</Heading>
                <p>{path.description}</p>
                <Link to={path.to} className={styles.textLink}>
                  {path.linkLabel}<span aria-hidden="true"> →</span>
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.capabilitySection}>
          <div className={styles.capabilityIntro}>
            <p className={styles.eyebrow}>{content.featuresEyebrow}</p>
            <Heading as="h2">{content.coreFeatures}</Heading>
            <p>{content.featuresDescription}</p>
            <Link to="/docs/getting-started/architecture" className={styles.textLink}>
              {content.paths[2].linkLabel}<span aria-hidden="true"> →</span>
            </Link>
          </div>
          <ol className={styles.capabilityList}>
            {content.features.map((feature, index) => (
              <li key={feature.title}>
                <span className={styles.capabilityIndex}>{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <Heading as="h3">{feature.title}</Heading>
                  <p>{feature.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.directionSection}>
          <div className={styles.centeredHeading}>
            <p className={styles.eyebrow}>{content.directionsEyebrow}</p>
            <Heading as="h2">{content.directionsTitle}</Heading>
            <p>{content.directionsDescription}</p>
          </div>
          <div className={styles.directionGrid}>
            {content.directions.map((direction) => (
              <DirectionItem key={direction.title} {...direction} />
            ))}
          </div>
        </section>

        <section className={styles.examplesSection}>
          <div className={styles.examplesHeading}>
            <p className={styles.examplesEyebrow}>{content.examplesEyebrow}</p>
            <Heading as="h2">{content.examplesTitle}</Heading>
            <p>{content.examplesDescription}</p>
          </div>
          <div className={styles.exampleGrid}>
            {content.examples.map((example) => (
              <article className={styles.exampleCard} key={example.title}>
                <p>{example.eyebrow}</p>
                <Heading as="h3">{example.title}</Heading>
                <p>{example.description}</p>
                <Link to={example.to}>
                  {example.linkLabel}<span aria-hidden="true"> →</span>
                </Link>
              </article>
            ))}
          </div>
        </section>

      </main>
    </Layout>
  );
}
