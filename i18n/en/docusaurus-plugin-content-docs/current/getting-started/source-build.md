---
sidebar_position: 3
title: Build and Start from Source
---

# Build and Start from Source

This guide explains how to build and start Conch from source, then create a Template and Sandbox. For package-based deployment, see [RPM Installation](/docs/getting-started/rpm-install).

## 1. Prepare the Environment

Follow [Installation](/docs/getting-started/installation) to install the dependencies and configure the host. Creating a Template also requires a guest kernel with EROFS support.

## 2. Build

Run these commands from the repository root:

```bash
make build
make build-conch-init-initramfs
```

The Conch binaries are written to `bin/`, and the initrd is written to `build-artifacts/conch-init-initramfs.cpio.gz`.

## 3. Run conchd

Copy the default configuration and start conchd:

```bash
cp config/config.yaml config/config.local.yaml
chmod 0600 config/config.local.yaml
sudo ./bin/conchd --config config/config.local.yaml
```

conchd runs in the foreground and writes logs to the terminal. Keep it running and use a second terminal for the remaining commands.

## 4. Basic Operations

Create a Template from an OCI image, guest kernel, and initrd:

```bash
sudo ./bin/conch template create \
  --config config/config.local.yaml \
  --source docker.io/library/nginx:latest \
  --kernel /path/to/guest/kernel \
  --initrd build-artifacts/conch-init-initramfs.cpio.gz
```

The command returns a Template ID. Use it to create and control a Sandbox:

```bash
sudo ./bin/conch template ls --config config/config.local.yaml

sudo ./bin/conch sandbox create \
  --config config/config.local.yaml \
  --template-id <template-id> \
  --sandbox-id sandbox_demo

sudo ./bin/conch sandbox suspend --config config/config.local.yaml sandbox_demo

sudo ./bin/conch sandbox resume --config config/config.local.yaml sandbox_demo

sudo curl --unix-socket /var/run/conchd/conchd.sock \
  -X DELETE http://localhost/api/v1/sandboxes/sandbox_demo
```

See [Template Management](/docs/user/template-management) for Template distribution and image management. See the [Python SDK](/docs/reference/python-sdk) for command execution and file operations inside a Sandbox.
