import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SearchModule } from 'carbon-components-angular';
import { CHROME_ARIA_LABEL_RESOLVER } from '../shell/chrome-aria-label-resolver';

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
@Component({
  selector: 'dos-carbon-search',
  standalone: true,
  imports: [CommonModule, SearchModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (resolvedAriaLabel()) {
      <cds-search
        [size]="size"
        [theme]="theme"
        [placeholder]="placeholder"
        [label]="resolvedAriaLabel()"
        [ariaLabel]="resolvedAriaLabel()"
        [disabled]="disabled"
        [skeleton]="skeleton"
        [autocomplete]="autocomplete"
        [name]="name"
        [value]="value"
        [toolbar]="toolbar"
        [expandable]="expandable"
        (valueChange)="onChange($event)"
        (clear)="cleared.emit()"
      ></cds-search>
    }
  `,
})
export class DosCarbonSearchComponent {
  private readonly chromeAriaResolver = inject(CHROME_ARIA_LABEL_RESOLVER, { optional: true });
  private readonly _ariaLabelInput = signal<string | null>(null);
  private readonly _ariaLabelKey = signal<string>('shell.dos-carbon-search.search.ariaLabel');

  /** Direct aria-label override — used only when host already has the resolved string. */
  @Input() set ariaLabel(value: string | null) { this._ariaLabelInput.set(value && value.trim() ? value.trim() : null); }
  /** Runtime chrome key. Defaults to the wrapper's own DB-seeded key. */
  @Input() set ariaLabelKey(value: string | null) {
    this._ariaLabelKey.set(value && value.trim() ? value.trim() : '');
  }
  @Input() placeholder = '';
  @Input() value = '';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() theme: 'light' | 'dark' = 'light';
  @Input() disabled = false;
  @Input() skeleton = false;
  @Input() autocomplete: 'on' | 'off' = 'off';
  @Input() name = '';
  @Input() toolbar = false;
  @Input() expandable = false;

  @Output() valueChange = new EventEmitter<string>();
  @Output() cleared = new EventEmitter<void>();

  readonly resolvedAriaLabel = computed<string>(() => {
    const direct = this._ariaLabelInput();
    if (direct) return direct;
    const key = this._ariaLabelKey();
    if (!key || !this.chromeAriaResolver) return '';
    const resolved = this.chromeAriaResolver.resolve(key);
    return typeof resolved === 'string' ? resolved.trim() : '';
  });

  onChange(value: string): void {
    this.value = value;
    this.valueChange.emit(value);
  }
}
