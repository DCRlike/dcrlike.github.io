---
sidebar_position: 8
title: Sandbox Lifecycle Webhooks
---

# Sandbox Lifecycle Webhooks

conchd can asynchronously send lifecycle events to registered HTTP or HTTPS callback URLs after a Sandbox is created, explicitly deleted, or exits unexpectedly. Webhook registrations exist only in the current conchd process memory and must be registered again after a restart.

## 1. Register a Webhook

conchd exposes its API over a Unix socket by default. Replace the socket in this example with `server.work_dir/conchd.sock`:

```bash
curl --unix-socket /var/run/conch/conchd.sock \
  -X POST http://localhost/api/v1/events/webhooks \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "reliability-service",
    "url": "https://reliability.example.com/conch/events",
    "events": [
      "sandbox.lifecycle.created",
      "sandbox.lifecycle.killed"
    ]
  }'
```

`name` and `url` are required. `url` must use HTTP or HTTPS. Omitting `events` subscribes to every currently supported event.

A successful request returns `201 Created`:

```json
{
  "webhook_id": "wh_0123456789abcdef0123456789abcdef",
  "name": "reliability-service",
  "url": "https://reliability.example.com/conch/events",
  "events": ["sandbox.lifecycle.created", "sandbox.lifecycle.killed"],
  "createdAt": "2026-08-21T10:20:30Z"
}
```

## 2. List and Delete Webhooks

List the Webhooks registered in the current conchd instance:

```bash
curl --unix-socket /var/run/conch/conchd.sock \
  http://localhost/api/v1/events/webhooks
```

The API returns `200 OK`:

```json
{
  "webhooks": [
    {
      "webhook_id": "wh_0123456789abcdef0123456789abcdef",
      "name": "reliability-service",
      "url": "https://reliability.example.com/conch/events",
      "events": ["sandbox.lifecycle.created", "sandbox.lifecycle.killed"],
      "createdAt": "2026-08-21T10:20:30Z"
    }
  ]
}
```

Delete a Webhook:

```bash
curl --unix-socket /var/run/conch/conchd.sock \
  -X DELETE \
  http://localhost/api/v1/events/webhooks/wh_0123456789abcdef0123456789abcdef
```

```json
{
  "webhook_id": "wh_0123456789abcdef0123456789abcdef",
  "status": "deleted"
}
```

After deletion succeeds, conchd creates no new delivery task for that `webhook_id`. A delivery that has already started may still finish.

## 3. Event Payload

The callback receives a `POST` request with a JSON body:

```json
{
  "event_id": "evt_0123456789abcdef0123456789abcdef",
  "version": "v1",
  "type": "sandbox.lifecycle.created",
  "timestamp": "2026-08-21T10:20:30Z",
  "sandbox_id": "sandbox-001",
  "event_data": {
    "execution": {
      "created_at": "2026-08-21T10:20:30Z",
      "vcpu_num": 2,
      "ram_mb": 512
    }
  }
}
```

In addition to `event_data.execution`, `sandbox.lifecycle.killed` includes `event_data.kill_reason`: `request` for explicit deletion and `orphaned` for an unexpected Sandbox exit.

| Event type | Delivery time |
| --- | --- |
| `sandbox.lifecycle.created` | After creation succeeds and state is persisted as `READY`. |
| `sandbox.lifecycle.killed` | After explicit deletion completes, with `kill_reason` set to `request`. |
| `sandbox.lifecycle.killed` | After an unexpected exit is persisted as `UNKNOWN`, with `kill_reason` set to `orphaned`. |

## 4. Headers, Retries, and Idempotency

| Header | Description |
| --- | --- |
| `Content-Type: application/json` | Media type of the event body. |
| `conch-webhook-id` | The `webhook_id` that triggered this delivery. |

Every retry for one logical event uses the same `event_id`. Receivers should deduplicate on `event_id` and process events idempotently.

conchd makes at most three delivery attempts for each matching Webhook. Any 2xx response is successful. Network errors, timeouts, and non-2xx responses are failures. Delivery is asynchronous and never blocks a Sandbox lifecycle operation. If all attempts fail, conchd logs an error but does not persist the event or delivery task.

The initial implementation does not provide callback signatures, delivery IDs, or event persistence. Deploy the callback in a controlled network and protect access to the conchd Unix socket.
