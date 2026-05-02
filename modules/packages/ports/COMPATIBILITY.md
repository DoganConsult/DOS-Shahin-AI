# @dos/ports — Compatibility Matrix

The `@dos/ports` package versions every platform-module port (DOS, DAuth,
DSOC, DNOC). Consumers MAY pin to a specific minor; platform modules
MUST stay in lockstep with the major.

## Current versions

| Component | Version | Status |
|-----------|---------|--------|
| `@dos/ports` (package) | **1.0.0** | stable |
| `DOSPort` | 1.0.0 | stable |
| `DAuthPort` | 1.0.0 | stable |
| `DSOCPort` | 1.0.0 | interface stable; reference impl pending DSOC bootstrap |
| `DNOCPort` | 1.0.0 | interface stable; reference impl pending DNOC bootstrap |

## Bumping rules

| Bump | When | Consumer impact |
|------|------|-----------------|
| **PATCH** (1.0.x) | Doc/comment only. No shape change. No behavior contract change. | None. Auto-pull. |
| **MINOR** (1.x.0) | Additive: new optional fields, new methods, new types. Existing callers compile and run unchanged. | None. Old code still works. |
| **MAJOR** (x.0.0) | Breaking: removed/renamed methods, required-field additions, tightened return types, semantic changes. | All consumers must adapt before upgrading. |

## Compatibility check at consumer bootstrap

```ts
import { assertPortsCompatible } from '@dos/ports';

// In product/service bootstrap, before resolving any port:
assertPortsCompatible('dauth', '1.0');
assertPortsCompatible('dsoc', '1.0');
```

`assertPortsCompatible` throws a clear, actionable error if the linked
`@dos/ports` major doesn't match the consumer's expectation, or if the
consumer expects a minor higher than what is loaded.

## Module ↔ port version requirements

Every platform-module package declares the minimum `@dos/ports`
version it implements via the `peerDependencies` field in its
`package.json`. The release workflow blocks a platform module from
being published against a `@dos/ports` version it has not been built
against.

| Platform module package | Implements | Min `@dos/ports` |
|-------------------------|------------|------------------|
| `@dos/dauth-core` | `DAuthPort@1.0.0`, `DSOCPort@1.0.0` (publisher only) | `^1.0.0` |
| `@dos/dauth-shared` | (consumes types only) | `^1.0.0` |
| `@dos/dauth-frontend` | DI tokens for frontend ports | `^1.0.0` |

## Consumer pinning

Products and modules pin `@dos/ports` to a major-range:

```jsonc
// product / module package.json
"dependencies": {
  "@dos/ports": "^1.0.0"
}
```

A minor bump in `@dos/ports` is a transparent upgrade for all
consumers — no rebuilds required for unaffected ports.

## Release checklist (every bump)

1. Update `PORTS_VERSION` and `MODULE_PORTS_VERSION` in
   `packages/ports/src/version.ts` to match `package.json#version`.
2. Update this file's "Current versions" table.
3. For MINOR bump: add a "What's new" section below.
4. For MAJOR bump: add a "Migration guide" section + raise the major in
   every consumer's package.json before merging.

## What's new

### 1.0.0 (2026-04-22)

- Initial published version of the four-module platform contract.
- DOSPort: tenancy, events, module registry, product registry.
- DAuthPort: validateSession, checkAccess, checkAuthority,
  getActiveDelegations, evaluateSoD, revokeSession.
- DSOCPort: recordAuditEvent, raiseAlert, getLatestPosture.
- DNOCPort: recordMetric, emitLog, emitSpan, registerRoute, getHealth.
