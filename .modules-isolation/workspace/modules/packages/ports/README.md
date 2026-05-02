# @dos/ports

Public port interfaces for the four DOS platform modules — **DOS, DAuth, DSOC, DNOC**.

## What this package contains

- Only `interface` / `type` declarations. No runtime code.
- One file per platform module (`dos.ts`, `dauth.ts`, `dsoc.ts`, `dnoc.ts`).
- Shared envelope types (events, principals, health status) live alongside the
  module they belong to.

## What this package does NOT contain

- No implementations. Those live in each module's package.
- No adapter ports (Keycloak / OpenFGA / Cerbos / etc.). Those are *internal*
  adapter ports, private to the owning module, and stay there.
- No product-level contracts. Products interact with platform modules through
  the same ports as other platform modules.

## Rule

Every cross-module call — DAuth → DSOC, DSOC → DOS, product → DAuth, etc. —
MUST be typed against an interface in this package. This is enforced by
`.dependency-cruiser.cjs` isolation rules (one per platform module).

## Subpath exports

```ts
import type { DAuthPort } from '@dos/ports/dauth';
import type { DSOCPort } from '@dos/ports/dsoc';
import type { DNOCPort } from '@dos/ports/dnoc';
import type { DOSPort }  from '@dos/ports/dos';
// or everything from the barrel:
import type { DAuthPort, DSOCPort } from '@dos/ports';
```
