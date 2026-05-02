import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '@env/environment';

@Injectable({ providedIn: 'root' })
export class WidgetDataService {
  private api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Fetch widget chart data from the chart-data API.
   * Returns the data payload or null on error.
   */
  fetchWidgetData(widgetId: string): Observable<any | null> {
    return this.http
      .get<{ success: boolean; data: unknown }>(`${this.api}/chart-data/widgets/${encodeURIComponent(widgetId)}/data`)
      .pipe(
        map(res => (res?.success ? res.data : null)),
        catchError(() => of(null)),
      );
  }

  /**
   * Batch-fetch data for multiple widget IDs (max 20).
   * Returns a record of widgetId → data.
   */
  fetchBatch(widgetIds: string[]): Observable<Record<string, unknown> | null> {
    return this.http
      .post<{ success: boolean; data: Record<string, unknown> }>(`${this.api}/chart-data/widgets/batch`, { widgetIds })
      .pipe(
        map(res => (res?.success ? res.data : null)),
        catchError(() => of(null)),
      );
  }
}
