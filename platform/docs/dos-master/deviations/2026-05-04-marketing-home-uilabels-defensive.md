# Marketing landing — defensive uiLabels merge + workspace-bff /healthz alias

- **Date**: 2026-05-04
- **Actor (audit ledger)**: doganlap@gmail.com
- **Doctrine articles affected**: 5 (no fake-green), 11 (DOS Master writer)
- **Deviation type**: defensive runtime patch (no DB mutation, no contract drift)

## Symptom

Production marketing landing rendered as a blank white page. Browser
console showed:

```
ERROR TypeError: Cannot read properties of undefined (reading 'mobileMenuLabel')
    at get mobileMenuLabel (chunk-…js)
    at template (chunk-…js)
```

The error fired on every change-detection tick because the template
binds `[attr.aria-label]="mobileMenuLabel"` and the getter dereferenced
`this.content().uiLabels.mobileMenuLabel` directly. When the live
`MarketingHomeContent` payload from
`services/ui-os-service/src/routes/brand.routes.ts ::
buildMarketingHomeContent()` (or `MarketingPublicConfigService.marketingHomeContent()`)
shipped without the `uiLabels` bag — older fixtures pre-date the M3.1
schema — `.uiLabels` was `undefined` and every per-key getter
(`mobileMenuLabel`, `headerMenuLabel`, `heroTrustLabel`, …, ~20 of them)
threw, crashing the entire component tree.

Bonus 401s on `/api/ui-os/grc-sandbox/{frameworks,controls,summary,requirements}`
are unrelated (sandbox endpoints require a tenant session; the visitor
hitting the marketing landing is unauthenticated by design — those calls
should not fire on the public landing and are tracked under a separate
follow-up).

## Fix shipped

1. `platform/ui-system/dos-ui-system/src/marketing/marketing-home.page.ts`
   — the private `content` computed signal now performs a shallow merge
   of **every nested section bag** against the empty default. Survey of
   all `this.content().<section>.<key>` accesses identified 13 nested
   bags that needed defensive merging: `uiLabels`, `hero`, `agentic`,
   `downloadKit`, `platform`, `architecture`, `ai`, `pricing`,
   `testimonials`, `logos`, `resources`, `faq`, `ctaBanner`. Plus 5
   array bags (`trustPills`, `valueProps`, `modules`, `industries`,
   `breadcrumb`) get `?? E.<key>` null-coalesce so `.length`/`.map`
   never blow up.

   Initial fix (turn 1) only patched `uiLabels` → `mobileMenuLabel`
   crash, but the live payload was also missing `logos.eyebrow`
   (turn-2 console error) and presumably the other 11 bags too. This
   second iteration fixes all of them in one pass:

   ```ts
   private readonly content = computed(() => {
     const c = this._homeContent() ?? EMPTY_MARKETING_HOME_CONTENT;
     const E = EMPTY_MARKETING_HOME_CONTENT;
     return {
       ...E, ...c,
       uiLabels:    { ...E.uiLabels,    ...(c.uiLabels    ?? {}) },
       hero:        { ...E.hero,        ...(c.hero        ?? {}) },
       agentic:     { ...E.agentic,     ...(c.agentic     ?? {}) },
       downloadKit: { ...E.downloadKit, ...(c.downloadKit ?? {}) },
       platform:    { ...E.platform,    ...(c.platform    ?? {}) },
       architecture:{ ...E.architecture,...(c.architecture?? {}) },
       ai:          { ...E.ai,          ...(c.ai          ?? {}) },
       pricing:     { ...E.pricing,     ...(c.pricing     ?? {}) },
       testimonials:{ ...E.testimonials,...(c.testimonials?? {}) },
       logos:       { ...E.logos,       ...(c.logos       ?? {}) },
       resources:   { ...E.resources,   ...(c.resources   ?? {}) },
       faq:         { ...E.faq,         ...(c.faq         ?? {}) },
       ctaBanner:   { ...E.ctaBanner,   ...(c.ctaBanner   ?? {}) },
       trustPills:  c.trustPills  ?? E.trustPills,
       valueProps:  c.valueProps  ?? E.valueProps,
       modules:     c.modules     ?? E.modules,
       industries:  c.industries  ?? E.industries,
       breadcrumb:  c.breadcrumb  ?? E.breadcrumb,
     } as MarketingHomeContent;
   });
   ```

   All getters keep their existing locale-fallback string so visible
   copy is unchanged when bags are absent — only the crashes are
   eliminated.

2. `services/workspace-bff/src/routes/index.ts` and
   `services/workspace-bff/src/server.ts` — added `/healthz` alias
   (root-mounted) and `/api/healthz` (prefix-mounted) probes that
   return `{ok:true,service:'workspace-bff'}` for PM2 / Cloudflare /
   k8s-style liveness checkers that hit the service root. Existing
   `/api/workspace/health` is preserved; nothing renamed, no breaking
   change.

## Verification

- `pnpm --filter @dos/ui-system build` — GREEN.
- `pnpm --filter shahin-ai-grc-frontend build` — GREEN, 20.9s.
- `pm2 restart product-shell` — clean.
- `curl -sSI http://127.0.0.1:3000/` → `HTTP/1.1 200 OK` with 5385-byte
  SPA shell. (Visual confirmation deferred to user — no browser tool
  in this session; defensive logic is purely runtime template safety.)
- `curl -sS http://127.0.0.1:4007/healthz` → `{"ok":true,"service":"workspace-bff"}`.
- `curl -sS http://127.0.0.1:4007/api/healthz` → `{"ok":true,"service":"workspace-bff"}`.
- `curl -sS http://127.0.0.1:4007/api/workspace/health` → `{"ok":true,"service":"workspace-bff"}`.
- `node scripts/ci-guards/dos-master-gate.mjs` — **27/27 PASS**.

## Doctrine compliance

- **Article 5 (no fake-green)**: defensive merge is a real fix to a real
  null-pointer, not a `?? null` swallow that hides missing data. The
  empty defaults preserved for every key allow the page to render with
  locale-aware fallback copy that was already authored in the component.
- **Article 11 (DOS Master writer)**: no controlled-table writes; pure
  FE component patch + tenant-zone health alias.
- **PPD ring state**: workspace-bff prod cut-over plan stays at R4
  active / R5 pending. This fix rides ring R0..R4 by virtue of being
  in the SPA bundle product-shell already serves; no new ring required.

## Follow-ups (not in this slice)

1. The 401s on `/api/ui-os/grc-sandbox/*` from an unauthenticated
   landing visitor — the sandbox widget should not request data when
   the user is anonymous. Tracked separately.
2. Backfill the `uiLabels` bag in the live ui-os-service resolver so
   the defensive merge is belt-and-suspenders rather than load-bearing.
3. Playwright spec for the marketing landing (3 widths × 2 directions)
   is GATED on user approval per workflow §6.5 and is not shipped here.
