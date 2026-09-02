---
sidebar_position: 6
title: Network
---

# Network Module Design

The Network module lives in `internal/netstack` and creates and reuses isolated network environments for Sandboxes. CNI manages each Sandbox's external network, while Conch manages the network namespace, guest tap, and address translation between the two network layers.

## 1. Components

| Component | Responsibility |
| --- | --- |
| `Pool` | Pre-create, allocate, recycle, and replenish Network Slots. |
| `Slot` | Store the Slot ID, network namespace path, CNI IP, DNS, and guest tap addresses. |
| `CNIManager` | Load CNI configuration, run CNI `ADD` / `DEL`, and obtain the Sandbox external IP and DNS. |
| `netns` | Create and mount an isolated network namespace. |
| `guest_tap` | Create `tap0`, enable IPv4 forwarding, and configure SNAT / DNAT. |

`Pool` owns Slot state transitions. Sandboxes and VMMs only read the namespace path, tap name, and CNI IP supplied by a Slot.

During initialization, `Pool` finds the host's IPv4 default route for `0.0.0.0/0` and configures host forwarding rules for the CNI bridge. The host running `conchd` must therefore have a usable route such as `default via 192.168.1.1 dev eth0`. Otherwise, network-pool initialization fails and `conchd` does not become ready.

## 2. Network topology

```text
CNI bridge / host network
          |
       veth pair
          |
  network namespace: slot-N
    ├── eth0: external IP assigned by CNI
    └── tap0: 192.168.100.2/24
          |
      virtio-net
          |
  guest: 192.168.100.21/24
```

Every Slot uses an isolated network namespace, so all Slots can reuse the same guest subnet. Conch configures the following address translation inside the namespace:

- Traffic sent by the guest leaves the namespace with the CNI IP as its source address.
- Traffic sent to the CNI IP is forwarded to the guest IP.

The VMM starts inside the Slot's network namespace and uses that Slot's `tap0`. During the initialization handshake, conch-init receives the guest IP, prefix length, gateway, and DNS. It configures the first non-loopback interface and default route, then updates `/etc/resolv.conf`.

## 3. Network Slots

A Network Slot is a reusable set of network resources that includes:

- A Slot ID and `/run/conch/netns/slot-N` namespace.
- The `conch-slot-N` container ID used by CNI.
- The outer interface created by CNI, its assigned IP, and the DNS returned by CNI.
- The `tap0`, IPv4 forwarding, and NAT rules created by Conch.

After conchd starts, it fills the warm pool concurrently. When a Sandbox is created, `Pool.Get` removes a Slot, binds it to the Sandbox ID, and triggers background replenishment. A create request fails if the pool is empty. After the Sandbox is deleted, `Pool.Release` checks whether the namespace, CNI interface, and tap still exist. A healthy Slot returns to the pool; an invalid Slot is destroyed and replaced.

Destroying a Slot removes the tap and NAT, runs CNI `DEL` once, deletes the network namespace, and finally releases the Slot ID. If CNI `DEL` fails, the namespace and Slot ID are retained and an error is returned. If startup cache reconciliation fails, the cache is retained and startup stops.

## 4. CNI boundary

The Network module uses `libcni` directly to load one default CNI network. ADD, DEL, and startup cache reconciliation share the same `libcni.CNIConfig`, keeping plugin configuration and the cache root consistent. CNI manages the bridge/veth pair, IPAM, routes, and outer network policy. Conch brings up the loopback interface in the namespace through netlink and does not invoke the loopback CNI plugin.

The CNI Result is the only source of guest DNS. Conch validates and deduplicates the returned DNS values, keeps at most three IPv4 nameservers, and sends them to conch-init through the initialization protocol. Conch does not read the host's resolv.conf.

Conch always loads its dedicated CNI configuration from `/etc/conch/cni/net.d`. The outer interface name is the internal fixed value `eth0`. The libcni cache root is derived as `<server.state_dir>/cni`, with the result cache in its `results` subdirectory. This path is not exposed as a separate user configuration option.

When loading CNI configuration, Conch sets host-local IPAM's `dataDir` to `<server.state_dir>/cni/networks`, so both the result cache and IPAM leases move with the persistent state root.

## 5. Sandbox network policy

A Sandbox creation request can include an IP-level policy. The complete policy of a running or suspended Sandbox can also be replaced with `PUT /api/v1/sandboxes/{sandboxID}/network`:

```json
{
  "allowOut": ["198.51.100.10", "203.0.113.0/24"],
  "denyOut": ["203.0.113.99"],
  "allowIn": ["192.0.2.0/24"],
  "denyIn": [],
  "allow_internet_access": false
}
```

The four address lists accept only IPv4 addresses or IPv4 CIDRs, with no more than 1024 entries in total. The policy is implemented with two iptables chains in the Slot's network namespace: FORWARD traffic leaving the guest tap enters the egress chain, and traffic forwarded to the guest tap enters the ingress chain.

Rules are evaluated in this order:

1. Allow `ESTABLISHED,RELATED` connections.
2. Apply explicit deny rules.
3. Apply explicit allow rules.
4. If an allow list is non-empty, deny unmatched traffic. For egress, `allow_internet_access: false` also enables the default deny.

Policy updates use `iptables-restore --noflush --wait` to switch rules in a batch. If applying the policy fails, the runtime service attempts to restore the old policy. If that restoration also fails, it marks the Sandbox as `UNKNOWN` and attempts to suspend it. The policy controls IP FORWARD traffic only; it does not affect VSOCK or create host port forwarding.

## 6. Configuration

```yaml
network:
  warm_pool_size: 250
  cni:
    plugin_bin_dirs:
      - /usr/libexec/cni
```

- `warm_pool_size`: Target number of idle Slots. The default is 250 and the maximum is 4000.
- `plugin_bin_dirs`: Directories containing CNI plugin binaries.

## 7. State and shutdown

Slot IDs, Slot-to-Sandbox bindings, and CNI IPs exist only in memory. Network Slots are not written to the state store. After conchd restarts, it creates a new Pool and does not restore or take over old Slots. Before warming the new pool, startup removes old mounted network namespaces. It then uses libcni to enumerate current-format attachments in the configured cache root and runs CNI `DEL` for `conch-slot-*` attachments that no longer have Slot state. Finally, it removes old Sandbox state records and releases their snapshot views. Old Sandboxes are not restored.

During a normal shutdown, conchd deletes every Sandbox before closing the containerd host. When the host closes the Pool, it stops background replenishment and makes a best effort to destroy queued idle Slots. A failure to clean one Slot is logged but does not block the rest of the shutdown.
