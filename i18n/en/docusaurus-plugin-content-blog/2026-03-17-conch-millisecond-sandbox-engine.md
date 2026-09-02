---
slug: conch-millisecond-sandbox-engine
title: "openEuler Conch Sandbox Engine: Putting a Conch Shell Around a Troublesome Lobster in Milliseconds"
tags: [openEuler, Conch, AI Agent, Sandbox]
description: How Conch gives AI Agents a sandbox execution environment with secure isolation, snapshot recovery, and millisecond startup.
---

## 01 Background

As AI Agent projects such as OpenClaw develop rapidly, the problems with deploying agents directly on a host or bare inside a virtual machine are becoming increasingly apparent. Developers grant AI Agents deep access to system resources, including file-system operations and peripheral-driver management, so that they can handle complex work like real employees. This also introduces several problems:

- **Damage to the host environment:** Prompt injection, model hallucinations, complex regular expressions, or mishandled symbolic links can easily damage the host and leave it irrecoverable.
- **Failures cannot be repaired:** An Agent can easily contaminate its environment during a task, for example by changing configuration or damaging library files. There is no mechanism to roll back instantly to the last working state when the environment fails.
- **Inefficient deployment:** Bare-metal and virtual-machine deployments take minutes. Even containerized deployments suffer nonlinear degradation when many instances start concurrently. Large-scale Agents need a way to start task Sandboxes in milliseconds without sacrificing isolation or deployment efficiency.

To address these issues, the CloudNative SIG of the **OpenAtom openEuler community introduced Conch, a next-generation Sandbox engine that combines strong isolation, scalability, and millisecond startup.** It provides a dependable execution foundation for AI Agents—putting a conch shell around a mischievous lobster so it can work safely.

<!-- truncate -->

![A lobster inside a conch shell, generated with Jimeng AI](/img/blog/conch-millisecond-sandbox-engine/lobster-conch.png)

## 02 Conch: A robust Sandbox engine built for AI Agents

Conch uses a modular, layered architecture to give AI Agents both physical-grade isolation and immediate responsiveness. Figure 1 shows its overall architecture.

![Overall Conch architecture](/img/blog/conch-millisecond-sandbox-engine/architecture.png)

*Figure 1. Overall Conch architecture*

**Conch separates its core functions into four independent modules: image services, memory snapshots, network resources, and Sandbox execution.** The modules communicate asynchronously through standardized interfaces. When a user requests code execution or file transfer, the unified Python SDK sends the request to the host daemon, `conchd`, for scheduling and resource validation. The request ultimately reaches the resident `conch-agent` inside the virtual machine, which drives the AI Agent to perform the task.

Conch also addresses, at the architecture level, the three central problems of bare OpenClaw and other AI Agent deployments: host damage, unrecoverable failures, and inefficient deployment.

- **Strong isolation—a physical-grade private room:** Cloud Hypervisor uses virtualization to create an independent kernel boundary for every Agent, physically separating the Sandbox from the host and protecting the host against malicious code.
- **Snapshot rollback—restore the scene in milliseconds:** A three-layer Rootfs, VM, and Memory architecture maps historical snapshots with copy-on-write (CoW). When an environment is contaminated or attacked, it can return to its original clean execution state in milliseconds without reinstalling the system.
- **Fast startup—pooled and ready to use:** Memory mapping loads a prewarmed VM Template directly, while preallocated network-resource units bypass lengthy BIOS and kernel boot sequences so a Sandbox can start in milliseconds.

### Image system: An image architecture for AI Agent Sandboxes

AI Agent scenarios are becoming increasingly varied, including Computer Use and Android Use. Traditional container images cannot easily support these complex system-level interactions. Conventional lightweight VMs such as Kata also lack flexibility because the kernel is fixed on the host, making dynamic kernel-version adaptation difficult for different Agents.

**Conch therefore uses a unified Kernel + Rootfs image design** that packages system resources in a standard form for on-demand loading and kernel isolation across scenarios. **A Snapshot Image mechanism is also planned** to preserve runtime state for warm startup and state reuse, combining dynamic adaptation with low latency for AI Agent Sandboxes.

This design gives Conch an end-to-end architecture from kernel packaging to layered mounts. Figure 2 shows the build and load flow of the image system.

![Conch image system: layered Sandbox image build and load flow](/img/blog/conch-millisecond-sandbox-engine/image-system.png)

*Figure 2. Conch image system: layered Sandbox image build and load flow*

#### Core concepts

- **Build Module—the dual-path build core:** Packages `bzImage + initrd` as a kernel image while converting EROFS Layers into a Rootfs image, then combines them into a standard Sandbox Image.
- **Sandbox Image—the standardized runtime artifact:** Combines the kernel and Rootfs images, with snapshot images planned for the future. It supports on-demand pulls and layered reuse across scenarios and can use stored runtime state for warm startup.
- **EROFS Rootfs—the image runtime foundation:** Converts container images into read-only layers backed by the high-performance EROFS file system. At VMM Sandbox startup, these layers mount as the read-only side of the overlay rootfs, preserving system consistency and high I/O efficiency.

#### Workflow

**Build time:**

Source/configuration → kernel build + kernel packaging (`bzImage + initrd`) + Rootfs conversion (EROFS layers) → Sandbox Image.

**Runtime:**

1. Cold start: Pull image → boot VM kernel → mount EROFS layers into Overlay → prepare the Sandbox runtime.
2. Warm start: Pull image, including snapshot components → restore state (Snapshot Restore) → task is ready immediately.

### Snapshot system: Three layers for warm Sandbox startup

In AI Agent scenarios, a Sandbox commonly runs an Agent such as Claude or OpenClaw continuously. During a task, tool-call errors, context contamination, or an incorrect execution path can put the Agent into a bad state. The system must be able not only to launch a fresh environment, but also to save the current virtual machine and quickly restore its last known-good state. The snapshot module is designed for this workflow.

The following diagram shows snapshot creation and Sandbox restoration.

![Conch snapshot system: three decoupled layers for fast recovery and dense reuse](/img/blog/conch-millisecond-sandbox-engine/snapshot-system.png)

*Figure 3. Conch snapshot system*

When an external client requests a snapshot of a Sandbox running an Agent task, the system persists its file-system state as a Rootfs Snapshot. It persists the VM execution context and memory state together as a Memory Snapshot, then combines them with basic boot information such as the kernel and initrd stored in the VM Snapshot. This forms one complete set of snapshot objects. After generation, `conchd` maintains the relationships among all three snapshot types so that together they represent the complete VM state at one moment.

To start a VM from a snapshot, an external user or Agent again sends a request through the SDK. **`conchd` uses the snapshot identifier to locate the corresponding VM Snapshot, Memory Snapshot, and Rootfs Snapshot.** It restores the VM's basic boot information, execution context, memory, and file-system state. Once all three parts are restored, the system recreates the VM execution context from the snapshot, allowing the Agent to continue from that state.

### Network module: Pooling removes startup bottlenecks

The network module uses native Linux components to connect Conch Sandboxes. It manages network-resource lifecycles through pooling, creating a clear end-to-end connection path. Figure 4 shows the design and data path.

![Conch network system: data-plane path](/img/blog/conch-millisecond-sandbox-engine/network-system.png)

*Figure 4. Conch network-system data plane*

#### Core concepts

- **Network resource unit (slot):** A reusable network-resource unit containing the Sandbox network space, a veth pair, tap interface, addresses and routes, and the corresponding NAT configuration.
- **Sandbox network (Sandbox netns):** A Sandbox-specific network context containing the VM attachment and Sandbox-side network configuration.
- **Host network (Host netns):** Provides bridging, route forwarding, NAT, and external connectivity.

#### Workflow

- **Data plane:** A packet originates in a VM application, enters the Sandbox-side tap through the virtual NIC, reaches the host bridge through a veth pair, and then leaves for the external network after host forwarding and NAT. Return traffic follows the same path in reverse and is mapped to the original Sandbox connection by conntrack and reverse NAT.
- **Control plane:** The module pre-creates and maintains allocatable network units in a pool. Sandbox creation claims and attaches an available unit. Releasing a Sandbox returns a healthy unit to the pool or deletes an invalid unit. Service shutdown cleans queued and allocated units.

Conch currently provides complete Sandbox-to-external-network connectivity, resource reuse, pooling, and recycling. Future work can support higher concurrency and finer-grained isolation and policy controls.

## 03 Use cases: Conch in practice

This section demonstrates snapshot-based startup performance and a secure development scenario integrating Claude Code. Install and deploy the environment as follows:

```bash
git clone https://atomgit.com/openeuler/Conch.git
cd Conch
git checkout dev
make && make install  # One-step installation and deployment
./bin/conchd          # Start the conchd host daemon
```

### Case 1: Snapshot startup

A performance script compared the end-to-end time from Sandbox startup through completion of code execution in two startup modes. The following pseudocode shows the core logic; see `example/perf.py` in the repository for the actual script. Figure 5 shows the results.

```python
box = Sandbox()                 # Create a Sandbox object
box.create()                    # Cold-start a Sandbox from an image
box.execute()                   # Run the task
box.pause()                     # Snapshot the current running state
box.create_by_snapshot()        # Warm-start a new Sandbox from the snapshot
box.execute()                   # Run the task again
```

- **Image cold start:** Performs the complete Sandbox startup, kernel initialization, `conch-agent` startup, and Python interpreter startup. End-to-end latency is 2.08 seconds.
- **Snapshot warm start:** Restores the execution context directly through memory mapping and skips the boot sequence, taking only 88 milliseconds.

![Image and snapshot startup performance](/img/blog/conch-millisecond-sandbox-engine/startup-performance.png)

*Figure 5. Image and snapshot startup performance*

### Case 2: Claude Code

The Conch SDK dynamically builds an isolation boundary for Claude Code. The following pseudocode shows the core logic; see `example/run_claude.py` in the repository for the actual script. Figure 6 shows the result.

```python
box = Sandbox()  # Create a Sandbox object
box.create()     # Start a Sandbox and obtain sandbox_ip
add_config(box)  # Inject configuration such as .claude/settings.json or an SSH key
box.execute(
    "claude",
    args=["-p", "What's the day today?"],
)                # Run claude -p non-interactively inside the Sandbox
os.system("ssh root@sandbox_ip")  # Enter over SSH and use the Claude TUI
box.delete()     # Destroy the Sandbox and clear the environment
```

![Claude Code inside a Conch Sandbox](/img/blog/conch-millisecond-sandbox-engine/claude-code.png)

*Figure 6. Claude Code inside a Conch Sandbox*

## 04 Summary and outlook

Conch gives AI Agents an execution boundary that combines secure isolation with millisecond response. It changes Sandbox startup from image startup to snapshot startup, reducing latency to milliseconds while preserving strong isolation.

Conch will continue to address performance bottlenecks and build a hypernode ecosystem. For performance, EROFS lazy loading will enable on-demand image loading, while Kunpeng KAE hardware acceleration will improve large-scale deployment efficiency. To strengthen the technology, unified image management on a distributed file system will enable cross-machine sharing and reinforce the hypernode advantage. For ecosystem integration, Conch will connect to the containerd snapshotter interface and become a deeper part of the cloud-native ecosystem.

## Community and project

The openEuler SIG-CloudNative has open-sourced the core technical solution and welcomes industry partners, universities, and individual developers to collaborate.

- Project: [https://atomgit.com/openeuler/Conch](https://atomgit.com/openeuler/Conch)
- Contributors: Hu Zhangying, Chen Zitong, Li Shixian, Ye Kelu, Luo Yuting, and Jing Rui
- Editor: Qiu Yun
- Reviewers: Liu Jingrong, Zheng Zhenyu, and Liu Yanfei
