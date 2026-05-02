import { Pipe, PipeTransform } from '@angular/core';

/**
 * BilingualPipe — resolves bilingual text based on current language.
 *
 * Usage in templates:
 *   {{ { en: 'Controls', ar: 'ضوابط' } | bilingual:lang }}
 *   {{ item | bilingual:lang:'label' }}    ← reads item.label_en / item.label_ar
 *
 * Supports two modes:
 * 1. Object mode: Pass { en: string, ar: string } → resolves by lang
 * 2. Field mode: Pass any object + field prefix → reads obj[prefix_en] / obj[prefix_ar]
 */
@Pipe({
  name: 'bilingual',
  standalone: true,
  pure: true,
})
export class BilingualPipe implements PipeTransform {
  transform(value: unknown, lang: 'en' | 'ar', fieldPrefix?: string): string {
    if (value == null) return '';

    // Mode 2: Field prefix — read obj[prefix_en] / obj[prefix_ar]
    if (fieldPrefix && typeof value === 'object') {
      const obj = value as Record<string, any>;
      const key = `${fieldPrefix}_${lang}`;
      const fallback = `${fieldPrefix}_${lang === 'ar' ? 'en' : 'ar'}`;
      return String(obj[key] ?? obj[fallback] ?? '');
    }

    // Mode 1: Object with en/ar keys
    if (typeof value === 'object' && !Array.isArray(value)) {
      const obj = value as Record<string, any>;
      return String(obj[lang] ?? obj[lang === 'ar' ? 'en' : 'ar'] ?? '');
    }

    // Fallback: return as string
    return String(value);
  }
}
