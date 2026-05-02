# AS-BUILT: Benchmarks Module (MP-49)

## Module Identity
- **Module Code:** `benchmarks`
- **Tier:** Cross-Module Support
- **Criticality:** P3

## Owned Artifacts
- **Database Tables:** `benchmarks_catalog`, `benchmark_control_mappings`, `benchmark_scores`, `benchmark_peer_data`
- **Aggregate Root:** `benchmarks_catalog`
- **API Surface:** `/api/benchmarks/` → `/catalog`, `/mappings`, `/scoring`, `/peers`, `/diagnostics`

## Protected Actions
- `benchmarks.read` — View benchmarks, scores, mappings
- `benchmarks.manage` — Create benchmarks, mappings, compute scores

## Service Families
1. **Benchmark Catalog Service** — `createBenchmark()`, `listBenchmarks()`
2. **Mapping Service** — `createMapping()`, `listMappings()`
3. **Scoring Service** — `computeScore()`, `getScores()`
4. **Peer Comparison Service** — `getPeerData()`
5. **Diagnostics Service** — `runDiagnostics()`

## Diagnostics
- Total/active benchmarks
- Total mappings count
- Health status based on active benchmarks presence
