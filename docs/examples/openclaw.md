---
title: Conch 部署 OpenClaw
sidebar_position: 1
---

# Conch 部署 OpenClaw

Conch 源码中的 `examples/openclaw.py` 展示了一个完整工作流：创建 Sandbox、通过 conch-init 写入 OpenClaw 配置、SSH 进入 guest 启动 OpenClaw TUI，并在退出时删除 Sandbox。

## 前置条件

开始前确认：

- conchd 已启动，host 可以通过 Sandbox 的 `domain` 地址访问 guest。
- 已有一个 cold Template，rootfs 中安装了 `openclaw`、`bash`、`ip`、`getent`，并已配置 SSH server 随 Sandbox 启动。
- Template 已配置当前 host 可用的 SSH 公钥；示例不会写入 `authorized_keys`。
- host 安装了 `ssh` 客户端和 Conch Python SDK。
- 已准备一个 OpenAI-compatible completions API 的 URL、API key 和模型名。

安装当前源码中的 SDK：

```bash
cd /path/to/Conch
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install ./sdk
```

## 配置环境变量

```bash
export CONCH_TEMPLATE_NAME=localhost/conch/openclaw:latest
export OPENCLAW_API_KEY='<api-key>'
export OPENCLAW_BASE_URL='https://api.example.com/v1'
export OPENCLAW_MODEL_NAME='MiniMax-M2.5'
```

`CONCH_TEMPLATE_NAME`、`OPENCLAW_API_KEY` 和 `OPENCLAW_BASE_URL` 是必需值。未设置时脚本会交互式询问；模型名默认是 `MiniMax-M2.5`。

不要把 API key 写入 Template 或提交到源码仓库。示例会在 Sandbox 创建后才把配置写入 guest，并在最终删除 Sandbox。

## 运行示例

在 Conch 源码根目录执行：

```bash
python3 examples/openclaw.py
```

脚本依次执行：

1. 通过 `Sandbox.create(template_name=...)` 创建 Sandbox。
2. 启用 guest loopback 接口，并通过 `whoami` 与 `getent passwd` 确定当前用户 home。
3. 通过 conch-init 文件接口写入：
   - `~/.openclaw/auth.json`
   - `~/.config/openclaw/config.json`
   - `~/.openclaw/openclaw.json`
4. 校验 guest 返回的用户名和 IPv4 地址。
5. 执行 SSH，启动 `openclaw gateway --allow-unconfigured` 和 `openclaw tui`。
6. TUI 或 SSH 会话结束后，在 `finally` 中删除 Sandbox。

示例为一次性 Sandbox 禁用了 SSH host key 持久化：使用 `StrictHostKeyChecking=no`，并把 `UserKnownHostsFile` 指向 `/dev/null`。这适合短生命周期演示，不应直接复制到需要确认服务端身份的长期生产连接。

## 验证与排错

成功创建后，终端会输出 Sandbox ID 和 IP：

```text
Sandbox created: sandbox_... (IP: 192.0.2.10)
Configuration complete, ready to start TUI...
```

常见问题：

| 现象 | 检查项 |
| --- | --- |
| `openclaw: command not found` | Template rootfs 是否已安装 OpenClaw，并且命令在 guest `PATH` 中。 |
| SSH 连接超时 | host 到 Sandbox IP 是否可路由；网络策略是否允许入站 SSH。 |
| `Permission denied (publickey)` | Template 中是否为实际 guest 用户配置了对应 host 公钥。 |
| 模型请求失败 | `OPENCLAW_BASE_URL` 是否包含服务要求的 API 前缀，key 与模型名是否匹配。 |
| 配置写入失败 | guest home 是否可写，conch-init Agent API 是否健康。 |

脚本捕获到异常时仍会尝试删除 Sandbox。若 host 进程被强制终止，可使用 `conch sandbox ls` 找到残留实例，再执行 `conch sandbox delete <sandbox-id>`。

命令和文件接口的完整行为见 [Python SDK](/docs/reference/python-sdk) 与 [conch-init Agent API](/docs/reference/conch-init)。
