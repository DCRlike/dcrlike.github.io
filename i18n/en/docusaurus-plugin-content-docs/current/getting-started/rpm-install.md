---
sidebar_position: 6
title: RPM Installation and Service Management
---

# RPM Installation and Service Management

## Installation

```bash
sudo dnf install conch
sudo systemctl enable --now conchd
```

The service is named `conchd`, its configuration file is `/etc/conch/config.yaml`, and its logs are written to journald:

```bash
systemctl status conchd
journalctl -u conchd -f
```

## Service Management

```bash
sudo systemctl start conchd
sudo systemctl stop conchd
sudo systemctl restart conchd
```

> **Warning:** conchd does not adopt existing Sandbox or VMM processes after a restart. Delete every active Sandbox before stopping or restarting the service.

To override the configuration file or append startup options, set these values in `/etc/sysconfig/conchd`:

```bash
CONCHD_CONFIG=/etc/conch/config-dev.yaml
CONCHD_OPTS=
```

Restart conchd after changing the file. Use `systemctl edit conchd` to create a drop-in when the systemd unit itself must be changed.

## Uninstallation

```bash
sudo dnf remove conch
```
