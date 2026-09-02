---
sidebar_position: 7
title: VSOCK Communication
---

# VSOCK Communication

Conch attaches virtio-vsock to every Sandbox. Guest processes can communicate with host processes over an `AF_VSOCK` stream socket without traversing the guest CNI/IP network.

A VSOCK endpoint uses a `(CID, port)` address. The host CID is always `2`. When the guest connects to `(2, port)`, the host process listening on the same AF_VSOCK port accepts the request and both sides can exchange a byte stream.

## Usage

This StratoVirt example uses port `19090`. Start the listener on the host first:

```bash
socat -u VSOCK-LISTEN:19090,fork -
```

Connect from the guest using host CID `2`:

```bash
printf 'hello from guest\n' | socat -u - VSOCK-CONNECT:2:19090
```

The host terminal prints `hello from guest`. Both socat builds must include VSOCK support.

## Notes

- Port `4065` is reserved by the Conch initialization protocol and must not be used by applications.
- CNI/IP policies such as `allowOut`, `denyOut`, and `allow_internet_access` do not restrict VSOCK.
- Only the StratoVirt backend supports the guest-to-host VSOCK workflow described above. The Cloud Hypervisor backend does not support it.
