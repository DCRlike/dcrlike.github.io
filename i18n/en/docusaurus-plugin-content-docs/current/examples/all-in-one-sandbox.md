---
title: Deploy an all-in-one sandbox with Conch
sidebar_position: 2
---

# Deploy an all-in-one sandbox with Conch

The `examples/e2b-rootfs/` directory in the Conch source provides an E2B-style all-in-one rootfs. A single Sandbox runs all of the following services:

- `envd`, listening on port `49983`.
- Jupyter Server, listening on port `8888`.
- The code-interpreter API, listening on port `49999`.
- OpenSSH server, listening on port `22`.
- The conch-init Agent API, listening on port `4064`.

After network initialization, conch-init starts `/etc/conch/entrypoint` from the rootfs. The entrypoint waits until envd and code-interpreter are healthy, then notifies conch-init with `SIGUSR1`. Therefore, when `Sandbox.create()` returns successfully, the core services are ready.

## Prerequisites

- The conchd runtime environment and guest kernel and initrd are ready.
- A BuildKit daemon is running on the host and `buildctl` is installed.
- An OCI registry that permits HTTP is running at `localhost:5000`.
- The build machine can download Go, the E2B envd source, the code-interpreter source, and Python/npm dependencies.

The example Dockerfile currently uses openEuler 24.03 LTS SP3 as its base and builds fixed versions of envd and code-interpreter. Refer to the Dockerfile in the source tree for the current version values.

## Build and publish the rootfs Image

Run the following commands from the root of the Conch source tree:

```bash
cd examples/e2b-rootfs
buildctl build \
  --frontend dockerfile.v0 \
  --local context=. \
  --local dockerfile=. \
  --output type=image,name=localhost:5000/conch/e2b-rootfs:debug,push=true,registry.insecure=true
```

By default, the build installs only the core Jupyter dependencies required by the example. To install every dependency in `template-requirements.txt`, add `--opt build-arg:INSTALL_FULL_TEMPLATE_REQUIREMENTS=1` to the `buildctl build` arguments.

## Create a Conch Template

Return to the source root and combine the rootfs Image with the guest kernel and initrd to create a cold Template:

```bash
cd ../..
sudo ./bin/conch template create \
  --config config/config.local.yaml \
  --name localhost/conch/e2b-all-in-one:latest \
  --source localhost:5000/conch/e2b-rootfs:debug \
  --kernel /var/lib/conch/kernel \
  --initrd /var/lib/conch/conch.initrd \
  --plain-http
```

Inspect the Template:

```bash
sudo ./bin/conch template inspect \
  --config config/config.local.yaml \
  localhost/conch/e2b-all-in-one:latest
```

## Create and verify a Sandbox

Install the SDK, then run this script:

```python
from conch import Sandbox

with Sandbox.create(
    template_name="localhost/conch/e2b-all-in-one:latest",
    ram_mb=4096,
) as sandbox:
    checks = [
        ("envd", "http://127.0.0.1:49983/health", "204"),
        ("code-interpreter", "http://127.0.0.1:49999/health", "200"),
        ("jupyter", "http://127.0.0.1:8888/api/status", "200"),
    ]
    for name, url, expected in checks:
        result = sandbox.commands.run(
            cmd="curl",
            args=["-sS", "-o", "/dev/null", "-w", "%{http_code}", url],
        )
        actual = result.stdout.strip()
        print(name, actual)
        if actual != expected:
            raise RuntimeError(
                f"{name} returned {actual}, expected {expected}"
            )
```

Service logs are stored at:

```text
/var/log/conch-init/conch-init.log
/var/log/conch-init/service.log
/var/log/conch-init/envd.log
/var/log/conch-init/code-interpreter.log
```

Read a log with `sandbox.files.read()` or run `tail`:

```python
print(sandbox.files.read("/var/log/conch-init/code-interpreter.log"))
```

## Optional SSH debugging

The Dockerfile can add a debug SSH public key at build time:

```bash
buildctl build \
  --frontend dockerfile.v0 \
  --local context=. \
  --local dockerfile=. \
  --opt build-arg:DEBUG_SSH_AUTHORIZED_KEY="$(cat ~/.ssh/id_ed25519.pub)" \
  --output type=image,name=localhost:5000/conch/e2b-rootfs:debug,push=true,registry.insecure=true
```

The public key becomes part of the image. Use only a dedicated, short-lived debugging key. Do not publish an image containing the key to an untrusted registry. After debugging, rebuild without this build argument.

Adding the key configures SSH inside the guest only. The host must still be able to route to the Sandbox IP, and the network policy must allow SSH traffic.

## Implementation boundaries

- The entrypoint sets `ENVD_DISABLE_MMDS=1` and `ENVD_DISABLE_PORT_FORWARDER=1`, so it does not depend on E2B MMDS or the port forwarder.
- Jupyter listens only on the guest loopback interface, while code-interpreter listens on all guest addresses.
- The entrypoint continuously monitors the core services and provides a restart loop for code-interpreter. It is not a general-purpose process orchestrator.
- Deleting the Sandbox stops these services. Configure a Conch Volume explicitly when persistent data is required.
