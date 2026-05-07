# Governance Wave Phase Runbook

**Purpose:** Strict wave sequencing with mandatory gates and stop-the-line rules for production readiness.

**Enforcement Tool:** `scripts/governance-cli-wave-enforcement.mjs`

**State Storage:** `.governance-proof/wave-state.json`

**Proof Bundles:** `.governance-proof/<wave-id>-proof-bundle.json`

---

## CLI Enforcement Architecture

### Strict Wave Sequencing

Waves execute in a strict sequence. Each wave must complete all phases (A through E) before the next wave can begin.

**Stop-the-Line Rules:**
- No continue on fail
- Any command failure halts the wave immediately
- Failed waves must be reset before retry

### Phase Structure

Each wave has 5 phases:

| Phase | Name | Purpose | Stop Condition |
|-------|------|---------|----------------|
| A | Entry Gate | Validate preconditions and baseline state | Entry commands fail |
| B | Implementation | Apply changes (migrations, code changes, builds) | Implementation commands fail |
| C | Verification Gate | Validate implementation with automated checks | Verification commands fail |
| D | Runtime + Visual Proof | Validate runtime behavior and visual rendering | Runtime commands fail |
| E | Wave Close | Generate proof bundle and mark wave complete | Proof bundle generation fails |

### Drift Control Rules

1. **Previous Wave Proof Required:** Next wave is blocked until current wave proof bundle is complete
2. **Phase Dependency:** Each phase requires previous phase to pass
3. **Proof Logging:** All command executions are logged to proof bundle
4. **State Persistence:** Wave state persists across CLI invocations
5. **Reset Required:** Failed waves must be explicitly reset before retry

### Mandatory Command Lists

Each wave defines mandatory commands for entry and verification phases. These commands are non-negotiable and must all pass.

---

## Wave Definitions

### Wave 1: service-manifest-hardening

**Description:** Service manifest hardening and CI guard enforcement

**Phase A: Entry Gate Commands**
```bash
node scripts/ci-guards/service-manifest-required.mjs
  env: MANIFEST_ENFORCE=1
  description: Service manifest guard with enforcement

node scripts/ci-guards/tenant-completeness.mjs
  env: TENANT_COMPLETENESS_ENFORCE=1
  description: Tenant completeness guard with enforcement

node scripts/ci-guards/dos-master-gate.mjs
  description: Master gate with all guards
```

**Phase B: Implementation Commands**
```bash
pnpm install
  description: Install dependencies

pnpm run build:packages
  description: Build packages

pnpm run build:services
  description: Build services
```

**Phase C: Verification Gate Commands**
```bash
bash ops/scripts/health-check-all.sh
  description: Health check all services

pnpm --filter shahin-ai-grc-frontend run build
  description: Build frontend

node scripts/ci-guards/dos-master-gate.mjs
  description: Final master gate verification
```

**Phase D: Runtime + Visual Proof Commands**
```bash
curl -sf http://localhost:4000/health
  description: Gateway health check

curl -sf http://localhost:4001/health
  description: Auth service health check

curl -sf http://localhost:4002/health
  description: Tenant service health check
```

**Phase E: Wave Close**
- Generate proof bundle: `.governance-proof/service-manifest-hardening-proof-bundle.json`
- Mark wave status: `closed`
- Record timestamp and proof bundle path

---

### Wave 2: dynamic-ui-db-driven

**Description:** Dynamic UI DB-driven contract implementation

**Phase A: Entry Gate Commands**
```bash
node scripts/ci-guards/dynamic-ui-db-driven.mjs
  description: Dynamic UI DB-driven guard

psql -h localhost -U dos_migrator -d shahin_grc -c "SELECT COUNT(*) FROM dos.dynamic_ui_setup_steps"
  description: Check setup steps table exists

psql -h localhost -U dos_migrator -d shahin_grc -c "SELECT COUNT(*) FROM dos.dynamic_ui_quick_actions"
  description: Check quick actions table exists
```

**Phase B: Implementation Commands**
```bash
pnpm run migrate:up 20260502_0138
  description: Promote draft table migration 0138

pnpm run migrate:up 20260502_0139
  description: Promote draft table migration 0139

pnpm run migrate:up 20260504_XXXX_workspace_surface_seed
  description: Apply workspace surface seed migration
```

**Phase C: Verification Gate Commands**
```bash
curl -sf http://localhost:4031/api/ui-os/workspace-surface/setup-steps
  description: Verify setup steps endpoint

curl -sf http://localhost:4031/api/ui-os/workspace-surface/quick-actions
  description: Verify quick actions endpoint

curl -sf http://localhost:4031/api/ui-os/workspace-surface/ai-tips
  description: Verify AI tips endpoint

curl -sf http://localhost:4031/api/ui-os/translations/en
  description: Verify translations endpoint
```

**Phase D: Runtime + Visual Proof Commands**
```bash
curl -sf http://localhost:3000/workspace-home
  description: Verify workspace home loads

curl -sf http://localhost:3000/api/ui-os/workspace-runtime
  description: Verify workspace runtime API
```

**Phase E: Wave Close**
- Generate proof bundle: `.governance-proof/dynamic-ui-db-driven-proof-bundle.json`
- Mark wave status: `closed`

---

### Wave 3: ibm-carbon-enforcement

**Description:** IBM Carbon component enforcement stack

**Phase A: Entry Gate Commands**
```bash
node scripts/ci-guards/carbon-only-enforcement.mjs
  description: Carbon-only enforcement guard

npx eslint products/shahin-ai/app/src --max-warnings 0
  description: ESLint check for forbidden imports

psql -h localhost -U dos_migrator -d shahin_grc -c "SELECT COUNT(*) FROM dos.ui_carbon_components WHERE vendor<>'ibm-carbon'"
  description: Verify no non-IBM Carbon catalog rows
```

**Phase B: Implementation Commands**
```bash
pnpm run migrate:up 20260502_0400_carbon_only_runtime_trigger
  description: Apply Carbon-only DB trigger migration

pnpm --filter shahin-ai-grc-frontend run build
  description: Build frontend with post-build scan

node platform/ui-system/dos-ui-system/scripts/post-build-carbon-only.mjs products/shahin-ai/app/dist
  description: Post-build Carbon-only scan
```

**Phase C: Verification Gate Commands**
```bash
curl -sf http://localhost:4033/api/foundation/dynamic-ui/allowlist | jq '.count'
  description: Verify allowlist returns only IBM-Carbon rows

curl -sf http://localhost:4033/api/foundation/dynamic-ui/allowlist/_health
  description: Verify allowlist health endpoint

psql -h localhost -U dos_migrator -d shahin_grc -c "SELECT COUNT(*) FROM dos.dynamic_ui_component_registry WHERE vendor<>'ibm-carbon'"
  description: Verify no non-IBM registry rows
```

**Phase D: Runtime + Visual Proof Commands**
```bash
curl -sf http://localhost:3000/compliance-home
  description: Verify compliance page loads with Carbon

curl -sf http://localhost:3000/foundation
  description: Verify foundation page loads with Carbon
```

**Phase E: Wave Close**
- Generate proof bundle: `.governance-proof/ibm-carbon-enforcement-proof-bundle.json`
- Mark wave status: `closed`

---

### Wave 4: primeng-removal

**Description:** PrimeNG component and icon removal

**Phase A: Entry Gate Commands**
```bash
grep -r "from 'primeng" products/shahin-ai/app/src || echo "0"
  description: Count PrimeNG imports

grep -r "pi-" products/shahin-ai/app/src/**/*.html || echo "0"
  description: Count PrimeIcons usage

node scripts/audits/primeng-audit.mjs
  description: PrimeNG audit script
```

**Phase B: Implementation Commands**
```bash
node scripts/migrations/primeng-to-carbon-migrator.mjs
  description: Run PrimeNG to Carbon migrator

node scripts/migrations/primeicons-to-carbon-migrator.mjs
  description: Run PrimeIcons to Carbon migrator

pnpm --filter shahin-ai-grc-frontend run build
  description: Build after migration
```

**Phase C: Verification Gate Commands**
```bash
grep -r "from 'primeng" products/shahin-ai/app/src || echo "0"
  description: Verify zero PrimeNG imports

grep -r "pi-" products/shahin-ai/app/src/**/*.html || echo "0"
  description: Verify zero PrimeIcons

npx eslint products/shahin-ai/app/src --max-warnings 0
  description: ESLint verification
```

**Phase D: Runtime + Visual Proof Commands**
```bash
curl -sf http://localhost:3000/risk-workspace
  description: Verify risk workspace with Carbon

curl -sf http://localhost:3000/approval-center
  description: Verify approval center with Carbon
```

**Phase E: Wave Close**
- Generate proof bundle: `.governance-proof/primeng-removal-proof-bundle.json`
- Mark wave status: `closed`

---

### Wave 5: module-dod-compliance

**Description:** Module Definition of Done compliance

**Phase A: Entry Gate Commands**
```bash
node scripts/ci-guards/module-dod-guard.mjs
  description: Module DOD guard

grep -r "@ts-ignore" modules/ platform/ --include="*.ts" || echo "0"
  description: Count blanket suppressions

node scripts/audits/three-owner-audit.mjs
  description: Three-owner audit
```

**Phase B: Implementation Commands**
```bash
node scripts/migrations/module-dod-normalizer.mjs
  description: Normalize module structure

node scripts/migrations/consolidate-enrollment-paths.mjs
  description: Consolidate enrollment paths

pnpm run build:packages
  description: Build packages after normalization
```

**Phase C: Verification Gate Commands**
```bash
node scripts/ci-guards/module-dod-guard.mjs
  description: Verify DOD compliance

pnpm --filter @dos/platform-core run typecheck
  description: Typecheck platform core

pnpm --filter @dos/ui-system run typecheck
  description: Typecheck UI system
```

**Phase D: Runtime + Visual Proof Commands**
```bash
curl -sf http://localhost:3000/workspace-home
  description: Verify workspace with normalized modules

curl -sf http://localhost:3000/api/dynamic-ui/workspace/nav
  description: Verify dynamic UI nav
```

**Phase E: Wave Close**
- Generate proof bundle: `.governance-proof/module-dod-compliance-proof-bundle.json`
- Mark wave status: `closed`

---

## CLI Usage

### List All Waves
```bash
node scripts/governance-cli-wave-enforcement.mjs list
```

### Show Wave Status
```bash
node scripts/governance-cli-wave-enforcement.mjs status <wave-id>
```

### Run Wave to Specific Phase
```bash
# Run all phases (A through E)
node scripts/governance-cli-wave-enforcement.mjs run <wave-id>

# Run only through Phase C (Entry + Implementation + Verification)
node scripts/governance-cli-wave-enforcement.mjs run <wave-id> C
```

### Reset Failed Wave
```bash
node scripts/governance-cli-wave-enforcement.mjs reset <wave-id>
```

---

## Proof Bundle Structure

Each proof bundle contains:

```json
{
  "entry": [
    {
      "timestamp": "2026-05-07T11:30:00.000Z",
      "cmd": "node scripts/ci-guards/service-manifest-required.mjs",
      "description": "Service manifest guard with enforcement",
      "success": true,
      "output": "...",
      "exitCode": 0
    }
  ],
  "implementation": [
    {
      "timestamp": "2026-05-07T11:35:00.000Z",
      "cmd": "pnpm install",
      "description": "Install dependencies",
      "success": true,
      "output": "...",
      "exitCode": 0
    }
  ],
  "verification": [...],
  "runtime": [...]
}
```

---

## State Transitions

```
not_started
    ↓ (Phase A passes)
entry_passed
    ↓ (Phase B passes)
implementation_complete
    ↓ (Phase C passes)
verification_passed
    ↓ (Phase D passes)
runtime_verified
    ↓ (Phase E passes)
closed
```

Any failure requires `reset` command to return to `not_started`.

---

## Stop-the-Line Examples

### Example 1: Entry Gate Failure
```bash
$ node scripts/governance-cli-wave-enforcement.mjs run service-manifest-hardening

═══ PHASE A: ENTRY GATE ─══
  Service manifest guard with enforcement
  → node scripts/ci-guards/service-manifest-required.mjs
  ✗ FAILED: Service manifest guard with enforcement
  Error: 3 violations found

✗ WAVE service-manifest-hardening FAILED AT PHASE A
Reason: Command failed
```

**Action:** Fix violations, then run wave again.

### Example 2: Previous Wave Incomplete
```bash
$ node scripts/governance-cli-wave-enforcement.mjs run dynamic-ui-db-driven

═══ PHASE A: ENTRY GATE ─══
  ✗ STOP: Previous wave 'service-manifest-hardening' proof bundle not complete
  Next wave is blocked until current wave proof bundle is complete

✗ WAVE dynamic-ui-db-driven FAILED AT PHASE A
Reason: previous_wave_incomplete
```

**Action:** Complete previous wave to Phase E (Wave Close), then retry.

### Example 3: Implementation Failure
```bash
$ node scripts/governance-cli-wave-enforcement.mjs run ibm-carbon-enforcement

═══ PHASE B: IMPLEMENTATION ─══
  Apply Carbon-only DB trigger migration
  → pnpm run migrate:up 20260502_0400_carbon_only_runtime_trigger
  ✗ FAILED: Apply Carbon-only DB trigger migration
  Error: Migration conflict

✗ WAVE ibm-carbon-enforcement FAILED AT PHASE B
Reason: Command failed
```

**Action:** Resolve migration conflict, reset wave, retry.

---

## CI Integration

### GitHub Actions Example

```yaml
name: Governance Wave Enforcement

on:
  push:
    branches: [main]

jobs:
  governance-waves:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Run Wave 1: Service Manifest Hardening
        run: node scripts/governance-cli-wave-enforcement.mjs run service-manifest-hardening
      
      - name: Run Wave 2: Dynamic UI DB-Driven
        run: node scripts/governance-cli-wave-enforcement.mjs run dynamic-ui-db-driven
      
      - name: Run Wave 3: IBM Carbon Enforcement
        run: node scripts/governance-cli-wave-enforcement.mjs run ibm-carbon-enforcement
      
      - name: Upload Proof Bundles
        uses: actions/upload-artifact@v3
        with:
          name: governance-proof-bundles
          path: .governance-proof/*.json
```

---

## Drift Control Verification

### Check All Wave States
```bash
node scripts/governance-cli-wave-enforcement.mjs list
```

### Verify Proof Bundle Completeness
```bash
ls -la .governance-proof/*-proof-bundle.json
```

### Audit Proof Bundle Content
```bash
cat .governance-proof/service-manifest-hardening-proof-bundle.json | jq '.entry[] | select(.success == false)'
```

---

## Emergency Rollback

If a wave causes production issues:

1. Stop the wave execution
2. Reset the failed wave:
   ```bash
   node scripts/governance-cli-wave-enforcement.mjs reset <wave-id>
   ```
3. Rollback code changes to previous commit
4. Revert migrations if applicable
5. Re-run previous wave verification to confirm stability

---

## Best Practices

1. **Run waves sequentially:** Do not skip waves or phases
2. **Review proof bundles:** After each wave close, review the proof bundle
3. **Commit proof bundles:** Include proof bundles in git for audit trail
4. **Reset before retry:** Always reset failed waves before retrying
5. **Monitor state:** Use `status` command to check wave state before proceeding
6. **Test in staging:** Run waves in staging environment before production

---

## Troubleshooting

### Wave Stuck in State
```bash
# Check current state
node scripts/governance-cli-wave-enforcement.mjs status <wave-id>

# Reset if stuck
node scripts/governance-cli-wave-enforcement.mjs reset <wave-id>
```

### Proof Bundle Missing
```bash
# Check proof directory
ls -la .governance-proof/

# Regenerate by running wave to Phase E
node scripts/governance-cli-wave-enforcement.mjs run <wave-id> E
```

### Command Timeout
Commands have no built-in timeout. Add timeout wrapper if needed:
```bash
timeout 300 node scripts/governance-cli-wave-enforcement.mjs run <wave-id>
```

---

## Appendix: Adding New Waves

To add a new wave to the enforcement script:

1. Add wave configuration to `WAVES` object in `governance-cli-wave-enforcement.mjs`
2. Define mandatory commands for each phase (entry, implementation, verification, runtime)
3. Add wave to this runbook with full documentation
4. Test wave in development environment
5. Commit changes and update CI integration

Example wave configuration:
```javascript
'new-wave-id': {
  description: 'Description of the wave',
  phases: {
    entry: [
      { cmd: 'command1', description: 'Description 1' },
      { cmd: 'command2', env: { VAR: 'value' }, description: 'Description 2' },
    ],
    implementation: [
      { cmd: 'command3', description: 'Description 3' },
    ],
    verification: [
      { cmd: 'command4', description: 'Description 4' },
    ],
    runtime: [
      { cmd: 'command5', description: 'Description 5' },
    ],
  },
},
```
