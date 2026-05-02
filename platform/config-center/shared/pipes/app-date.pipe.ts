import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService } from '../core/services/i18n.service';

@Pipe({ name: 'appDate', standalone: true, pure: false })
export class AppDatePipe implements PipeTransform {
  private readonly i18n = inject(I18nService);

  transform(value: string | number | Date | null | undefined, format: 'short' | 'medium' | 'long' | 'relative' = 'medium'): string {
    if (!value) return '—';
    const date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) return '—';

    const locale = this.i18n.currentLang() === 'ar' ? 'ar-SA' : 'en-US';

    if (format === 'relative') {
      return this.relativeTime(date, locale);
    }

    const options: Intl.DateTimeFormatOptions =
      format === 'short' ? { year: 'numeric', month: 'numeric', day: 'numeric' } :
      format === 'long'  ? { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' } :
                           { year: 'numeric', month: 'short', day: 'numeric' };

    return new Intl.DateTimeFormat(locale, options).format(date);
  }

  private relativeTime(date: Date, locale: string): string {
    const now = Date.now();
    const diff = now - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (typeof Intl !== 'undefined' && (Intl as any).RelativeTimeFormat) {
      const rtf = new (Intl as any).RelativeTimeFormat(locale, { numeric: 'auto' });
      if (days > 30) return this.transform(date, 'medium');
      if (days > 0) return rtf.format(-days, 'day');
      if (hours > 0) return rtf.format(-hours, 'hour');
      if (minutes > 0) return rtf.format(-minutes, 'minute');
      return rtf.format(-seconds, 'second');
    }

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'just now';
  }
}
