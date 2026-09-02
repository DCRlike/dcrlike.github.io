---
title: Network Management
sidebar_position: 6
---

# Network Management

Conch assigns a pre-created Network Slot to each Sandbox. A Slot contains an isolated network namespace, a CNI address, a guest tap, and NAT rules. When a Sandbox is created, the guest network parameters from the Slot are sent to `conch-init`.

## Host network prerequisites

When conchd starts, it requires:

- A usable IPv4 default route on the host.
- A valid CNI configuration in `/etc/conch/cni/net.d`.
- The `bridge` and `host-local` plugins in `network.cni.plugin_bin_dirs`.
- Host kernel and iptables settings that allow Sandbox traffic to be forwarded.

Basic configuration:

```yaml
network:
  warm_pool_size: 250
  cni:
    plugin_bin_dirs:
      - /usr/libexec/cni
```

`warm_pool_size` is the target number of idle Slots. It defaults to 250 and has a maximum of 4000. Creating a Sandbox removes one Slot and replenishes the pool asynchronously. A create request fails when the pool is empty.

## Set a network policy at creation time

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

The four address lists accept only IPv4 addresses or IPv4 CIDRs, with no more than 1024 entries in total:

| Field | Direction | Behavior |
| --- | --- | --- |
| `allowOut` | Guest egress | A non-empty list enables an egress allowlist; unmatched traffic is denied. |
| `denyOut` | Guest egress | Denies matching destinations and takes precedence over allow rules. |
| `allowIn` | Guest ingress | A non-empty list enables an ingress allowlist; unmatched traffic is denied. |
| `denyIn` | Guest ingress | Denies matching sources and takes precedence over allow rules. |
| `allow_internet_access` | Guest egress | When `false`, denies egress traffic that no other rule accepts. |

Established connections that are still tracked by conntrack are allowed first, so updating a policy does not immediately terminate every existing connection.

## Update a policy at runtime

`update_network()` replaces the entire policy; it does not append rules incrementally:

```python
sandbox.update_network(
    allow_out=["198.51.100.10"],
    deny_in=["203.0.113.0/24"],
    allow_internet_access=False,
)
```

Policies can be updated for both running and suspended Sandboxes. Omitted lists are treated as empty, so provide every rule you want to keep.

The network policy filters only IP traffic that has already been routed to the Sandbox. It does not create host listening ports, route HTTP hostnames, or expose guest services automatically. VSOCK traffic does not pass through these rules.

## Addresses and DNS

The `domain` in a Sandbox creation response is the external IPv4 address assigned by CNI. Inside the Slot, Conch performs NAT between this address and a fixed guest subnet. The guest interface itself is configured by `conch-init`.

DNS settings come only from the CNI Result. After validation and deduplication, Conch sends at most three IPv4 nameservers to the guest. It does not read the host's `/etc/resolv.conf`.

## Recycling and failure handling

When a Sandbox is deleted, a healthy Slot returns to the pool. A Slot with invalid interfaces, namespaces, or rules is destroyed and replenished. At startup, conchd removes namespaces and CNI attachments left by the previous abnormal exit; it does not restore old Slots or Sandboxes.

For detailed topology, the CNI cache path, and the Slot lifecycle, see the [Network Reference](/docs/reference/network).
