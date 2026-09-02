---
title: Sandbox HTTP API
sidebar_position: 2
---

# Sandbox HTTP API

conchd 通过本地 Unix socket 提供 Sandbox 控制面 API。默认 socket 为 `/var/run/conch/conchd.sock`，实际路径固定为 `<server.work_dir>/conchd.sock`。

```bash
export CONCH_SOCKET=/var/run/conch/conchd.sock
curl --unix-socket "$CONCH_SOCKET" http://localhost/health
```

当前控制面 API 不提供 TCP listener，也不在 HTTP 层实现鉴权。应使用文件权限限制 Unix socket 的访问者。

## 接口概览

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/health` | 检查控制面核心组件是否完成初始化。 |
| `POST` | `/api/v1/sandboxes` | 创建 Sandbox。 |
| `GET` | `/api/v1/sandboxes` | 列出 Sandbox。 |
| `GET` | `/api/v1/sandboxes/{sandboxID}` | 查询 Sandbox 详情。 |
| `DELETE` | `/api/v1/sandboxes/{sandboxID}` | 删除 Sandbox。 |
| `PUT` | `/api/v1/sandboxes/{sandboxID}/network` | 完整替换网络策略。 |
| `POST` | `/api/sandbox/suspend` | 暂停 Sandbox。 |
| `POST` | `/api/sandbox/resume` | 恢复 Sandbox。 |
| `POST` | `/api/sandbox/checkpoint` | 创建 resume Template。 |

除创建 Template 的 multipart 接口外，JSON 请求体最大为 1 MiB，并且不允许未知字段、多个连续 JSON 值或 JSON 值后的非空内容。

## 健康检查

```bash
curl --unix-socket "$CONCH_SOCKET" \
  -i http://localhost/health
```

核心组件就绪时返回 `204 No Content`。该检查确认 state store、containerd host、daemon client 和 runtime service 已初始化，不会逐项探测它们之后的实时健康状态。

## 创建 Sandbox

```bash
curl --unix-socket "$CONCH_SOCKET" \
  -X POST http://localhost/api/v1/sandboxes \
  -H 'Content-Type: application/json' \
  -d '{
    "sandbox_id": "sandbox-demo",
    "template_name": "localhost/conch/python:latest",
    "vcpu_num": 2,
    "vcpu_max": 2,
    "ram_mb": 4096,
    "env": {
      "WORKLOAD": "docs-demo"
    },
    "network": {
      "allowOut": ["198.51.100.10"],
      "denyIn": ["203.0.113.0/24"],
      "allow_internet_access": false
    },
    "volumeMounts": [
      {
        "source": "/srv/conch/workspace",
        "path": "/workspace",
        "readonly": false
      }
    ]
  }'
```

### 请求字段

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `sandbox_id` | string | 可选。省略时由 conchd 生成；显式值长度 2～32，只能使用字母、数字、`_`、`.`、`-`，并以字母或数字开头。 |
| `template_name` | string | 可选。可变的 Template Name；与 `template_id` 互斥。 |
| `template_id` | string | 可选。不可变的 OCI digest；与 `template_name` 互斥。 |
| `vmm_name` | string | 可选。VMM 名称，例如 `stratovirt` 或 `cloud-hypervisor`。 |
| `vcpu_num` | integer | 可选。初始 vCPU 数量。 |
| `vcpu_max` | integer | 可选。vCPU 上限，不能小于 `vcpu_num`。 |
| `ram_mb` | integer | 可选。内存 MiB。显式值至少 128，固定上限 262144。 |
| `env` | object | 可选。传给 guest 初始化环境的字符串键值。 |
| `network` | object | 可选。创建时应用的 IPv4 网络策略。 |
| `volumeMounts` | array | 可选。host 目录挂载列表。 |

Template 和资源字段为零值或空字符串时，conchd 使用 `sandbox.default_spec` 与 `sandbox.backend`。应用默认值后，必须恰好存在 `template_name` 或 `template_id` 之一；vCPU 固定上限为 64。

`vcpu_num` 与 `vcpu_max` 分别独立应用默认值。如果显式把 `vcpu_num` 调高到超过默认 `vcpu_max`，必须同时传入不小于它的 `vcpu_max`。

`env` 的键不能为空，不能包含 `=` 或 NUL；值不能包含 NUL。Sandbox ID、Agent token、网络配置和环境变量共同组成 guest 初始化消息，UTF-8 编码后最大 16 KiB。

网络策略字段为 `allowOut`、`denyOut`、`allowIn`、`denyIn` 和 `allow_internet_access`。四个列表只接受 IPv4 地址或 CIDR，合计最多 1024 项。Volume 字段见 [Storage 参考](/docs/reference/storage)。

### 成功响应

```json
{
  "templateName": "localhost/conch/python:latest",
  "templateID": "sha256:0123456789abcdef...",
  "sandboxID": "sandbox-demo",
  "conchInitVersion": "",
  "alias": "",
  "conchInitAccessToken": "<token>",
  "domain": "192.0.2.10"
}
```

`conchInitAccessToken` 用于访问 guest 内的 conch-init Agent API，应按凭证处理。该 token 只在创建响应中返回，不会出现在后续 GET 响应中。

## 列出 Sandbox

```bash
curl --unix-socket "$CONCH_SOCKET" \
  'http://localhost/api/v1/sandboxes?state=running&limit=100'
```

查询参数：

| 参数 | 说明 |
| --- | --- |
| `state` | 可重复。支持 `running` 和 `paused`，分别对应内部 `READY` 和 `SUSPENDED`。 |
| `limit` | 1～5000，默认 100。 |

不传 `state` 时仍只返回运行或暂停的记录，不返回 `CREATING`、`UNKNOWN` 等内部状态。

```json
[
  {
    "templateName": "localhost/conch/python:latest",
    "templateID": "sha256:0123456789abcdef...",
    "imageName": "",
    "snapshotID": "",
    "sandboxID": "sandbox-demo",
    "startedAt": "2026-09-01T08:00:00Z",
    "endAt": "",
    "cpuCount": 2,
    "memoryMB": 4096,
    "diskSizeMB": 0,
    "conchInitVersion": "",
    "alias": "",
    "metadata": {},
    "volumeMounts": []
  }
]
```

当前列表不会返回 `domain`、`network` 或 lifecycle 详情。

## 查询 Sandbox 详情

```bash
curl --unix-socket "$CONCH_SOCKET" \
  http://localhost/api/v1/sandboxes/sandbox-demo
```

详情响应在列表字段之外增加 `domain`、`lifecycle` 和 `network`：

```json
{
  "templateName": "localhost/conch/python:latest",
  "templateID": "sha256:0123456789abcdef...",
  "imageName": "",
  "snapshotID": "",
  "sandboxID": "sandbox-demo",
  "startedAt": "2026-09-01T08:00:00Z",
  "endAt": "",
  "cpuCount": 2,
  "memoryMB": 4096,
  "diskSizeMB": 0,
  "conchInitVersion": "",
  "alias": "",
  "domain": "192.0.2.10",
  "metadata": {},
  "lifecycle": {"autoResume": false},
  "volumeMounts": [],
  "network": {
    "allowOut": ["198.51.100.10"],
    "denyIn": ["203.0.113.0/24"],
    "allow_internet_access": false
  }
}
```

`imageName`、`snapshotID`、`diskSizeMB`、`conchInitVersion`、`alias`、`metadata` 和 `lifecycle.autoResume` 是当前响应中的兼容或预留字段。`volumeMounts` 当前也不会从持久状态恢复，固定返回空数组。

## 更新网络策略

```bash
curl --unix-socket "$CONCH_SOCKET" \
  -X PUT http://localhost/api/v1/sandboxes/sandbox-demo/network \
  -H 'Content-Type: application/json' \
  -d '{
    "allowOut": ["198.51.100.10"],
    "denyOut": [],
    "allowIn": [],
    "denyIn": ["203.0.113.0/24"],
    "allow_internet_access": false
  }'
```

成功返回 `204 No Content`。该接口完整替换已有策略；省略的数组按空数组处理。运行和暂停状态均可更新。

拒绝规则优先于允许规则。非空允许列表启用对应方向的白名单；只有拒绝列表时，未匹配流量仍允许。`allow_internet_access: false` 会拒绝未被其它规则接受的出站流量。已有的 conntrack 连接优先放行，不保证更新后立即断开。

## 暂停与恢复

暂停：

```bash
curl --unix-socket "$CONCH_SOCKET" \
  -X POST http://localhost/api/sandbox/suspend \
  -H 'Content-Type: application/json' \
  -d '{"sandbox_id":"sandbox-demo"}'
```

恢复：

```bash
curl --unix-socket "$CONCH_SOCKET" \
  -X POST http://localhost/api/sandbox/resume \
  -H 'Content-Type: application/json' \
  -d '{"sandbox_id":"sandbox-demo"}'
```

成功响应均为：

```json
{"status":"ok"}
```

Suspend 保留 VMM、网络和 Volume 资源，只暂停执行；resume 继续同一个 Sandbox。它不是持久化 checkpoint。

## 创建 checkpoint Template

```bash
curl --unix-socket "$CONCH_SOCKET" \
  -X POST http://localhost/api/sandbox/checkpoint \
  -H 'Content-Type: application/json' \
  -d '{
    "sandbox_id": "sandbox-demo",
    "template_name": "localhost/conch/python-ready:latest",
    "labels": {
      "purpose": "docs"
    }
  }'
```

`sandbox_id` 和 `template_name` 必填。成功返回：

```json
{
  "status": "ok",
  "template_id": "sha256:fedcba9876543210..."
}
```

Checkpoint 产生 resume Template，但不改变源 Sandbox 的运行状态。带 Volume 的 Sandbox 不支持 checkpoint。

## 删除 Sandbox

```bash
curl --unix-socket "$CONCH_SOCKET" \
  -X DELETE http://localhost/api/v1/sandboxes/sandbox-demo
```

成功返回 `204 No Content`。目标不存在时返回 `404`，因此 HTTP 删除接口不是幂等成功语义。

## 错误响应

失败响应统一使用 JSON：

```json
{
  "status": "error",
  "code": "sandbox.invalid_argument",
  "error": "invalid sandbox argument"
}
```

`code` 用于自动化判断，`error` 是面向用户的公开文案。常见 HTTP 映射包括：

| HTTP 状态 | 含义 |
| --- | --- |
| `400` | 请求字段或 JSON 无效。 |
| `404` | Sandbox 或 Template 不存在。 |
| `409` | ID 冲突、状态不满足操作前提。 |
| `413` | 请求体或初始化载荷过大。 |
| `429` | 超出固定资源上限。 |
| `503` | 控制面尚未就绪。 |
| `504` | 请求超时。 |

## 相关参考

- [Python SDK](/docs/reference/python-sdk)
- [conch-init Agent API](/docs/reference/conch-init)
- [Sandbox 生命周期 Webhook](/docs/reference/sandbox-webhooks)
- [VSOCK 通信](/docs/reference/sandbox-vsock)
