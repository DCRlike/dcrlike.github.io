---
title: 沙箱创建与删除
sidebar_position: 1
---

# 沙箱创建与删除

本页介绍 Sandbox 的创建、查询和删除。开始前应已启动 conchd，并准备好一个 Template；Template 的创建方法见[模板管理](/docs/user/template-management)。

## 选择 Template

创建 Sandbox 时可以使用以下任一种选择器：

- `Template Name`：便于人阅读和更新，例如 `localhost/conch/python:latest`。
- `Template ID`：固定到不可变的 Boot Index digest，例如 `sha256:...`。

二者不能同时指定。若二者都省略，conchd 使用 `sandbox.default_spec.template_name` 或 `sandbox.default_spec.template_id`。

先查看本地 Template：

```bash
sudo ./bin/conch template ls --config config/config.local.yaml
```

## 使用 CLI 创建

```bash
sudo ./bin/conch sandbox create \
  --config config/config.local.yaml \
  --template-name localhost/conch/python:latest \
  --sandbox-id sandbox-demo \
  --ram-mb 4096
```

`--sandbox-id` 省略时由 CLI 生成。Sandbox ID 长度必须为 2～32 个字符，以字母或数字开头，并且只能包含字母、数字、下划线、点和连字符。

CLI 当前只覆盖 Template、Sandbox ID 和内存参数。需要设置 vCPU、环境变量、网络策略、Volume 或 VMM 时，使用 Python SDK 或 HTTP API。

## 使用 Python SDK 创建

Python SDK 位于 Conch 源码的 `sdk/` 目录，可以在源码仓库中安装：

```bash
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install ./sdk
```

创建 Sandbox 并执行一条命令：

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

`with` 代码块退出时会自动调用 `delete()`。不使用上下文管理器时，应使用 `try/finally` 确保 Sandbox 被删除。

省略资源字段时，SDK 不会自行填默认值，而是让 conchd 应用 `sandbox.default_spec`。固定资源上限为 64 vCPU 和 256 GiB 内存；内存不得低于 128 MiB。

## 查询 Sandbox

CLI 列出当前处于运行或暂停状态的 Sandbox：

```bash
sudo ./bin/conch sandbox ls --config config/config.local.yaml
```

SDK 可以筛选状态并限制返回数量：

```python
from conch import Sandbox

for item in Sandbox.list(state=["running"], limit=20):
    print(item["sandboxID"], item["templateName"], item["startedAt"])
```

`state` 支持 `running` 和 `paused`；`limit` 范围为 1～5000，默认 100。`Sandbox.get(sandbox_id)` 可读取详细控制面信息，但 conchd 不会在查询响应中返回既有 Sandbox 的 Agent token，因此查询得到的对象不能执行 guest 内命令或文件操作。

## 删除 Sandbox

```bash
sudo ./bin/conch sandbox delete \
  --config config/config.local.yaml \
  sandbox-demo
```

Python SDK：

```python
sandbox.delete()

# 只有 Sandbox ID 时：
Sandbox.delete_sandbox("sandbox-demo")
```

删除操作会停止 VMM，并回收网络、快照视图和 virtiofs 运行时资源；用户提供的 Volume host 目录及其中的数据不会被删除。

conchd 启动时会清理上次异常退出遗留的 Sandbox 状态和运行时资源，不会重新接管旧 VMM。正常停止或重启服务前，仍应先删除所有活跃 Sandbox。

## 下一步

- [休眠与唤醒](/docs/user/suspend-resume)
- [沙箱快照启动](/docs/user/snapshot-start)
- [Sandbox HTTP API](/docs/reference/sandbox)
- [Python SDK](/docs/reference/python-sdk)
