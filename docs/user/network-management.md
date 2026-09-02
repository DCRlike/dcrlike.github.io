---
title: 网络管理
sidebar_position: 6
---

# 网络管理

Conch 为每个 Sandbox 分配一个预创建的 Network Slot。Slot 包含独立 network namespace、CNI 地址、guest tap 和 NAT 规则；创建 Sandbox 时会把 Slot 的 guest 网络参数发送给 `conch-init`。

## 主机网络前置条件

conchd 启动时需要：

- 主机存在可用的 IPv4 默认路由。
- `/etc/conch/cni/net.d` 中存在一份有效的 CNI 配置。
- `bridge` 和 `host-local` 插件位于 `network.cni.plugin_bin_dirs`。
- 主机内核与 iptables 允许转发 Sandbox 流量。

基本配置：

```yaml
network:
  warm_pool_size: 250
  cni:
    plugin_bin_dirs:
      - /usr/libexec/cni
```

`warm_pool_size` 是目标空闲 Slot 数，默认 250，最大 4000。创建 Sandbox 会取走一个 Slot并异步补充；池为空时，创建请求失败。

## 创建时设置网络策略

```python
from conch import Sandbox

sandbox = Sandbox.create(
    template_name="localhost/conch/python:latest",
    network={
        "allowOut": ["198.51.100.10", "203.0.113.0/24"],
        "denyOut": ["203.0.113.99"],
        "allowIn": ["192.0.2.0/24"],
        "allow_internet_access": False,
    },
)
```

四个地址列表只接受 IPv4 地址或 IPv4 CIDR，合计最多 1024 项：

| 字段 | 方向 | 行为 |
| --- | --- | --- |
| `allowOut` | guest 出站 | 非空时启用出站白名单，未匹配流量被拒绝。 |
| `denyOut` | guest 出站 | 拒绝匹配目标；优先于允许规则。 |
| `allowIn` | guest 入站 | 非空时启用入站白名单，未匹配流量被拒绝。 |
| `denyIn` | guest 入站 | 拒绝匹配来源；优先于允许规则。 |
| `allow_internet_access` | guest 出站 | 为 `false` 时拒绝未被其它规则接受的出站流量。 |

已建立并仍被 conntrack 跟踪的连接会优先放行，因此更新策略不会立即断开所有现有连接。

## 运行时更新策略

`update_network()` 会完整替换策略，而不是增量追加：

```python
sandbox.update_network(
    allow_out=["198.51.100.10"],
    deny_in=["203.0.113.0/24"],
    allow_internet_access=False,
)
```

运行中和已 suspend 的 Sandbox 都可以更新。省略的列表会按空列表处理，因此调用前应提供希望保留的全部规则。

网络策略只过滤已经路由到 Sandbox 的 IP 流量，不会创建 host 监听端口、做 HTTP hostname 路由或自动暴露 guest 服务。VSOCK 流量也不经过这些规则。

## 地址与 DNS

Sandbox 创建响应中的 `domain` 是 CNI 分配的外部 IPv4 地址。Conch 在 Slot 内把这个地址与固定 guest 子网做 NAT；guest 实际接口由 `conch-init` 配置。

DNS 只来自 CNI Result。Conch 校验、去重后最多向 guest 下发 3 个 IPv4 nameserver，不读取 host 的 `/etc/resolv.conf`。

## 回收与故障处理

删除 Sandbox 时，健康的 Slot 会回到池中；接口、namespace 或规则异常的 Slot 会被销毁并重新补充。conchd 启动时会清理上次异常退出遗留的 namespace 和 CNI attachment，不会恢复旧 Slot 或旧 Sandbox。

详细拓扑、CNI cache 路径和 Slot 生命周期见 [Network 参考](/docs/reference/network)。
