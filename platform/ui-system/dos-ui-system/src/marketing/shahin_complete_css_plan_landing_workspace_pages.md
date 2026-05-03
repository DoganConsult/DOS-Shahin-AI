# Shahin-AI+ Complete CSS / SCSS Closeout Plan

## Purpose

Create one consistent styling system for:

1. Public marketing / landing pages
2. Authenticated workspace host
3. Dynamic/module pages

This is a CSS/UI-System task only. It must not become a route migration, DB migration, gateway/auth task, or module-content rewrite.

---

# 0. Non-negotiable rules

## 0.1 Source of truth

Use this layer order:

```text
IBM Carbon Angular primitives
→ @dos/ui-system wrappers
→ @dos/design-tokens
→ Shahin-AI+ product aliases
→ page/component SCSS
```

## 0.2 Forbidden

```text
No external UI kits
No PrimeNG for new shell/landing/page CSS
No Material
No Tailwind theme copy
No raw hex colors
No random px spacing except token fallbacks
No physical left/right CSS where logical property exists
No module business logic inside workspace shell
No route migration in this CSS task
No DB migration in this CSS task
```

## 0.3 Required

```text
Use IBM Carbon classes/components for behavior.
Use @dos/ui-system wrappers for semantic surfaces.
Use @dos/design-tokens for color, spacing, typography, radius, shadow, z-index, motion.
Support EN/AR and LTR/RTL.
Support 390, 430, 768, 1440 widths.
```

---

# 1. File layout to create / update

## 1.1 Marketing landing CSS

Create:

```text
platform/ui-system/dos-ui-system/src/marketing/marketing-home.page.scss
```

Update:

```text
platform/ui-system/dos-ui-system/src/marketing/marketing-home.page.ts
```

Add:

```ts
styleUrl: './marketing-home.page.scss',
```

## 1.2 Workspace host CSS

Create or update:

```text
platform/ui-system/dos-ui-system/src/shell/workspace-host-kit/workspace-host-kit.scss
platform/ui-system/dos-ui-system/src/shell/workspace-header/workspace-header.component.scss
platform/ui-system/dos-ui-system/src/shell/workspace-sidebar/workspace-sidebar.component.scss
platform/ui-system/dos-ui-system/src/shell/mobile-drawer/mobile-drawer.component.scss
platform/ui-system/dos-ui-system/src/shell/mobile-bottom-nav/mobile-bottom-nav.component.scss
platform/ui-system/dos-ui-system/src/shell/command-search/command-search.component.scss
platform/ui-system/dos-ui-system/src/shell/inbox-center/inbox-center.component.scss
```

If current wrappers use different exact paths, do not rename files. Add styles beside the existing components.

## 1.3 Module/page CSS primitives

Create or update shared page SCSS only inside UI-System:

```text
platform/ui-system/dos-ui-system/src/page/page-layout.scss
platform/ui-system/dos-ui-system/src/page/page-archetypes.scss
platform/ui-system/dos-ui-system/src/page/page-responsive.scss
platform/ui-system/dos-ui-system/src/page/page-states.scss
```

Do not edit every module page manually in this wave.

---

# 2. Token bridge required before CSS

Before authoring component CSS, confirm these token families exist. If a token is missing, add it in the design-token layer, not locally in page CSS.

```css
:root {
  /* Carbon role tokens */
  --cds-background: var(--cds-background);
  --cds-layer: var(--cds-layer);
  --cds-layer-01: var(--cds-layer-01);
  --cds-layer-02: var(--cds-layer-02);
  --cds-field: var(--cds-field);
  --cds-border-subtle: var(--cds-border-subtle);
  --cds-border-strong: var(--cds-border-strong);
  --cds-text-primary: var(--cds-text-primary);
  --cds-text-secondary: var(--cds-text-secondary);
  --cds-link-primary: var(--cds-link-primary);
  --cds-icon-primary: var(--cds-icon-primary);
  --cds-support-error: var(--cds-support-error);
  --cds-support-success: var(--cds-support-success);
  --cds-support-warning: var(--cds-support-warning);
  --cds-support-info: var(--cds-support-info);
  --cds-focus: var(--cds-focus);

  /* DOS semantic aliases */
  --dos-bg-page: var(--cds-background);
  --dos-bg-surface: var(--cds-layer);
  --dos-bg-elevated: var(--cds-layer-01);
  --dos-border-subtle: var(--cds-border-subtle);
  --dos-text-primary: var(--cds-text-primary);
  --dos-text-secondary: var(--cds-text-secondary);
  --dos-action-primary: var(--cds-link-primary);
  --dos-focus-ring: var(--cds-focus);

  /* Spacing */
  --dos-space-01: 0.125rem;
  --dos-space-02: 0.25rem;
  --dos-space-03: 0.5rem;
  --dos-space-04: 0.75rem;
  --dos-space-05: 1rem;
  --dos-space-06: 1.5rem;
  --dos-space-07: 2rem;
  --dos-space-08: 2.5rem;
  --dos-space-09: 3rem;
  --dos-space-10: 4rem;
  --dos-space-11: 5rem;
  --dos-space-12: 6rem;

  /* Layout */
  --dos-container-max: 1200px;
  --dos-shell-header-height: 3rem;
  --dos-shell-sidebar-width: 16rem;
  --dos-shell-sidebar-collapsed-width: 3rem;

  /* Radius and shadow — controlled */
  --dos-radius-sm: 0.25rem;
  --dos-radius-md: 0.5rem;
  --dos-shadow-subtle: 0 1px 2px rgb(0 0 0 / 0.08);
}
```

---

# 3. Marketing home SCSS — complete required scaffold

Create `marketing-home.page.scss` with this structure. Adjust token names only if the repo already has canonical alternatives.

```scss
:host {
  display: block;
  min-block-size: 100dvh;
  background: var(--dos-bg-page, var(--cds-background));
  color: var(--dos-text-primary, var(--cds-text-primary));
}

.dos-mh-container {
  inline-size: min(100% - calc(var(--dos-space-06, 1.5rem) * 2), var(--dos-container-max, 1200px));
  margin-inline: auto;
}

.dos-mh-breadcrumb-row {
  padding-block: var(--dos-space-04, 0.75rem);
  border-block-end: 1px solid var(--dos-border-subtle, var(--cds-border-subtle));
}

.dos-mh-section {
  padding-block: var(--dos-space-10, 4rem);
}

.dos-mh-hero {
  position: relative;
  overflow: clip;
  padding-block: var(--dos-space-12, 6rem);
  background:
    linear-gradient(180deg, var(--cds-layer-01) 0%, var(--cds-background) 100%);
}

.dos-mh-hero-content {
  display: grid;
  gap: var(--dos-space-06, 1.5rem);
  align-content: center;
  max-inline-size: 44rem;
}

.dos-mh-hero-badge,
.dos-mh-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: var(--dos-space-03, 0.5rem);
  color: var(--cds-text-secondary);
  font-size: var(--cds-label-01-font-size, 0.75rem);
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.dos-mh-title {
  margin: 0;
  color: var(--cds-text-primary);
  font-size: clamp(2.25rem, 6vw, 4.75rem);
  line-height: 0.98;
  letter-spacing: -0.045em;
}

.dos-mh-section-title {
  margin: 0 0 var(--dos-space-06, 1.5rem);
  color: var(--cds-text-primary);
  font-size: clamp(1.75rem, 3vw, 3rem);
  line-height: 1.08;
  letter-spacing: -0.03em;
}

.dos-mh-sub {
  margin: 0;
  max-inline-size: 42rem;
  color: var(--cds-text-secondary);
  font-size: clamp(1rem, 1.5vw, 1.25rem);
  line-height: 1.6;
}

.dos-mh-cta-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--dos-space-04, 0.75rem);
  margin-block-start: var(--dos-space-02, 0.25rem);
}

.dos-mh-hero-microcopy {
  color: var(--cds-text-secondary);
  font-size: 0.875rem;
}

.dos-mh-hero-visual {
  position: relative;
  display: grid;
  place-items: center;
  min-block-size: 28rem;
}

.dos-mh-hero-orb {
  inline-size: min(100%, 28rem);
  aspect-ratio: 1;
  border: 1px solid var(--cds-border-subtle);
  background:
    radial-gradient(circle at 35% 30%, var(--cds-layer-02), transparent 40%),
    linear-gradient(135deg, var(--cds-layer-01), var(--cds-background));
  box-shadow: var(--dos-shadow-subtle);
}

.dos-mh-trust,
.dos-mh-value-props,
.dos-mh-download-kit,
.dos-mh-ai {
  background: var(--cds-background);
}

.dos-mh-pill-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dos-space-03, 0.5rem);
  align-items: center;
}

.dos-mh-grid-3,
.dos-mh-agent-tiles {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--dos-space-05, 1rem);
}

.dos-mh-agentic {
  background: var(--cds-layer-01);
}

.dos-mh-readiness {
  display: grid;
  gap: var(--dos-space-04, 0.75rem);
  max-inline-size: 36rem;
  margin-block: var(--dos-space-05, 1rem) var(--dos-space-06, 1.5rem);
}

.dos-mh-demo-skeleton {
  display: grid;
  gap: var(--dos-space-03, 0.5rem);
  padding: var(--dos-space-05, 1rem);
  background: var(--cds-layer-02);
  border: 1px solid var(--cds-border-subtle);
}

.dos-mh-ai-loop {
  margin-block-start: var(--dos-space-06, 1.5rem);
  padding: var(--dos-space-05, 1rem);
  background: var(--cds-layer-01);
  border: 1px solid var(--cds-border-subtle);
}

.dos-mh-quote {
  margin: 0 0 var(--dos-space-04, 0.75rem);
  color: var(--cds-text-primary);
  font-size: 1.125rem;
  line-height: 1.5;
}

.dos-mh-logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-inline-size: 8rem;
  min-block-size: 3rem;
  padding-inline: var(--dos-space-04, 0.75rem);
  color: var(--cds-text-secondary);
  background: var(--cds-layer-01);
  border: 1px solid var(--cds-border-subtle);
}

.dos-mh-cta-banner {
  padding-block: var(--dos-space-10, 4rem);
}

.dos-mh-cta-banner-inner {
  display: grid;
  gap: var(--dos-space-05, 1rem);
  padding: clamp(var(--dos-space-06, 1.5rem), 5vw, var(--dos-space-10, 4rem));
  background: var(--cds-gray-100, #161616);
  color: var(--cds-text-on-color, #ffffff);
}

.dos-mh-eyebrow-on-dark,
.dos-mh-sub-on-dark {
  color: var(--cds-text-on-color, #ffffff);
}

.dos-mh-footer {
  padding-block: var(--dos-space-08, 2.5rem);
  background: var(--cds-layer-01);
  border-block-start: 1px solid var(--cds-border-subtle);
}

.dos-mh-footer-grid {
  display: grid;
  grid-template-columns: 2fr repeat(3, 1fr);
  gap: var(--dos-space-06, 1.5rem);
}

.dos-mh-footer-col {
  display: grid;
  align-content: start;
  gap: var(--dos-space-03, 0.5rem);
}

.dos-mh-footer-brand {
  display: grid;
  gap: var(--dos-space-03, 0.5rem);
  max-inline-size: 24rem;
}

@media (max-width: 1440px) {
  .dos-mh-container {
    inline-size: min(100% - calc(var(--dos-space-06, 1.5rem) * 2), 1180px);
  }
}

@media (max-width: 768px) {
  .dos-mh-section,
  .dos-mh-hero,
  .dos-mh-cta-banner {
    padding-block: var(--dos-space-08, 2.5rem);
  }

  .dos-mh-grid-3,
  .dos-mh-agent-tiles,
  .dos-mh-footer-grid {
    grid-template-columns: 1fr;
  }

  .dos-mh-hero-visual {
    min-block-size: 18rem;
  }
}

@media (max-width: 430px) {
  .dos-mh-container {
    inline-size: min(100% - calc(var(--dos-space-05, 1rem) * 2), 100%);
  }

  .dos-mh-cta-row {
    align-items: stretch;
  }

  .dos-mh-cta-row :where(button, a) {
    inline-size: 100%;
  }
}

@media (max-width: 390px) {
  .dos-mh-title {
    font-size: clamp(2rem, 12vw, 2.75rem);
  }
}

:host-context([dir='rtl']) .dos-mh-eyebrow,
:host-context([dir='rtl']) .dos-mh-hero-badge {
  letter-spacing: 0;
}
```

Note: the two fallbacks `#161616` and `#ffffff` should be removed if the project already exposes `--cds-gray-100` and `--cds-text-on-color`. If the guard forbids fallback hex, add the tokens centrally instead.

---

# 4. Workspace host SCSS — required behavior

Workspace CSS must not style business content. It only styles frame surfaces.

## 4.1 Workspace host wrapper

```scss
:host {
  display: block;
  min-block-size: 100dvh;
  background: var(--dos-bg-page, var(--cds-background));
  color: var(--dos-text-primary, var(--cds-text-primary));
}

.dos-workspace-host {
  display: grid;
  grid-template-rows: var(--dos-shell-header-height, 3rem) 1fr;
  min-block-size: 100dvh;
}

.dos-workspace-host__body {
  display: grid;
  grid-template-columns: var(--dos-shell-sidebar-width, 16rem) minmax(0, 1fr);
  min-block-size: calc(100dvh - var(--dos-shell-header-height, 3rem));
}

.dos-workspace-host__body--rail {
  grid-template-columns: var(--dos-shell-sidebar-collapsed-width, 3rem) minmax(0, 1fr);
}

.dos-workspace-host__main {
  min-inline-size: 0;
  overflow: auto;
  background: var(--cds-background);
}

.dos-workspace-host__content {
  padding: var(--dos-space-06, 1.5rem);
}

@media (max-width: 768px) {
  .dos-workspace-host__body {
    grid-template-columns: 1fr;
  }

  .dos-workspace-host__content {
    padding: var(--dos-space-05, 1rem);
    padding-block-end: calc(var(--dos-space-10, 4rem) + env(safe-area-inset-bottom));
  }
}
```

## 4.2 Header requirements

Header must show:

```text
Product name: Shahin-AI+
Workspace label
Selected module label if available
Account menu
Notification entry
Command search entry
Quick-create entry if mounted
```

Header SCSS must control only spacing and responsive visibility. Carbon controls interaction styling.

```scss
.dos-workspace-header {
  display: flex;
  align-items: center;
  min-inline-size: 0;
}

.dos-workspace-header__brand {
  display: inline-flex;
  align-items: center;
  gap: var(--dos-space-03, 0.5rem);
  min-inline-size: 0;
  font-weight: 600;
}

.dos-workspace-header__module {
  color: var(--cds-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dos-workspace-header__actions {
  display: inline-flex;
  align-items: center;
  margin-inline-start: auto;
}

@media (max-width: 430px) {
  .dos-workspace-header__module {
    display: none;
  }
}
```

## 4.3 Sidebar requirements

Sidebar must:

```text
Use resolved labels, never literal Title.
Use WorkspaceNavigationAdapter data.
Support collapsed rail.
Use logical spacing.
Show active item state.
```

```scss
.dos-workspace-sidebar {
  block-size: 100%;
  overflow: auto;
  border-inline-end: 1px solid var(--cds-border-subtle);
  background: var(--cds-layer-01);
}

.dos-workspace-sidebar__group {
  margin-block: var(--dos-space-03, 0.5rem);
}

.dos-workspace-sidebar__item {
  display: flex;
  align-items: center;
  gap: var(--dos-space-03, 0.5rem);
  min-block-size: 2.5rem;
  padding-inline: var(--dos-space-04, 0.75rem);
  color: var(--cds-text-secondary);
  text-decoration: none;
}

.dos-workspace-sidebar__item[aria-current='page'],
.dos-workspace-sidebar__item--active {
  color: var(--cds-text-primary);
  background: var(--cds-layer-selected, var(--cds-layer-02));
  border-inline-start: 3px solid var(--cds-focus);
}
```

## 4.4 Mobile drawer and bottom nav

```scss
.dos-mobile-drawer {
  position: fixed;
  inset-block: 0;
  inset-inline-start: 0;
  z-index: var(--dos-z-drawer, 8000);
  inline-size: min(84vw, 22rem);
  background: var(--cds-layer-01);
  box-shadow: var(--dos-shadow-subtle);
  transform: translateX(-100%);
  transition: transform 160ms ease;
}

:host-context([dir='rtl']) .dos-mobile-drawer {
  transform: translateX(100%);
}

.dos-mobile-drawer--open {
  transform: translateX(0);
}

.dos-mobile-bottom-nav {
  position: fixed;
  inset-inline: 0;
  inset-block-end: 0;
  z-index: var(--dos-z-mobile-nav, 7000);
  display: none;
  padding-block-end: env(safe-area-inset-bottom);
  background: var(--cds-layer-01);
  border-block-start: 1px solid var(--cds-border-subtle);
}

@media (max-width: 768px) {
  .dos-mobile-bottom-nav {
    display: grid;
  }
}
```

---

# 5. Dynamic/module page CSS

Module page CSS must be generic and archetype-driven.

## 5.1 Required page layout primitives

```scss
.dos-page {
  display: grid;
  gap: var(--dos-space-06, 1.5rem);
  padding: var(--dos-space-06, 1.5rem);
  background: var(--cds-background);
}

.dos-page__masthead {
  display: grid;
  gap: var(--dos-space-04, 0.75rem);
  padding: var(--dos-space-06, 1.5rem);
  background: var(--cds-layer-01);
  border: 1px solid var(--cds-border-subtle);
}

.dos-page__title {
  margin: 0;
  color: var(--cds-text-primary);
  font-size: clamp(1.75rem, 3vw, 2.75rem);
  line-height: 1.1;
}

.dos-page__subtitle {
  max-inline-size: 48rem;
  margin: 0;
  color: var(--cds-text-secondary);
  line-height: 1.6;
}

.dos-page__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dos-space-03, 0.5rem);
  align-items: center;
  justify-content: space-between;
}

.dos-page__grid-2,
.dos-page__grid-3,
.dos-page__grid-4 {
  display: grid;
  gap: var(--dos-space-05, 1rem);
}

.dos-page__grid-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.dos-page__grid-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.dos-page__grid-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }

@media (max-width: 768px) {
  .dos-page {
    padding: var(--dos-space-05, 1rem);
  }

  .dos-page__grid-2,
  .dos-page__grid-3,
  .dos-page__grid-4 {
    grid-template-columns: 1fr;
  }
}
```

## 5.2 Page states

```scss
.dos-empty-state,
.dos-loading-state,
.dos-error-state {
  display: grid;
  place-items: center;
  min-block-size: 18rem;
  padding: var(--dos-space-07, 2rem);
  text-align: center;
  background: var(--cds-layer-01);
  border: 1px solid var(--cds-border-subtle);
}
```

---

# 6. Execution order

## Patch 1 — Marketing visual CSS only

Allowed:

```text
marketing-home.page.scss
marketing-home.page.ts styleUrl only
```

Forbidden:

```text
Route changes
DB changes
Resolver wiring
Workspace shell changes
Module page changes
```

Acceptance:

```text
Landing no longer looks like raw HTML.
Hero/grid/footer/CTA/trust pills are styled.
Build passes.
Desktop and mobile screenshots pass.
```

## Patch 2 — Workspace shell CSS only

Allowed:

```text
Existing @dos/ui-system shell wrapper SCSS files
ShellHost only if needed to add wrapper class names, not behavior rewrite
```

Acceptance:

```text
Header/sidebar/mobile nav are styled.
No Title placeholders.
No module business imports.
Build passes.
```

## Patch 3 — Page/archetype shared CSS only

Allowed:

```text
@dos/ui-system page layout SCSS
Dynamic page host classes
```

Acceptance:

```text
Module pages use consistent page masthead, grids, states.
No module-by-module CSS rewrite.
Build passes.
```

## Patch 4 — Contract refactor later

Only after visual CSS is green:

```text
Refactor marketing content arrays into @Input props.
Prepare Dynamic UI marketing host.
Add DB props tables if approved.
```

---

# 7. Agent prompt

```text
Implement the Shahin-AI+ CSS closeout in controlled patches.

Patch 1 only:
- Create marketing-home.page.scss.
- Add styleUrl to marketing-home.page.ts.
- Cover all dos-mh-* scaffold selectors.
- Use Carbon/DOS tokens only.
- Use logical CSS properties.
- Add 390/430/768/1440 responsive behavior.
- Do not refactor content arrays.
- Do not touch routes, DB, resolver, workspace, gateway, auth, tenant-service, or module pages.

Patch 1 acceptance:
- Landing page no longer renders as raw vertical stream.
- Header/hero/grids/trust pills/CTA/footer have layout.
- Carbon components keep Carbon styling.
- Shahin SPA build passes.
- Desktop/mobile screenshots provided.

After Patch 1 passes, stop and report.
Do not start Patch 2 without approval.
```

---

# 8. Validation commands

```bash
pnpm --filter shahin-ai-grc-frontend run build
```

Optional static checks:

```bash
grep -R "dos-mh-" platform/ui-system/dos-ui-system/src/marketing/marketing-home.page.scss

grep -R "#[0-9a-fA-F]\{3,8\}" platform/ui-system/dos-ui-system/src/marketing/marketing-home.page.scss

grep -R "margin-left\|margin-right\|padding-left\|padding-right" platform/ui-system/dos-ui-system/src/marketing/marketing-home.page.scss
```

Expected:

```text
All required selectors exist.
No raw hex unless explicitly approved token fallback.
No physical left/right properties.
Build passes.
```

---

# 9. Report format

```text
Files changed:
- ...

Patch completed:
- Patch 1 Marketing CSS only

Selectors covered:
- count: 33+

Rules:
- raw hex: none / exceptions listed
- logical CSS: yes
- responsive: 390/430/768/1440

Build:
- command:
- result:

Screenshots:
- desktop:
- mobile:

Next blocker:
- ...
```
