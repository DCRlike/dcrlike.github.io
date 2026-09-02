---
sidebar_position: 3
title: Template
---

# Template Module Reference

The Template module is a named catalog of bootable OCI Boot Indexes. Its implementation is in `internal/template`, and its containerd adapter is in `internal/adapters/containerd/template`.

## Data model

```go
type Entry struct {
    Name                  string
    Origin                Origin
    BootMode              BootMode
    BootIndexDigest       string
    ParentBootIndexDigest string
    SourceSandboxID       string
    SourceRef             string
    Labels                map[string]string
    CreatedAt             int64
}
```

| Field | Description | Constraint |
| --- | --- | --- |
| `Name` | User-visible Template Name. | Required; leading and trailing whitespace is removed. |
| `Origin` | How the Template was produced. | `image` or `checkpoint`. |
| `BootMode` | How a Sandbox boots. | `cold` or `resume`; must match the Boot Index content. |
| `BootIndexDigest` | Immutable Template ID and Boot Index digest. | Required; must be a valid OCI digest. |
| `ParentBootIndexDigest` | Parent Template ID of a checkpoint. | Optional. |
| `SourceSandboxID` | ID of the Sandbox that produced a checkpoint. | Optional. |
| `SourceRef` | Source registry reference used during creation or pull. | Optional. |
| `Labels` | Caller-provided labels. | Optional; keys must be encodable as containerd labels. |
| `CreatedAt` | Creation time of the internal image record. | Unix nanoseconds. |

Common `Origin` and `BootMode` combinations:

| Origin | BootMode | Source |
| --- | --- | --- |
| `image` | `cold` | Built from a regular OCI rootfs Image, kernel, and initrd. |
| `checkpoint` | `resume` | Generated from a Sandbox checkpoint or pulled from a Boot Index that contains memory state. |

## Name and ID

A Template Name is a mutable reference; a Template ID is an immutable content identifier:

```text
localhost/conch/python:latest  ──>  sha256:012345...
          Template Name                 Template ID
```

The Store creates an internal containerd image record for each Name. `TemplateRecordName(name)` derives the record name deterministically. Calling `Put` again for the same Name updates the record target and metadata. The old ID still identifies the old content, while the Name points to the new ID.

Sandbox creation supports two resolution paths:

- `template_name`: the Store resolves the current ID and records both the resolved Name and ID.
- `template_id`: validates the corresponding Boot Index in containerd directly; a Template Name record is not required.

A request must select exactly one. Supplying both or leaving both unconfigured returns an invalid-argument error. conchd can provide a default selector through `sandbox.default_spec`.

## Store interface

```go
type Store interface {
    Put(context.Context, Entry, ocispec.Descriptor) (Entry, error)
    Get(context.Context, string) (Entry, error)
    List(context.Context, Filter) ([]Entry, error)
    Delete(context.Context, string) error
}
```

### Put

```go
Put(ctx context.Context, entry Entry, target ocispec.Descriptor) (Entry, error)
```

`Put` performs these validation and persistence steps:

1. Normalizes `Entry` and validates its Name, Origin, BootMode, and digest.
2. Requires `target.Digest` to match `BootIndexDigest`.
3. Reads the Boot Index and verifies that its cold/resume mode matches `BootMode`.
4. Writes containerd GC children labels for the descriptor closure.
5. Creates or updates the internal image record derived from the Name.
6. Populates the returned value from the record's `CreatedAt`.

An existing record with the same name is updated if it belongs to the Template schema. If non-Template data occupies that internal record, `Put` returns an already-exists error.

### Get

```go
Get(ctx context.Context, name string) (Entry, error)
```

`Get` looks up an internal image record by Name, revalidates the schema label, record name, Boot Index content, image kind, and metadata, then returns a normalized `Entry`. It does not query by Template ID.

### List

```go
type Filter struct {
    Origin   Origin
    BootMode BootMode
}

List(ctx context.Context, filter Filter) ([]Entry, error)
```

Empty fields match all values. Non-empty fields accept only a defined Origin or BootMode. The Store returns only records with the current Template schema label whose record names can be decoded into Template Names.

### Delete

```go
Delete(ctx context.Context, name string) error
```

`Delete` removes the internal image record by Name and uses a conditional target deletion to avoid removing a concurrently updated record. A missing Name is treated as success. Actual content reclamation depends on containerd GC and other references.

## containerd persistence

Template metadata is stored in internal image-record labels:

- `io.conch.template.schema`
- `io.conch.template.origin`
- `io.conch.template.parent`
- `io.conch.template.source-sandbox`
- `io.conch.template.source-ref`
- `io.conch.template.user.<key>`

The Boot Index type also uses `io.conch.kind` to distinguish cold and resume content. Users should not edit these records or labels directly; manage Templates with `conch template` commands.

## External record

The control plane converts the internal `Entry` to this JSON structure:

```json
{
  "name": "localhost/conch/python:latest",
  "template_id": "sha256:0123456789abcdef...",
  "origin": "image",
  "boot_mode": "cold",
  "parent_template_id": "",
  "source_sandbox_id": "",
  "source_ref": "docker.io/library/python:3.12",
  "labels": {"purpose": "agent"},
  "created_at": 1788249600000000000
}
```

For CLI operations and Template Name update semantics, see [Template Management](/docs/user/template-management).
