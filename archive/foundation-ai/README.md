# Foundation-AI Archive

Lossless archive of obsoleted Foundation artifacts, organized by phase and wave.

```
archive/foundation-ai/
  phase-<P>/
    wave-<N>/
      <kind>/<original-relative-path>/<file>
      MANIFEST.json   (signed)
      README.md
```

`<kind>` ∈ `legacy | mirror | fallback | obsolete-contracts | dead-code | deprecated-renderers | superseded-migrations | stale-fixtures | temp-scaffolds | orphan-tests | duplicate-docs`.

## Rules

- **Move, never delete** anything that contributed to a signed proof.
- Every move is recorded in MANIFEST.json with hash + signer.
- Archive is read-only via branch protection; only the autopilot writes here.
- Retention: kept until +90 days post-launch, then compressed to `phase-<P>.tar.gz`.
