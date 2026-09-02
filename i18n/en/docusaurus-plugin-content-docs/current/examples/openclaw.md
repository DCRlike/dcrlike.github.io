---
title: Deploy OpenClaw with Conch
sidebar_position: 1
---

# Deploy OpenClaw with Conch

The `examples/openclaw.py` file in the Conch source demonstrates a complete workflow: create a Sandbox, write the OpenClaw configuration through conch-init, connect to the guest over SSH to start the OpenClaw TUI, and delete the Sandbox when the session ends.

## Prerequisites

Before you begin, verify that:

- conchd is running and the host can reach the guest through the Sandbox `domain` address.
- A cold Template is available. Its rootfs contains `openclaw`, `bash`, `ip`, and `getent`, and its SSH server starts with the Sandbox.
- The Template contains an SSH public key that is valid for the current host. The example does not write `authorized_keys`.
- The host has an `ssh` client and the Conch Python SDK installed.
- You have the URL, API key, and model name for an OpenAI-compatible completions API.

Install the SDK from the current source tree:

```bash
cd /path/to/Conch
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install ./sdk
```

## Configure environment variables

```bash
export CONCH_TEMPLATE_NAME=localhost/conch/openclaw:latest
export OPENCLAW_API_KEY='<api-key>'
export OPENCLAW_BASE_URL='https://api.example.com/v1'
export OPENCLAW_MODEL_NAME='MiniMax-M2.5'
```

`CONCH_TEMPLATE_NAME`, `OPENCLAW_API_KEY`, and `OPENCLAW_BASE_URL` are required. If they are unset, the script prompts for them interactively. The default model name is `MiniMax-M2.5`.

Do not write the API key into a Template or commit it to the source repository. The example writes the configuration to the guest only after creating the Sandbox, then deletes the Sandbox at the end.

## Run the example

Run the following command from the root of the Conch source tree:

```bash
python3 examples/openclaw.py
```

The script performs these steps:

1. Creates a Sandbox with `Sandbox.create(template_name=...)`.
2. Enables the guest loopback interface and uses `whoami` and `getent passwd` to determine the current user's home directory.
3. Uses the conch-init file API to write:
   - `~/.openclaw/auth.json`
   - `~/.config/openclaw/config.json`
   - `~/.openclaw/openclaw.json`
4. Validates the username and IPv4 address returned by the guest.
5. Starts `openclaw gateway --allow-unconfigured` and `openclaw tui` over SSH.
6. Deletes the Sandbox in a `finally` block after the TUI or SSH session ends.

For this short-lived Sandbox, the example disables SSH host-key persistence by setting `StrictHostKeyChecking=no` and pointing `UserKnownHostsFile` to `/dev/null`. This is appropriate for a short-lived demonstration, but should not be copied into long-running production connections that must verify server identity.

## Verification and troubleshooting

After a successful creation, the terminal prints the Sandbox ID and IP address:

```text
Sandbox created: sandbox_... (IP: 192.0.2.10)
Configuration complete, ready to start TUI...
```

Common issues:

| Symptom | What to check |
| --- | --- |
| `openclaw: command not found` | Verify that OpenClaw is installed in the Template rootfs and that the command is in the guest `PATH`. |
| SSH connection times out | Verify that the host can route to the Sandbox IP and that the network policy permits inbound SSH. |
| `Permission denied (publickey)` | Verify that the Template configures the matching host public key for the actual guest user. |
| Model request fails | Verify that `OPENCLAW_BASE_URL` includes the API prefix required by the service and that the key and model name match. |
| Configuration write fails | Verify that the guest home directory is writable and that the conch-init Agent API is healthy. |

If the script catches an exception, it still attempts to delete the Sandbox. If the host process is forcibly terminated, use `conch sandbox ls` to find any remaining instance, then run `conch sandbox delete <sandbox-id>`.

For complete command and file API behavior, see the [Python SDK](/docs/reference/python-sdk) and [conch-init Agent API](/docs/reference/conch-init).
