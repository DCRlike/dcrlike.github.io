---
slug: conch-complete-sandbox-image
title: "openEuler Conch Sandbox Engine: What Does a Complete Sandbox Image for AI Agents Look Like?"
tags: [openEuler, Conch, AI Agent, Sandbox Image]
description: How Conch uses a complete Sandbox image to represent a rootfs, Sandbox boot components, and optional memory-state snapshots together.
---

## Introduction

AI Agents can think and act independently, and their runtime is evolving from stateless containers into stateful Sandboxes where configuration changes frequently and dependencies are installed dynamically. When an Agent needs to modify system configuration, install toolchains, run complex tasks for long periods, and frequently **resume its execution state** across nodes, traditional container-image distribution reaches its limits.

Conch, introduced by OpenAtom openEuler, is a Sandbox engine designed for this scenario. The previous article, [“openEuler Conch Sandbox Engine: Putting a Conch Shell Around a Troublesome Lobster in Milliseconds”](https://mp.weixin.qq.com/s/cpSrWvow71tzlNr6rziOCg), introduced Conch in detail. This article explores its architecture through three central questions:

1. Why do traditional OCI images fall short for AI Agent Sandboxes?
2. What has the industry built, and what is still missing?
3. How does Conch fill that gap, and how do users work with it?

<!-- truncate -->

## 01 Where traditional OCI images fall short for AI Agent Sandboxes

AI Agent Sandboxes have evolved from simple process containers into complete system environments that are isolated, dynamically modifiable, and able to resume execution from a saved point. An image must deliver not only an application `rootfs`, but also Sandbox boot dependencies, relationships among components, and the ability to restore a task's runtime state. Traditional OCI images standardize `rootfs` packaging, addressing, and registry distribution, but have two major limitations in strongly isolated AI Agent Sandboxes.

### 1.1 Limited image scope cannot describe a complete bootable Sandbox

An OCI image focuses on the application root file system. It packages business applications, system dependencies, configuration files, and layer metadata, which is enough for ordinary stateless containers. In a strongly isolated MicroVM-based Agent Sandbox, a `rootfs` alone cannot start a complete environment:

- Virtualization boot components such as the Kernel and Initrd must be configured and maintained separately by the host runtime. They cannot share version management, distribution, and rollback with the business image.
- There is no standard description of the task's execution state. The image cannot define the bound recovery relationship among file-system changes, VM state, and memory context, so a long Agent task cannot resume on another node or roll back after interruption.

> Put simply, a traditional OCI image can describe which files an application contains, but not how its Sandbox boots, how runtime state is restored, or how all required components belong together.

### 1.2 No unified orchestration for multiple Sandbox components

The container ecosystem already has mature `rootfs` data-plane acceleration. Tools such as eStargz, SOCI, and Nydus support indexed prefetching, sidecar metadata, block-level storage optimization, and cross-image deduplication. They enable on-demand pulls and faster startup, greatly improving the distribution of one root file system.

Their scope, however, remains limited to the `rootfs`; they do not standardize the organization of all Sandbox components. Once kernels, VM snapshots, and memory runtime state are involved, several gaps remain:

1. Component dependencies have no explicit index. A target node must reconstruct relationships through external scripts or manual conventions, which easily produces inconsistent environments.
2. Only the `rootfs` uses standardized registry distribution. Kernels, snapshot chains, and memory state must be transferred and configured separately, preventing one-step movement of the whole Sandbox across nodes.
3. Base environments, boot components, and runtime snapshots are managed together without clear reuse boundaries, making components harder to replace or reuse and limiting fine-grained storage deduplication.

Conch fills this gap at the image-semantics layer. It packages the `rootfs`, `sandbox` boot components, and an optional `mem-snapshot` into one image artifact that can be published, pulled, unpacked, and restored on another machine.

Conch currently converts existing OCI images into native EROFS and organizes multiple components through `boot index` metadata. Future work will add block-level on-demand loading, block-granularity cross-image deduplication, and multiple storage backends to improve image movement and storage efficiency in large Agent clusters.

![Traditional OCI image and Conch complete Sandbox image formats](/img/blog/conch-complete-sandbox-image/oci-vs-conch.png)

Figure 1. Traditional OCI and complete Conch Sandbox image formats.

The figure compares their scope. OCI primarily covers the application rootfs. Conch uses a boot index to organize the rootfs, Sandbox components, and optional mem-snapshot as a bootable and restorable Sandbox image.

## 02 The Conch solution: Full-Sandbox-Image

Conch uses unified image semantics to package scattered components as **one complete, distributable Sandbox runtime unit**.

### What is a complete Sandbox?

> **Complete Sandbox:** The smallest closed set of elements required to run, move, and restore an AI Agent task. In addition to a traditional file system (rootfs), it explicitly includes the virtualization-boundary components that make it run (Kernel/Initrd) and optional runtime state (Memory State). A unified metadata index (Boot Index) describes the strong recovery relationships among them.

Conch defines two **core objects** for this model:

1. `sandbox-image` (cold-start image)
2. `sandbox-snapshot` (warm-start snapshot image)

### Core terms and technical boundaries

| Object | Problem it solves | What it does not solve directly |
| --- | --- | --- |
| Traditional OCI image | Application rootfs and layer metadata | Standardized distribution of application content |
| `sandbox-image` | Turns an existing rootfs into a bootable Sandbox image | Does not include memory state from a particular run |
| `sandbox-snapshot` | Turns runtime state into a restorable, distributable image | Must be paused and exported at a stable point; does not replace all runtime scheduling |

![Conch Boot Index and Manifest structure](/img/blog/conch-complete-sandbox-image/boot-index-manifest.png)

Figure 2. Conch Boot Index and Manifest structure.

The diagram shows how Conch builds on OCI Image Index, distinguishes `rootfs`, `sandbox`, and `mem-snapshot` components with annotations such as `io.conch.kind`, and restores local snapshotter and component relationships after `conch pull` / `unpack`.

## 03 Core workflow: Building and moving images

The current Conch workflow centers on five commands:

- `conch convert`
- `conch push`
- `conch snapshot export`
- `conch pull`
- `conch unpack`

Together they solve the end-to-end problem: start with an existing OCI rootfs, generate a native Conch image, publish it to a registry, then pull it on a target machine and restore it as a local runnable object.

![Conch image workflow](/img/blog/conch-complete-sandbox-image/image-workflow.png)

Figure 3. Conch image workflow.

The workflow starts with an existing OCI rootfs, uses `conch convert` to produce a `sandbox-image`, and distributes and restores it through `conch push` / `pull` / `unpack`. It also shows the two snapshot paths: `conch convert --snapshot` and `conch snapshot export`.

### 3.1 Convert an OCI image into a sandbox-image

Suppose a user has a traditional OCI image containing a large Python AI toolchain and needs to turn it into a complete Sandbox image that Conch can start directly. The first step is:

```bash
conch convert --source docker.io/library/ubuntu:latest \
  --kernel ./vmlinux-5.10 \
  --initrd ./conch.initrd \
  --tag localhost/conch/ai-agent-sandbox:v1
```

**Convert internals:**

1. **Rootfs conversion:** Conch extracts the layers of the original OCI image, flattens them, and converts them directly into **native EROFS (Enhanced Read-Only File System)**. This native EROFS rootfs is better suited to read-only Sandbox mounting and compressed storage and provides a foundation for future block-level lazy loading and fine-grained deduplication.
2. **Sandbox packaging:** The `--kernel` and `--initrd` inputs are archived as Sandbox-specific metadata components.
3. **Metadata generation:** Conch creates a `boot index` describing the relationship between them, writes it to local storage, and creates a manageable image record.

### 3.2 Create a base sandbox-snapshot in one step

In addition to an ordinary `sandbox-image`, `conch convert` can generate a `sandbox-snapshot` with base runtime state by using `--snapshot`:

```bash
conch convert --source docker.io/library/ubuntu:latest \
  --kernel ./bzImage \
  --initrd ./conch.initrd \
  --snapshot \
  -t localhost/conch/ubuntu-snapshot:latest
```

After converting the rootfs and packaging Sandbox components, this path automatically creates and pauses a Sandbox. It writes the generated mem-snapshot and its relationships with the rootfs and Sandbox into a new boot index. This is useful for a base boot-state snapshot after system initialization and provides a standard recovery baseline.

For a business-prewarmed snapshot—after dependencies are installed, toolchains are loaded, or Agent configuration is initialized—start a Sandbox from the `sandbox-image`, finish prewarming, and export with `conch snapshot export --sandbox-id`.

### 3.3 When to snapshot and how to build a sandbox-snapshot

**The critical timing:** A snapshot cannot be built from nothing. It must be triggered when the Sandbox has reached a **deterministic, valuable, and stable state**.

The Conch SDK can pause a running Sandbox to generate a snapshot. Because this article focuses on image construction, the discussion here is limited to snapshot images.

`sandbox-snapshot` has two typical use cases:

- A `warmup-snapshot` reuses a standard environment after dependency deployment and toolchain initialization.
- A `stage-snapshot` saves a checkpoint in a long-running Agent task for failure rollback or cross-machine continuation.

These are scenario names only; the core image artifact remains `sandbox-snapshot`.

There are three common ways to generate one:

- `conch convert --snapshot`: Create a base boot-state snapshot image in one step from an existing OCI rootfs.
- `conch snapshot export --sandbox-id`: Export a running Sandbox. The command pauses it internally so file-system, VM, and memory state remain consistent, then generates a snapshot image that can move across nodes.
- `conch snapshot export --snapshot-id`: Export from an existing stable rootfs snapshot without pausing. It resolves existing metadata and the snapshot dependency chain, making it useful for a fixed environment baseline.

`conch snapshot export` is a dedicated CLI command for building a snapshot image from a running Sandbox. It pauses the current Sandbox before exporting the image.

```bash
conch snapshot export \
  --sandbox-id <running-sandbox-id> \
  -t localhost/conch/ai-agent-snapshot:v1
```

If a rootfs snapshot ID already exists, export from it instead:

```bash
conch snapshot export \
  --snapshot-id <rootfs-snapshot-id> \
  -t localhost/conch/ai-agent-snapshot:v1
```

During export, Conch resolves the mem/sandbox snapshot relationships recorded by the rootfs snapshot, finds the corresponding snapshot chain, and generates a new boot index. The resulting `sandbox-snapshot` is a complete Sandbox image with a restorable execution state.

### 3.4 Publish, pull, and restore

OCI Artifacts allow a standard Registry to store arbitrary descriptor types and binary Blobs. The Registry is still a static content-addressable store, however, and cannot understand the components inside `sandbox-image` and `sandbox-snapshot` or the decoupled kernel-assembly semantics used at Sandbox startup.

**The closed-loop Conch solution:** Extend capabilities with custom annotations on OCI descriptors while remaining fully compliant with OCI artifacts. Existing registries require no changes.

- **Push:** `conch push` distributes the Conch `boot index` and referenced content: the native EROFS rootfs, `sandbox` components (`kernel/initrd`), and optional `mem-snapshot` chains. The boot index describes component types, references, and recovery relationships instead of treating them as an ordinary container rootfs.
- **Registry view:** The Registry still sees OCI artifacts/manifests and blobs that it can receive, store, and transfer with existing mechanisms. It does not understand how those components form a bootable or restorable Sandbox.
- **Pull & Unpack:** After `conch pull` on another machine, Conch parses the boot index and annotations, identifies the rootfs, Sandbox, and mem-snapshot objects, and enters its own unpack path. On the target host it restores the EROFS snapshotter, local image records, and snapshot relationships, then lets the runtime start the Sandbox through either cold boot or snapshot recovery.

Usage examples follow.

`conch push` accepts a local image reference and remote image address directly, so no prior `conch tag` is required:

```bash
conch push localhost/conch/ai-agent-sandbox:v1 hub.oepkgs.net/conch/ai-agent-sandbox:v1
```

`conch pull` retrieves a native Conch image and unpacks it automatically:

```bash
conch pull hub.oepkgs.net/conch/ai-agent-sandbox:v1
```

For a local image, run `conch unpack` separately:

```bash
conch unpack hub.oepkgs.net/conch/ai-agent-sandbox:v1
```

Unpack restores the component relationships described by the boot index into the local snapshotter. The rootfs enters the EROFS snapshotter, and the relationships to Sandbox and mem-snapshot components are rebuilt. The runtime now receives a local object set it can consume.

## 04 Prototype example

Developers can validate Conch through one minimal end-to-end path: generate a `sandbox-image` from an existing OCI rootfs, start and initialize a Sandbox, export a `sandbox-snapshot`, and finally restore it on a target machine.

The path verifies three questions:

- Can an existing OCI rootfs become a bootable `sandbox-image`?
- After registry distribution, can the target automatically unpack the `sandbox-image` and restore local runtime relationships?
- Can a running Sandbox be exported as a distributable and restorable `sandbox-snapshot`?

**Steps:**

1. Run `conch convert` to create a `sandbox-image` from an existing OCI rootfs.
2. Run `conch push / conch pull` to move it through a registry and unpack it automatically on the target.
3. Start a Sandbox with the `sandbox-image` and verify that rootfs and Sandbox components combine correctly.
4. Initialize or prewarm the Sandbox by installing dependencies, writing configuration, or loading a toolchain.
5. Run `conch snapshot export --sandbox-id ...` to export its runtime state as a `sandbox-snapshot`.
6. Publish and pull the `sandbox-snapshot`, then start the Sandbox through the snapshot-recovery path on the target.

This validates the core value of both objects: a `sandbox-image` turns an existing rootfs into a bootable Sandbox image, while a `sandbox-snapshot` turns runtime state into a recovery artifact that can move across machines.

![End-to-end verification for a complete Conch Sandbox image](/img/blog/conch-complete-sandbox-image/end-to-end.gif)

Figure 4. End-to-end verification for a complete Conch Sandbox image.

The demonstration converts an OCI rootfs into a sandbox-image, starts the Sandbox and exports a sandbox-snapshot, then restores the Sandbox runtime state from that snapshot image in the target environment.

## 05 Summary and next steps

The current Conch image system now provides a complete end-to-end workflow: OCI rootfs conversion, sandbox-image construction, three paths for generating sandbox-snapshots, standard Registry distribution, automatic pull and unpack on a target node to restore component relationships, and Sandbox cold start or snapshot recovery. It supports standardized AI Agent Sandbox delivery, cross-node runtime-state migration, and continuation of interrupted tasks.

**Planned work**

- **Lazy loading:** Start without waiting for a complete snapshot download to improve large-scale distribution.
- **Tiered hypernode cache over high-speed interconnects:** Improve deployment performance without sacrificing runtime performance and eliminate redundant storage through sharing.
- **Multiple backends:** Support remote storage such as standard OCI registries, object storage, and block storage across infrastructure environments.
- **Block-level cross-image deduplication:** Add fine-grained block deduplication for multi-version snapshots and large Agent fleets, reducing repeated storage and improving cluster resource use.

**Join the community**

Conch has open-sourced its complete core solution in the openEuler SIG-CloudNative community. Industry partners, universities, and individual developers are invited to discuss technical ideas and help improve the project.

Join the SIG-CloudNative technical group through the community assistant, or visit the AtomGit repository to read the project material and submit issues.

Project: [https://atomgit.com/openeuler/Conch](https://atomgit.com/openeuler/Conch)

> **Previous article:** [“openEuler Conch Sandbox Engine: Putting a Conch Shell Around a Troublesome Lobster in Milliseconds”](https://mp.weixin.qq.com/s/cpSrWvow71tzlNr6rziOCg)

---

**Copyright notice:** Copyright © 2026 openEuler Community. This article was first published by the openEuler community and may be redistributed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/legalcode). Please retain the original link and author information when redistributing it.

**Disclaimer:** This article represents only the author's views and not those of this website. The website remains neutral regarding its statements and judgments and makes no express or implied guarantee of their accuracy, reliability, or completeness. The article is for reference only; readers assume all resulting legal responsibility.
