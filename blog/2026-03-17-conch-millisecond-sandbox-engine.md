---
slug: conch-millisecond-sandbox-engine
title: openEuler Conch沙箱引擎：如何用毫秒级速度给“闯祸”的小龙虾套上“海螺”壳
tags: [openEuler, Conch, AI Agent, Sandbox]
description: Conch 如何为 AI Agent 提供兼顾安全隔离、快照恢复与毫秒级启动的沙箱执行环境。
---

## 01 背景介绍

随着 OpenClaw 等 AI Agent 项目快速发展，直接在宿主机或者在虚拟机上裸机部署智能体的问题日益凸显。开发者赋予了 AI Agent 深度调用系统资源（如文件系统操作、外设驱动管理）的特权，使其能够像真实员工一样处理复杂业务。但也带来如下一些问题：

- **破坏主机环境：**在遇到提示词注入、模型幻觉、复杂正则表达式、符号连接处理不当的情况下，极易破坏宿主环境，导致环境不可逆损坏。
- **故障无法修复：**Agent 在执行任务时极易造成环境“污染”（如配置篡改或库文件损坏），缺乏一种能在环境崩溃时瞬间回滚至上一个可用状态的机制。
- **部署效率低下：**采用裸机部署或者虚拟机部署都需要分钟级，即使容器化部署也面临并发启动性能非线性劣化问题，需要一种支持大规模 Agent 毫秒级拉起任务沙箱的机制，同时保障隔离和部署效率。

针对上述痛点，**OpenAtom openEuler（简称“openEuler”或“开源欧拉”）社区 CloudNative SIG 组推出了 Conch（海螺）——一个集成了强隔离、可扩展、毫秒级启动的下一代沙箱引擎，**为 AI 智能体提供可靠的执行基座。给调皮的“小龙虾”装上“海螺壳”，能够放心让它干活。

<!-- truncate -->

![小龙虾与海螺壳示意图（即梦 AI 生成）](/img/blog/conch-millisecond-sandbox-engine/lobster-conch.png)

## 02 Conch：专为 AI Agent 定制的硬核沙箱引擎

Conch 是一套模块化分层架构，旨在为 AI Agent 打造一个既有“物理级隔离”又能“瞬时响应”的环境。Conch 整体框图如图 1 所示：

![Conch 整体架构图](/img/blog/conch-millisecond-sandbox-engine/architecture.png)

*图 1 Conch 整体架构图*

**Conch 的核心功能被拆分为镜像服务、内存快照、网络资源和沙箱执行四个独立模块，**各模块间通过标准化接口实现异步通信。当用户下达代码执行或文件传输指令时，请求从统一的 Python SDK 发起，经宿主机守护进程 `conchd` 的统一调度与资源校验后，最终送达虚拟机内部常驻的 `conch-agent`，由其驱动 AI Agent 完成具体业务。

同时，针对背景中提出的 OpenClaw 等 AI Agent 在裸机部署下的“破坏主机环境、故障无法修复、部署效率低下”三大核心问题，Conch 在架构层面进行了深度设计：

- **强隔离：物理级“小隔间”。**底层集成 Cloud-Hypervisor，利用虚拟化技术为每个 Agent 构建独立内核边界，从物理层面切断沙箱与宿主机的联系，保障宿主机环境不受恶意代码渗透。
- **快照回滚：毫秒级“现场还原”。**基于 Rootfs、VM、Memory 三层解耦架构，通过写时复制（CoW）技术映射历史快照。当环境遭遇污染或攻击时，无需重装系统即可在毫秒级将执行现场恢复至初始纯净状态。
- **极速启动：池化“即插即用”。**通过内存映射（Memory Mapping）直接加载预热好的 VM 模板，并配合预分配的网络资源单元，跳过冗长的 BIOS 及内核引导流程，实现沙箱在毫秒级拉起。

### 镜像系统：面向 AI Agent 沙箱的镜像架构

AI Agent 应用场景日趋多元（如 Computer Use、Android Use 等），传统容器镜像难以承载复杂的系统级交互需求；而传统轻量化虚机（如 Kata）由于内核固化在宿主机，缺乏灵活性，无法满足不同 Agent 对内核版本的动态适配要求。

为此，**Conch 方案采用 Kernel + Rootfs 统一镜像设计**，将系统级资源进行标准化封装，实现多场景下的按需加载与内核隔离；**同时将引入 Snapshot Image 快照机制**，通过预存运行时状态支撑热启动与状态复用，从而兼顾 AI Agent 沙箱对动态适配与低延迟运行的双重追求。

基于该设计，Conch 构建了从内核封装到分层挂载的全链路架构，其镜像系统的构建逻辑与加载流程如图 2 所示：

![Conch 镜像系统：沙箱镜像分层构建与加载流程图](/img/blog/conch-millisecond-sandbox-engine/image-system.png)

*图 2 Conch 镜像系统：沙箱镜像分层构建与加载流程图*

#### 核心概念

- **构建模块（Build Module）：双路构建核心。**同步封装 `bzImage + initrd` 为内核镜像，并将 EROFS Layers 转化为 Rootfs 镜像，最终整合输出标准 Sandbox Image。
- **沙箱镜像（Sandbox Image）：标准化的运行实体。**由内核镜像与 Rootfs 镜像集成（未来将引入快照镜像），支持在不同场景下的按需拉取与分层复用，并可通过预存运行时状态支撑热启动。
- **只读根文件系统（EROFS Rootfs）：镜像运行基座。**基于高性能 EROFS 文件系统实现容器镜像的只读分层转换，在 VMM 沙箱启动时作为 overlay rootfs 的只读层挂载，确保系统一致性与高 IO 效率。

#### 工作流程

**构建态：**

源码/配置 → 内核编译 + 内核封装（`bzImage + initrd`）+ Rootfs 转化（EROFS layers）→ Sandbox Image。

**运行态：**

1. 冷启动：镜像拉取 → 虚拟机内核启动 → 挂载 EROFS layers 至 Overlay → 准备沙箱运行环境。
2. 热启动：镜像拉取（含快照组件）→ 状态恢复（Snapshot Restore）→ 任务瞬时就绪。

### 快照系统：三层架构实现沙箱热启动

在 AI Agent 场景下，沙箱内部通常运行着 Claude、OpenClaw 这类持续执行任务的 Agent。一次任务执行过程中，Agent 可能因工具调用异常、上下文污染或执行路径错误而进入异常状态。对于这类场景，系统不仅需要能够重新拉起一个新环境，更需要能够把当前虚拟机保存下来，并在需要时快速恢复到上一次正常状态。快照模块就是针对这一过程而设计。

快照创建以及基于快照恢复沙箱的原理图如下：

![Conch 快照系统原理图：三层解耦，实现快速恢复与高密度复用](/img/blog/conch-millisecond-sandbox-engine/snapshot-system.png)

*图 3 Conch 快照系统原理图：三层解耦，实现快速恢复与高密度复用*

当一个正在执行 Agent 任务的沙箱，外部发起快照生成请求后，系统会将当前沙箱中的文件系统状态持久化为 Rootfs Snapshot，将虚拟机运行现场和内存状态统一持久化为 Memory Snapshot，并结合 VM Snapshot 中保存的 kernel、initrd 等基础启动信息，形成一组完整的快照对象。快照生成完成后，`conchd` 继续维护三类快照之间的关联关系，使它们能够共同表示一个虚拟机在某一时刻的完整运行状态。

在基于快照启动虚拟机时，外部 User / Agent 同样通过 SDK 发起请求，**`conchd` 根据快照标识找到对应的 VM Snapshot、Memory Snapshot 和 Rootfs Snapshot，**再据此恢复虚拟机基础启动信息、运行现场、内存状态和文件系统状态。三部分内容恢复完成后，系统即可重新得到一个与快照生成时一致的虚拟机运行现场，Agent 也能够从该状态继续执行。

### 网络模块：池化机制消除启动瓶颈

网络模块基于 Linux 原生组件为 Conch 沙箱提供网络连接能力，并通过池化机制管理网络资源生命周期，使整个流程形成一条结构清晰的连通路径。具体设计及通路如图 4 所示：

![Conch 网络系统：数据面路径流程图](/img/blog/conch-millisecond-sandbox-engine/network-system.png)

*图 4 Conch 网络系统：数据面路径流程图*

#### 核心概念

- **网络资源单元（slot）：**一个可复用的网络资源单元，包含沙箱网络空间、veth pair、tap 接口、地址/路由以及对应 NAT 配置等。
- **沙箱网络（Sandbox netns）：**沙箱专属的网络上下文，用于承载 VM 接入点及沙箱侧网络配置。
- **宿主机网络（Host netns）：**负责桥接、路由转发、NAT 和与外部网络的连通。

#### 工作流程

- **数据面：**数据包由 VM 内应用发起，经虚拟网卡进入沙箱侧接口 tap，再通过 veth pair 接入宿主机桥接，随后进入宿主机转发与 NAT 映射后发往外部网络；回包沿同一路径反向返回，并由 conntrack/反向 NAT 映射回原沙箱连接。
- **控制面：**模块通过池化机制预创建并维护可分配网络资源单元；沙箱创建时领取一个可用单元并完成挂载；沙箱释放时，其占用的健康单元回收到池中复用，若发现异常则删除；服务退出时统一清理队列中和在用的网络资源单元。

当前已实现从沙箱到外部网络的全部连通、资源复用、池化以及回收。后续可进一步做到更高并发度、更细颗粒度的隔离与策略控制。

## 03 使用案例：Conch 的实战表现

为了让大家更直观地感受 Conch 沙箱引擎的实际效果，本章节将重点展示基于快照启动性能，以及集成 Claude Code 的安全开发案例。环境安装部署流程如下：

```bash
git clone https://atomgit.com/openeuler/Conch.git
cd Conch
git checkout dev
make && make install  # 一键式安装部署
./bin/conchd          # 启动宿主机守护进程 conchd
```

### 案例 1：快照启动示例

通过运行性能测试脚本，对比了两种启动模式下“从沙箱启动到执行代码结束”的端到端耗时。以下为该场景的核心逻辑伪代码（具体脚本内容可见代码仓 `example/perf.py`），执行结果如图 5 所示：

```python
box = Sandbox()                 # 创建沙箱对象
box.create()                    # 镜像冷启动沙箱实例
box.execute()                   # 执行任务
box.pause()                     # 当前运行状态打快照
box.create_by_snapshot()        # 快照热启动新沙箱实例
box.execute()                   # 再次执行任务
```

- **镜像冷启动：**需完整执行沙箱启动、内核初始化、`conch-agent` 启动、Python 解释器启动，端到端耗时为 2.08s。
- **快照热启动：**利用快照恢复特性，通过内存映射直接还原执行现场，跳过了引导环节，耗时仅为 88ms。

![镜像和快照启动性能结果](/img/blog/conch-millisecond-sandbox-engine/startup-performance.png)

*图 5 镜像和快照启动性能结果*

### 案例 2：Claude Code 示例

通过 Conch SDK 为 Claude Code 动态构建隔离边界。以下为该场景的核心逻辑伪代码（具体脚本内容可见代码仓 `example/run_claude.py`），执行结果如图 6 所示：

```python
box = Sandbox()  # 创建沙箱对象
box.create()     # 启动沙箱实例，获得 sandbox_ip
add_config(box)  # 配置注入：如 .claude/settings.json 或 SSH key
box.execute(
    "claude",
    args=["-p", "What's the day today?"],
)                # 在沙箱内运行 claude -p，执行非交互式任务
os.system("ssh root@sandbox_ip")  # 通过 SSH 进入沙箱使用 Claude TUI 终端界面
box.delete()     # 销毁沙箱实例，清空环境
```

![Conch 沙箱内 Claude Code 交互界面](/img/blog/conch-millisecond-sandbox-engine/claude-code.png)

*图 6 Conch 沙箱内 Claude Code 交互界面*

## 04 总结与展望

Conch 为 AI Agent 提供了一套兼顾安全隔离与毫秒级响应的执行边界。Conch 将沙箱启动模式从“镜像启动”转变为“快照启动”，在实现强隔离的同时，将时延缩短至毫秒级。

未来，Conch 将持续突破性能瓶颈并构建“超节点”生态。在性能方面，通过引入 EROFS 懒加载实现镜像按需加载，并结合鲲鹏 KAE 硬件加速以提升大规模部署效率。在技术竞争力上，探索基于分布式文件系统的镜像统一管理，实现跨机镜像共享，构建超节点优势。在生态建设上，Conch 通过对接 containerd snapshotter 接口深度融入云原生生态。

## 社区与项目地址

openEuler SIG-CloudNative 已面向开发者开源核心技术方案，诚邀行业伙伴、高校与个人开发者交流合作方向。

- 项目地址：[https://atomgit.com/openeuler/Conch](https://atomgit.com/openeuler/Conch)
- 供稿：胡张颖、陈紫彤、李世娴、叶克炉、罗宇霆、敬锐
- 编辑：丘云
- 校审：刘靖蓉、郑振宇、刘彦飞
