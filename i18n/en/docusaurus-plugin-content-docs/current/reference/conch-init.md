---
sidebar_position: 4
title: conch-init
---

# conch-init Agent API

This page describes the Agent API exposed by `conch-init` inside a Sandbox. The API supports command execution, background processes, signals, and file transfer. `conch-init` currently listens on `:4064` inside the Sandbox.

## Protocol and authentication

The Agent API uses Connect RPC over h2c. Ordinary unary RPCs can be called with Connect HTTP/JSON:

```text
Connect-Protocol-Version: 1
Content-Type: application/json
conch-init-token: <agent_token>
```

`conch-init-token` is the access credential for the in-Sandbox Agent API. A missing, uninitialized, or invalid token returns Connect `Unauthenticated`. `GET /health` is an ordinary HTTP health check and does not require this header.

```bash
curl --request GET \
  --url "${AGENT_URL}/health"
```

Response:

```json
{"status":"OK","message":"OK"}
```

`ProcessDataEvent.stdout`, `stderr`, and `pty` are protobuf `bytes` fields. Connect JSON represents them as base64. The Python SDK incrementally decodes each output channel as UTF-8, so SDK examples receive ordinary strings.

## RPC list

| Interface | RPC path | Description |
| --- | --- | --- |
| `StartProcess` | `/pb.ProcessService/StartProcess` | Run a synchronous command or start a background process. |
| `Connect` | `/pb.ProcessService/Connect` | Connect to a background process and read output events. |
| `List` | `/pb.ProcessService/List` | List background processes. |
| `SendSignal` | `/pb.ProcessService/SendSignal` | Send a signal to a background process. |
| `PostFileStream` | `/pb.FileService/PostFileStream` | Upload or write a file. |
| `GetFileStream` | `/pb.FileService/GetFileStream` | Download or read a file. |
| `ListFiles` | `/pb.FileService/ListFiles` | List files and directories. |
| `SearchFiles` | `/pb.FileService/SearchFiles` | Search for files by glob. |

## Run a command

RPC name: `StartProcess`

```text
pb.ProcessService/StartProcess
```

### Input

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `cmd` | string | Yes | Executable command such as `python3` or `sh`. |
| `args` | string[] | No | Command arguments. |
| `env` | object | No | Environment variables added for this execution. |
| `cwd` | string | No | Working directory; when empty, the current user's home directory is used. |
| `content` | string | No | Script content; when non-empty, `args` must be empty. |
| `background` | boolean | No | Whether to start the process in the background. |
| `tag` | string | No | Background-process tag. |
| `pty` | object/null | No | PTY configuration; omitted or `null` disables PTY. |
| `pty.cols` | integer | No | PTY columns; omitted or 0 uses the default. |
| `pty.rows` | integer | No | PTY rows; omitted or 0 uses the default. |
| `stdin` | bytes | No | Bytes written once to the child's standard input; base64 in Connect JSON. |

`content` and `args` are mutually exclusive. `stdin` and `pty` are mutually exclusive.

`Connect-Timeout-Ms` sets the maximum process execution time in milliseconds. A missing value or `0` means no timeout.

### Output

```text
stream ProcessEvent
```

```jsonl
{"start": {"pid": 23456}}
{"data": {"stdout": "aGVsbG8K"}}
{"end": {"exitCode": 0, "exited": true, "status": "exited", "error": ""}}
```

`stdout`, `stderr`, and `pty` are base64-encoded bytes. Request failures before process startup are returned as Connect status errors. A non-zero command exit is returned in `end.exitCode`.

### Description

Runs a command or script. `background` selects foreground execution or a background process.

### SDK

Synchronous execution:

```python
from conch import Sandbox

sandbox = Sandbox.create(template_id="<template_id>")

result = sandbox.commands.run(
    cmd="python3",
    args=["-c", "print('hello')"],
    cwd="/tmp",
    env={"DEMO_KEY": "demo-value"},
    background=False,
    pty=None,
)

print(result.stdout, end="")
print(result.exit_code)
```

Output:

```text
hello
0
```

Run inline script text with `content`:

```python
script_result = sandbox.commands.run(
    cmd="python3",
    content="print('hello from content')",
    cwd="/tmp",
    background=False,
    pty=None,
)

print(script_result.stdout, end="")
```

Pass standard input and an execution timeout:

```python
from conch import TimeoutException

stdin_result = sandbox.commands.run(
    cmd="python3",
    args=["-c", "import sys; print(sys.stdin.buffer.read().hex())"],
    stdin=b"\x00\xff",
)
print(stdin_result.stdout, end="")  # 00ff

try:
    sandbox.commands.run(cmd="sleep", args=["10"], timeout=0.2)
except TimeoutException:
    print("timed out")
```

Output:

```text
hello from content
00ff
timed out
```

Background execution:

```python
command = sandbox.commands.run(
    cmd="python3",
    args=["-m", "http.server", "18080"],
    cwd="/tmp",
    env={},
    background=True,
    tag="http-srv",
    pty=None,
    timeout=0,
)

print(command)
```

> This is a long-running HTTP service. Do not call `wait()` directly on the returned `CommandHandle`; `wait()` blocks until the process exits, and an HTTP service normally does not exit by itself. To read startup logs, use `connect()` with a bounded read and call `disconnect()` when finished. Call `kill()` when the service should stop.

`timeout` is measured in seconds. For long-running services, `0` means no lifetime limit; stop the service explicitly with `kill()`. With a positive value, `conch-init` terminates the process after the timeout.

The PID in the output is assigned dynamically by the system:

```text
process handle (pid=204, tag=http-srv)
```

### Call the Agent API directly

Synchronous execution request:

```json
{
  "cmd": "python3",
  "args": ["-c", "import sys; print(sys.stdin.read(), end='')"],
  "cwd": "/tmp",
  "env": {
    "DEMO_KEY": "demo-value"
  },
  "content": "",
  "background": false,
  "pty": null,
  "stdin": "aGVsbG8K"
}
```

`stdin` is a protobuf `bytes` field, so Connect JSON uses base64. In this example, `aGVsbG8K` decodes to `hello\n`. The Agent writes these bytes when starting the child process, then closes standard input.

Request using `content`:

```json
{
  "cmd": "python3",
  "args": [],
  "cwd": "/tmp",
  "env": {
    "DEMO_KEY": "demo-value"
  },
  "content": "import os\nprint(\"hello from content\")\nprint(os.environ.get(\"DEMO_KEY\", \"\"))",
  "background": false,
  "pty": null
}
```

Background execution request:

```json
{
  "cmd": "python3",
  "args": ["-m", "http.server", "18080"],
  "cwd": "/tmp",
  "env": {},
  "content": "",
  "background": true,
  "tag": "http-srv",
  "pty": null
}
```

Background execution sends `start` first, followed by output and the final `end`. Callers must consume the stream returned by `StartProcess` or `Connect` promptly. Excess background output events may be dropped, but this does not block the process. A timeout terminates both foreground and background processes; a foreground call returns Connect `DeadlineExceeded`.

## Connect to a background process

RPC name: `Connect`

```text
pb.ProcessService/Connect
```

### Input

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `process.pid` | integer | One selector | Process PID; mutually exclusive with `process.tag`. |
| `process.tag` | string | One selector | Process tag; mutually exclusive with `process.pid`. |

### Output

```text
stream ProcessEvent
```

```jsonl
{"start":{"pid":23456}}
{"data":{"stdout":"aGVhcnRiZWF0IDEK"}}
{"data":{"stderr":"d2Fybgo="}}
{"data":{"pty":"aW50ZXJhY3RpdmUgb3V0cHV0DQo="}}
{"end":{"exitCode":0,"exited":true,"status":"exited","error":""}}
```

### Description

Connects to a running background process selected by `process.pid` or `process.tag` and reads subsequent output.

### SDK

The following long-running process emits heartbeat output. `background=True` returns its handle immediately, and `timeout=0` leaves its lifetime unlimited. Do not call `wait()` on this handle because the process does not exit by itself. Save the returned handle when you only need to start the process; call `connect()` later to read subsequent output.

```python
starter = sandbox.commands.run(
    cmd="python3",
    content="""import time
time.sleep(1)  # Give Connect time to subscribe first
print("service-ready", flush=True)
count = 0
while True:
    count += 1
    print(f"heartbeat {count}", flush=True)
    time.sleep(1)
""",
    background=True,
    tag="heartbeat-worker",
    timeout=0,
)
print(starter)  # process handle (pid=42, tag=heartbeat-worker)
```

To read output from a long-running connection, place log consumption in a background thread and use the main thread for stop control. Output produced before the connection is established is not guaranteed to be replayed.

```python
import threading

command = sandbox.commands.connect(tag="heartbeat-worker")

def read_logs():
    for stdout, stderr, pty in command:
        if stdout:
            print(stdout, end="")
        if stderr:
            print(stderr, end="")

reader = threading.Thread(target=read_logs, daemon=True)
reader.start()
try:
    input("Press Enter or Ctrl-C to stop: ")
except KeyboardInterrupt:
    pass
finally:
    command.disconnect()
    sandbox.commands.kill(tag="heartbeat-worker", signal=2)
    reader.join(timeout=1)
```

`disconnect()` closes only the log connection; it does not terminate the process. `kill()` stops the process. If the process does not respond, use `signal=9` to force termination.

`stdout` event chunks do not necessarily align with log lines; callers must buffer and parse output according to their own protocol. A long-running service emits an `end` event only after it exits or receives a signal. Only then does `CommandHandle.wait()` return the final exit code.

### Request example

```json
{
  "process": {
    "tag": "heartbeat-worker"
  }
}
```

All three data fields are base64-encoded bytes. SDK callbacks receive incrementally decoded UTF-8 strings.

## List background processes

RPC name: `List`

```text
pb.ProcessService/List
```

### Input

No input fields.

### Output

```json
{
  "processes": [
    {
      "pid": 23456,
      "tag": "http-srv",
      "config": {"cmd": "python3", "args": ["-m", "http.server", "18080"], "env": {}, "cwd": "/tmp", "pty": null},
      "running": true,
      "startedAt": "2026-07-11T10:00:00Z",
      "exitCode": -1,
      "finishedAt": ""
    }
  ]
}
```

### Description

Lists background processes currently managed by the Agent inside the Sandbox. Read command output from a `Connect` stream.

### SDK

```python
processes = sandbox.commands.list()
for process in processes:
    print(process.pid, process.tag, process.running, process.cmd, process.args)
```

Example output:

```text
204 docs-background True /bin/sh ['-c', 'sleep 1; echo background-ready']
```

### cURL

```bash
curl --request POST \
  --url "${AGENT_URL}/pb.ProcessService/List" \
  --header 'Connect-Protocol-Version: 1' \
  --header 'Content-Type: application/json' \
  --header "conch-init-token: ${AGENT_TOKEN}" \
  --data '{}'
```

## Send a process signal

RPC name: `SendSignal`

```text
pb.ProcessService/SendSignal
```

### Input

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `process.pid` | integer | One selector | Process PID; mutually exclusive with `process.tag`. |
| `process.tag` | string | One selector | Process tag; mutually exclusive with `process.pid`. |
| `signal` | integer | Yes | Non-zero signal number; `15` is SIGTERM and `9` is SIGKILL. |

### Output

```json
{}
```

### Description

Sends a signal to a background process. A missing target returns Connect `NotFound`.

### SDK

```python
ok = sandbox.commands.kill(tag="http-srv", signal=15)
print(ok)
```

Output:

```text
True
```

A missing target returns `False`:

```python
print(sandbox.commands.kill(tag="does-not-exist", signal=15))
```

```text
False
```

The SDK returns `True` after sending the signal, returns `False` when the target does not exist, and maps and raises other failures as SDK error types.

### cURL

```bash
curl --request POST \
  --url "${AGENT_URL}/pb.ProcessService/SendSignal" \
  --header 'Connect-Protocol-Version: 1' \
  --header 'Content-Type: application/json' \
  --header "conch-init-token: ${AGENT_TOKEN}" \
  --data '{
    "process": {
      "tag": "http-srv"
    },
    "signal": 15
  }'
```

## Upload a file

RPC name: `PostFileStream`

```text
pb.FileService/PostFileStream
```

### Input

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `filepath` | string | First chunk | Target path inside the Sandbox. The first chunk must include it; later chunks may omit it or repeat the same path. |
| `content` | bytes | No | File chunk; base64 in JSON examples, with a maximum of 1 MiB per chunk. |

### Output

```json
{
  "uploadedCount": 1,
  "entries": [{"name": "remote.txt", "path": "/tmp/conch-doc-api/remote.txt", "type": "file"}]
}
```

### Description

Uploads a local file or writes content into the Sandbox.

### SDK

```python
# Write text content
entry = sandbox.files.write("/tmp/conch-doc-api/remote.txt", "hello\n")
print(entry)

# Write multiple contents
entries = sandbox.files.write_files([
    {"path": "/tmp/conch-doc-api/a.txt", "data": "a"},
    {"path": "/tmp/conch-doc-api/main.py", "data": b"print('ok')\n"},
])
print(entries)

# Upload a local file
entry = sandbox.files.upload("local.txt", "/tmp/conch-doc-api/uploaded.txt")
```

Actual output from `write()` and `write_files()`:

```text
WriteInfo(name='remote.txt', type=<FileType.FILE: 'file'>, path='/tmp/conch-doc-api/remote.txt')
[WriteInfo(name='a.txt', type=<FileType.FILE: 'file'>, path='/tmp/conch-doc-api/a.txt'), WriteInfo(name='main.py', type=<FileType.FILE: 'file'>, path='/tmp/conch-doc-api/main.py')]
```

### Request example

```json
{
  "filepath": "/tmp/conch-doc-api/remote.txt",
  "content": "aGVsbG8K"
}
```

Uploads are written to a temporary file and renamed to the target after the complete stream has been received. Upload failures are returned as Connect status errors.

## Download a file

RPC name: `GetFileStream`

```text
pb.FileService/GetFileStream
```

### Input

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `filepath` | string | Yes | Source-file path inside the Sandbox. |

### Output

```text
stream FileChunk
```

Each chunk is at most 1 MiB. The first chunk includes `filepath`; later chunks normally contain only `content`.

### Description

Downloads a file from the Sandbox or reads its contents.

### SDK

```python
content = sandbox.files.read("/tmp/conch-doc-api/remote.txt")
raw = sandbox.files.read("/tmp/conch-doc-api/remote.txt", format="bytes")
chunks = sandbox.files.read("/tmp/conch-doc-api/remote.txt", format="stream")

result = sandbox.files.download("/tmp/conch-doc-api/remote.txt", "remote.txt")

print(repr(content))
print(repr(raw))
print(repr(b"".join(chunks)))
print(result)
```

`read()` returns UTF-8 text by default. Use `format="bytes"` explicitly for binary content.

Output:

```text
'hello\n'
b'hello\n'
b'hello\n'
{'status': 0, 'size': 6, 'message': 'OK'}
```

### Request example

```json
{
  "filepath": "/tmp/conch-doc-api/remote.txt"
}
```

## List files

RPC name: `ListFiles`

```text
pb.FileService/ListFiles
```

### Input

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `path` | string | Yes | Path to list. |
| `depth` | integer | No | Recursion depth. `1` means the current directory; omitted, `0`, or negative values are treated as `1`. |

### Output

```json
{
  "entries": [
    {
      "name": "remote.txt",
      "path": "/tmp/conch-doc-api/remote.txt",
      "type": "file",
      "size": "6",
      "isDirectory": false,
      "permissions": "-rw-r--r--",
      "modifiedTime": "2026-07-11T10:00:00Z",
      "metadata": {}
    }
  ]
}
```

### Description

Lists files and directories beneath a Sandbox path.

### SDK

```python
items = sandbox.files.list("/tmp/conch-doc-api", depth=2)
for item in items:
    print(item.path, item.type, item.size, item.is_directory)
```

Assuming `linked` is a directory symlink to `target`, example output is:

```text
/tmp/conch-doc-api/a.txt FileType.FILE 1 False
/tmp/conch-doc-api/linked FileType.DIR 60 True
/tmp/conch-doc-api/linked/main.py FileType.FILE 12 False
/tmp/conch-doc-api/remote.txt FileType.FILE 6 False
/tmp/conch-doc-api/target FileType.DIR 60 True
/tmp/conch-doc-api/target/main.py FileType.FILE 12 False
```

Directory symlinks are returned as directories and traversed through their logical paths when allowed by `depth`. The implementation detects real paths in the current recursion chain to prevent symlink cycles from causing infinite traversal. Broken symlinks are still returned as ordinary entries.

PIDs, timestamps, and directory-entry `size` values depend on the runtime and should not be used as fixed assertions. File-content sizes can be asserted reliably.

### cURL

```bash
curl --request POST \
  --url "${AGENT_URL}/pb.FileService/ListFiles" \
  --header 'Connect-Protocol-Version: 1' \
  --header 'Content-Type: application/json' \
  --header "conch-init-token: ${AGENT_TOKEN}" \
  --data '{
    "path": "/tmp/conch-doc-api",
    "depth": 2
  }'
```

## Search files

RPC name: `SearchFiles`

```text
pb.FileService/SearchFiles
```

### Input

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `path` | string | Yes | Search root. |
| `pattern` | string | Yes | Glob pattern. |
| `excludePatterns` | string[] | No | Exclusion patterns. |

### Output

```json
{
  "entries": [
    {
      "name": "main.py",
      "path": "/tmp/conch-doc-api/target/main.py",
      "type": "file",
      "size": "12",
      "isDirectory": false,
      "permissions": "-rw-r--r--",
      "modifiedTime": "2026-07-11T10:00:00Z",
      "metadata": {}
    }
  ]
}
```

### Description

Searches for files using a glob pattern.

### SDK

```python
items = sandbox.files.search(
    path="/tmp/conch-doc-api",
    pattern="*.py",
    exclude_patterns=["*.bak"],
)
for item in items:
    print(item.path, item.type)
```

Directory symlinks also participate in recursive search. Example output:

```text
/tmp/conch-doc-api/linked/main.py FileType.FILE
/tmp/conch-doc-api/target/main.py FileType.FILE
```

### cURL

```bash
curl --request POST \
  --url "${AGENT_URL}/pb.FileService/SearchFiles" \
  --header 'Connect-Protocol-Version: 1' \
  --header 'Content-Type: application/json' \
  --header "conch-init-token: ${AGENT_TOKEN}" \
  --data '{
    "path": "/tmp/conch-doc-api",
    "pattern": "*.py",
    "excludePatterns": ["*.bak"]
  }'
```
