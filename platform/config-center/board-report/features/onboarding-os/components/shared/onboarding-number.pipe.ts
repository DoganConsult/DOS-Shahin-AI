import { Pipe, PipeTransform, inject } from '@angular/core';
import { ONBOARDING_PLATFORM } from '../../ports/onboarding-platform.port';

@Pipe({ name: 'appNumber', standalone: true, pure: false })
export class OnboardingNumberPipe implements PipeTransform {
  private readonly platform = inject(ONBOARDING_PLATFORM);

  transform(
    value: number | string | null | undefined,
    format: 'decimal' | 'percent' | 'compact' | 'currency' = 'decimal',
    digits?: string
  ): string {
    if (value == null || value === '') return '—';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '—';

    const locale = this.platform.i18n.currentLang() === 'ar' ? 'ar-SA' : 'en-US';
    const [minInt, minFrac, maxFrac] = this.parseDigits(digits);

    const options: Intl.NumberFormatOptions = {
      minimumIntegerDigits: minInt,
      minimumFractionDigits: minFrac,
      maximumFractionDigits: maxFrac,
    };

    if (format === 'percent') {
      options.style = 'percent';
      options.maximumFractionDigits = maxFrac ?? 1;
      return new Intl.NumberFormat(locale, options).format(num / 100);
    }

    if (format === 'compact') {
      options.notation = 'compact';
      options.maximumFractionDigits = 1;
      return new Intl.NumberFormat(locale, options).format(num);
    }

    if (format === 'currency') {
      options.style = 'currency';
      options.currency = 'SAR';
      return new Intl.NumberFormat(locale, options).format(num);
    }

    return new Intl.NumberFormat(locale, options).format(num);
  }

  private parseDigits(digits?: string): [number, number, number] {
    if (!digits) return [1, 0, 2];
    const match = digits.match(/^(\d+)\.(\d+)-(\d+)$/);
    if (match) return [+match[1], +match[2], +match[3]];
    return [1, 0, 2];
  }
}
