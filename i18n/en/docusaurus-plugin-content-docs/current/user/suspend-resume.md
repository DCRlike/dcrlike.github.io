---
title: Suspend and Resume
sidebar_position: 3
---

# Suspend and Resume

Suspend pauses a Sandbox VMM while retaining its memory and runtime resources. Resume lets the same Sandbox continue running. This workflow does not create a Template and differs from a [checkpoint](/docs/user/snapshot-start).

## Suspend a Sandbox

```bash
sudo ./bin/conch sandbox suspend \
  --config config/config.local.yaml \
  sandbox-demo
```

Python SDK:

```python
sandbox.suspend()
```

After a successful suspend, the control-plane state is `SUSPENDED`, which corresponds to `paused` in SDK list filters. The VMM process, Network Slot, and Volumes remain allocated, so suspend is not a replacement for resource cleanup.

## Resume a Sandbox

```bash
sudo ./bin/conch sandbox resume \
  --config config/config.local.yaml \
  sandbox-demo
```

Python SDK:

```python
sandbox.resume()
```

After a successful resume, the control-plane state returns to `READY`, which corresponds to `running` in the SDK.

## Check state

The CLI lists running and suspended Sandboxes, but its current output does not include a separate state column. Use the Python SDK to distinguish them:

```python
from conch import Sandbox

paused = Sandbox.list(state=["paused"])
running = Sandbox.list(state=["running"])
```

You can also call `GET /api/v1/sandboxes?state=paused` directly. See the [Sandbox HTTP API](/docs/reference/sandbox) for the complete interface.

## Operational boundaries

- Only Sandboxes managed by the current conchd process can be suspended or resumed.
- Suspend is not persistent hibernation: conchd does not restore suspended Sandboxes after a restart.
- Sandboxes with Volumes support suspend and resume.
- Use checkpoint when you need restorable state that can be used across Sandboxes.
- Use delete when you need to release the VMM, network, and temporary runtime resources.
