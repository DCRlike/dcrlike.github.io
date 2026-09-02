---
sidebar_position: 1
title: Python SDK
---

# Conch Python SDK API

## Quick Start

Before creating a Sandbox, start `conchd` and prepare a complete Template. If you do not have one, see [Template Management](/docs/user/template-management).

Run `python3` to enter an interactive session:

```pycon
>>> from conch import Sandbox
>>> sandbox = Sandbox.create(template_id="<template-id>")
>>> sandbox.sandbox_id
'sandbox_a1b2c3d4e5f6789012345678'
>>> result = sandbox.commands.run(cmd="printf", args=["hello Conch\n"])
>>> print(result.stdout, end="")
hello Conch
>>> sandbox.delete()
True
```

- `Sandbox.create(template_name=...)` or `Sandbox.create(template_id=...)` creates a Sandbox from a mutable name or immutable digest.
- `commands.run()` executes a command.
- `delete()` releases resources.

You can also use `with Sandbox.create(template_id="<template-id>") as sandbox:` to call `delete()` automatically.

## Sandbox Lifecycle

### Context manager

Sandbox implements the Python context-manager protocol for concise resource management:

```python
from conch import Sandbox

with Sandbox.create(template_id="<template-id>") as sbx:
    result = sbx.commands.run(cmd='python3', content='print("Hello")')
    print(result)
# delete() is called automatically
```

### Create a Sandbox

```text
Sandbox.create(template_name=None, template_id=None, sandbox_id=None,
               vcpu_num=None, vcpu_max=None, ram_mb=None,
               volume_mounts=None, env=None, network=None,
               vmm_name=None) -> Sandbox
```

Creates a Sandbox from a Template. When fields are omitted, conchd applies `sandbox.default_spec`. If `template_name`, `template_id`, and the default Template are all empty, conchd returns HTTP 400.

Parameters:

- `template_name` (optional str): Template Name to start; mutually exclusive with `template_id`.
- `template_id` (optional str): Template ID to start; mutually exclusive with `template_name`.
- `sandbox_id` (optional str): Explicit Sandbox ID; generated automatically by default.
- `vcpu_num` / `vcpu_max` / `ram_mb` (optional int): Sandbox resources.
- `volume_mounts` (optional list): Volume mount configuration.
- `env` (optional `dict[str, str]`): Environment variables passed during creation. Keys cannot be empty or contain `=` or NUL; values cannot contain NUL. The Sandbox ID, access token, protocol fields, network configuration, and serialized environment must fit in a 16 KiB UTF-8 initialization message. Clearly oversized environments are rejected before VM startup, and the complete message is checked again before sending.
- `network` (optional dict): IP-level policy applied at creation. Supports `allowOut`, `denyOut`, `allowIn`, `denyIn`, and `allow_internet_access`.
- `vmm_name` (optional str): VMM such as `stratovirt` or `cloud-hypervisor`. When omitted, conchd uses `sandbox.backend`. The name must exist in the conchd `sandbox` configuration or the request returns HTTP 400.

Control-plane failures continue to raise `RuntimeError` or an existing subclass. For a structured conchd error, the exception text is `<code>: <error>`, for example `sandbox.invalid_environment: invalid sandbox environment`. `code` is stable for automation; the user-facing `error` text is not guaranteed to remain unchanged across versions. Plain-text errors from older servers are preserved.

Returns a `Sandbox` on success and raises `RuntimeError` when the conchd request fails.

Examples:

```python
from conch import Sandbox

# Create from a specific Template Name
sbx = Sandbox.create(template_name="localhost/conch/python:latest")
sbx.commands.run(cmd='python3', content='print("Hello")')
sbx.delete()

# Omit resources to use sandbox.default_spec
sbx = Sandbox.create(template_id="<template-id>")
sbx.delete()

# Create from a resumable Template produced by a checkpoint
sbx = Sandbox.create(template_id="<template-id>")
sbx.commands.run(cmd='python3', content='print("Restored")')
sbx.delete()

# Use a context manager
with Sandbox.create(template_id="<template-id>") as sbx:
    sbx.commands.run(cmd='python3', content='print("Hello")')
```

### Checkpoint a Sandbox

```text
sandbox.checkpoint(template_name) -> TemplateInfo
```

Captures the current Sandbox state and returns a resumable Template. `template_name` is a required non-empty string that creates or updates a mutable Template Name. Checkpoint is an action on a Sandbox, not an independent resource, and does not stop or delete the source Sandbox.

Returns a `TemplateInfo` containing `template_name`, `template_id`, and `sandbox_id`.

Complete snapshot-lifecycle example:

```python
# Step 1: Create a Sandbox from a Template
sbx = Sandbox.create(template_id="<template-id>")
print(f"Created sandbox: {sbx.sandbox_id}")

# Step 2: Checkpoint the Sandbox to obtain a resumable Template
template = sbx.checkpoint("localhost/conch/python-ready:latest")
print(f"Template Name: {template.template_name}")
print(f"Template ID: {template.template_id}")

# Step 3: Create a new Sandbox from the resumable Template
sbx2 = Sandbox.create(template_id=template.template_id)
print(f"Restored sandbox: {sbx2.sandbox_id}")
sbx2.delete()

sbx.delete()
```

- The Template produced by checkpoint stores the complete restorable state.
- `checkpoint(template_name)` does not change the Sandbox's running state.
- Use the returned `template_name` to follow the name's current content, or `template_id` to pin this immutable checkpoint.
- `origin=checkpoint` and `boot_mode=resume` identify the Template's origin and boot capability.

### Suspend and Resume

```text
sandbox.suspend() -> bool
sandbox.resume() -> bool
```

```python
sandbox.suspend()
sandbox.resume()
```

- `suspend()` pauses a running Sandbox.
- `resume()` resumes a suspended Sandbox.

Both return `True` on success and raise `RuntimeError` if the conchd request fails. The SDK has no `stop()` method that only stops the runtime while retaining its management record. Use `delete()` to release Sandbox resources.

### Delete

```text
sandbox.delete(sandbox_id=None) -> bool
Sandbox.delete_sandbox(sandbox_id) -> bool
```

Deletes a Sandbox instance and releases its resources. `sandbox_id` optionally selects a specific Sandbox; otherwise, the current instance is deleted. The static method deletes a Sandbox without first creating an instance. Success returns `True`; failure raises `RuntimeError`.

```python
# Delete automatically with a context manager
with Sandbox.create(template_id="<template-id>") as sbx:
    pass

# Delete manually
sbx = Sandbox.create(template_id="<template-id>")
sbx.delete()

# Delete a specific Sandbox directly
Sandbox.delete_sandbox("sandbox_abc")
```

### Check the conchd service

```text
Sandbox.service_health() -> bool
```

Returns `True` after core components such as the conchd state store, containerd host, daemon client, and runtime service have initialized. This confirms initialization only and does not actively probe the ongoing health of each dependency.

### List and Get Sandboxes

```text
Sandbox.list(state=None, limit=None) -> list[dict]
Sandbox.get(sandbox_id) -> Sandbox
```

`state` accepts `running` and `paused`; `limit` must be an integer from 1 to 5000. Even without `state`, the list contains only `READY` and `SUSPENDED` records; internal states such as `UNKNOWN` are omitted.

| `Sandbox.list()` parameter | Type | Description |
| --- | --- | --- |
| `state` | list[str] | Filter by `running` or `paused`; `READY` maps to `running` and `SUSPENDED` maps to `paused`. |
| `limit` | int | Maximum result count; defaults to `100`, range `1`–`5000`. |

| `Sandbox.get()` parameter | Type | Description |
| --- | --- | --- |
| `sandbox_id` | str | Sandbox ID to retrieve. |

`Sandbox.list()` returns a list of Sandbox summary dictionaries. `Sandbox.get()` returns a `Sandbox` populated with basic information.

`Sandbox.get()` populates the available control-plane resource, domain, metadata, and lifecycle fields. Because the daemon does not restore the conch-init access token used during creation, GET responses omit `conchInitAccessToken`. The returned object is therefore limited to control-plane operations such as reading metadata or deleting the Sandbox. Commands, file operations, and in-Sandbox Agent health checks raise `Agent credentials unavailable for retrieved sandbox`. Objects returned by `Sandbox.create()` are unaffected.

The table uses REST API JSON names. The SDK maps them to Python attributes, for example `sandboxID` to `sandbox_id`, `templateID` to `template_id`, `startedAt` to `started_at`, and `domain` to `ip`.

| Field | Type | Description |
| --- | --- | --- |
| `templateName` | str | Template Name resolved at creation; may be empty when created by ID. |
| `templateID` | str | Template ID used to create the Sandbox. |
| `imageName` | str | Associated image name, or an empty string when unavailable. |
| `snapshotID` | str | Associated snapshot ID, or an empty string when unavailable. |
| `sandboxID` | str | Public Conch Sandbox ID. |
| `startedAt` | str | RFC 3339 Sandbox creation time. |
| `endAt` | str | Reserved end-time field; currently always an empty string. |
| `cpuCount` | int | Number of virtual CPUs. |
| `memoryMB` | int | Memory size in MB. |
| `diskSizeMB` | int | Disk size in MB; `0` when unavailable. |
| `conchInitVersion` | str | conch-init version; empty when unavailable. |
| `alias` | str | Sandbox alias or name. |
| `domain` | str | Current Sandbox network address, provided by the detailed GET response. |
| `metadata` | dict | Sandbox metadata map. |
| `lifecycle` | dict | Lifecycle configuration; currently contains the reserved `autoResume` field. |
| `network` | dict | Current persisted IP-level policy, provided by detailed GET. |
| `volumeMounts` | list[dict] | Reserved Volume list; currently always empty. |

### Update Network Policy

```python
sandbox.update_network(
    allow_out=None,
    deny_out=None,
    allow_in=None,
    deny_in=None,
    allow_internet_access=None,
) -> bool
```

This method replaces the complete Sandbox network policy through `PUT /api/v1/sandboxes/{sandboxID}/network`. Omitted lists are treated as empty. Omitting `allow_internet_access` adds no default rejection for unmatched egress. Both `READY` and `SUSPENDED` Sandboxes can be updated.

| Parameter | JSON field | Description |
| --- | --- | --- |
| `allow_out` | `allowOut` | Allowed egress IPv4 addresses or CIDRs. |
| `deny_out` | `denyOut` | Denied egress IPv4 addresses or CIDRs. |
| `allow_in` | `allowIn` | Allowed source IPv4 addresses or CIDRs entering the guest. |
| `deny_in` | `denyIn` | Denied source IPv4 addresses or CIDRs entering the guest. |
| `allow_internet_access` | `allow_internet_access` | `False` rejects egress not accepted by another rule; `True` or omission adds no default rejection. |

Rule semantics:

- For new connections, explicit deny rules take precedence over explicit allow rules. Established connections still tracked by conntrack are not terminated immediately and can continue until the connection closes or tracking expires.
- A non-empty allow list enables allowlist mode and rejects unmatched traffic in that direction.
- With only a deny list, matching addresses are rejected and unmatched traffic is allowed.
- If both allow and deny lists are empty, lists do not restrict that direction.
- `allow_internet_access: false` additionally rejects unmatched egress and does not affect ingress rules.
- Only IPv4 addresses and IPv4 CIDRs are accepted. The four lists can contain at most 1024 entries in total.

```python
sandbox.update_network(
    allow_out=["10.0.0.0/8"],
    deny_out=["10.10.0.0/16"],
    allow_internet_access=False,
)
```

Egress rules attach to the forwarded path leaving the guest tap in the Linux network namespace. Ingress rules attach to the path forwarded to the guest tap. Ingress rules filter only IP traffic already routed to the Sandbox; they do not create host listeners, publish services, route hostnames, or modify HTTP requests. VSOCK is unaffected.

### Get Sandbox Information

```text
sandbox.get_info() -> SandboxInfo
```

Returns the saved Sandbox ID, IP, source Template Name, and Template ID for the current instance.

```python
info = sandbox.get_info()
print(f"ID: {info.sandbox_id}, IP: {info.ip}, Source: {info.template_id}")
```

The return value is a `SandboxInfo`; see [Data Types](#sandboxinfo).

## Workload APIs

### Run Commands

```text
sandbox.commands.run(cmd, args=None, cwd=None, env=None, content=None, background=False, tag=None, pty=None, stdin=None, timeout=None, on_stdout=None, on_stderr=None) -> CommandResult | CommandHandle
```

Runs a foreground command or starts a background process inside the Sandbox.

- `cmd` (str): Command such as `python3`, `ls`, or `sh`.
- `content` (optional str): Script content.
- `args` (optional list): Command arguments.
- `cwd` (optional str): Working directory; the user's home directory when omitted.
- `env` (optional dict): Variables added to the default Sandbox environment.
- `background` (optional bool): When `True`, starts a background process and returns `CommandHandle`.
- `tag` (optional str): Tag used later by `connect`, `list`, or `kill`.
- `pty` (optional dict): PTY configuration such as `{"cols": 80, "rows": 24}`.
- `stdin` (optional str or bytes): Content written once to standard input at startup; standard input is then closed.
- `timeout` (optional float): Maximum execution time in seconds; sent as the Agent's `Connect-Timeout-Ms` header.
- `on_stdout` / `on_stderr` (optional callable): Incremental foreground-output callbacks.

`content` and `args` are mutually exclusive. `stdin` and `pty` are mutually exclusive. Foreground execution returns `CommandResult`; background execution returns `CommandHandle`. A non-zero exit raises `CommandExitException`, timeout raises `TimeoutException`, and invalid parameters raise `InvalidArgumentError`.

```python
# Execute Python source
result = sandbox.commands.run(
    cmd="python3",
    content="print('hello')",
)

# Execute a command with arguments
result = sandbox.commands.run(cmd="uname", args=["-a"])

# Set a working directory
result = sandbox.commands.run(cmd="pwd", cwd="/tmp")

# Add environment variables
result = sandbox.commands.run(
    cmd="sh",
    args=["-c", "printf '%s\\n' \"$DEMO_KEY\""],
    env={"DEMO_KEY": "demo-value"},
)

# Send one-shot stdin
result = sandbox.commands.run(
    cmd="python3",
    args=["-c", "import sys; print(sys.stdin.read(), end='')"],
    stdin=b"hello from stdin\n",
)

# Use the file API when executing a script file
sandbox.files.write('/tmp/app.py', 'print("Hello")')
result = sandbox.commands.run(cmd='python3', args=['/tmp/app.py'])

# Foreground streaming callbacks
chunks = []
result = sandbox.commands.run(
    cmd='sh',
    args=['-c', 'printf foo; printf bar >&2'],
    on_stdout=lambda text: chunks.append(("stdout", text)),
    on_stderr=lambda text: chunks.append(("stderr", text)),
)
```

`timeout` is measured in seconds. A timeout raises `TimeoutException`:

```python
from conch import TimeoutException

try:
    sandbox.commands.run(cmd="sleep", args=["10"], timeout=0.2)
except TimeoutException:
    print("timed out")
```

For a background process, use `background=True`, an optional `tag`, and `timeout=0` for no lifetime limit:

```python
handle = sandbox.commands.run(
    cmd="python3",
    args=["-m", "http.server", "18080"],
    background=True,
    tag="http-server",
    timeout=0,
)
```

Do not call `wait()` immediately on a service that is expected to run indefinitely.

### Connect to a Background Process

```text
sandbox.commands.connect(pid=None, tag=None) -> CommandHandle
command.wait() -> CommandResult
command.disconnect() -> None
```

Connect by `pid` or `tag`. `wait()` returns after the process exits; `disconnect()` closes only this output stream.

```python
command = sandbox.commands.connect(tag="http-server")
try:
    for stdout, stderr, pty in command:
        if stdout:
            print(stdout, end="")
        if stderr:
            print(stderr, end="")
finally:
    command.disconnect()
```

`disconnect()` stops reading but does not terminate the process.

### List Background Processes

```text
sandbox.commands.list() -> list[ProcessInfo]
```

```python
for process in sandbox.commands.list():
    print(process.pid, process.tag, process.running)
```

### Stop a Background Process

```text
sandbox.commands.kill(pid=None, tag=None, signal=15) -> bool
command.kill(signal=15) -> bool
```

`kill()` sends a non-zero signal by `pid` or `tag`; the default is `15`.

```python
stopped = sandbox.commands.kill(tag="http-server", signal=15)
# Or: handle.kill(signal=15)
```

`kill()` returns `False` when the process does not exist. Use signal `9` only when the process does not respond to a graceful signal.

### File Operations

Every remote file path (`path`, `remote_path`, and `filepath` in upload specifications) must be a normalized absolute guest path such as `/home/user/a.txt` or a Volume target such as `/workspace/data.txt`. Relative paths, `..` or `.` segments, duplicate or redundant separators, and NUL bytes are rejected before file access. The root path `/` itself is valid. `guestd` provides these APIs after chrooting into the Sandbox merge root, so `/` means the guest root; configured Volumes remain accessible at their guest targets. This validation defines guest API path semantics and does not imply that a host-filesystem escape previously existed.

#### Upload files

```text
sandbox.files.upload(local_path, remote_path) -> WriteInfo | list[WriteInfo]
sandbox.files.upload(files) -> WriteInfo | list[WriteInfo]
sandbox.files.write(path, content) -> WriteInfo
sandbox.files.write_files(files) -> list[WriteInfo]
```

Upload a local file or write strings, bytes, and file streams:

```python
entry = sandbox.files.write("/tmp/hello.txt", "hello\n")

entries = sandbox.files.write_files([
    {"path": "/tmp/a.txt", "data": "a"},
    {"path": "/tmp/main.py", "data": b"print('ok')\n"},
])

entry = sandbox.files.upload("local.txt", "/tmp/uploaded.txt")
```

`write_files()` uses `{"path": remote_path, "data": content}`. `upload()` accepts local paths or content specifications.

#### Download files

```text
sandbox.files.download(remote_path, local_path) -> dict
sandbox.files.read(remote_path, format="text") -> str
sandbox.files.read(remote_path, format="bytes") -> bytes
sandbox.files.read(remote_path, format="stream") -> Iterator[bytes]
```

Download a file or read remote content as text, bytes, or a stream:

```python
text = sandbox.files.read("/tmp/hello.txt")
raw = sandbox.files.read("/tmp/hello.txt", format="bytes")
chunks = sandbox.files.read("/tmp/hello.txt", format="stream")
result = sandbox.files.download("/tmp/hello.txt", "hello.txt")
```

`download()` returns a dictionary with `status` (`0` for success and `-1` for failure), byte `size`, and a result `message`.

#### List files

```text
sandbox.files.list(path, depth=1) -> list[EntryInfo]
```

`path` is the directory and `depth` is the listing depth, defaulting to `1`.

```python
for item in sandbox.files.list("/tmp", depth=2):
    print(item.path, item.type, item.size)
```

#### Search files

```text
sandbox.files.search(path, pattern, exclude_patterns=None) -> list[EntryInfo]
```

Search by glob beneath `path`, optionally excluding patterns:

```python
for item in sandbox.files.search(
    path="/tmp",
    pattern="*.py",
    exclude_patterns=["*.bak"],
):
    print(item.path)
```

### Health Check

```text
sandbox.health_check() -> dict
```

Checks the health of the Agent service inside the Sandbox. The returned dictionary contains `status` (`'OK'` or `'ERROR'`) and a descriptive `message`.

```python
health = sandbox.health_check()
print(health)
# {'status': 'OK', 'message': 'OK'}
```

## Sandbox Constructor

```python
Sandbox(sandbox_id=None, template_name=None, template_id=None,
        vcpu_num=None, vcpu_max=None, ram_mb=None,
        volume_mounts=None, env=None, network=None,
        vmm_name=None)
```

| Parameter | Type | Description |
| --- | --- | --- |
| `sandbox_id` | str | Sandbox ID; generated automatically by default. |
| `template_name` | str | Template Name; mutually exclusive with `template_id`. |
| `template_id` | str | Template ID; mutually exclusive with `template_name`. |
| `vcpu_num` | int | Number of virtual CPUs. |
| `vcpu_max` | int | Maximum number of virtual CPUs. |
| `ram_mb` | int | Memory size in MiB. |
| `volume_mounts` | list | Volume mounts used at creation. |
| `env` | dict | Environment passed at creation. |
| `network` | dict | IP-level network policy applied at creation. |
| `vmm_name` | str | VMM selection; conchd decides when omitted. |

The constructor initializes local state only. Use the `Sandbox.create()` class method to create a Sandbox.

## Data Types

### SandboxInfo

```python
@dataclass
class SandboxInfo:
    sandbox_id: str
    ip: str
    template_name: Optional[str]
    template_id: Optional[str]
```

### TemplateInfo

```python
@dataclass
class TemplateInfo:
    template_name: str
    template_id: str
    sandbox_id: str
```

### CommandResult

```python
class CommandResult:
    raw: dict
    stdout: str
    stderr: str
    exit_code: int
    error: str
    exited: bool
    process_status: str
    logs: str
```

`str(result)` returns `logs.strip()`.

### CommandExitException

```python
class CommandExitException(Exception):
    stdout: str
    stderr: str
    exit_code: int
    error: str
```

Foreground commands and `CommandHandle.wait()` raise this exception on a non-zero exit. Its string prefers `stderr`, falling back to `error`.

### SDK Errors

```python
class SandboxError(RuntimeError):
    pass

class InvalidArgumentError(SandboxError):
    pass

class NotFoundError(SandboxError):
    pass

class AuthenticationError(SandboxError):
    pass

class TimeoutException(SandboxError):
    pass
```

conch-init RPC failures are mapped to these SDK errors instead of exposing Connect internals. For example, connecting to a missing tag raises `NotFoundError`, omitting both PID and tag in `kill()` raises `InvalidArgumentError`, and a timed-out command raises `TimeoutException`.

### ProcessInfo

```python
@dataclass
class ProcessInfo:
    pid: int
    tag: str | None
    cmd: str
    args: list[str]
    envs: dict[str, str]
    cwd: str | None
    running: bool
    started_at: str
    exit_code: int
    finished_at: str
    stdout: str
    stderr: str
```

### File Objects

```python
class FileType(Enum):
    FILE = "file"
    DIR = "dir"

@dataclass
class WriteInfo:
    name: str
    type: FileType | None
    path: str

@dataclass
class EntryInfo(WriteInfo):
    size: int
    permissions: str
    modified_time: str
    metadata: dict[str, str]
    is_directory: bool
```

`files.write()` and `files.upload()` return `WriteInfo`; `write_files()` returns `list[WriteInfo]`; `list()` and `search()` return `list[EntryInfo]`.

## Complete Examples

### Example 1: Basic use with try/finally

```python
from conch import Sandbox

sbx = None
try:
    sbx = Sandbox.create(template_id="<template-id>")
    info = sbx.get_info()
    print(f"Created sandbox: {info.sandbox_id}, IP: {info.ip}")

    # Run a command
    result = sbx.commands.run(cmd='python3', content='print("Hello!")')
    print(result.stdout)

    # Upload a file
    sbx.files.upload('./local.txt', '/home/user/remote.txt')

    # Download a file
    sbx.files.download('/home/user/remote.txt', './downloaded.txt')

    # List files
    files = sbx.files.list('/home/user')
    print(f"Files: {files}")
except (FileNotFoundError, ValueError, KeyError, RuntimeError) as e:
    print(f"Error: {e}")
finally:
    if sbx:
        sbx.delete()
```

### Example 2: Basic use with a context manager

```python
from conch import Sandbox

with Sandbox.create(template_id="<template-id>") as sbx:
    info = sbx.get_info()
    print(f"Created sandbox: {info.sandbox_id}, IP: {info.ip}")

    # Run a command
    result = sbx.commands.run(cmd='python3', content='print("Hello!")')
    print(result.stdout)

    # Upload a file
    sbx.files.upload('./local.txt', '/home/user/remote.txt')

    # Download a file
    sbx.files.download('/home/user/remote.txt', './downloaded.txt')

    # List files
    files = sbx.files.list('/home/user')
    print(f"Files: {files}")
```

### Example 3: Checkpoint

```python
from conch import Sandbox

# Create a checkpoint Template
sbx = Sandbox.create(template_id="<template-id>")
template = sbx.checkpoint("localhost/conch/python-ready:latest")
print(f"Created resumable template: {template.template_name}")
print(f"Created resumable template: {template.template_id}")

# Start from the resumable Template
sbx2 = Sandbox.create(template_id=template.template_id)
sbx2.commands.run(cmd='python3', content='print("Restored!")')
sbx2.delete()
sbx.delete()
```

### Example 4: Error handling

```python
from conch import Sandbox

sbx = None
try:
    sbx = Sandbox.create(template_id="<template-id>")
    result = sbx.commands.run(cmd='invalid_command')
except RuntimeError as e:
    print(f"Error: {e}")
finally:
    if sbx:
        sbx.delete()
```

## FAQ

### Why does `commands.run(cmd='echo', args=['$HOME'])` print `$HOME` literally?

The SDK executes `cmd` directly without a shell, so shell syntax is not expanded:

```python
sandbox.commands.run(cmd="echo", args=["$HOME"])
# $HOME
```

Invoke a shell explicitly when expansion is required:

```python
sandbox.commands.run(cmd="sh", args=["-c", "echo $HOME"])
# /root
```
