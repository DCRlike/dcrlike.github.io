---
sidebar_position: 1
slug: /getting-started/intro
title: Conch 介绍
---

# Conch — Agent Sandbox Engine

Conch 是一个基于 Go 开发的容器沙箱引擎，适用于 Agent 对沙箱的安全隔离、启动性能与弹性、高密部署和运行性能等诉求。项目支持 Agent 原生的沙箱管理 API 和 SDK，支持 StratoVirt、Cloud Hypervisor 等多种 microVM 隔离沙箱，通过快照 Template 实现 60 ms 启动，并使用内存快照 CoW 和 rootfs 快照 virtio-pmem DAX 消除重复内存占用，同时支持超节点部署形态加速。

项目围绕以下 Agent 对沙箱的新需求展开：

1. **新生态**：相比传统命令行和 K8s 云原生生态，提供 Agent 原生的沙箱管理 API 和 SDK；
2. **新镜像**：相比传统 OCI v1 容器镜像格式，提供 EROFS 镜像格式，统一管理容器镜像和快照；
3. **新硬件（超节点）**：相比传统单机管理容器镜像，利用超节点高速互联能力，提供跨级镜像共享和管理机制。

## 核心特性

- **安全隔离** — 支持 StratoVirt、Cloud Hypervisor 等多种 microVM 隔离沙箱，为 Agent 任务提供安全的执行环境。
- **极速启动** — 通过快照 Template 实现 60 ms 启动，满足 Agent 工作负载对启动性能与弹性的要求。
- **高密部署** — 使用内存快照 CoW 和 rootfs 快照 virtio-pmem DAX 消除重复内存占用，并支持超节点部署形态加速。

## 项目组成

| 组件 | 说明 |
| --- | --- |
| `conchd` | 沙箱守护进程，提供 HTTP API、管理 Template 与 Sandbox |
| `conch` | 命令行工具，用于管理 Template、镜像与 Sandbox |
| `conch-init` | sandbox 内 Agent，提供命令执行、文件传输等 RPC 服务 |
| `conch-init-initramfs` | 极简 initramfs，用于启动 guest |

## 快速上手

- [安装](/docs/getting-started/installation)：准备环境并选择源码或 RPM 安装方式
- [核心概念](/docs/getting-started/core-concepts)：了解 Sandbox、Template、Image 和 Snapshot
- [沙箱创建与删除](/docs/user/sandbox-lifecycle)：创建第一个 Sandbox

## 许可证

木兰宽松许可证，第 2 版（Mulan PSL v2）。
