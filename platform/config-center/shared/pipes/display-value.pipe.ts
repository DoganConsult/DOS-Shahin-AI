import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService } from '@app/infrastructure';

/**
 * DisplayValuePipe — D-03 canonical fallback pipe.
 *
 * Returns `value` if it is a non-empty string / non-null value,
 * otherwise returns the localized fallback (default: `common.notApplicable`).
 *
 * Usage:
 *   {{ record.name | displayValue }}
 *   {{ record.score | displayValue:'common.noData' }}
 *
 * Replaces all inline `|| 'N/A'` and `?? 'N/A'` template expressions.
 * This is the canonical solution for D-03: hardcoded fallback strings.
 */
@Pipe({ name: 'displayValue', standalone: true, pure: false })
export class DisplayValuePipe implements PipeTransform {
  private readonly i18n = inject(I18nService);

  transform(value: unknown, fallbackKey = 'common.notApplicable'): string {
    if (value === null || value === undefined || value === '') {
      return this.i18n.translate(fallbackKey) || '—';
    }
    if (typeof value === 'number' && isNaN(value)) {
      return this.i18n.translate(fallbackKey) || '—';
    }
    return String(value);
  }
}
