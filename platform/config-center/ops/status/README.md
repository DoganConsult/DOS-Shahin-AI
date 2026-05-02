# ops/status — Public Status Page State

This folder holds the **single source of truth** for active incidents
and planned maintenance announced on the public `/status` page.

- [`incidents.json`](./incidents.json) is read on every request to
  `GET /api/public/status` in the gateway, with a 30-second cache.
- The schema is defined in
  [`services/gateway/src/schemas/status.schemas.ts`](../../services/gateway/src/schemas/status.schemas.ts)
  as `IncidentsFileSchema` (Zod).
- The human-readable guide to using this file is at
  [`docs/sre/status-page.md`](../../docs/sre/status-page.md).

## Editing during an incident

1. Check out a branch: `git checkout -b release/<tag>-status-<inc-id>`.
2. Add an entry under `activeIncidents` with `status: "investigating"`.
3. Open a PR; under the emergency-merge policy in
   [`docs/sre/status-page.md`](../../docs/sre/status-page.md), the
   `@dogan-ai/sre` CODEOWNER can merge with a single approval when a
   customer-visible outage is active.
4. Update `latestUpdate` (and, as the incident progresses, `status`)
   via additional commits to the same file; each commit propagates
   to the status page within ~30 seconds.
5. When resolved: set `status` to `"resolved"` and `resolvedAt`.
   The composer in the gateway filters resolved incidents out of
   `activeIncidents` in the JSON response while leaving the record
   in-place for audit purposes.

## Planned maintenance

Add a `plannedMaintenance` entry at least 72 hours before the window
starts (see the SLA clause on advance notice). When `now` falls
between `startsAt` and `endsAt`, the overall status pill switches to
`maintenance`.

## Invariants

- `version: 1` — bump and coordinate an ADR before breaking.
- `id` fields are lowercase slugs, globally unique within the file.
- Dates are ISO 8601 UTC (`Z` suffix).
- The file must parse against `IncidentsFileSchema` in CI; malformed
  JSON is rejected and the composer falls back to treating the file
  as absent (rather than serving a stale state).
