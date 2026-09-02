---
title: 核心概念
sidebar_position: 3
---

# 核心概念

本页建立 Conch 文档中共用的核心概念，具体操作和字段说明见用户手册与参考手册。

## Sandbox

Sandbox 是运行 Agent 工作负载的 microVM 隔离环境。每个 Sandbox 由一个 Template 启动，拥有独立的 VMM 进程、网络资源和 guest 内 `conch-init`。`conch-init` 提供命令执行、后台进程和文件传输接口。

Sandbox 创建时可以指定 CPU、内存、环境变量、网络策略和 Volume。省略的 Template 与资源字段由 conchd 的 `sandbox.default_spec` 补齐。Sandbox ID 可以由调用方指定，也可以自动生成。

## Template

Template 是创建 Sandbox 的可启动模板，与 OCI Boot Index 一一对应。一个 Template 同时包含：

- `Template Name`：用户可读、可复用的名称，例如 `localhost/conch/python:latest`；同名写入会让名称指向新的 Template ID。
- `Template ID`：Boot Index 的 OCI digest，例如 `sha256:...`；内容确定后不可变。

创建 Sandbox 时，`template_name` 与 `template_id` 二选一。Template 可以从普通 OCI Image 构建，也可以由运行中的 Sandbox checkpoint 生成。

## Image

Image 是承载 rootfs 和应用内容的普通 OCI 镜像，可作为 cold Template 的输入，但不能直接创建 Sandbox。Conch 会把 Image rootfs 转换为 EROFS，并与 guest kernel、initrd 一起发布为 Boot Index。

## Snapshot

Snapshot 是 Conch 内部管理的 containerd 快照。用户执行 checkpoint 后得到的是 `boot_mode=resume` 的 Template，而不是需要单独管理的 Snapshot 资源。该 Template 包含可恢复的 VMM 内存状态，并记录父 Template ID 与来源 Sandbox ID。

Checkpoint 不删除原 Sandbox，也不改变它的运行状态。当前带 Volume 的 Sandbox 不支持 checkpoint；从 resume Template 启动时也不能再挂载 Volume。

## Network Slot 与 Volume

- Network Slot 是可预创建、分配和回收的沙箱网络资源。
- Volume 将 host 上已存在的目录挂载到 guest 内指定路径。

Network Slot 负责 Sandbox 的 CNI 地址、network namespace、guest tap 和地址转换。`network` 策略只接受 IPv4 地址或 CIDR，用于限制 guest 的入站、出站流量。

Volume 当前使用 virtiofs。`source` 是 conchd 所在 host 上的绝对目录，`path` 是 guest 内的绝对目标路径；删除 Sandbox 不会删除 host 数据。

## 下一步

- [架构](/docs/getting-started/architecture)
- [沙箱创建与删除](/docs/user/sandbox-lifecycle)
- [模板管理](/docs/user/template-management)
