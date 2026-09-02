---
title: 休眠与唤醒
sidebar_position: 3
---

# 休眠与唤醒

Suspend 会暂停 Sandbox 的 VMM，保留其内存和运行时资源；resume 会让同一个 Sandbox 继续运行。这一流程不会创建 Template，与 [checkpoint](/docs/user/snapshot-start) 不同。

## 暂停 Sandbox

```bash
sudo ./bin/conch sandbox suspend \
  --config config/config.local.yaml \
  sandbox-demo
```

Python SDK：

```python
sandbox.suspend()
```

暂停成功后，Sandbox 控制面状态为 `SUSPENDED`，在 SDK 的列表筛选中对应 `paused`。VMM 进程、Network Slot 和 Volume 仍被占用，因此 suspend 不适合替代资源清理。

## 恢复 Sandbox

```bash
sudo ./bin/conch sandbox resume \
  --config config/config.local.yaml \
  sandbox-demo
```

Python SDK：

```python
sandbox.resume()
```

恢复成功后，控制面状态回到 `READY`，对应 SDK 的 `running`。

## 查看状态

CLI 会列出运行和暂停的 Sandbox，但当前输出不单独显示状态列。需要区分状态时使用 Python SDK：

```python
from conch import Sandbox

paused = Sandbox.list(state=["paused"])
running = Sandbox.list(state=["running"])
```

也可以直接调用 `GET /api/v1/sandboxes?state=paused`。完整接口见 [Sandbox HTTP API](/docs/reference/sandbox)。

## 操作边界

- 只有当前 conchd 管理的 Sandbox 才能 suspend 或 resume。
- Suspend 不是持久化休眠：conchd 重启后不会恢复暂停的 Sandbox。
- 带 Volume 的 Sandbox 支持 suspend 和 resume。
- 需要生成可跨 Sandbox 使用的可恢复状态时，使用 checkpoint。
- 需要释放 VMM、网络和临时运行时资源时，使用 delete。
