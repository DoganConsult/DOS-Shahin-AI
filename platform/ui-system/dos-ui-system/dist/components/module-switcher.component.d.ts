import { EventEmitter } from '@angular/core';
/**
 * DosModuleSwitcher — platform-tier UI primitive.
 *
 * Renders a compact horizontal/vertical strip of module entries. The set
 * of modules and the active selection are inputs; emitting `select` is
 * the only side effect. **Zero hardcoded modules**, no PrimeNG, no
 * product-specific I18n service.
 *
 * Lifted from `platform/config-center/shared/layout/header/module-switcher.component.ts`
 * (which had GRC/Qiyas baked in). That component should now wrap this one
 * with its own static module list + i18n adapter; products can also
 * consume this directly.
 *
 * Locale: optional `localize` input function `(en, ar?) => string` so
 * downstream products inject their I18nService without coupling. When
 * omitted the EN label is rendered.
 *
 * Density variants: `compact` (icon-only, 32px), `comfortable` (default,
 * icon + label), `expanded` (icon + label + active dot).
 */
export interface DosModuleEntry {
    id: string;
    labelEn: string;
    labelAr?: string;
    icon?: string;
    rootRoute?: string;
    color?: string;
    badge?: string;
    disabled?: boolean;
}
export declare class DosModuleSwitcherComponent {
    /** Module catalog. Caller filters by entitlement / readiness BEFORE handing to this component. */
    modules: ReadonlyArray<DosModuleEntry>;
    /** Currently-selected module id. */
    activeId: string | null;
    /** Display density. */
    density: 'compact' | 'comfortable' | 'expanded';
    /** Locale code; the component reads `labelAr` only when this starts with 'ar'. */
    locale: string;
    /** Document direction; usually inherited from `<html dir>`. */
    dir: 'ltr' | 'rtl';
    /** Optional aria label override. */
    ariaLabel: string;
    /** Optional localize override `(en, ar?) => string`. When provided takes precedence over `locale`. */
    localize: ((en: string, ar?: string) => string) | null;
    /** Emits the chosen module entry on click (after disabled-check). */
    select: EventEmitter<DosModuleEntry>;
    readonly visibleModules: import("@angular/core").Signal<DosModuleEntry[]>;
    readonly showLabel: () => boolean;
    label(m: DosModuleEntry): string;
    onSelect(m: DosModuleEntry): void;
}
