---
title: Architecture
sidebar_position: 4
---

# Architecture

Conch consists of a control plane, a Sandbox runtime, and an in-guest agent.

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

## Main Components

| Component | Responsibility |
| --- | --- |
| `conchd` | Exposes the HTTP API and manages Templates, Sandboxes, networking, and storage. |
| `conch` | Command-line client. |
| Python SDK | Agent-facing Sandbox management and workload APIs. |
| VMM | Provides microVM isolation through StratoVirt, Cloud Hypervisor, and other supported backends. |
| `conch-init` | Provides command execution, process management, and file transfer inside the guest. |

## Detailed Design

- [Storage](/docs/reference/storage)
- [Network](/docs/reference/network)
- [conch-init](/docs/reference/conch-init)
