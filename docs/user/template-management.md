---
sidebar_position: 4
title: 模板管理
---

# 模板管理

Template 是 Conch 创建 Sandbox 的启动对象。每个 Template 有一个可变的 `Template Name` 和一个不可变的 `Template ID`：

| 概念 | 示例 | 用途 |
| --- | --- | --- |
| Template Name | `localhost/conch/python:latest` | 用于创建、查询、发布、解包和删除 Template；同名写入会更新指向。 |
| Template ID | `sha256:...` | OCI Boot Index digest；用于精确标识不可变内容，也可直接创建 Sandbox。 |

Template 的 Boot Index 包含 EROFS rootfs、guest kernel 和 initrd；由 checkpoint 产生的 resume Template 还包含 VMM 内存状态。

## 从 OCI Image 创建 Template

```bash
sudo ./bin/conch template create \
  --config config/config.local.yaml \
  --name localhost/conch/python:latest \
  --source docker.io/library/python:3.12 \
  --kernel /var/lib/conch/kernel \
  --initrd /var/lib/conch/conch.initrd
```

`--name`、`--source`、`--kernel` 和 `--initrd` 都是必填项。Conch 按以下顺序处理：

1. 在 conchd 内嵌 containerd 中查找 `--source`；不存在时从 registry 拉取。
2. 确认来源是普通 OCI Image，而不是 Boot Index。
3. 将 rootfs 转换为 EROFS。
4. 与 kernel、initrd 组成 cold Boot Index。
5. 让 `--name` 指向生成的 Template ID。

成功输出示例：

```text
Template Name: localhost/conch/python:latest
Template ID: sha256:0123456789abcdef...
```

私有仓库可以使用 `--user username:password`，或者分别使用 `--username`、`--password`。只有明确使用 HTTP 的 registry 才传 `--plain-http`。

## 查询与筛选

列出全部 Template：

```bash
sudo ./bin/conch template ls --config config/config.local.yaml
```

按来源或启动方式筛选：

```bash
sudo ./bin/conch template ls \
  --config config/config.local.yaml \
  --origin checkpoint \
  --boot-mode resume
```

允许的筛选值：

- `origin`：`image` 或 `checkpoint`。
- `boot-mode`：`cold` 或 `resume`。

查看指定名称：

```bash
sudo ./bin/conch template inspect \
  --config config/config.local.yaml \
  localhost/conch/python:latest
```

输出列包括 `NAME`、`TEMPLATE_ID`、`ORIGIN`、`BOOT_MODE`、`SOURCE_REF` 和 `SOURCE_SANDBOX`。

## Template Name 的更新语义

Template Name 对应一个内部 containerd image record。再次使用相同名称执行 `template create`、`template pull` 或 checkpoint，会更新该 record 指向的 Boot Index；已经拿到的旧 Template ID 不会改变。

因此：

- 日常创建 Sandbox 可使用 Template Name，以跟随名称的最新内容。
- 可复现工作负载应保存并使用 Template ID。
- 更新名称不会修改已运行的 Sandbox。

## 发布与拉取

发布本地 Template 时，第一个位置参数是本地 Template Name，第二个是远端 registry reference：

```bash
sudo ./bin/conch template push \
  --config config/config.local.yaml \
  localhost/conch/python:latest \
  registry.example.com/conch/python:latest
```

拉取远端 Boot Index：

```bash
sudo ./bin/conch template pull \
  --config config/config.local.yaml \
  registry.example.com/conch/python:latest
```

拉取成功后，本地 Template Name 使用 registry 返回的规范化来源名称，命令同时输出 Template ID。`template pull` 会校验 Boot Index 结构；普通 OCI Image 应使用 `conch image pull`。

## 解包 Template

创建 Sandbox 时会按需准备 Boot Index 组件。需要提前把指定 Template 的全部组件解包到本地 snapshotter 时，执行：

```bash
sudo ./bin/conch template unpack \
  --config config/config.local.yaml \
  localhost/conch/python:latest
```

该命令接收 Template Name，不接收 Template ID。

## 删除 Template

```bash
sudo ./bin/conch template rm \
  --config config/config.local.yaml \
  localhost/conch/python:latest
```

删除按 Template Name 执行，并且具有幂等语义：名称不存在时也视为成功。操作只删除 Template 的内部 image record；不再被其它 image record 或 GC root 引用的内容由 containerd GC 回收。

## Image 管理

普通 OCI Image 使用 `conch image` 管理：

```bash
sudo ./bin/conch image pull docker.io/library/python:3.12
sudo ./bin/conch image ls
sudo ./bin/conch image rm docker.io/library/python:3.12
```

默认的 `image ls` 会隐藏 Template 及 Boot Index 组件使用的内部 record；需要诊断时使用 `conch image ls --all`。`image rm` 不用于删除 Template，应使用 `template rm`。

## 请求超时

所有 CLI 到 conchd 的请求默认超时为 2 分钟。拉取、转换或发布大镜像时，可以为当前命令设置正的 Go duration：

```bash
CONCH_API_TIMEOUT=30m sudo --preserve-env=CONCH_API_TIMEOUT \
  ./bin/conch template create \
  --config config/config.local.yaml \
  --name localhost/conch/python:latest \
  --source docker.io/library/python:3.12 \
  --kernel /var/lib/conch/kernel \
  --initrd /var/lib/conch/conch.initrd
```

`template push --timeout 30m` 和 `image push --timeout 30m` 只覆盖本次 push 请求，并优先于 `CONCH_API_TIMEOUT`。

## 相关文档

- [沙箱创建与删除](/docs/user/sandbox-lifecycle)
- [沙箱快照启动](/docs/user/snapshot-start)
- [Template 参考](/docs/reference/template)
