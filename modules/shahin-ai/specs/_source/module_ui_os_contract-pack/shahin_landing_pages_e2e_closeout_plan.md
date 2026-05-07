# Shahin-AI+ Marketing Landing Pages — End-to-End Closeout Plan

## Purpose

Complete the public Shahin-AI+ marketing/landing experience end-to-end using IBM Carbon, `@dos/ui-system`, `@dos/design-tokens`, and the Shahin-AI+ Agentic GRC product story.

This is a landing-page closeout plan, not a workspace-shell task and not a module-page task.

## Current confirmed finding

The landing route renders, but the visual system is incomplete because the marketing home page is missing its page-scaffold CSS. Carbon base CSS and DOS design tokens are bundled, but `marketing-home.page.ts` has no `styles`, no `styleUrl`, and no `.scss` peer for the `dos-mh-*` classes. The result is a flat stream of Carbon micro-widgets without the intended section layout, hero composition, grids, banner, footer, spacing, or responsive behavior.

The `/` route is currently a static Angular `loadComponent` route. `data: { contractRoute: '/', componentKey: 'marketing.home.page' }` is metadata only unless a runtime host consumes it.

## Strict scope

### Allowed

- Public Shahin-AI+ marketing/landing pages.
- Marketing home page layout and styling.
- Marketing page kit integration.
- Public route ownership investigation for `/` and sibling public marketing pages.
- Carbon/DOS/Shahin design token usage.
- EN/AR and RTL/LTR support.
- Product-shell static serve verification.
- Visual proof at desktop and mobile widths.

### Forbidden

- Workspace shell changes.
- `ShellHostComponent` changes.
- Auth, gateway, tenant-service, or module-service changes.
- Foundation/Risk/Compliance/Admin module pages.
- Tenant AccessStore.
- Real customer data.
- DB migrations unless a later explicit Dynamic UI marketing wave is approved.
- External UI kits, PrimeNG, Material, or marketplace templates.
- Converting Shahin-AI+ into Tuwaiq ERP.

## Product positioning

Target product: **Shahin-AI+**

Positioning:

> Agentic GRC operating workspace for regulated enterprises.

Keep the story focused on:

- Agentic GRC.
- Risk.
- Controls.
- Evidence.
- Audit.
- Policy lifecycle.
- Third-party risk.
- Foundation.
- DAuth.
- Dynamic UI.
- AI Engine.
- Audit Ledger.
- Bilingual EN/AR.
- GCC/KSA compliance proof.

Do not rewrite the page as ERP, Finance AI, ERPNext, or Tuwaiq.

---

# Phase 0 — Stop and preserve investigation lock

## Goal

Do not redesign blindly. First fix the broken visual pipeline and page scaffold.

## Required rule

```
Investigation-first lock remains active.
Do not broaden into workspace, module routing, DB migration, or product rebranding.
```

## Output

A short implementation note confirming:

- Current rendered route.
- Current component.
- Whether Dynamic UI is actually used for `/`.
- Whether visual issue is CSS/scaffold, component imports, stale dist, or wrong route.

---

# Phase 1 — Route ownership and runtime truth

## Goal

Prove which component renders `/` and whether `marketing.home.page` is runtime-enforced or metadata-only.

## Checks

1. Inspect `products/shahin-ai/app/src/app/app.routes.ts`.
2. Find the `/` route.
3. Record the loaded component.
4. Confirm whether a `MarketingPageHost` or Dynamic UI resolver is involved.
5. Confirm whether `componentKey: 'marketing.home.page'` is consumed or just route data.

## Decision options

### Option A — Static route remains

Keep `/` as static Angular route, but enforce Marketing Page Kit and CSS pipeline.

### Option B — Full Dynamic UI route

Migrate `/` to Dynamic UI resolver. Do not do this now unless approved.

### Option C — Preferred hybrid

Keep `/` as a public Angular route, but load a `MarketingPageHost` that resolves `marketing.home.page` from a registry/config source.

## Current recommendation

Use **Option A now** to fix production visual quality quickly.
Use **Option C later** for registry-enforced marketing runtime.

---

# Phase 2 — Fix the immediate visual blocker

## Goal

Add the missing marketing home page scaffold styles.

## Target

`platform/ui-system/dos-ui-system/src/marketing/marketing-home.page.ts`

or a peer file such as:

`platform/ui-system/dos-ui-system/src/marketing/marketing-home.page.scss`

## Problem to fix

The template uses many `dos-mh-*` classes, but no stylesheet defines them.

Required style coverage must include at least:

- `dos-mh-container`
- `dos-mh-section`
- `dos-mh-hero`
- `dos-mh-hero-content`
- `dos-mh-hero-badge`
- `dos-mh-eyebrow`
- `dos-mh-title`
- `dos-mh-sub`
- `dos-mh-cta-row`
- `dos-mh-hero-microcopy`
- `dos-mh-hero-visual`
- `dos-mh-hero-orb`
- `dos-mh-breadcrumb-row`
- `dos-mh-trust`
- `dos-mh-pill-row`
- `dos-mh-grid-3`
- `dos-mh-value-props`
- `dos-mh-agentic`
- `dos-mh-section-title`
- `dos-mh-readiness`
- `dos-mh-demo-skeleton`
- `dos-mh-agent-tiles`
- `dos-mh-download-kit`
- `dos-mh-ai`
- `dos-mh-ai-loop`
- `dos-mh-quote`
- `dos-mh-logo`
- `dos-mh-cta-banner`
- `dos-mh-cta-banner-inner`
- `dos-mh-eyebrow-on-dark`
- `dos-mh-sub-on-dark`
- `dos-mh-footer`
- `dos-mh-footer-grid`
- `dos-mh-footer-col`
- `dos-mh-footer-brand`

## Styling rules

- Use Carbon/DOS/Shahin tokens only.
- Use logical CSS properties for RTL/LTR.
- Use responsive breakpoints for 390, 430, 768, and 1440 widths.
- Do not introduce raw theme colors unless they are mapped to tokens.
- Do not use PrimeNG, Material, Tailwind theme classes, or copied marketplace CSS.

## Acceptance

- Header is styled.
- Hero has correct spacing, hierarchy, and CTA row.
- Tags render in rows, not vertical raw stacks.
- Cards render in responsive grids.
- CTA banner has dark/brand background and readable text.
- Footer columns render correctly.
- No huge whitespace.
- No raw/native browser look.

---

# Phase 3 — Carbon component import verification

## Goal

Confirm landing components use real Carbon Angular components/directives and import the needed modules.

## Required Carbon primitives for marketing pages

- Header
- HeaderNavigation
- HeaderMenu
- HeaderItem
- HeaderGlobal
- HeaderAction
- Grid
- ColumnDirective
- Layer
- Button
- Link
- Tag
- Tile
- ClickableTile
- Tabs
- Accordion
- StructuredList
- ProgressIndicator
- ProgressStep
- Modal
- TextInput
- TextArea
- Select
- Dropdown
- Checkbox
- Notification
- Toast
- SkeletonText
- SkeletonPlaceholder
- Tooltip
- Toggletip
- DataTable

## Checks

1. If Carbon classes exist but no styling applies, the CSS bundle is missing or stale.
2. If Carbon classes do not exist, the Angular component/directive import is wrong.
3. Standalone marketing components must import the actual Carbon Angular modules needed by their template.

## Acceptance

- Carbon buttons render as Carbon buttons.
- Carbon header/nav render with Carbon structure.
- Carbon tiles/tags/tabs/table/accordion render correctly.
- No plain anchors/buttons pretending to be Carbon components.

---

# Phase 4 — Global CSS and asset pipeline verification

## Goal

Confirm the built SPA and product-shell are serving the expected CSS and assets.

## Checks

1. `angular.json` global styles include:
   - Carbon CSS.
   - IBM Plex / Arabic fonts if used.
   - `@dos/design-tokens` or product token CSS.
   - Shahin base global CSS.
2. Production build includes a hashed `styles-*.css` file.
3. Browser Network tab shows:
   - CSS bundle 200.
   - JS bundle 200.
   - logo asset 200.
   - no stale hashed asset 404.
4. Product-shell serves the latest Shahin SPA dist.
5. Hard refresh/cache bust after rebuild.

## Acceptance

- Latest CSS hash is referenced by `index.html`.
- CSS bundle contains `dos-mh-*` rules after the fix.
- No missing assets.
- Product-shell is not serving old dist.

---

# Phase 5 — Complete all marketing sections

## Required 17 sections

1. Public header
2. Breadcrumb row
3. Hero
4. Trust pills
5. Value propositions
6. Agentic proof
7. Download kit
8. Platform overview
9. Modules
10. Industries
11. Architecture
12. AI and agents
13. Pricing teaser
14. Testimonials
15. Customer logos
16. Resources
17. FAQ
18. CTA banner
19. Footer

Note: The audit calls the page “17-section” but also identifies header, breadcrumb, CTA, and footer areas. Treat the final implementation as a complete public page, not a numeric-only checklist.

## Required features

### Public header

- Shahin-AI+ logo/name.
- Public nav.
- Language switch.
- Sign in.
- Start trial / request demo CTA.

### Hero

- Badge.
- Eyebrow.
- H1.
- Subheadline.
- Primary and secondary CTAs.
- Microcopy.
- Visual proof/mock preview.

### Trust/compliance

- ISO 27001.
- SOC 2.
- GDPR.
- NCA ECC.
- SAMA CSF.
- Use only defensible claims; do not imply certification unless actually proven.

### Product story

- Agentic GRC.
- Human-in-the-loop.
- Evidence ledger.
- Risk/control/audit lifecycle.
- AI governance.

### Download kit

- Executive kit card.
- Gated download modal.
- Success/ready notification.
- No fake download if backend is not wired; use safe pending state.

### Pricing teaser

- Trial / Standard / Enterprise comparison.
- No unsupported billing claims.

### Footer

- Product links.
- Resources.
- Legal.
- Contact.
- Powered by Dogan AI OS / Dogan Consult.

## Acceptance

- Every section has layout CSS.
- Every section works in EN and AR.
- Every section is responsive.
- No raw placeholder content.
- No broken CTA.

---

# Phase 6 — Responsive and RTL proof

## Required widths

- 390px
- 430px
- 768px
- 1440px

## Required checks

- No horizontal overflow.
- Header does not collapse into raw text.
- CTA row wraps cleanly.
- Hero visual scales.
- Card grids collapse to one column on mobile.
- Footer columns stack cleanly.
- RTL uses logical spacing and proper text direction.
- Arabic typography is readable.

## Acceptance

Provide screenshots for:

- Desktop EN.
- Desktop AR/RTL.
- Mobile EN.
- Mobile AR/RTL.

---

# Phase 7 — Future Dynamic UI marketing alignment

## Do not implement in the immediate CSS fix unless approved

Later, add a registry-driven public marketing host.

## Future target

- `/` static public Angular route loads `MarketingPageHost`.
- `MarketingPageHost` resolves `marketing.home.page`.
- Marketing content is fed by typed props or public config.
- Dynamic UI registry truth is enforced without requiring tenant auth.

## Future DB/design tasks

- Add marketing archetype or public-page archetype.
- Add route/template binding for marketing pages.
- Add marketing props schema/tables or public JSON contract.
- Fix component registry mappings so marketing rows are not all placeholder `tiles`.
- Add marketing coverage guard.

## Guardrail

Do not mix this future Dynamic UI migration with the immediate visual CSS fix.

---

# Validation commands

Run the relevant build command for the Shahin SPA. Use the repo’s actual script name if different:

```bash
pnpm --filter shahin-ai-grc-frontend run build
```

Then verify product-shell:

```bash
curl -sI http://localhost:3000/
```

Browser/network proof must show:

- `index.html` 200.
- JS bundle 200.
- CSS bundle 200.
- Logo/assets 200.
- No stale hashed asset served as HTML.

---

# Final acceptance gate

The landing page is complete only when:

1. `/` renders the intended Shahin-AI+ marketing home.
2. Carbon CSS is active.
3. `dos-mh-*` scaffold CSS is present in final CSS bundle.
4. Header/nav/buttons/cards/footer are visually styled.
5. All major sections are present.
6. EN/AR and RTL/LTR work.
7. Mobile and desktop layouts are clean.
8. No workspace or module code was touched.
9. No external UI kit was added.
10. Production build passes.

---

# Report-back format

Report only:

- Root cause confirmed.
- Route/component actually rendering `/`.
- Files changed.
- CSS/classes added.
- Carbon imports fixed, if any.
- Build result.
- Product-shell restart/cache-bust status.
- Desktop/mobile screenshot proof.
- Remaining blockers.
