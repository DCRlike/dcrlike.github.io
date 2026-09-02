---
title: Storage Management
sidebar_position: 5
---

# Storage Management

A Conch Volume mounts a directory from the host running conchd into a Sandbox guest. The current backend is virtiofs: each Sandbox with a Volume runs one virtiofsd process, and one shared device carries every mount for that Sandbox.

## Prepare host directories

`source` must be an existing absolute directory on the host. Conch does not create or delete it for you:

```bash
sudo install -d -m 0755 /srv/conch/workspace
sudo install -d -m 0755 /srv/conch/dataset
```

Directory access is still determined jointly by the host file system permissions and the guest process UID/GID. `readonly: true` only prevents writes through the guest mount; it does not change the permissions of the host directory itself.

## Create a Sandbox with Volumes

The CLI does not currently accept Volume arguments. Use the Python SDK or HTTP API:

```python
from conch import Sandbox

with Sandbox.create(
    template_name="localhost/conch/python:latest",
    volume_mounts=[
        {
            "source": "/srv/conch/workspace",
            "path": "/workspace",
        },
        {
            "source": "/srv/conch/dataset",
            "path": "/data",
            "readonly": True,
        },
    ],
) as sandbox:
    sandbox.commands.run(
        cmd="sh",
        args=["-c", "printf persisted > /workspace/result.txt"],
    )
    print(sandbox.commands.run(cmd="cat", args=["/data/input.txt"]).stdout)
```

The request field is named `volume_mounts` in Python and is sent to conchd as `volumeMounts`.

## Data persistence

Deleting a Sandbox unmounts bind mounts, stops virtiofsd, and removes the Conch runtime directory, but does not delete `source`. Create another Sandbox with the same host directory to read data written by the previous Sandbox.

Do not treat a Conch Volume as a shared file system with concurrency consistency guarantees. When multiple Sandboxes write to the same host directory, coordination remains the responsibility of the underlying file system and the applications.

## Validation rules

- A Sandbox can mount at most `volume.max_mounts` directories; the default is 10.
- `source` must be an existing absolute host directory.
- `path` must be an absolute guest path and must not be duplicated within one Sandbox.
- Mounts at `/`, `/proc`, `/sys`, `/dev`, `/run`, or any of their descendants are prohibited.
- `readonly` defaults to `false` when omitted.
- A Sandbox with Volumes supports suspend and resume, but not checkpoint.
- Volumes cannot be configured when creating a Sandbox from a `boot_mode=resume` Template.

## Configure virtiofsd

```yaml
volume:
  max_mounts: 10
  backend: virtiofs
  virtiofs:
    binary: /usr/libexec/virtiofsd
```

`binary` can be a command available in `PATH` or an absolute path. Distributions such as Debian and Ubuntu usually install virtiofsd at `/usr/libexec/virtiofsd`, outside the default `PATH`; use the absolute path in that case.

The guest kernel must have `CONFIG_VIRTIO_FS=y` and `CONFIG_FUSE_FS=y` built in. Minimal initrds usually do not contain modules that can be loaded dynamically.

For the complete architecture, guest mount flow, and VMM arguments, see the [Storage Reference](/docs/reference/storage).
