---
title: 沙箱快照启动
sidebar_position: 2
---

# 沙箱快照启动

Checkpoint 会捕获运行中 Sandbox 的 VMM 内存状态，并生成一个 `origin=checkpoint`、`boot_mode=resume` 的新 Template。之后可通过这个 Template 恢复出新的 Sandbox。

## 前置条件与限制

- 源 Sandbox 必须仍由当前 conchd 管理。
- checkpoint 必须指定一个 `Template Name`，用于保存新 Template。
- checkpoint 不停止、不暂停也不删除源 Sandbox。
- 带 Volume 挂载的 Sandbox 不支持 checkpoint。
- 从 resume Template 创建 Sandbox 时不能配置 Volume。
- 每次 checkpoint 都以当前 Sandbox 的 checkpoint head 为父节点；成功后 head 前移到新 Template ID。

## 使用 CLI

先从 cold Template 创建 Sandbox：

```bash
sudo ./bin/conch sandbox create \
  --config config/config.local.yaml \
  --template-name localhost/conch/python:latest \
  --sandbox-id sandbox-demo
```

在 guest 中完成需要保留的初始化后，创建 checkpoint Template：

```bash
sudo ./bin/conch sandbox checkpoint \
  --config config/config.local.yaml \
  --template-name localhost/conch/python-ready:latest \
  sandbox-demo
```

命令输出新 Template Name 和 Template ID。确认其启动模式：

```bash
sudo ./bin/conch template inspect \
  --config config/config.local.yaml \
  localhost/conch/python-ready:latest
```

通过名称恢复新的 Sandbox：

```bash
sudo ./bin/conch sandbox create \
  --config config/config.local.yaml \
  --template-name localhost/conch/python-ready:latest \
  --sandbox-id sandbox-restored
```

## 使用 Python SDK

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

使用 `template_name` 适合让名称持续指向最近一次 checkpoint；使用返回的 `template_id` 创建，则可固定到本次不可变快照内容。

## 清理

恢复得到的 Sandbox 和源 Sandbox 是两个独立实例，需要分别删除。确认不再需要 checkpoint Template 后，再按名称删除：

```bash
sudo ./bin/conch sandbox delete --config config/config.local.yaml sandbox-restored
sudo ./bin/conch sandbox delete --config config/config.local.yaml sandbox-demo
sudo ./bin/conch template rm \
  --config config/config.local.yaml \
  localhost/conch/python-ready:latest
```

删除 Template 只移除该名称对应的 containerd image record；不再被任何记录引用的内容由 containerd GC 回收。
