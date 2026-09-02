---
title: 存储管理
sidebar_position: 5
---

# 存储管理

Conch Volume 将 conchd 所在 host 的目录挂载到 Sandbox guest。当前后端是 virtiofs：每个有 Volume 的 Sandbox 启动一个 virtiofsd，并通过一个共享设备承载该 Sandbox 的全部挂载。

## 准备 host 目录

`source` 必须是 host 上已经存在的绝对目录。Conch 不会替用户创建或删除它：

```bash
sudo install -d -m 0755 /srv/conch/workspace
sudo install -d -m 0755 /srv/conch/dataset
```

目录权限仍由 host 文件系统和 guest 进程 UID/GID 共同决定。`readonly: true` 只能阻止 guest 通过该挂载写入，不会改变 host 目录本身的权限。

## 创建带 Volume 的 Sandbox

CLI 暂不接受 Volume 参数，请使用 Python SDK 或 HTTP API：

```python
from conch import Sandbox

with Sandbox.create(
    template_name="localhost/conch/python:latest",
    volume_mounts=[
        {
            "source": "/srv/conch/workspace",
            "path": "/workspace",
        },
        {
            "source": "/srv/conch/dataset",
            "path": "/data",
            "readonly": True,
        },
    ],
) as sandbox:
    sandbox.commands.run(
        cmd="sh",
        args=["-c", "printf persisted > /workspace/result.txt"],
    )
    print(sandbox.commands.run(cmd="cat", args=["/data/input.txt"]).stdout)
```

请求字段名在 Python 中是 `volume_mounts`，发送到 conchd 时为 `volumeMounts`。

## 数据持久性

删除 Sandbox 会卸载 bind mount、停止 virtiofsd 并删除 Conch 的运行时目录，但不会删除 `source`。使用相同 host 目录创建另一个 Sandbox，即可读取前一个 Sandbox 写入的数据。

不要把 Conch Volume 当作具有并发一致性保证的共享文件系统。多个 Sandbox 同时写同一 host 目录时，仍由底层文件系统和应用自行协调。

## 校验规则

- 每个 Sandbox 最多挂载 `volume.max_mounts` 个目录，默认 10。
- `source` 必须是已经存在的 host 绝对目录。
- `path` 必须是 guest 绝对路径，且同一 Sandbox 内不能重复。
- 不允许挂载到 `/`、`/proc`、`/sys`、`/dev`、`/run` 或这些目录的子路径。
- `readonly` 省略时默认为 `false`。
- 带 Volume 的 Sandbox 支持 suspend 和 resume，但不支持 checkpoint。
- 从 `boot_mode=resume` 的 Template 创建 Sandbox 时不能配置 Volume。

## 配置 virtiofsd

```yaml
volume:
  max_mounts: 10
  backend: virtiofs
  virtiofs:
    binary: /usr/libexec/virtiofsd
```

`binary` 可以是 `PATH` 中的命令名或绝对路径。Debian/Ubuntu 等发行版通常把 virtiofsd 安装在 `/usr/libexec/virtiofsd`，不在默认 `PATH` 中，此时应填写绝对路径。

guest kernel 必须内建 `CONFIG_VIRTIO_FS=y` 和 `CONFIG_FUSE_FS=y`。极简 initrd 通常没有可供动态加载的模块。

完整架构、guest 挂载流程与 VMM 参数见 [Storage 参考](/docs/reference/storage)。
