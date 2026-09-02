---
sidebar_position: 5
title: Storage
---

# Conch Volume Design

## 1. Goals

Conch volumes mount host directories into paths inside a Sandbox guest. Users declare host paths when creating a Sandbox, and Conch makes them available at the requested guest paths.

- Mount an existing absolute host directory at an absolute guest path.
- Keep the backend replaceable. The current backend is virtiofs; future implementations may use another shared filesystem or a VMM-native mount backend.

Dependencies:

- virtiofsd 1.13.3+
- Cloud Hypervisor v52.0-conch, or StratoVirt 2.5.0+ built with vhost-user-fs

## 2. Architecture

### 2.1 Architecture diagram

```text
Python SDK / conch CLI
        |
        v
conchd HTTP API
        |
        v
Sandbox Manager
        |
        +-----------------------------------+
        |                                   |
        v                                   v
Volume Mount Resolver              Shared Dir Backend (virtiofs)
        |                                   |
        v                                   v
/run/conch/sandboxes/<id>/volume/   virtiofsd process/socket (×1)
   ├─ 0/      (bind: host-path A)           |
   ├─ 1/      (bind: host-path B)           v
   └─ config.json                    VMM Adapter
        |                                   |
        v                                   v
   guest agent (passive)            VMM virtiofs device (×1)
        |
        v
   mount --bind per config.json entry
```

`Sandbox Manager` validates `volume_mounts`: count no greater than `max_mounts`, existing absolute `source`, protected absolute guest `path`, and unique target paths. It coordinates volume and VMM startup and cleans up after deletion or failed creation.

`Volume Mount Resolver` turns `volume_mounts` into a host bind plan (`source` to `<runtime>/volume/<index>`) and guest `config.json` entries (`index` to `path` and `readonly`).

The replaceable `Shared Dir Backend` boundary is currently implemented by virtiofs. It creates the per-Sandbox runtime and volume directories, performs host bind mounts, writes `config.json`, starts one virtiofsd, waits until its socket is connectable, returns the socket/tag to the VMM adapter, and cleans up virtiofsd and bind mounts.

`VMM Adapter` maps the device to backend-specific arguments. Cloud Hypervisor uses `--fs tag=...,socket=...`; StratoVirt uses one `vhost-user-fs-pci`. Both add a small sharefs switch to the kernel command line.

At boot, the passive guest agent checks for `conch.sharefs=virtiofs`. If present, it mounts virtiofs at the fixed guest path, reads `config.json`, creates each target directory, and performs the bind mounts. If absent, it skips the volume path entirely.

### 2.2 Principles and Constraints

- Mount metadata is delivered through `config.json` inside the shared directory.
- Data flows from conchd to the passive guest; the guest does not request it from conchd.
- One Sandbox uses at most one virtiofsd and one vhost-user-fs device. All mounts are subdirectories of one shared root.
- conchd does not adopt old VMMs or restore old Sandboxes after a restart. Delete active Sandboxes before a normal restart. After an abnormal exit, the next startup cleans virtiofsd processes, bind mounts, sockets, and per-Sandbox directories under the Conch runtime directory before warming Network Slots. If cleanup fails, conchd stops startup instead of creating new Sandboxes on top of stale state.
- Rust virtiofsd 1.13.x has no daemon-side cache argument. The guest uses the default mode with `mount -t virtiofs conchfs ...`; `cache=none` is not used because it hangs with the documented guest-kernel/StratoVirt combination. Concurrent writes from multiple Sandboxes to one host path do not provide distributed POSIX consistency.

The backend waits until the socket exists and accepts connections before returning it to the VMM adapter.

### 2.3 virtiofs Backend

virtiofsd starts only when `volume_mounts` is non-empty, with at most one process per Sandbox:

```text
/run/conch/sandboxes/<sandbox-id>/
  ├─ volume/                # virtiofsd --shared-dir export root
  │   ├─ 0                  # bind: mounts[0].source
  │   ├─ 1                  # bind: mounts[1].source
  │   └─ config.json        # read by the guest agent
  └─ virtiofs.sock          # vhost-user-fs socket
```

Fixed guest constants:

```text
tag              = conchfs
guest mountpoint = /run/conch/volume
```

virtiofsd command:

```bash
virtiofsd --socket-path <runtime>/virtiofs.sock --shared-dir <runtime>/volume
```

### 2.4 StratoVirt Adapter

StratoVirt 2.5.0 uses vhost-user-fs:

```text
-device vhost-user-fs-pci,id=<device_id>,chardev=<chardev_id>,tag=<mount_tag>
```

Exactly one chardev/device pair is added regardless of the mount count:

```bash
-chardev socket,id=charfs0,path=/run/conch/sandboxes/<id>/virtiofs.sock \
-device vhost-user-fs-pci,id=fs0,chardev=charfs0,tag=conchfs,bus=pcie.0,addr=0x14
```

- The pair and `-machine mem-share=on` are added only when mounts exist.
- The PCI address follows virtio-pmem devices: the first virtiofs address is `0x12 + pmemCount`. The example has two pmem components, so it uses `0x14`.
- The kernel command line adds only ` conch.sharefs=virtiofs`, never a volume table.

### 2.5 config.json

Before the VM starts, conchd writes `<runtime>/volume/config.json`. virtiofs exposes it to the guest as `/run/conch/volume/config.json`.

```json
{
  "version": 1,
  "mounts": [
    {"index": 0, "path": "/workspace", "readonly": false},
    {"index": 1, "path": "/data",     "readonly": true}
  ]
}
```

```text
version: int          Schema version; currently 1.
mounts[].index: int   Selects <runtime>/volume/<index>; guest bind source is <guest-mp>/<index>.
mounts[].path: str    Absolute guest target created by the agent before binding.
mounts[].readonly: bool  Read-only bind; default false.
```

## 3. Interfaces

### 3.1 Configuration

```yaml
volume:
  max_mounts: 10
  backend: virtiofs
  virtiofs:
    binary: /usr/libexec/virtiofsd
```

- `volume.max_mounts`: policy limit per Sandbox; default 10.
- `volume.backend`: backend name; default `virtiofs`.
- `volume.virtiofs.binary`: executable name resolved through `PATH`, or an absolute path; default `virtiofsd`. Debian and Ubuntu commonly install it as `/usr/libexec/virtiofsd`, which must be configured explicitly.

The per-Sandbox runtime is fixed at `<server.work_dir>/sandboxes/<sandbox-id>/` and is not user-configurable.

Additional requirements:

1. Build `CONFIG_VIRTIO_FS` and `CONFIG_FUSE_FS` into the guest kernel with `=y`. The minimal Alpine initrd has no modprobe, and image root filesystems normally have no `/lib/modules`. Other Conch options such as EROFS_FS, OVERLAY_FS, VIRTIO_NET, VIRTIO_PMEM, and VIRTIO_VSOCKETS should also be built in.
2. The StratoVirt binary must include vhost-user-fs. Check with `strings /usr/local/bin/stratovirt | grep -i "virtiofs"`.
3. Conch automatically adds `mem-share=on` when volumes exist because vhost-user-fs requires shared guest memory.
4. StratoVirt requires an explicit `bus=pcie.0` and the address calculated as `0x12 + pmemCount`.

### 3.2 SDK

#### Sandbox.create

The Python SDK accepts `volume_mounts` and converts it to `volumeMounts` in the conchd request:

```python
from conch import Sandbox

sandbox = Sandbox.create(
    template_id="<template-id>",
    volume_mounts=[
        {"source": "/host/path/cache",   "path": "/mnt/cache"},
        {"source": "/host/path/dataset", "path": "/data", "readonly": True},
    ],
)
```

Each `list[dict[str, object]]` element contains:

- `source: str`: existing absolute host path. conchd trusts its authentication and deployment boundary and applies no path allowlist or denylist.
- `path: str`: absolute target path inside the guest.
- `readonly: bool`: read-only bind; default `false`.

```json
{
  "template_id": "<template-id>",
  "volumeMounts": [
    {"source": "/host/path/cache",   "path": "/mnt/cache", "readonly": false},
    {"source": "/host/path/dataset", "path": "/data",      "readonly": true}
  ]
}
```

## 4. Limitations

- A Sandbox supports at most `volume.max_mounts` mounts; default 10.
- Guest paths must be absolute and cannot be `/`, `/proc`, `/sys`, `/dev`, `/run`, or any descendant of those protected paths.
- Target `path` values must be unique within one Sandbox.
- A Sandbox with mounts cannot be checkpointed or created from a resumable `boot_mode=resume` Template. A successfully created mounted Sandbox can still be suspended and resumed.
- Deleting a Sandbox never deletes user host-path content.
