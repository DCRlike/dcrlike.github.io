---
title: Create and Delete Sandboxes
sidebar_position: 1
---

# Create and Delete Sandboxes

This page explains how to create, query, and delete Sandboxes. Before you begin, conchd should be running and a Template should be available. See [Template Management](/docs/user/template-management) to create one.

## Choose a Template

You can create a Sandbox with either selector:

- `Template Name`: human-readable and updateable, for example `localhost/conch/python:latest`.
- `Template ID`: pins the request to an immutable Boot Index digest such as `sha256:...`.

The two selectors are mutually exclusive. If both are omitted, conchd uses `sandbox.default_spec.template_name` or `sandbox.default_spec.template_id`.

List local Templates first:

```bash
sudo ./bin/conch template ls --config config/config.local.yaml
```

## Create with the CLI

```bash
sudo ./bin/conch sandbox create \
  --config config/config.local.yaml \
  --template-name localhost/conch/python:latest \
  --sandbox-id sandbox-demo \
  --ram-mb 4096
```

The CLI generates a Sandbox ID when `--sandbox-id` is omitted. An ID must contain 2–32 characters, start with a letter or number, and contain only letters, numbers, underscores, periods, and hyphens.

The CLI currently covers only the Template, Sandbox ID, and memory arguments. Use the Python SDK or HTTP API to set vCPUs, environment variables, network policy, Volumes, or a VMM.

## Create with the Python SDK

The Python SDK is in the `sdk/` directory of the Conch source tree. Install it from the repository:

```bash
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install ./sdk
```

Create a Sandbox and run a command:

```python
from conch import Sandbox

with Sandbox.create(
    template_name="localhost/conch/python:latest",
    vcpu_num=2,
    vcpu_max=2,
    ram_mb=4096,
    env={"WORKLOAD": "docs-demo"},
) as sandbox:
    print(sandbox.sandbox_id, sandbox.ip)
    result = sandbox.commands.run(
        cmd="sh",
        args=["-c", "printf '%s\n' \"$WORKLOAD\""],
    )
    print(result.stdout, end="")
```

Leaving the `with` block calls `delete()` automatically. When you do not use a context manager, use `try/finally` to ensure that the Sandbox is deleted.

When resource fields are omitted, the SDK does not fill them itself; it lets conchd apply `sandbox.default_spec`. The fixed resource limits are 64 vCPUs and 256 GiB of memory, with a minimum of 128 MiB of memory.

## Query Sandboxes

The CLI lists Sandboxes that are currently running or suspended:

```bash
sudo ./bin/conch sandbox ls --config config/config.local.yaml
```

The SDK can filter by state and limit the number of results:

```python
from conch import Sandbox

for item in Sandbox.list(state=["running"], limit=20):
    print(item["sandboxID"], item["templateName"], item["startedAt"])
```

`state` accepts `running` and `paused`. `limit` ranges from 1 to 5000 and defaults to 100. `Sandbox.get(sandbox_id)` returns detailed control-plane information, but conchd does not return the existing Sandbox's Agent token in query responses. Therefore, a queried object cannot run commands or perform file operations inside the guest.

## Delete a Sandbox

```bash
sudo ./bin/conch sandbox delete \
  --config config/config.local.yaml \
  sandbox-demo
```

Python SDK:

```python
sandbox.delete()

# When you only have the Sandbox ID:
Sandbox.delete_sandbox("sandbox-demo")
```

Deletion stops the VMM and releases network, snapshot-view, and virtiofs runtime resources. User-provided Volume host directories and their contents are not deleted.

When conchd starts, it cleans up Sandbox state and runtime resources left by a previous abnormal exit. It does not reattach to old VMMs. You should still delete every active Sandbox before a normal service stop or restart.

## Next steps

- [Suspend and Resume](/docs/user/suspend-resume)
- [Snapshot Startup](/docs/user/snapshot-start)
- [Sandbox HTTP API](/docs/reference/sandbox)
- [Python SDK](/docs/reference/python-sdk)
