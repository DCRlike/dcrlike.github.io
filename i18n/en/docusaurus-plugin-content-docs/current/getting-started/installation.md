---
sidebar_position: 2
title: Installation
---

# Installation

Conch supports Linux 5.10+ on `x86_64` and `aarch64`. The host must provide `/dev/kvm` and at least one usable IPv4 default route. Installing system dependencies requires root privileges.

## Required Tools

| Tool | Requirement | Installation path or source |
| --- | --- | --- |
| Go | 1.26.2+ | [Official installation](https://go.dev/doc/install); add the command to `PATH`. |
| Git, GNU Make | Distribution version | System package manager. |
| Cloud Hypervisor | v52.0-conch | [Conch release](https://github.com/ConchSandbox/cloud-hypervisor/releases/tag/v52.0-conch); install as `/usr/local/bin/cloud-hypervisor`. |
| erofs-utils | 1.9+ with `mkfs.erofs --fsalignblks` | System package manager or [source installation](https://erofs.docs.kernel.org/en/latest/install.html); add to `PATH`. |
| CNI plugins | `bridge`, `host-local` | [Official releases](https://github.com/containernetworking/plugins/releases); install under `/usr/libexec/cni`. |
| iptables, util-linux | Provide `iptables` and `nsenter` | System package manager. |
| kmod | Provides `modprobe` for modular kernels | System package manager. |

Optional tools:

| Use | Tool | Requirement or path |
| --- | --- | --- |
| Python SDK | Python 3.10+, pip, venv | Use a repository-local `.venv`. |
| `volume_mounts` | virtiofsd 1.13.3+ | [Official releases](https://gitlab.com/virtio-fs/virtiofsd/-/releases); default path `/usr/libexec/virtiofsd`. |
| Protobuf changes | protoc | System package manager; `make gen-proto-*` installs the other plugins. |
| initramfs build | cpio, gzip | System package manager. |

## Installation

### Distribution Packages

openEuler, Fedora, CentOS, and RHEL:

```bash
sudo dnf install -y git make curl tar \
  iptables util-linux kmod erofs-utils containernetworking-plugins
```

Debian and Ubuntu:

```bash
sudo apt-get update
sudo apt-get install -y git make curl tar \
  iptables util-linux kmod erofs-utils containernetworking-plugins
```

### Go

Follow the [official Go installation guide](https://go.dev/doc/install) to install Go 1.26.2+ and add `go` to `PATH`.

### Cloud Hypervisor

Download Cloud Hypervisor v52.0-conch from the [ConchSandbox release](https://github.com/ConchSandbox/cloud-hypervisor/releases/tag/v52.0-conch) and install it as `/usr/local/bin/cloud-hypervisor`.

| Host architecture | Asset |
| --- | --- |
| `x86_64` | `cloud-hypervisor-static` |
| `aarch64` | `cloud-hypervisor-static-aarch64` |

### CNI Plugins

Conch loads `bridge` and `host-local` from `/usr/libexec/cni` by default. If the distribution installs them elsewhere, add the actual path to `network.cni.plugin_bin_dirs`. Conch brings up the loopback interface directly through netlink, so the `loopback` CNI plugin is not required.

### erofs-utils

If the distribution's `mkfs.erofs` does not support `--fsalignblks`, install version 1.9+ from source using the [EROFS instructions](https://erofs.docs.kernel.org/en/latest/install.html).

## Host Configuration

Install the repository CNI configuration and load the required kernel modules:

```bash
sudo install -d -m 0755 /etc/conch/cni/net.d
sudo install -m 0644 config/cni/net.d/10-conch.conf /etc/conch/cni/net.d/10-conch.conf
sudo modprobe erofs
sudo modprobe vhost_vsock
```

Conch stores the libcni result cache under `<server.state_dir>/cni/results` and host-local IPAM state under `<server.state_dir>/cni/networks`. Ensure that the CNI subnet does not overlap the host, cluster, or guest tap subnet.

Before starting `conchd`, verify that the host has a usable IPv4 default route such as `default via 192.168.1.1 dev eth0`. Network-pool initialization fails if Conch cannot find `0.0.0.0/0`.

If a binary is installed elsewhere, put its absolute path in the local configuration:

```yaml
sandbox:
  cloud_hypervisor:
    binary: /actual/path/to/cloud-hypervisor
volume:
  virtiofs:
    binary: /actual/path/to/virtiofsd
```

## Verification

```bash
go version
cloud-hypervisor --version
mkfs.erofs --help 2>&1 | grep -- --fsalignblks
test -x /usr/libexec/cni/bridge
test -x /usr/libexec/cni/host-local
test -r /dev/kvm -a -w /dev/kvm
grep -w erofs /proc/filesystems
test -e /dev/vhost-vsock
```

After these checks pass, choose an installation path:

- [Build and Start from Source](/docs/getting-started/source-build)
- [RPM Installation and Service Management](/docs/getting-started/rpm-install)
