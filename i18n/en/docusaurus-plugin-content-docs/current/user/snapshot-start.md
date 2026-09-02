---
title: Snapshot Startup
sidebar_position: 2
---

# Snapshot Startup

A checkpoint captures the VMM memory state of a running Sandbox and creates a new Template with `origin=checkpoint` and `boot_mode=resume`. You can then restore a new Sandbox from that Template.

## Prerequisites and limitations

- The source Sandbox must still be managed by the current conchd process.
- A checkpoint must specify a `Template Name` for the new Template.
- A checkpoint does not stop, suspend, or delete the source Sandbox.
- Sandboxes with Volume mounts do not support checkpoints.
- Volumes cannot be configured when creating a Sandbox from a resume Template.
- Each checkpoint uses the Sandbox's current checkpoint head as its parent. After success, the head advances to the new Template ID.

## Use the CLI

First, create a Sandbox from a cold Template:

```bash
sudo ./bin/conch sandbox create \
  --config config/config.local.yaml \
  --template-name localhost/conch/python:latest \
  --sandbox-id sandbox-demo
```

After performing the initialization that you want to preserve in the guest, create a checkpoint Template:

```bash
sudo ./bin/conch sandbox checkpoint \
  --config config/config.local.yaml \
  --template-name localhost/conch/python-ready:latest \
  sandbox-demo
```

The command prints the new Template Name and Template ID. Inspect its boot mode:

```bash
sudo ./bin/conch template inspect \
  --config config/config.local.yaml \
  localhost/conch/python-ready:latest
```

Restore a new Sandbox by name:

```bash
sudo ./bin/conch sandbox create \
  --config config/config.local.yaml \
  --template-name localhost/conch/python-ready:latest \
  --sandbox-id sandbox-restored
```

## Use the Python SDK

```python
from conch import Sandbox

source = Sandbox.create(template_name="localhost/conch/python:latest")
restored = None
try:
    source.commands.run(
        cmd="sh",
        args=["-c", "printf ready > /tmp/checkpoint-marker"],
    )

    template = source.checkpoint(
        "localhost/conch/python-ready:latest"
    )
    print(template.template_name, template.template_id)

    restored = Sandbox.create(template_name=template.template_name)
    result = restored.commands.run(
        cmd="cat",
        args=["/tmp/checkpoint-marker"],
    )
    print(result.stdout, end="")
finally:
    if restored is not None:
        restored.delete()
    source.delete()
```

Use `template_name` when the name should continue to point to the latest checkpoint. Create with the returned `template_id` when you need to pin the request to this checkpoint's immutable content.

## Cleanup

The restored Sandbox and source Sandbox are independent instances and must be deleted separately. When the checkpoint Template is no longer needed, delete it by name:

```bash
sudo ./bin/conch sandbox delete --config config/config.local.yaml sandbox-restored
sudo ./bin/conch sandbox delete --config config/config.local.yaml sandbox-demo
sudo ./bin/conch template rm \
  --config config/config.local.yaml \
  localhost/conch/python-ready:latest
```

Deleting a Template removes only the containerd image record for that name. Content no longer referenced by any record is reclaimed by containerd GC.
