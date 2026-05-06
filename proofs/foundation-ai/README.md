# Foundation-AI Proofs

Signed, hash-chained proof artifacts for every wave of the AI-led Foundation program.

## Layout

```
proofs/foundation-ai/
  _ledger/                  # append-only signed run ledger (HEAD + per-event JSON)
  wave-<N>/
    inventory.proof.json
    run.proof.json
    quality-gate.proof.json
    drift.proof.json
    zerodirt.proof.json
    archive.proof.json
    autopilot.proof.json
```

## Doctrine

- **Zero static / zero legacy / zero fallback / zero mirror.**
- **Dynamic UI-OS only**; DB is the source, contracts are the publisher, UI-OS is the resolver.
- Every wave commit is signed and references its proofs.
- A wave cannot start until the previous wave's proofs are GREEN.

## Schema

All proofs declare `"schema": "foundation-ai.<kind>.v1"` and carry `hash`, `emittedAt`, and structured `payload`.
