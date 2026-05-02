import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'appTruncate', standalone: true })
export class AppTruncatePipe implements PipeTransform {
  transform(value: string | null | undefined, limit = 80, trail = '…'): string {
    if (!value) return '';
    return value.length > limit ? value.substring(0, limit).trimEnd() + trail : value;
  }
}
