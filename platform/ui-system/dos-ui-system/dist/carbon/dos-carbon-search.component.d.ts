import { EventEmitter } from '@angular/core';
/**
 * Carbon-backed search input. Carbon's `cds-search` exposes:
 *   theme/size/disabled/toolbar/expandable/skeleton/active/tableSearch/
 *   name/id/required/value/autocomplete/label/placeholder/clearButtonTitle/
 *   searchTitle/ariaLabel/fluid
 *
 * Fail-closed: the wrapper renders nothing unless an aria-label is
 * resolved from the host's runtime chrome bag (DB → UI-OS → resolver)
 * via `CHROME_ARIA_LABEL_RESOLVER`. No hardcoded English/Arabic
 * placeholder, no static `'Search'` literal. The `ariaLabelKey`
 * defaults to the wrapper's own DB-seeded chrome key
 * (`shell.dos-carbon-search.search.ariaLabel`).
 */
export declare class DosCarbonSearchComponent {
    private readonly chromeAriaResolver;
    private readonly _ariaLabelInput;
    private readonly _ariaLabelKey;
    /** Direct aria-label override — used only when host already has the resolved string. */
    set ariaLabel(value: string | null);
    /** Runtime chrome key. Defaults to the wrapper's own DB-seeded key. */
    set ariaLabelKey(value: string | null);
    placeholder: string;
    value: string;
    size: 'sm' | 'md' | 'lg';
    theme: 'light' | 'dark';
    disabled: boolean;
    skeleton: boolean;
    autocomplete: 'on' | 'off';
    name: string;
    toolbar: boolean;
    expandable: boolean;
    valueChange: EventEmitter<string>;
    cleared: EventEmitter<void>;
    readonly resolvedAriaLabel: import("@angular/core").Signal<string>;
    onChange(value: string): void;
}
