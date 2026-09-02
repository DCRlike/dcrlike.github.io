---
title: 架构
sidebar_position: 4
---

# 架构

Conch 由控制面、Sandbox 运行时和 guest 内 Agent 组成。

```text
Agent / Python SDK / conch CLI
              |
              v
          conchd API
              |
    +---------+---------+
    |         |         |
 Template  Sandbox   Network / Storage
              |
              v
       microVM + conch-init
```

## 主要组件

| 组件 | 职责 |
| --- | --- |
| `conchd` | 提供 HTTP API，管理 Template、Sandbox、网络与存储资源。 |
| `conch` | 命令行客户端。 |
| Python SDK | 面向 Agent 的 Sandbox 管理和业务接口。 |
| VMM | 提供 StratoVirt、Cloud Hypervisor 等 microVM 隔离。 |
| `conch-init` | 在 guest 内提供命令执行、进程管理和文件传输。 |

## 详细设计

- [Storage](/docs/reference/storage)
- [Network](/docs/reference/network)
- [conch-init](/docs/reference/conch-init)
