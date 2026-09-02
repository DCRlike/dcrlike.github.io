---
sidebar_position: 1
slug: /getting-started/intro
title: Introduction to Conch
---

# Conch — Agent Sandbox Engine

Conch is a Go-based container sandbox engine built for the isolation, startup performance, elasticity, density, and runtime performance requirements of AI agents.

The project focuses on three new requirements for agent sandboxes:

1. **A new ecosystem**: agent-native sandbox management APIs and SDKs instead of relying only on traditional CLIs or Kubernetes-native workflows.
2. **A new image format**: EROFS images that manage container images and snapshots together instead of traditional OCI v1 image layers.
3. **New hardware (hypernodes)**: image sharing and management across hierarchy levels over high-speed hypernode interconnects.

## Core Features

- **Secure isolation** — Run agent tasks in isolated microVM sandboxes backed by StratoVirt, Cloud Hypervisor, and other supported VMMs.
- **Instant startup** — Start snapshot-based Templates in 60 ms for elastic agent workloads.
- **High-density deployment** — Eliminate duplicate memory usage through memory-snapshot CoW and rootfs snapshots backed by virtio-pmem DAX, with support for accelerated hypernode deployments.

## Components

| Component | Description |
| --- | --- |
| `conchd` | Sandbox daemon that exposes the HTTP API and manages Templates and Sandboxes. |
| `conch` | CLI for managing Templates, images, and Sandboxes. |
| `conch-init` | In-Sandbox agent that provides command execution, file transfer, and other RPC services. |
| `conch-init-initramfs` | Minimal initramfs used to boot the guest. |

## Get Started

- [Installation](/docs/getting-started/installation): prepare the environment and choose a source or RPM installation path.
- [Core Concepts](/docs/getting-started/core-concepts): understand Sandbox, Template, Image, and Snapshot.
- [Create and Delete Sandboxes](/docs/user/sandbox-lifecycle): create your first Sandbox.

## License

Mulan Permissive Software License, Version 2 (Mulan PSL v2).
