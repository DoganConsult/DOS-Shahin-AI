import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface WidgetResponseDto<T = unknown> {
  widgetKey: string;
  title: string;
  payload: T;
  fetchedAt: string;
}

@Injectable({ providedIn: 'root' })
export class WidgetsApiService {
  private http = inject(HttpClient);

  getWidget<T = unknown>(widgetKey: string): Observable<WidgetResponseDto<T>> {
    return this.http.get<unknown>(`/api/widgets/${widgetKey}`).pipe(
      map(res => {
        if (res && typeof res === 'object' && 'payload' in (res as any)) return res as WidgetResponseDto<T>;
        return {
          widgetKey,
          title: (res as any)?.title || widgetKey,
          payload: res as T,
          fetchedAt: (res as any)?.fetchedAt || new Date().toISOString(),
        };
      }),
    );
  }
}
