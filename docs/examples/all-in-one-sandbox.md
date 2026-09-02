---
title: Conch 部署 all-in-one sandbox
sidebar_position: 2
---

# Conch 部署 all-in-one sandbox

Conch 源码中的 `examples/e2b-rootfs/` 提供一个 E2B 风格的 all-in-one rootfs。单个 Sandbox 内同时运行：

- `envd`，监听 `49983`。
- Jupyter Server，监听 `8888`。
- code-interpreter API，监听 `49999`。
- OpenSSH server，监听 `22`。
- conch-init Agent API，监听 `4064`。

rootfs 中的 `/etc/conch/entrypoint` 由 conch-init 在网络初始化后启动。entrypoint 等待 envd 与 code-interpreter 健康，然后通过 `SIGUSR1` 通知 conch-init；因此 `Sandbox.create()` 成功返回时，核心服务已进入 ready 状态。

## 前置条件

- conchd 运行环境与 guest kernel、initrd 已准备完成。
- host 上运行 BuildKit daemon，并安装 `buildctl`。
- `localhost:5000` 运行一个允许 HTTP 的 OCI registry。
- 构建机能够下载 Go、E2B envd 源码、code-interpreter 源码及 Python/npm 依赖。

本示例 Dockerfile 当前以 openEuler 24.03 LTS SP3 为基础，并构建固定版本的 envd 与 code-interpreter。版本值以源码中的 Dockerfile 为准。

## 构建并发布 rootfs Image

在 Conch 源码根目录执行：

```bash
cd examples/e2b-rootfs
buildctl build \
  --frontend dockerfile.v0 \
  --local context=. \
  --local dockerfile=. \
  --output type=image,name=localhost:5000/conch/e2b-rootfs:debug,push=true,registry.insecure=true
```

默认只安装示例运行所需的 Jupyter 核心依赖。需要安装 `template-requirements.txt` 的完整依赖时，在 `buildctl build` 参数中增加 `--opt build-arg:INSTALL_FULL_TEMPLATE_REQUIREMENTS=1`。

## 创建 Conch Template

回到源码根目录，把 rootfs Image 与 guest kernel、initrd 组合为 cold Template：

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

确认 Template：

```bash
sudo ./bin/conch template inspect \
  --config config/config.local.yaml \
  localhost/conch/e2b-all-in-one:latest
```

## 创建并验证 Sandbox

先安装 SDK，然后运行以下脚本：

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

服务日志位于：

```text
/var/log/conch-init/conch-init.log
/var/log/conch-init/service.log
/var/log/conch-init/envd.log
/var/log/conch-init/code-interpreter.log
```

可以通过 `sandbox.files.read()` 读取日志，或执行 `tail`：

```python
print(sandbox.files.read("/var/log/conch-init/code-interpreter.log"))
```

## 可选的 SSH 调试

Dockerfile 支持在构建时写入 debug SSH 公钥：

```bash
buildctl build \
  --frontend dockerfile.v0 \
  --local context=. \
  --local dockerfile=. \
  --opt build-arg:DEBUG_SSH_AUTHORIZED_KEY="$(cat ~/.ssh/id_ed25519.pub)" \
  --output type=image,name=localhost:5000/conch/e2b-rootfs:debug,push=true,registry.insecure=true
```

公钥会成为镜像内容的一部分。只使用专门的短期调试 key，不要把含 key 的镜像发布到不受信任的 registry；调试结束后应在不传该 build arg 的情况下重新构建。

写入 key 只配置 guest SSH，仍需保证 host 能路由到 Sandbox IP，并且网络策略允许 SSH 流量。

## 实现边界

- entrypoint 设置 `ENVD_DISABLE_MMDS=1` 和 `ENVD_DISABLE_PORT_FORWARDER=1`，不依赖 E2B 的 MMDS 或端口转发器。
- Jupyter 只监听 guest loopback，code-interpreter 监听所有 guest 地址。
- entrypoint 会持续监测核心服务，并为 code-interpreter 提供重启循环；这不是通用进程编排器。
- 删除 Sandbox 会终止这些服务。需要持久数据时，应显式配置 Conch Volume。
