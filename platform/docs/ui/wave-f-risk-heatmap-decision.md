# Wave F — Risk Heatmap Canonical Renderer Decision

**Date:** 2026-04-30
**Roadmap reference:** [`platform/docs/ui/ui-component-migration-roadmap.md`](ui-component-migration-roadmap.md) §4 (Domain widget registry plan) and §6 (Third-party wrapper rationalization)
**ComponentKey under decision:** `Risk.RiskHeatmap`
**Status:** **DECIDED — ECharts** (consolidation work filed as Wave F-2)

---

## Context

The migration roadmap §4 flagged `Risk.RiskHeatmap` as the canonical domain
componentKey but observed three competing renderer implementations in the
estate, all named differently and shipping in both the active app and the
website packages. Wave F's job is to pick the canonical renderer with
evidence so the redundant variants can be retired without ambiguity.

## Evidence

Inventory of risk-heatmap-related files:

| File | Lines | Renderer | Notes |
|---|---:|---|---|
| `products/shahin-ai/app/.../shared/widgets/chart-infra/d3-charts/risk-heatmap-chart.component.ts` | 129 | D3 | Full custom axis + scale + cell render |
| `products/shahin-ai/website/.../shared/widgets/chart-infra/d3-charts/risk-heatmap-chart.component.ts` | 129 | D3 | Identical copy |
| `products/shahin-ai/app/.../shared/widgets/chart-infra/echart-components/heatmap/risk-heatmap-echart.component.ts` | 56 | ECharts | Wrapper around `series: [{ type: 'heatmap' }]` |
| `products/shahin-ai/website/.../shared/widgets/chart-infra/echart-components/heatmap/risk-heatmap-echart.component.ts` | 56 | ECharts | Identical copy |
| `products/shahin-ai/app/.../shared/widgets/echart-components/heatmap/risk-heatmap-echart.component.ts` | 1 | (stub) | Empty re-export shell |
| `products/shahin-ai/website/.../shared/widgets/echart-components/heatmap/risk-heatmap-echart.component.ts` | 1 | (stub) | Empty re-export shell |
| `products/shahin-ai/app/.../features/dashboard/widgets/compliance-risk-widgets/risk-heatmap-widget.component.ts` | 47 | (composer) | Dashboard widget that hosts a renderer |
| `products/shahin-ai/app/.../features/dashboard/widgets/risk-vendor-widgets/risk-heatmap/risk-heatmap-widget.component.ts` | 71 | (composer) | Dashboard widget that hosts a renderer |

Behavior comparison (per renderer):

| Property | D3 (129 lines) | ECharts (56 lines) |
|---|:-:|:-:|
| Tooltips | ❌ — would need bespoke `mouseover` listener | ✅ — `tooltip: {}` flag |
| Legend | ❌ — manual SVG | ✅ — `visualMap: {}` |
| Responsive resize | ❌ — manual ResizeObserver | ✅ — `chart.resize()` on parent resize |
| RTL | ❌ — manual axis flip | ✅ — RTL flag in ECharts |
| Touch / hover semantics | ❌ — bespoke | ✅ — built-in |
| Bundle cost (lazy-loaded) | D3 ≈ 70 KB gzip core | ECharts ≈ 100 KB gzip per Wave F lazy plan |
| Maintenance surface | 129 lines of bespoke axis/scale/cell code per consumer | 56 lines of config |
| Existing canonicalisation in roadmap | `R3 — replace where ECharts already covers it` | `R2 — keep + lazy-load; canonicalise per domain` |

## Decision

**Canonical renderer for `Risk.RiskHeatmap` = ECharts.**

Rationale (from highest-weight to lowest):

1. **Half the maintenance surface.** 56 vs 129 lines per renderer, before
   counting the bespoke tooltip/legend/responsive code D3 would still need
   added to reach ECharts feature parity.
2. **Behaviours we'd otherwise re-implement.** Tooltips, legend
   (`visualMap`), responsive resize, RTL flip, focusable cells,
   touch-vs-mouse semantics — all are already built into ECharts.
3. **Already in the lazy-load cleanup scope.** Wave F's stated landing-
   performance plan keeps ECharts code-split off the landing route. The
   D3 module would either need the same treatment (extra work) or stay
   on the critical path (regression).
4. **Roadmap §6 already conditioned this.** The roadmap explicitly said
   "D3: replace where ECharts already covers it; keep for force-directed
   graphs only." Risk heatmap is exactly the case where ECharts already
   covers it.
5. **Bundle delta is acceptable.** ECharts gzip cost is ~100 KB; D3 core
   is ~70 KB. The 30 KB gap is recovered by D3 retirement on consumer
   pages that no longer need it (Risk register, vendor pulse, audit
   findings — all covered by ECharts).

What is **not** decided here:
- Force-directed graph widgets (org chart, ownership canvas) **stay on D3**.
  D3 keeps domain over graph layout where ECharts has no equivalent.
- PrimeNG heatmaps are not in scope: PrimeNG has no first-class heatmap
  series; `<p-chart type="bar">` styled as a heatmap was never a real
  candidate.

## Consolidation plan (Wave F-2 — separate commit)

Order of operations, one revertable commit per step:

1. **Pin canonical**: rename
   `products/shahin-ai/app/.../chart-infra/echart-components/heatmap/risk-heatmap-echart.component.ts`
   to `risk-heatmap.component.ts`. The class becomes the canonical
   `RiskHeatmapComponent` registered as `Risk.RiskHeatmap` in the
   capability registry (`platform/ui-system/dos-ui-contracts/src/capability-registry.ts`).
2. **Rewire composers**: update both dashboard widget composers
   (`compliance-risk-widgets/risk-heatmap-widget.component.ts` and
   `risk-vendor-widgets/risk-heatmap/risk-heatmap-widget.component.ts`)
   to import the canonical class. Verify the website's ECharts variant is
   import-equivalent and re-export through a thin shim.
3. **Quarantine D3 variants**: `git mv` the two `risk-heatmap-chart.component.ts`
   D3 files to `_archive/ui-orphans-batch-2/` after grep confirms zero
   inbound importers (these will be confirmed orphans once step 2 lands).
4. **Quarantine 1-line stub copies**: `git mv` the two stub re-export
   shells to the same archive batch.
5. **Census re-run**: confirms `THIRD_PARTY_WRAPPER` count drops by the D3
   variants, `Risk.RiskHeatmap` is the single registered renderer, and
   `totalUsingD3` drops from 19 toward 17.
6. **Visual proof**: capture canonical heatmap render at 390/430/768/1440
   (scope: dashboard widget pages, both Risk and Compliance dashboards).

Each step is its own `commit + push`. Wave F-2 will not start until a
reviewer signs off on this Wave F decision.

## Reversibility

- Decision recorded here, not encoded in source yet (Wave F-2 is the
  source change). Reverting this decision = delete this file and choose
  D3 instead. No code is touched.
- Wave F-2 is a sequence of small commits with `_archive/` quarantine
  before any deletion; rollback is `git mv` back from archive.

## Cross-references

- `Risk.RiskHeatmap` capability entry: `platform/ui-system/dos-ui-contracts/src/capability-registry.ts`
- Roadmap §4 (domain widget registry): [`ui-component-migration-roadmap.md`](ui-component-migration-roadmap.md)
- Roadmap §6 (third-party wrapper rationalization): [`ui-component-migration-roadmap.md`](ui-component-migration-roadmap.md)
- Census (re-run after Wave E batch 1, this commit): [`ui-component-census.json`](ui-component-census.json)

## Sign-off

| Role | Name | Date |
|---|---|---|
| Author | Claude (Opus 4.7) on behalf of DOS Platform | 2026-04-30 |
| Reviewer | _pending — needed before Wave F-2_ | _pending_ |
