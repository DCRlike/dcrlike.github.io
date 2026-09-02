---
sidebar_position: 3
title: 源码构建与启动
---

# 源码构建与启动

本文介绍如何从源码编译并启动 Conch，以及如何创建 Template 和 Sandbox。使用软件包部署请参阅 [RPM 安装](/docs/getting-started/rpm-install)。

## 1. 准备环境

按照[安装](/docs/getting-started/installation)安装依赖并完成主机配置。创建 Template 还需要准备一个支持 EROFS 的 guest kernel。

## 2. 编译

在仓库根目录执行：

```bash
make build
make build-conch-init-initramfs
```

Conch 二进制位于 `bin/`，initrd 位于 `build-artifacts/conch-init-initramfs.cpio.gz`。

## 3. 运行 conchd

复制默认配置并启动 conchd：

```bash
cp config/config.yaml config/config.local.yaml
chmod 0600 config/config.local.yaml
sudo ./bin/conchd --config config/config.local.yaml
```

conchd 会在前台运行并输出日志。保持该终端运行，在另一个终端执行后续命令。

## 4. 基本操作

从 OCI 镜像、guest kernel 和 initrd 创建 Template：

```bash
sudo ./bin/conch template create \
  --config config/config.local.yaml \
  --name localhost/conch/nginx:latest \
  --source docker.io/library/nginx:latest \
  --kernel /path/to/guest/kernel \
  --initrd build-artifacts/conch-init-initramfs.cpio.gz
```

命令会返回 Template Name 和不可变的 Template ID。以下示例通过 Template Name 创建并控制 Sandbox：

```bash
sudo ./bin/conch template ls --config config/config.local.yaml

sudo ./bin/conch sandbox create \
  --config config/config.local.yaml \
  --template-name localhost/conch/nginx:latest \
  --sandbox-id sandbox_demo

sudo ./bin/conch sandbox ls --config config/config.local.yaml

sudo ./bin/conch sandbox suspend --config config/config.local.yaml sandbox_demo

sudo ./bin/conch sandbox resume --config config/config.local.yaml sandbox_demo

sudo ./bin/conch sandbox delete --config config/config.local.yaml sandbox_demo
```

也可以使用 `--template-id sha256:...` 固定到某一份不可变内容；`--template-name` 与 `--template-id` 不能同时使用。若两者都省略，conchd 会使用 `sandbox.default_spec` 中配置的默认 Template。

Template 分发和镜像管理见[模板管理](/docs/user/template-management)，Sandbox 内命令执行和文件操作见 [Python SDK](/docs/reference/python-sdk)。
